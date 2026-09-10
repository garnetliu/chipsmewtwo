/**
 * 补数据用的 DataSource。
 *
 * 它存在的唯一理由是库里数据不足 —— 主线是查询（PokemonDbSource），
 * 这个类负责在查不到时从 PokeAPI 拉回来写进库。所以拉取、字段映射、落库
 * 全在这一个文件里：等数据全导进库之后，删掉这个文件和 route.ts 里
 * 实例化它的那行就行，查询主线一行都不用改。
 *
 * 依赖字典表先就位（prisma/seed.ts 灌的）：language、generation、type、
 * version、pokedex、color。缺任何一张这里都会外键报错。
 */
import { RESTDataSource } from "@apollo/datasource-rest";

import type { PokemonImporter } from "@/graphql/context";
import { resolveLanguageCode } from "@/lib/pokeapi/language";
import { FORM_COLOR_HISTORY, FORM_COLORS } from "@/lib/pokemon/form-colors";
import { prisma } from "@/lib/prisma";

/** 属性按世代展开的上界，也是种族值唯一有数据的那一代 */
const LATEST_GENERATION = 9;

/** 「按颜色查找图鉴」是红宝石蓝宝石引入的功能，Gen1/2 没有颜色分类 */
const COLOR_SINCE_GENERATION = 3;

// ── PokeAPI 的响应形状。只在这个文件里用，不导出 ──────────────

type NamedRef = { name: string; url: string };
type LocalizedName = { name: string; language: { name: string } };

type SpeciesResponse = {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: { name: string } }[];
  color: NamedRef | null;
  generation: NamedRef;
  pokedex_numbers: { entry_number: number; pokedex: NamedRef }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: NamedRef;
  }[];
};

type PokemonResponse = {
  id: number;
  name: string;
  is_default: boolean;
  species: NamedRef;
  types: { slot: number; type: NamedRef }[];
  past_types: { generation: NamedRef; types: { slot: number; type: NamedRef }[] }[];
  stats: { base_stat: number; stat: NamedRef }[];
  sprites: {
    /** 点阵图，96×96 */
    front_default: string | null;
    other: {
      /** 官方美术图，475×475 */
      "official-artwork": { front_default: string | null };
    };
  };
};

type ListResponse = { count: number; results: NamedRef[] };

// ── 内部的中间形状。响应 → 这个 → 落库，两步分开是为了映射代码集中好读 ──

type Snapshot = {
  id: number;
  slug: string;
  names: { languageCode: string; name: string; genus: string | null }[];
  dexNumbers: { pokedexSlug: string; number: number }[];
  form: {
    slug: string;
    isDefault: boolean;
    /** 大图文件名，数据源没收录时是 null */
    fullImage: string | null;
    /** 小图文件名，同上 */
    detailImage: string | null;
    /** 已经按世代展开好，每代一行 */
    types: { generationId: number; primarySlug: string; secondarySlug: string | null }[];
    /** 同样每代一行 */
    colors: { generationId: number; colorSlug: string }[];
    stats: {
      generationId: number;
      hp: number;
      attack: number;
      defense: number;
      specialAttack: number | null;
      specialDefense: number | null;
      speed: number;
      special: number | null;
    }[];
    descriptions: { versionSlug: string; languageCode: string; text: string }[];
  };
};

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

/** 从 ".../api/v2/generation/6/" 这种 URL 里抠出末尾的 id */
function idFromUrl(url: string): number {
  const id = Number(url.replace(/\/$/, "").split("/").pop());
  if (!Number.isFinite(id)) throw new Error(`URL 里解析不出 id: ${url}`);
  return id;
}

/** 从图片地址里取文件名。数据源给的是完整 URL，库里只留 "10103.png" 这一段 ——
 *  地址前缀和版本号在 lib/pokemon/sprites.ts 里，换图源不用动数据 */
