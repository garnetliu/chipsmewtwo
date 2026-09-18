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
import type { Pokemon, PokemonI18n, Prisma } from "@/prisma/generated/client";

import type { VersionRow } from "./version-source";

export type PokemonRow = Pokemon;

/** 译名和分类。这个语言没收录时是别的语言的值，见 pickByLanguage */
export type PokemonNameRow = Pick<PokemonI18n, "name" | "genus">;

/** 进化链上的一个成员。链是按形态连的，展示时按物种给（详情页路由是物种级的） */
export type ChainMember = { formId: number; pokemon: PokemonRow };

/** 一条进化关系，排序只用得上两端 */
export type ChainEdge = { fromFormId: number; toFormId: number };

/** null 是不筛，取全量 */
type Generation = number | null;

type PageKey = { offset: number; limit: number; generation: Generation };
type NameKey = { pokemonId: number; language: string };

/**
 * 「这只是第几代新增的」的筛选条件。
 *
 * 库里没有这一列 —— 属性表是按世代存的，一只从登场那一代起每代一行，
 * 所以「最早有属性行的那一代」就是它新增的世代。写成「这一代有行」且
 * 「更早的世代没有行」，这样不用 group by min() 就能进 where，翻页和 count 共用。
 *
 * 喷火龙的超级形态到第六代才有行，但它的默认形态第一代就有，所以它算第一代 ——
 * 条件落在物种的任一形态上，正是这个意思
 */
function introducedIn(generation: Generation): Prisma.PokemonWhereInput {
  if (generation === null) return {};

  return {
    forms: { some: { types: { some: { generationId: generation } } } },
    NOT: { forms: { some: { types: { some: { generationId: { lt: generation } } } } } },
  };
}

/**
 * 把一条链上的成员按进化顺序排开：先找链头（没有谁进化成它的那些），
 * 再顺着进化关系往下走，分叉按全国图鉴编号排（伊布的八个分支就是这样出来的）。
 *
 * 同一只物种在链上出现两次（同一物种的两个形态各占一环）时只留第一次 ——
 * 详情页的链条是物种级的，同名条目连着出现没有意义。
 *
 * 万一进化关系成了环（数据出错），剩下的成员按形态 id 补在末尾，不会丢条目。
 * 纯函数，用例在 graphql/schema/pokemon/__tests__/evolution-chain.test.ts
 */
