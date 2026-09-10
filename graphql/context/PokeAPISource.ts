/**
 * 补数据用的 DataSource。
 *
 * 它存在的唯一理由是库里数据不足 —— 主线是查询（PokemonDbSource），
 * 这个类负责在查不到时从 PokeAPI 拉回来写进库。字段映射在
 * lib/pokeapi/pokemon.ts，跟拉全量写快照的脚本共用一份 —— 两条路进库的
 * 数据形状必须一样。这里只剩拉取和落库。
 *
 * 依赖字典表先就位（prisma/seed.ts 灌的）：language、generation、type、
 * version、pokedex、color。缺任何一张这里都会外键报错。
 */
import { RESTDataSource } from "@apollo/datasource-rest";

import type { PokemonImporter } from "@/graphql/context";
import {
  type ListResponse,
  type PokemonResponse,
  type Snapshot,
  type SpeciesResponse,
  toSnapshot,
} from "@/lib/pokeapi/pokemon";
import { prisma } from "@/lib/prisma";

/** slug → id 的映射。字典表灌完就不变，进程内缓存一份，
 *  免得每写一只宝可梦都去查这几张小表（加起来一百多行） */
type Dictionaries = {
  colors: Map<string, number>;
  types: Map<string, number>;
  versions: Map<string, number>;
  pokedexes: Map<string, number>;
};

let dictionaries: Promise<Dictionaries> | null = null;

function loadDictionaries(): Promise<Dictionaries> {
  dictionaries ??= (async () => {
    const [colors, types, versions, pokedexes] = await Promise.all([
      prisma.color.findMany({ select: { id: true, slug: true } }),
      prisma.type.findMany({ select: { id: true, slug: true } }),
      prisma.version.findMany({ select: { id: true, slug: true } }),
      prisma.pokedex.findMany({ select: { id: true, slug: true } }),
    ]);
    const toMap = (rows: { id: number; slug: string }[]) =>
      new Map(rows.map((r) => [r.slug, r.id]));
    return {
      colors: toMap(colors),
      types: toMap(types),
      versions: toMap(versions),
      pokedexes: toMap(pokedexes),
    };
  })();
  return dictionaries;
}

