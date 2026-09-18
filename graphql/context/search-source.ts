/**
 * 顶部搜索框。一次跨宝可梦、招式、道具、特性四类，按各自译名表里的名字找。
 *
 * 只管「找出哪几条」—— 副文本要的属性、说明由各自的 source 出，
 * 在 graphql/schema/search/resolvers/SearchResult.ts 里拼。
 *
 * 必须每个请求新建实例，理由同 PokemonSource
 */
import DataLoader from "dataloader";

import { prisma } from "@/lib/prisma";

/** 结果属于哪一类。取值跟 SDL 的 SearchResultKind 一一对应 */
export type SearchKind = "POKEMON" | "MOVE" | "ITEM" | "ABILITY";

/** 命中的一条。id 是各自表的主键，副文本回各自的 source 取时用得上 */
export type SearchHitRow = {
  kind: SearchKind;
  id: number;
  slug: string;
  /** 命中的那一行的名字，也就是要显示的名字，不用再查一次译名表 */
  name: string;
};

type SearchKey = { keyword: string; language: string };

/** 命中行排完序之前只有这两样，slug 等分完名额再查 */
type Candidate = { id: number; name: string };

/** 按主键取 slug，四类各给一个 */
type SlugFetch = (ids: number[]) => Promise<{ id: number; slug: string }[]>;

/** 一次最多给这么多条 —— 模态框的结果区就是按 10 行的高度画的 */
const RESULT_LIMIT = 10;

/**
 * 说明的首句，拿来当副文本。
 *
 * 英文句点要后面跟空白或到结尾才算句末 —— 道具说明里的
 * 「Restores 1/16 (6.25%) holder's max HP…」小数点不是句末。
 * 中文的。！？后面不留空格，所以不带这个条件。
 * 句末标点留着，本来就是一句完整的话。
 *
 * 一句都切不出来（整段没有句末标点）就整段返回，由前端按一行截断显示
 */
export function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null;

  const end = /[。！？]|[.!?](?=\s|$)/.exec(text);
  const head = (end ? text.slice(0, end.index + end[0].length) : text).trim();
  return head || null;
}

/**
 * 转掉 LIKE 的通配符。Prisma 的 contains 把关键词原样拼进 LIKE 的模式串，
 * 不转的话用户敲的 % 和 _ 会被当成通配符 —— 搜一个「%」等于把四张表都捞出来。
 * 反斜杠是 Postgres LIKE 默认的转义字符，Prisma 不会再加 ESCAPE 子句
 */
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, "\\$&");
}

/**
 * 同一类里的排序：关键词出现得越靠前越前，名字跟关键词完全相同的再往前提一位，
 * 其余按库里的主键 —— 宝可梦是全国图鉴编号，招式和特性的 id 就是照英文标识的
 * 字母序灌的，道具的 id 是数据源自己的编号（1 是 sun-stone、2 是 moon-stone，
 * 跟字母序对不上），所以道具这一组的先后跟道具列表页不一样。
 *
 * 所以搜「火」时「火焰鸟」（开头就是）排在「小火龙」前面，
 * 搜「妙蛙」时三只按 0001 / 0002 / 0003 排，搜「妙蛙花」时妙蛙花自己排第一
 */
function byRelevance(rows: Candidate[], keyword: string): Candidate[] {
  const needle = keyword.toLowerCase();
  const exactness = (name: string) => (name.toLowerCase() === needle ? 0 : 1);

  return [...rows].sort(
    (a, b) =>
      a.name.toLowerCase().indexOf(needle) - b.name.toLowerCase().indexOf(needle) ||
      exactness(a.name) - exactness(b.name) ||
      a.id - b.id,
  );
}

/**
 * 10 个名额怎么分：轮转，每一轮四类各拿一条，取满为止。
 *
 * 不用「合起来排序取前 10」—— 那样一类命中多就会把别的类挤没，
 * 搜「火」这种四类都命中一堆的词会全是宝可梦。
 * 某一类候选取完就跳过它，名额让给还有候选的类，
 * 所以搜「妙蛙」这种只有两类命中、加起来不到 10 条的词，两类全给
 */
function allot(sizes: number[], limit: number): number[] {
  const taken = sizes.map(() => 0);
  let total = 0;

  for (;;) {
    let progressed = false;
    for (let i = 0; i < sizes.length && total < limit; i += 1) {
      if (taken[i] >= sizes[i]) continue;
      taken[i] += 1;
      total += 1;
      progressed = true;
    }
    if (!progressed || total >= limit) break;
  }
  return taken;
}

export class SearchSource {
  /**
   * 按名字找，最多 RESULT_LIMIT 条，按类型分组返回（宝可梦、招式、道具、特性）。
   * 关键词去掉首尾空白后是空的就直接是空数组，不打库
   */
  search(keyword: string, language: string): Promise<SearchHitRow[]> {
    const trimmed = keyword.trim();
    if (!trimmed) return Promise.resolve([]);

    return this.#searchLoader.load({ keyword: trimmed, language });
  }

