/**
 * 物种。只有身份、译名、翻页 —— 属性、种族值、图片这些都是形态的属性，在 FormSource。
 *
 * 必须每个请求新建实例 —— DataLoader 的缓存是按实例存的，跨请求复用会把上一个
 * 请求的数据喂给下一个。实例化在 app/api/graphql/route.ts。
 *
 * 返回的都是库里的行，字段名即列名，不造 GraphQL 的表示。id 不转字符串：
 * GraphQL 的 ID 序列化收 string 和 number 两种（types.generated.ts 里
 * Scalars["ID"]["output"] 是 `string | number`），库里的自增 id 直接透出去就行
 */
import DataLoader from "dataloader";

import { pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type { Pokemon, PokemonI18n } from "@/prisma/generated/client";

export type PokemonRow = Pokemon;

/** 译名。这个语言没收录时是别的语言的值，见 pickByLanguage */
export type PokemonNameRow = Pick<PokemonI18n, "name">;

type PageKey = { offset: number; limit: number };
type NameKey = { pokemonId: number; language: string };

export class PokemonSource {
  /**
   * 按全国图鉴编号或英文 slug 找一只。纯数字当编号，否则当 slug ——
   * 库里这两者在不同列，得分开查，所以下面是两个 loader
   */
  findOne(idOrSlug: string): Promise<PokemonRow | null> {
    const dexNumber = /^\d+$/.test(idOrSlug) ? Number(idOrSlug) : null;
    return dexNumber !== null
      ? this.#byIdLoader.load(dexNumber)
      : this.#bySlugLoader.load(idOrSlug);
  }

  /** 按全国图鉴编号翻页 */
  findPage(offset: number, limit: number): Promise<PokemonRow[]> {
    return this.#pageLoader.load({ offset, limit });
  }

  /** 库里一共多少只，翻页算总页数用 */
  countAll(): Promise<number> {
    return this.#countLoader.load("total");
  }

  /** 译名和分类。name 和 genus 两个字段调它，DataLoader 会合并成一次查询 */
  nameOf(pokemonId: number, language: string): Promise<PokemonNameRow | null> {
    return this.#nameLoader.load({ pokemonId, language });
  }

  // ── DataLoader ──────────────────────────────────────────────

  /**
   * 编号和 slug 各一个 loader —— 两者在库里是不同的列，合不成一次查询。
   *
   * 查到之后互相 prime 一下：同一请求里 pokemon(id: "37") 和
   * pokemon(id: "vulpix") 问的是同一行，第二次不该再打库。
   * prime 不覆盖已有的缓存，所以重复调用无害
   */
  readonly #byIdLoader = new DataLoader<number, PokemonRow | null>(async (ids) => {
    const rows = await prisma.pokemon.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        slug: true,
        isBaby: true,
        isLegendary: true,
        isMythical: true,
        genderCode: true,
        growthRateId: true,
        evoStage: true,
      },
    });

    const byId = new Map<number, PokemonRow>();
    for (const row of rows) {
      byId.set(row.id, row);
      this.#bySlugLoader.prime(row.slug, row);
    }
    return ids.map((id) => byId.get(id) ?? null);
  });

  readonly #bySlugLoader = new DataLoader<string, PokemonRow | null>(async (slugs) => {
    const rows = await prisma.pokemon.findMany({
      where: { slug: { in: [...slugs] } },
      select: {
        id: true,
        slug: true,
        isBaby: true,
        isLegendary: true,
        isMythical: true,
        genderCode: true,
        growthRateId: true,
        evoStage: true,
      },
    });

    const bySlug = new Map<string, PokemonRow>();
    for (const row of rows) {
      bySlug.set(row.slug, row);
      this.#byIdLoader.prime(row.id, row);
    }
    return slugs.map((slug) => bySlug.get(slug) ?? null);
  });

  /**
   * 翻页。每个 key 的 offset/limit 都不一样，合不成一条 SQL，所以批函数里
   * 各查各的 —— 这里用 DataLoader 只图它的记忆化：同一请求里问同一页两次
   * （别名查询）只打一次库。
   *
   * 查出来的每一行顺手 prime 进上面两个 loader，列表页之后再单查某一只
   * 就不用回库
   */
  readonly #pageLoader = new DataLoader<PageKey, PokemonRow[], string>(
    async (keys) =>
      Promise.all(
        keys.map(async ({ offset, limit }) => {
          const rows = await prisma.pokemon.findMany({
            orderBy: { id: "asc" },
            skip: offset,
            take: limit,
            select: {
              id: true,
              slug: true,
              isBaby: true,
              isLegendary: true,
              isMythical: true,
              genderCode: true,
              growthRateId: true,
              evoStage: true,
            },
          });

          for (const row of rows) {
            this.#byIdLoader.prime(row.id, row);
            this.#bySlugLoader.prime(row.slug, row);
          }
          return rows;
        }),
      ),
    { cacheKeyFn: (k) => `${k.offset}:${k.limit}` },
  );

  /**
   * 总数。只有一个 key，DataLoader 在这里纯粹当请求级缓存用 ——
   * 一次查询里出现几个 pokemonList 就会问几次 pagination.total
   */
  readonly #countLoader = new DataLoader<"total", number>(async (keys) => {
    const total = await prisma.pokemon.count();
    return keys.map(() => total);
  });

  /**
   * 译名。查全部语言再挑的道理同 name-loader.ts
   */
  readonly #nameLoader = new DataLoader<NameKey, PokemonNameRow | null, string>(
    async (keys) => {
      const rows = await prisma.pokemonI18n.findMany({
        where: { pokemonId: { in: [...new Set(keys.map((k) => k.pokemonId))] } },
        select: { pokemonId: true, languageCode: true, name: true },
      });

      const byPokemon = new Map<number, typeof rows>();
      for (const row of rows) {
        const list = byPokemon.get(row.pokemonId);
        if (list) list.push(row);
        else byPokemon.set(row.pokemonId, [row]);
      }
      return keys.map((k) => pickByLanguage(byPokemon.get(k.pokemonId) ?? [], k.language));
    },
    { cacheKeyFn: (k) => `${k.pokemonId}:${k.language}` },
  );
}