function fileNameOf(url: string | null): string | null {
  return url ? (url.split("/").pop() ?? null) : null;
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

// ── 响应 → 中间形状 ───────────────────────────────────────────

function toSnapshot(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot {
  return {
    id: species.id,
    slug: species.name,
    names: toNames(species),
    dexNumbers: species.pokedex_numbers.map((entry) => ({
      pokedexSlug: entry.pokedex.name,
      number: entry.entry_number,
    })),
    form: {
      slug: pokemon.name,
      isDefault: pokemon.is_default,
      fullImage: fileNameOf(pokemon.sprites.other["official-artwork"].front_default),
      detailImage: fileNameOf(pokemon.sprites.front_default),
      types: toTypes(pokemon, species),
      colors: toColors(pokemon, species),
      stats: toStats(pokemon),
      descriptions: toDescriptions(species),
    },
  };
}

/** names 给名字、genera 给分类，两者按语言合并成一行 */
function toNames(species: SpeciesResponse): Snapshot["names"] {
  const genusByCode = new Map<string, string>();
  for (const g of species.genera) {
    const code = resolveLanguageCode(g.language.name);
    if (code) genusByCode.set(code, g.genus);
  }

  const out: Snapshot["names"] = [];
  for (const n of species.names) {
    const code = resolveLanguageCode(n.language.name);
    if (!code) continue;
    out.push({ languageCode: code, name: n.name, genus: genusByCode.get(code) ?? null });
  }
  return out;
}

/**
 * 属性按世代展开成每代一行。types 是当前（Gen9）的，past_types 每项的
 * generation 表示「该世代及之前是这样」—— 魔墙人偶当前是超能力+妖精，
 * past 是 Gen5 只有超能力，所以 Gen1~5 的 secondary 为 null、Gen6~9 是妖精。
 *
 * 展开放在这里而不是留给落库：past_types 那种「当前值 + 历史差异」的表达
 * 是 PokeAPI 特有的，库里存的是每代一行完整值。
 */
function toTypes(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot["form"]["types"] {
  const introducedIn = idFromUrl(species.generation.url);
  const past = pokemon.past_types
    .map((p) => ({ generationId: idFromUrl(p.generation.url), types: p.types }))
    .sort((a, b) => a.generationId - b.generationId);

  const out: Snapshot["form"]["types"] = [];
  for (let generationId = introducedIn; generationId <= LATEST_GENERATION; generationId++) {
    // 取第一个覆盖这一代的历史快照，没有就说明这代用的是当前值
    const snapshot = past.find((p) => p.generationId >= generationId)?.types ?? pokemon.types;
    const bySlot = new Map(snapshot.map((t) => [t.slot, t.type.name]));
    const primarySlug = bySlot.get(1);
    if (!primarySlug) continue;

    out.push({ generationId, primarySlug, secondarySlug: bySlot.get(2) ?? null });
  }
  return out;
}

/**
 * 种族值只有最新世代那一份 —— PokeAPI 没有 past_stats，只给当前值。
 * 历史种族值（比如 Gen1 的合并特殊值）得另找数据源，所以 special 这里永远是 null。
 */
function toStats(pokemon: PokemonResponse): Snapshot["form"]["stats"] {
  const byName = new Map(pokemon.stats.map((s) => [s.stat.name, s.base_stat]));
  const hp = byName.get("hp");
  const attack = byName.get("attack");
  const defense = byName.get("defense");
  const speed = byName.get("speed");
  // 四项必填的缺任何一项就说明响应不对，整条跳过而不是写半行进去
  if (hp === undefined || attack === undefined || defense === undefined || speed === undefined) {
    return [];
  }

  return [
    {
      generationId: LATEST_GENERATION,
      hp,
      attack,
      defense,
      specialAttack: byName.get("special-attack") ?? null,
      specialDefense: byName.get("special-defense") ?? null,
      speed,
      special: null,
    },
  ];
}

/**
 * 图鉴颜色按世代展开。
 *
 * PokeAPI 的 color 挂在物种上，同一物种的所有形态拿到同一个值 —— 照它写的话
 * 阿罗拉六尾会变成关都六尾的褐色。所以物种值只作兜底，形态和世代的真实分类
 * 走 FORM_COLORS / FORM_COLOR_HISTORY（数据来自神奇宝贝百科）。
 */
function toColors(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot["form"]["colors"] {
  const fallback = FORM_COLORS[pokemon.name] ?? species.color?.name;
  if (!fallback) return [];

  const history = FORM_COLOR_HISTORY[pokemon.name];
  const from = Math.max(idFromUrl(species.generation.url), COLOR_SINCE_GENERATION);
  const out: Snapshot["form"]["colors"] = [];
  for (let generationId = from; generationId <= LATEST_GENERATION; generationId++) {
    out.push({ generationId, colorSlug: history?.[generationId] ?? fallback });
  }
  return out;
}

/**
 * 图鉴说明。PokeAPI 把它挂在 species 上而不是形态上，所以同一物种的各个形态
 * 拿到的是同一批文案 —— 游戏里阿罗拉六尾的说明跟原版不同，这层差异补不了。
 */
function toDescriptions(species: SpeciesResponse): Snapshot["form"]["descriptions"] {
  // 原文带换行和软连字符，那是为了适配游戏内文本框宽度，存库前抹平
  const clean = (text: string) =>
    text
      .replace(/[\n\f\r]+/g, " ")
      .replace(/­/g, "")
      .trim();

  const out: Snapshot["form"]["descriptions"] = [];
  for (const entry of species.flavor_text_entries) {
    const code = resolveLanguageCode(entry.language.name);
    if (!code) continue;
    out.push({
      versionSlug: entry.version.name,
      languageCode: code,
      text: clean(entry.flavor_text),
    });
  }
  return out;
}
