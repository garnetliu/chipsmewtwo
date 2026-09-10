/**
 * 查库的 DataSource，网站的主线。
 *
 * 每个方法配一个 DataLoader：列表页 20 只宝可梦各自查 name 和 types，
 * 走 DataLoader 是 2 次 `IN (...)` 查询而不是 40 次单查。
 *
 * 必须每个请求新建实例 —— DataLoader 的缓存是按实例存的，跨请求复用
 * 会把上一个请求的数据喂给下一个。实例化在 app/api/graphql/route.ts。
 */
import DataLoader from "dataloader";

import { pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";

/** 库里的 slug 换成前端要的译名。这个语言没收录时是别的语言的值，见 pickByLanguage */
export type NameRow = { name: string; genus: string | null };

/** 图片文件名。地址前缀在 lib/pokemon/sprites.ts 拼，库里只存文件名 */
export type ImageRow = { fullImage: string | null; detailImage: string | null };

/** 已经是 GraphQL PokemonType 的形状（除了带参数的 name），所以 resolver 不用再转 */
export type TypeRow = { id: string; slug: string; color: string };

/** 已经是 GraphQL PokemonStats 的形状 */
export type StatsRow = {
  id: string;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number | null;
  specialDefense: number | null;
  speed: number;
  special: number | null;
};

/** DataLoader 的 key 是复合值，拼成字符串当 cacheKey */
type PokemonLanguageKey = { pokemonId: number; language: string };
type PokemonGenerationKey = { pokemonId: number; generationId: number };
type TypeLanguageKey = { typeId: number; language: string };

export class PokemonDbSource {
  /**
   * 按全国图鉴编号或英文 slug 找一只。纯数字当编号，否则当 slug ——
   * 库里这两者在不同列，得分开查。
   *
   * 返回的对象就是 GraphQL Pokemon 的标量部分，其余字段由字段 resolver
   * 各自走 DataLoader 取
   */
  async findOne(idOrSlug: string): Promise<{ id: string; slug: string } | null> {
    const dexNumber = /^\d+$/.test(idOrSlug) ? Number(idOrSlug) : null;
    const row = await prisma.pokemon.findFirst({
      where: dexNumber !== null ? { id: dexNumber } : { slug: idOrSlug },
      select: { id: true, slug: true },
    });
    return row ? { id: String(row.id), slug: row.slug } : null;
  }

  async findPage(offset: number, limit: number): Promise<{ id: string; slug: string }[]> {
    const rows = await prisma.pokemon.findMany({
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
      select: { id: true, slug: true },
    });
    return rows.map((r) => ({ id: String(r.id), slug: r.slug }));
  }

  /** 物种的译名和分类。name 和 genus 两个字段调它，DataLoader 会合并成一次查询 */
  nameOf(pokemonId: number, language: string): Promise<NameRow | null> {
    return this.#nameLoader.load({ pokemonId, language });
  }

  /** 返回的数组顺序就是属性槽位：第一个是第一属性，单属性只有一个元素 */
  typesOf(pokemonId: number, generationId: number): Promise<TypeRow[] | null> {
    return this.#typesLoader.load({ pokemonId, generationId });
  }

  statsOf(pokemonId: number, generationId: number): Promise<StatsRow | null> {
    return this.#statsLoader.load({ pokemonId, generationId });
  }

  /** 属性本体的译名 */
  typeNameOf(typeId: number, language: string): Promise<string | null> {
    return this.#typeNameLoader.load({ typeId, language });
  }

  /** 默认形态的两个图片文件名。数据源没收录、或者这只还没导入时是 null */
  imagesOf(pokemonId: number): Promise<ImageRow | null> {
    return this.#imageLoader.load(pokemonId);
  }

  // ── DataLoader ──────────────────────────────────────────────

  /**
   * 译名。查的是每只的全部语言而不是只查请求的那一种 ——
   * 请求的语言没收录时要回退到默认语言或别的语言（pickByLanguage），
   * 只查一种的话拿不到可回退的行。项目只导 6 种语言，一页 20 只最多 120 行。
   */
  readonly #nameLoader = new DataLoader<PokemonLanguageKey, NameRow | null, string>(
    async (keys) => {
      const rows = await prisma.pokemonI18n.findMany({
        where: { pokemonId: { in: [...new Set(keys.map((k) => k.pokemonId))] } },
        select: { pokemonId: true, languageCode: true, name: true, genus: true },
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

  /**
   * 属性。只取默认形态 —— 地区形态要单独暴露得给 schema 加 form 参数，是另一件事。
   *
   * 库里是宽表（primary/secondary 两列），这里摊平成数组，顺序即槽位。
   * 数组本身不需要 id：Apollo 缓存列表存的是元素引用，而元素 PokemonType
   * 有 id（type 表主键），所以火系全局只存一份
   */
  readonly #typesLoader = new DataLoader<PokemonGenerationKey, TypeRow[] | null, string>(
    async (keys) => {
      const rows = await prisma.formType.findMany({
        where: {
          OR: keys.map((k) => ({
            generationId: k.generationId,
            form: { pokemonId: k.pokemonId, isDefault: true },
          })),
        },
        select: {
          generationId: true,
          form: { select: { pokemonId: true } },
          primaryType: { select: { id: true, slug: true, color: true } },
          secondaryType: { select: { id: true, slug: true, color: true } },
        },
      });

      const byKey = new Map(
        rows.map((r) => [
          `${r.form.pokemonId}:${r.generationId}`,
          [
            {
              id: String(r.primaryType.id),
              slug: r.primaryType.slug,
              color: r.primaryType.color,
            },
            // 单属性的宝可梦这一项是 null，filter 掉
            ...(r.secondaryType
              ? [
                  {
                    id: String(r.secondaryType.id),
                    slug: r.secondaryType.slug,
                    color: r.secondaryType.color,
                  },
                ]
              : []),
          ] satisfies TypeRow[],
        ]),
      );
      return keys.map((k) => byKey.get(`${k.pokemonId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.pokemonId}:${k.generationId}` },
  );

  readonly #statsLoader = new DataLoader<PokemonGenerationKey, StatsRow | null, string>(
    async (keys) => {
      const rows = await prisma.formStat.findMany({
        where: {
          OR: keys.map((k) => ({
            generationId: k.generationId,
            form: { pokemonId: k.pokemonId, isDefault: true },
          })),
        },
        select: {
          formId: true,
          generationId: true,
          form: { select: { pokemonId: true } },
          hp: true,
          attack: true,
          defense: true,
          specialAttack: true,
          specialDefense: true,
          speed: true,
          special: true,
        },
      });

      const byKey = new Map(
        rows.map((r) => [
          `${r.form.pokemonId}:${r.generationId}`,
          {
            id: `${r.formId}:${r.generationId}`,
            hp: r.hp,
            attack: r.attack,
            defense: r.defense,
            specialAttack: r.specialAttack,
            specialDefense: r.specialDefense,
            speed: r.speed,
            special: r.special,
          } satisfies StatsRow,
        ]),
      );
      return keys.map((k) => byKey.get(`${k.pokemonId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.pokemonId}:${k.generationId}` },
  );

  /** 图片文件名。跟属性、种族值一样只取默认形态 */
  readonly #imageLoader = new DataLoader<number, ImageRow | null>(async (pokemonIds) => {
    const rows = await prisma.form.findMany({
      where: { pokemonId: { in: [...pokemonIds] }, isDefault: true },
      select: { pokemonId: true, fullImage: true, detailImage: true },
    });

    const byPokemon = new Map(rows.map((r) => [r.pokemonId, r]));
    return pokemonIds.map((id) => byPokemon.get(id) ?? null);
  });

  /** 同 #nameLoader，查全部语言再挑，这样缺译名时能回退 */
  readonly #typeNameLoader = new DataLoader<TypeLanguageKey, string | null, string>(
    async (keys) => {
      const rows = await prisma.typeI18n.findMany({
        where: { typeId: { in: [...new Set(keys.map((k) => k.typeId))] } },
        select: { typeId: true, languageCode: true, name: true },
      });

      const byType = new Map<number, typeof rows>();
      for (const row of rows) {
        const list = byType.get(row.typeId);
        if (list) list.push(row);
        else byType.set(row.typeId, [row]);
      }
      return keys.map((k) => pickByLanguage(byType.get(k.typeId) ?? [], k.language)?.name ?? null);
    },
    { cacheKeyFn: (k) => `${k.typeId}:${k.language}` },
  );
}