export function orderEvolutionChain(members: ChainMember[], edges: ChainEdge[]): PokemonRow[] {
  const inChain = new Set(members.map((m) => m.formId));
  // 两端都在这条链上的关系才算数，同一对形态在多个版本组各有一行，去重
  const seenEdges = new Set<string>();
  const childrenOf = new Map<number, number[]>();
  const hasParent = new Set<number>();

  for (const edge of edges) {
    if (!inChain.has(edge.fromFormId) || !inChain.has(edge.toFormId)) continue;
    const key = `${edge.fromFormId}:${edge.toFormId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);

    const children = childrenOf.get(edge.fromFormId);
    if (children) children.push(edge.toFormId);
    else childrenOf.set(edge.fromFormId, [edge.toFormId]);
    hasParent.add(edge.toFormId);
  }

  const byForm = new Map(members.map((m) => [m.formId, m]));
  const dexNumber = (formId: number) => Number(byForm.get(formId)?.pokemon.id ?? 0);
  const sortByDex = (formIds: number[]) => [...formIds].sort((a, b) => dexNumber(a) - dexNumber(b));

  const ordered: number[] = [];
  const visited = new Set<number>();

  const walk = (formId: number) => {
    if (visited.has(formId)) return;
    visited.add(formId);
    ordered.push(formId);
    for (const child of sortByDex(childrenOf.get(formId) ?? [])) walk(child);
  };

  for (const formId of sortByDex(
    members.filter((m) => !hasParent.has(m.formId)).map((m) => m.formId),
  ))
    walk(formId);
  // 环里的成员上面一个都到不了，按形态 id 兜底
  for (const formId of [...inChain].sort((a, b) => a - b)) walk(formId);

  const result: PokemonRow[] = [];
  const seenPokemon = new Set<number>();
  for (const formId of ordered) {
    const member = byForm.get(formId);
    if (!member || seenPokemon.has(member.pokemon.id)) continue;
    seenPokemon.add(member.pokemon.id);
    result.push(member.pokemon);
  }
  return result;
}

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

  /** 按英文 slug 找一只。/pokemon/[name] 路由传的就是 slug */
  findBySlug(slug: string): Promise<PokemonRow | null> {
    return this.#bySlugLoader.load(slug);
  }

  /** 按全国图鉴编号翻页。generation 给了就只翻那一代新增的 */
  findPage(offset: number, limit: number, generation: Generation): Promise<PokemonRow[]> {
    return this.#pageLoader.load({ offset, limit, generation });
  }

  /** 这个筛选条件下一共多少只，翻页算总页数用 */
  countAll(generation: Generation): Promise<number> {
    // DataLoader 不收 null 当 key，不筛世代换成 "all"
    return this.#countLoader.load(generation ?? "all");
  }

  /**
   * 这只所在进化链上的全部物种，按进化顺序排，自己也在里面。
   * 库里没有它的进化关系时是空数组
   */
  chainOf(pokemonId: number): Promise<PokemonRow[]> {
    return this.#chainLoader.load(pokemonId);
  }

  /** 这只登场过的游戏版本，按发售顺序排 */
  versionsOf(pokemonId: number): Promise<VersionRow[]> {
    return this.#versionsLoader.load(pokemonId);
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
      select: { id: true, slug: true },
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
      select: { id: true, slug: true },
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
        keys.map(async ({ offset, limit, generation }) => {
          const rows = await prisma.pokemon.findMany({
            where: introducedIn(generation),
            orderBy: { id: "asc" },
            skip: offset,
            take: limit,
            select: { id: true, slug: true },
          });

          for (const row of rows) {
            this.#byIdLoader.prime(row.id, row);
            this.#bySlugLoader.prime(row.slug, row);
          }
          return rows;
        }),
      ),
    { cacheKeyFn: (k) => `${k.offset}:${k.limit}:${k.generation ?? "all"}` },
  );

  /**
   * 总数，按世代分别数。DataLoader 在这里纯粹当请求级缓存用 ——
   * 一次查询里出现几个 pokemonList 就会问几次 pagination.total。
   * 每个世代的条件不同，合不成一条 SQL，所以批函数里各数各的
   */
  readonly #countLoader = new DataLoader<number | "all", number>(async (keys) =>
    Promise.all(
      keys.map((key) => prisma.pokemon.count({ where: introducedIn(key === "all" ? null : key) })),
    ),
  );

  /**
   * 进化链。链挂在形态上（关都六尾和阿罗拉六尾各一条），物种级取默认形态那条。
   *
   * 三次查询：先拿默认形态和它的链号，再拿整条链的成员，最后拿成员之间的
   * 进化关系用来排序。成员和关系都是一批一起查，链上三只各问一次也只打这三次库
   */
  readonly #chainLoader = new DataLoader<number, PokemonRow[]>(async (pokemonIds) => {
    const defaultForms = await prisma.form.findMany({
      where: { pokemonId: { in: [...pokemonIds] }, isDefault: true },
      select: { pokemonId: true, evolutionChainId: true },
    });

    const chainByPokemon = new Map(
      defaultForms.map((f) => [f.pokemonId, f.evolutionChainId] as const),
    );
    const chainIds = [
      ...new Set(defaultForms.map((f) => f.evolutionChainId).filter((id) => id !== null)),
    ];
    if (chainIds.length === 0) return pokemonIds.map(() => []);

    const members = await prisma.form.findMany({
      where: { evolutionChainId: { in: chainIds } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        evolutionChainId: true,
        pokemon: { select: { id: true, slug: true } },
      },
    });
    const edges = await prisma.evolution.findMany({
      where: { fromFormId: { in: members.map((m) => m.id) } },
      select: { fromFormId: true, toFormId: true },
    });

    const membersByChain = new Map<number, ChainMember[]>();
    for (const row of members) {
      if (row.evolutionChainId === null) continue;
      const member = { formId: row.id, pokemon: row.pokemon };
      const list = membersByChain.get(row.evolutionChainId);
      if (list) list.push(member);
      else membersByChain.set(row.evolutionChainId, [member]);
    }

    const orderedByChain = new Map(
      [...membersByChain].map(([chainId, list]) => [chainId, orderEvolutionChain(list, edges)]),
    );

    return pokemonIds.map((id) => {
      const chainId = chainByPokemon.get(id) ?? null;
      if (chainId === null) return [];
      return orderedByChain.get(chainId) ?? [];
    });
  });

  /**
   * 登场版本。库里没有「这只在哪些版本里」这张表 —— 招式表是按形态 × 版本组存的，
   * 某个版本组里有它的招式，它就在那个版本组的游戏里登场过。任一形态算数。
   *
   * 招式表六十多万行，但查的是「这几个形态出现在哪些版本组」，
   * group by 走 (formId, moveId, groupId…) 的唯一索引，扫不到行外
   */
  readonly #versionsLoader = new DataLoader<number, VersionRow[]>(async (pokemonIds) => {
    const forms = await prisma.form.findMany({
      where: { pokemonId: { in: [...pokemonIds] } },
      select: { id: true, pokemonId: true },
    });
    if (forms.length === 0) return pokemonIds.map(() => []);

    const learned = await prisma.moveLearn.groupBy({
      by: ["formId", "groupId"],
      where: { formId: { in: forms.map((f) => f.id) } },
    });

    const groups = await prisma.group.findMany({
      where: { id: { in: [...new Set(learned.map((l) => l.groupId))] } },
      orderBy: { order: "asc" },
      select: { id: true, versions: { orderBy: { id: "asc" }, select: { id: true, slug: true } } },
    });

    const pokemonByForm = new Map(forms.map((f) => [f.id, f.pokemonId] as const));
    const groupsByPokemon = new Map<number, Set<number>>();
    for (const row of learned) {
      const pokemonId = pokemonByForm.get(row.formId);
      if (pokemonId === undefined) continue;
      const set = groupsByPokemon.get(pokemonId);
      if (set) set.add(row.groupId);
      else groupsByPokemon.set(pokemonId, new Set([row.groupId]));
    }

    // groups 已经按版本组的发售顺序排好，照它的顺序挑，出来就是发售顺序
    return pokemonIds.map((id) => {
      const owned = groupsByPokemon.get(id);
      if (!owned) return [];
      return groups.filter((g) => owned.has(g.id)).flatMap((g) => g.versions);
    });
  });

  /**
   * 译名。跟 createNameLoader 那批的区别是它还要带 genus，而且 name 和 genus
   * 两个字段共用一次查询，所以单独写。查全部语言再挑的道理同 name-loader.ts
   */
  readonly #nameLoader = new DataLoader<NameKey, PokemonNameRow | null, string>(
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
}