  // ── DataLoader ──────────────────────────────────────────────

  /**
   * 每个关键词要自己扫一遍四张译名表，几个关键词合不成一次查询，所以批函数里各查各的 ——
   * 这里用 DataLoader 只图它的记忆化，同一请求里搜同一个词两次只打一次库
   */
  readonly #searchLoader = new DataLoader<SearchKey, SearchHitRow[], string>(
    async (keys) => Promise.all(keys.map((key) => this.#search(key))),
    { cacheKeyFn: (k) => `${k.keyword}:${k.language}` },
  );

  /**
   * 两步：四张译名表各查一次拿到全部命中，排完序分完名额，再给进了名额的
   * 那几条查 slug。所以最多 8 条 SQL，一类都没命中时只有 4 条。
   *
   * 命中行不截断 —— 截断之后排序就只在前 N 条里排，位置更靠前的命中会被丢掉：
   * 搜「果」道具那边命中上百条，按 id 取前几十条的话，名字就以「果」开头的
   * 「果汁牛奶」反而进不来。不截也不贵，最坏是搜单个汉字，一张表也就三百来条命中。
   *
   * 只看这一种语言的行，不做语言回退 —— 回退会让搜中文时命中英文名，
   * 「搜到的名字」和「显示的名字」就对不上了。库里没有这种语言译名的条目搜不到。
   *
   * `%词%` 用不上 name 上的 btree 索引，四条都是顺序扫描，但表都不大：
   * 最大的两张译名表（一万行、两万行）实测各扫一遍 4 ms、9 ms，
   * 四条一起发出去，这一步十来毫秒
   */
  async #search({ keyword, language }: SearchKey): Promise<SearchHitRow[]> {
    // 四张表结构一样，条件也一样：这种语言的行里名字包含关键词，不分大小写
    const where = {
      languageCode: language,
      name: { contains: escapeLike(keyword), mode: "insensitive" },
    } as const;

    const [pokemon, moves, items, abilities] = await Promise.all([
      prisma.pokemonI18n.findMany({ where, select: { pokemonId: true, name: true } }),
      prisma.moveI18n.findMany({ where, select: { moveId: true, name: true } }),
      prisma.itemI18n.findMany({ where, select: { itemId: true, name: true } }),
      prisma.abilityI18n.findMany({ where, select: { abilityId: true, name: true } }),
    ]);

    // 顺序就是轮转分名额的顺序，也是返回结果的分组顺序。
    // slug 不跟着译名表一起关联取 —— 那样 Prisma 会为全部命中行再查一次基表，
    // 最后只有十条用得上
    const groups = [
      {
        kind: "POKEMON",
        hits: pokemon.map((r) => ({ id: r.pokemonId, name: r.name })),
        slugsOf: (ids: number[]) =>
          prisma.pokemon.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } }),
      },
      {
        kind: "MOVE",
        hits: moves.map((r) => ({ id: r.moveId, name: r.name })),
        slugsOf: (ids: number[]) =>
          prisma.move.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } }),
      },
      {
        kind: "ITEM",
        hits: items.map((r) => ({ id: r.itemId, name: r.name })),
        slugsOf: (ids: number[]) =>
          prisma.item.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } }),
      },
      {
        kind: "ABILITY",
        hits: abilities.map((r) => ({ id: r.abilityId, name: r.name })),
        slugsOf: (ids: number[]) =>
          prisma.ability.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } }),
      },
    ] satisfies { kind: SearchKind; hits: Candidate[]; slugsOf: SlugFetch }[];

    const ranked = groups.map((group) => ({ ...group, hits: byRelevance(group.hits, keyword) }));
    const quota = allot(
      ranked.map((group) => group.hits.length),
      RESULT_LIMIT,
    );
    const picked = ranked.map((group, index) => ({
      ...group,
      hits: group.hits.slice(0, quota[index]),
    }));

    const slugs = await Promise.all(
      picked.map(async ({ hits, slugsOf }) => {
        if (hits.length === 0) return new Map<number, string>();

        const rows = await slugsOf(hits.map((hit) => hit.id));
        return new Map(rows.map((row) => [row.id, row.slug]));
      }),
    );

    // picked 本来就是按类型排的，摊平出来就是分组顺序
    return picked.flatMap(({ kind, hits }, index) =>
      hits.flatMap((hit) => {
        const slug = slugs[index].get(hit.id);
        // 译名表有外键约束，查不到 slug 只可能是数据被删到一半，
        // 宁可少一条也不给前端一个拼不出路径的结果
        return slug ? [{ kind, id: hit.id, slug, name: hit.name }] : [];
      }),
    );
  }
}
