/**
 * 道具。进化条件里用到的道具挂在 Evolution 上（见 FormSource），
 * 这里管道具本身：身份、译名、说明、翻页，以及按版本组摊开的可用性表。
 *
 * 必须每个请求新建实例，理由同 PokemonSource。返回的都是库里的行，字段名即列名
 */
import DataLoader from "dataloader";

import { createNameLoader, pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type { Item, ItemEffectI18n, Prisma } from "@/prisma/generated/client";

import type { VersionRow } from "./version-source";

/** 取数只要身份那两列，图片文件名列表页和详情页都没画 */
export type ItemRow = Pick<Item, "id" | "slug">;

/** 可用性表的一行。获取方式和可用性库里没有，不在行里，由 resolver 恒返回 null */
export type ItemAvailabilityRow = {
  /** 这个版本组包含的版本，按库里的顺序排 */
  versions: VersionRow[];
};

/** 版本组，登场版本和可用性表都用它。order 是发售顺序 */
type GroupRow = { order: number; versions: VersionRow[] };

/** null 是不筛，取全量 */
type Generation = number | null;

type PageKey = { offset: number; limit: number; generation: Generation };

/**
 * 说明的一行。两列都可能没文案：shortEffect 这一列可空，effect 是 NOT NULL
 * 但没文案时存的是空串
 */
type ItemEffectRow = Pick<ItemEffectI18n, "languageCode" | "shortEffect" | "effect">;

/**
 * 「这条道具是第几代引入的」的筛选条件。
 *
 * 库里没有这一列 —— 说明是按世代存的，一条道具从引入那一代起每代一行
 * （有说明的道具没有一条世代是断开的，都是从引入那代一直排到第九代），
 * 所以「最早有说明行的那一代」就是它引入的世代。
 * 写成「这一代有行」且「更早的世代没有行」，不用 group by min() 就能进 where，
 * 翻页和 count 共用，同 MoveSource 的 introducedIn
 */
function introducedIn(generation: Generation): Prisma.ItemWhereInput {
  if (generation === null) return {};

  return {
    effects: { some: { generationId: generation } },
    NOT: { effects: { some: { generationId: { lt: generation } } } },
  };
}

export class ItemSource {
  /** 按英文 slug 找一条。/item/[name] 路由传的就是 slug */
  findBySlug(slug: string): Promise<ItemRow | null> {
    return this.#bySlugLoader.load(slug);
  }

  /**
   * 按英文标识的字母序翻页。这里显式按 slug 排，不像 move / ability 那样借 id ——
   * item.id 是数据源自己的编号（1 是 sun-stone、2 是 moon-stone），跟字母序对不上，
   * 几乎每条的位次都不一样。slug 上有唯一索引，按它排照样走索引
   */
  findPage(offset: number, limit: number, generation: Generation): Promise<ItemRow[]> {
    return this.#pageLoader.load({ offset, limit, generation });
  }

  /** 这个筛选条件下一共多少条，翻页算总页数用 */
  countAll(generation: Generation): Promise<number> {
    // DataLoader 不收 null 当 key，不筛世代换成 "all"
    return this.#countLoader.load(generation ?? "all");
  }

  /** 道具译名，例如「吃剩的东西」 */
  nameOf(itemId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: itemId, language });
  }

  /**
   * 最新一版的一句话说明。说明按世代存，展示的是现在的行为，
   * 所以取这条道具有说明的最后一代。
   *
   * 挑语言前先把这一列没文案的行滤掉 —— 库里简中那一行在，但 shortEffect
   * 这一列一行都没填，不滤的话 pickByLanguage 只看「请求的语言有没有这一行」，
   * 会挑中简中那行拿到 null，落不到有文案的英法两行。
   * 滤掉之后回退规则同译名：简中拿不到就给英文
   */
  async shortEffectOf(itemId: number, language: string): Promise<string | null> {
    const rows = await this.#effectLoader.load(itemId);

    return (
      pickByLanguage(
        rows.filter((row) => row.shortEffect),
        language,
      )?.shortEffect ?? null
    );
  }

  /**
   * 最新一版的完整说明，也就是游戏里显示的那句文案。取法同 shortEffectOf。
   *
   * 它比一句话版能给出中文的多得多 —— 这一列简中是有文案的，
   * 而一句话版只有英法两种语言。搜索结果的副文本用的是它
   */
  async effectOf(itemId: number, language: string): Promise<string | null> {
    const rows = await this.#effectLoader.load(itemId);

    return (
      pickByLanguage(
        rows.filter((row) => row.effect),
        language,
      )?.effect ?? null
    );
  }

  /** 第几代引入 —— 最早有说明的那一代。数据源没收录说明时是 null */
  async introducedGenerationOf(itemId: number): Promise<number | null> {
    const generations = await this.#generationsLoader.load(itemId);
    return generations[0] ?? null;
  }

  /** 这条道具登场过的游戏版本，按发售顺序排 */
  versionsOf(itemId: number): Promise<VersionRow[]> {
    return this.#versionsLoader.load(itemId);
  }

  /** 按版本组分行的可用性表，按发售顺序排 */
  availabilityOf(itemId: number): Promise<ItemAvailabilityRow[]> {
    return this.#availabilityLoader.load(itemId);
  }

  // ── DataLoader ──────────────────────────────────────────────

  readonly #bySlugLoader = new DataLoader<string, ItemRow | null>(async (slugs) => {
    const rows = await prisma.item.findMany({
      where: { slug: { in: [...slugs] } },
      select: { id: true, slug: true },
    });

    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return slugs.map((slug) => bySlug.get(slug) ?? null);
  });

  /**
   * 翻页。每个 key 的 offset/limit 都不一样，合不成一条 SQL，所以批函数里
   * 各查各的 —— 这里用 DataLoader 只图它的记忆化，同一请求里问同一页两次
   * 只打一次库。查出来的行顺手 prime 进 slug loader
   */
  readonly #pageLoader = new DataLoader<PageKey, ItemRow[], string>(
    async (keys) =>
      Promise.all(
        keys.map(async ({ offset, limit, generation }) => {
          const rows = await prisma.item.findMany({
            where: introducedIn(generation),
            orderBy: { slug: "asc" },
            skip: offset,
            take: limit,
            select: { id: true, slug: true },
          });

          for (const row of rows) this.#bySlugLoader.prime(row.slug, row);
          return rows;
        }),
      ),
    { cacheKeyFn: (k) => `${k.offset}:${k.limit}:${k.generation ?? "all"}` },
  );

  /**
   * 总数，按世代分别数。每个世代的条件不同，合不成一条 SQL，所以批函数里各数各的；
   * 用 DataLoader 是图它的请求级缓存，一次查询里几个 itemList 只数一次
   */
  readonly #countLoader = new DataLoader<number | "all", number>(async (keys) =>
    Promise.all(
      keys.map((key) => prisma.item.count({ where: introducedIn(key === "all" ? null : key) })),
    ),
  );

  /**
   * 这条道具在哪些世代存在过，升序。取自说明表 —— 库里没有「这条道具在哪些版本里」
   * 这张表，某一代有它的说明，它在那一代的游戏里就存在。
   *
   * 引入世代、登场版本、可用性表、说明四处都要这份世代集合，所以单拎出来一个 loader
   */
  readonly #generationsLoader = new DataLoader<number, number[]>(async (itemIds) => {
    const rows = await prisma.itemEffectI18n.groupBy({
      by: ["itemId", "generationId"],
      where: { itemId: { in: [...itemIds] } },
    });

    const byItem = new Map<number, number[]>();
    for (const row of rows) {
      const list = byItem.get(row.itemId);
      if (list) list.push(row.generationId);
      else byItem.set(row.itemId, [row.generationId]);
    }
    return itemIds.map((id) => (byItem.get(id) ?? []).sort((a, b) => a - b));
  });

  /**
   * 最新一代的说明行，一条道具一组，语言都在里面。先问出每条道具最后一代是
   * 哪一代，再只查那一代的行 —— 一条道具七八代四语言几十行，整页一起拉出来
   * 正文就上百 KB。
   *
   * 一句话版和完整版共用它，语言各挑各的（两列能给出文案的行不是同一批，
   * 见 shortEffectOf），所以 key 里不带语言
   */
  readonly #effectLoader = new DataLoader<number, ItemEffectRow[]>(async (itemIds) => {
    // 同一批 load 都落在这一个 tick 里，下面这些调用会合并成一次 groupBy
    const generations = await Promise.all(itemIds.map((id) => this.#generationsLoader.load(id)));

    const latest = new Map<number, number>();
    itemIds.forEach((id, index) => {
      const last = generations[index]?.at(-1);
      if (last !== undefined) latest.set(id, last);
    });
    if (latest.size === 0) return itemIds.map(() => []);

    const rows = await prisma.itemEffectI18n.findMany({
      where: { OR: [...latest].map(([itemId, generationId]) => ({ itemId, generationId })) },
      select: { itemId: true, languageCode: true, shortEffect: true, effect: true },
    });

    const byItem = new Map<number, ItemEffectRow[]>();
    for (const row of rows) {
      const list = byItem.get(row.itemId);
      if (list) list.push(row);
      else byItem.set(row.itemId, [row]);
    }
    return itemIds.map((id) => byItem.get(id) ?? []);
  });

  /**
   * 一个世代下的版本组，按发售顺序排，版本跟着一起查出来。
   *
   * 按世代做 key 而不是按道具：九个世代就九个 key，一页 20 条道具的
   * 世代集合最多也就这九个，批出来一次查完（同 MoveSource）
   */
  readonly #groupsLoader = new DataLoader<number, GroupRow[]>(async (generationIds) => {
    const rows = await prisma.group.findMany({
      where: { generationId: { in: [...generationIds] } },
      orderBy: { order: "asc" },
      select: {
        generationId: true,
        order: true,
        versions: { orderBy: { id: "asc" }, select: { id: true, slug: true } },
      },
    });

    const byGeneration = new Map<number, GroupRow[]>();
    for (const row of rows) {
      const list = byGeneration.get(row.generationId);
      if (list) list.push(row);
      else byGeneration.set(row.generationId, [row]);
    }
    return generationIds.map((id) => byGeneration.get(id) ?? []);
  });

  /** 登场版本，把版本组摊平。版本组已经按发售顺序排过，摊出来就是发售顺序 */
  readonly #versionsLoader = new DataLoader<number, VersionRow[]>(async (itemIds) => {
    const groups = await Promise.all(itemIds.map((id) => this.#groupsOf(id)));
    return groups.map((list) => list.flatMap((group) => group.versions));
  });

  /**
   * 可用性表。一个版本组一行 —— 库里能给的只有「这条道具在哪些版本里」，
   * 获取方式和可用性两列没有数据（见 ItemAvailability 的 SDL 说明）
   */
  readonly #availabilityLoader = new DataLoader<number, ItemAvailabilityRow[]>(async (itemIds) => {
    const groups = await Promise.all(itemIds.map((id) => this.#groupsOf(id)));
    return groups.map((list) => list.map((group) => ({ versions: group.versions })));
  });

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.itemI18n.findMany({
      where: { itemId: { in: ids } },
      select: { itemId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.itemId, languageCode: r.languageCode, name: r.name }));
  });

  /**
   * 这条道具存在过的每个世代，摊到它下面的每个版本组，按版本组的发售顺序排 ——
   * 跨世代也是同一把尺子（order 是全局的，第一世代 1~4、第二世代 5~6）。
   *
   * 登场版本和可用性表都从它出发，两处共用上面那两个 loader 的缓存
   */
  async #groupsOf(itemId: number): Promise<GroupRow[]> {
    const generations = await this.#generationsLoader.load(itemId);
    const groups = await Promise.all(generations.map((id) => this.#groupsLoader.load(id)));

    return groups.flat().sort((a, b) => a.order - b.order);
  }
}