/** 跑完 seed 之后调一下，否则缓存里还是旧的 */
export function resetDictionaryCache(): void {
  dictionaries = null;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "extensions" in error &&
    (error as { extensions?: { response?: { status?: number } } }).extensions?.response?.status ===
      404
  );
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export class PokeAPI extends RESTDataSource implements PokemonImporter {
  override baseURL = "https://pokeapi.co/api/v2/";

  /**
   * 正在补数据的请求，按标识去重。
   *
   * GraphQL 的同级字段是并行 resolve 的，一个请求里查同一只的多个世代会
   * 同时触发补数据；批量那边 Promise.all 里伊布家族共享同一条进化链，也是
   * 并发写同一行。没有这层去重就会撞唯一键 —— Prisma 的 upsert 是
   * 「先 SELECT 再 INSERT」两步，不原子。
   *
   * 它只按传进来的标识去重，所以 "37" 和 "vulpix" 指同一只却算两个 key，
   * 那种情况靠下面 #write 的冲突重试兜底。
   */
  readonly #inFlight = new Map<string, Promise<boolean>>();

  async importPokemon(idOrSlug: string): Promise<boolean> {
    const running = this.#inFlight.get(idOrSlug);
    if (running) return running;

    const task = this.#fetchAndWrite(idOrSlug).finally(() => this.#inFlight.delete(idOrSlug));
    this.#inFlight.set(idOrSlug, task);
    return task;
  }

  /**
   * 列表接口只返回 name + url，不含任何详情，所以每一只还要再拉一次 ——
   * limit=20 是这里 1 次加后面 40 次（/pokemon 和 /pokemon-species 各 20）。
   * RESTDataSource 自带请求去重和 HTTP 缓存，重复翻页不会重复打。
   *
   * 单只失败不 catch：一页里有一只拉不回来就整页报错，比静默少几条好排查。
   */
  async importPokemonPage(offset: number, limit: number): Promise<void> {
    const list = await this.get<ListResponse>("pokemon", {
      params: { offset: String(offset), limit: String(limit) },
    });
    await Promise.all(list.results.map((r) => this.importPokemon(r.name)));
  }

  async #fetchAndWrite(idOrSlug: string): Promise<boolean> {
    let snapshot: Snapshot;
    try {
      const pokemon = await this.get<PokemonResponse>(`pokemon/${encodeURIComponent(idOrSlug)}`);
      const species = await this.get<SpeciesResponse>(
        `pokemon-species/${encodeURIComponent(pokemon.species.name)}`,
      );
      snapshot = toSnapshot(pokemon, species);
    } catch (error) {
      // 404 说明这只压根不存在，是正常结果不是故障
      if (isNotFound(error)) return false;
      throw error;
    }

    const dict = await loadDictionaries();
    try {
      await this.#write(snapshot, dict);
    } catch (error) {
      // 唯一键冲突说明另一个并发写抢先插了同一行。上面的 in-flight 去重挡得住
      // 同一标识的并发，但跨进程挡不住。重试一次就够 —— 那行已存在，走 UPDATE 分支
      if (!isUniqueViolation(error)) throw error;
      await this.#write(snapshot, dict);
    }
    return true;
  }

  /**
   * 整个过程包在一个事务里：要么物种、译名、形态、属性、种族值、图鉴描述
   * 全部落地，要么一条都不写。否则中途失败会留下半条记录，
   * 下次查库看着像命中了。
   *
   * Form.evolutionChainId 这里不写。链是形态级的（关都六尾和阿罗拉六尾
   * 各走一条），而数据源给的链是物种级的，一条链里混着三条形态线 ——
   * 照抄进来就是错的分组。等 pokemon_evolution 的边导入后跑连通分量回填。
   */
  async #write(snapshot: Snapshot, dict: Dictionaries): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.pokemon.upsert({
        where: { id: snapshot.id },
        create: { id: snapshot.id, slug: snapshot.slug },
        update: { slug: snapshot.slug },
      });

      for (const n of snapshot.names) {
        const row = { name: n.name, genus: n.genus };
        await tx.pokemonI18n.upsert({
          where: {
            pokemonId_languageCode: { pokemonId: snapshot.id, languageCode: n.languageCode },
          },
          create: { pokemonId: snapshot.id, languageCode: n.languageCode, ...row },
          update: row,
        });
      }

      for (const entry of snapshot.dexNumbers) {
        // 库里没有这本图鉴就跳过，而不是让整个事务炸掉 ——
        // 数据源偶尔会引用没进字典表的条目
        const pokedexId = dict.pokedexes.get(entry.pokedexSlug);
        if (pokedexId === undefined) continue;

        await tx.pokedexNumber.upsert({
          where: { pokemonId_pokedexId: { pokemonId: snapshot.id, pokedexId } },
          create: { pokemonId: snapshot.id, pokedexId, number: entry.number },
          update: { number: entry.number },
        });
      }

      const form = await tx.form.upsert({
        where: { slug: snapshot.form.slug },
        create: {
          pokemonId: snapshot.id,
          slug: snapshot.form.slug,
          isDefault: snapshot.form.isDefault,
          fullImage: snapshot.form.fullImage,
          detailImage: snapshot.form.detailImage,
        },
        update: {
          pokemonId: snapshot.id,
          isDefault: snapshot.form.isDefault,
          fullImage: snapshot.form.fullImage,
          detailImage: snapshot.form.detailImage,
        },
      });

      for (const t of snapshot.form.types) {
        const primaryTypeId = dict.types.get(t.primarySlug);
        if (primaryTypeId === undefined) continue;
        const secondaryTypeId = t.secondarySlug ? (dict.types.get(t.secondarySlug) ?? null) : null;

        const row = { primaryTypeId, secondaryTypeId };
        await tx.formType.upsert({
          where: { formId_generationId: { formId: form.id, generationId: t.generationId } },
          create: { formId: form.id, generationId: t.generationId, ...row },
          update: row,
        });
      }

      for (const c of snapshot.form.colors) {
        const colorId = dict.colors.get(c.colorSlug);
        if (colorId === undefined) continue;

        await tx.formColor.upsert({
          where: { formId_generationId: { formId: form.id, generationId: c.generationId } },
          create: { formId: form.id, generationId: c.generationId, colorId },
          update: { colorId },
        });
      }

      for (const s of snapshot.form.stats) {
        const { generationId, ...values } = s;
        await tx.formStat.upsert({
          where: { formId_generationId: { formId: form.id, generationId } },
          create: { formId: form.id, generationId, ...values },
          update: values,
        });
      }

      for (const entry of snapshot.form.descriptions) {
        const versionId = dict.versions.get(entry.versionSlug);
        if (versionId === undefined) continue;

        await tx.formDescriptionI18n.upsert({
          where: {
            formId_versionId_languageCode: {
              formId: form.id,
              versionId,
              languageCode: entry.languageCode,
            },
          },
          create: {
            formId: form.id,
            versionId,
            languageCode: entry.languageCode,
            text: entry.text,
          },
          update: { text: entry.text },
        });
      }
    });
  }
}
