/**
 * 招式。哪只宝可梦怎么学会它存在 move_learn 里（六十多万行，这里不碰），
 * 这里管招式本身：身份、译名、效果说明、翻页，以及按版本组摊开的数值表。
 *
 * 必须每个请求新建实例，理由同 PokemonSource。返回的都是库里的行，字段名即列名
 */
import DataLoader from "dataloader";

import { createNameLoader, pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type { Move, MoveCategory, Prisma } from "@/prisma/generated/client";

import type { TypeRow } from "./type-source";
import type { VersionRow } from "./version-source";

export type MoveRow = Move;

/** 一个版本组一行。版本、属性都是查数值时一起 join 出来的 */
export type MoveVersionStatRow = {
  /** 这个版本组包含的版本。红/蓝是两条，黄单独一条，库里最多两条 */
  versions: VersionRow[];
  type: TypeRow;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

/** 库里的一行 move_generation，外加属性那几列 */
type StatRow = {
  generationId: number;
  damageClass: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: TypeRow;
};

/** 版本组，摊数值表和算登场版本都用它。order 是发售顺序 */
type GroupRow = { order: number; versions: VersionRow[] };

/** null 是不筛，取全量 */
type Generation = number | null;

type PageKey = { offset: number; limit: number; generation: Generation };
type EffectKey = { moveId: number; language: string };

/**
 * 「这条招式是第几代新增的」的筛选条件。
 *
 * 库里没有这一列 —— 数值表是按世代存的，一条招式从登场那一代起每代一行
 * （4925 行里没有一条是断开的），所以「最早有数值行的那一代」就是它新增的世代。
 * 写成「这一代有行」且「更早的世代没有行」，不用 group by min() 就能进 where，
 * 翻页和 count 共用，同 PokemonSource 的 introducedIn
 */
function introducedIn(generation: Generation): Prisma.MoveWhereInput {
  if (generation === null) return {};

  return {
    generations: { some: { generationId: generation } },
    NOT: { generations: { some: { generationId: { lt: generation } } } },
  };
}

export class MoveSource {
  /** 按英文 slug 找一条。/move/[name] 路由传的就是 slug */
  findBySlug(slug: string): Promise<MoveRow | null> {
    return this.#bySlugLoader.load(slug);
  }

  /**
   * 按英文标识的字母序翻页 —— move.id 就是按 slug 灌进去的（1 是
   * 10-000-000-volt-thunderbolt，937 是 zippy-zap），用它排等价且有索引。
   * generation 给了就只翻那一代新增的
   */
  findPage(offset: number, limit: number, generation: Generation): Promise<MoveRow[]> {
    return this.#pageLoader.load({ offset, limit, generation });
  }

  /** 这个筛选条件下一共多少条，翻页算总页数用 */
  countAll(generation: Generation): Promise<number> {
    // DataLoader 不收 null 当 key，不筛世代换成 "all"
    return this.#countLoader.load(generation ?? "all");
  }

  /** 招式译名，例如「喷射火焰」 */
  nameOf(moveId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: moveId, language });
  }

  /**
   * 最新一版的完整效果说明。说明按世代存，展示的是现在的行为，
   * 所以取这条招式有说明的最后一代
   */
  effectOf(moveId: number, language: string): Promise<string | null> {
    return this.#effectLoader.load({ moveId, language });
  }

  /** 这条招式登场过的游戏版本，按发售顺序排 */
  versionsOf(moveId: number): Promise<VersionRow[]> {
    return this.#versionsLoader.load(moveId);
  }

  /** 按版本组分行的数值表，按发售顺序排 */
  versionStatsOf(moveId: number): Promise<MoveVersionStatRow[]> {
    return this.#versionStatsLoader.load(moveId);
  }

  // ── DataLoader ──────────────────────────────────────────────

  readonly #bySlugLoader = new DataLoader<string, MoveRow | null>(async (slugs) => {
    const rows = await prisma.move.findMany({
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
  readonly #pageLoader = new DataLoader<PageKey, MoveRow[], string>(
    async (keys) =>
      Promise.all(
        keys.map(async ({ offset, limit, generation }) => {
          const rows = await prisma.move.findMany({
            where: introducedIn(generation),
            orderBy: { id: "asc" },
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
   * 用 DataLoader 是图它的请求级缓存，一次查询里几个 moveList 只数一次
   */
  readonly #countLoader = new DataLoader<number | "all", number>(async (keys) =>
    Promise.all(
      keys.map((key) => prisma.move.count({ where: introducedIn(key === "all" ? null : key) })),
    ),
  );

  /**
   * 这条招式每一代的数值，按世代升序。主键是 (moveId, generationId)，
   * 一条招式最多 9 行，整页 20 条也就一两百行。
   *
   * 数值表、登场版本、「第几代新增的」三处都要这份行，所以只有这一个 loader；
   * 属性跟着一起查出来，数值表那一列不用再回库
   */
  readonly #statsLoader = new DataLoader<number, StatRow[]>(async (moveIds) => {
    const rows = await prisma.moveGeneration.findMany({
      where: { moveId: { in: [...moveIds] } },
      orderBy: { generationId: "asc" },
      select: {
        moveId: true,
        generationId: true,
        damageClass: true,
        power: true,
        accuracy: true,
        pp: true,
        type: { select: { id: true, slug: true, color: true } },
      },
    });

    const byMove = new Map<number, StatRow[]>();
    for (const row of rows) {
      const list = byMove.get(row.moveId);
      if (list) list.push(row);
      else byMove.set(row.moveId, [row]);
    }
    return moveIds.map((id) => byMove.get(id) ?? []);
  });

  /**
   * 一个世代下的版本组，按发售顺序排，版本跟着一起查出来。
   *
   * 按世代做 key 而不是按招式：九个世代就九个 key，一页 20 条招式的
   * 世代集合最多也就这九个，批出来一次查完
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

  /**
   * 效果说明。先问出每条招式最后一代是哪一代，再只查那一代的行 ——
   * 一条招式九代四语言几十行，整页一起拉出来正文就上百 KB。
   *
   * 那一代的几条译文里挑语言，规则同译名。简中的 shortEffect 一行都没有
   * （4432 行全空），所以列表和详情用的都是完整版 effect
   */
  readonly #effectLoader = new DataLoader<EffectKey, string | null, string>(
    async (keys) => {
      const moveIds = [...new Set(keys.map((k) => k.moveId))];

      const latest = await prisma.moveEffectI18n.groupBy({
        by: ["moveId"],
        where: { moveId: { in: moveIds } },
        _max: { generationId: true },
      });

      const pairs = latest.flatMap((row) =>
        row._max.generationId === null
          ? []
          : [{ moveId: row.moveId, generationId: row._max.generationId }],
      );
      if (pairs.length === 0) return keys.map(() => null);

      const rows = await prisma.moveEffectI18n.findMany({
        where: { OR: pairs },
        select: { moveId: true, languageCode: true, effect: true },
      });

      const byMove = new Map<number, typeof rows>();
      for (const row of rows) {
        const list = byMove.get(row.moveId);
        if (list) list.push(row);
        else byMove.set(row.moveId, [row]);
      }
      return keys.map(
        (k) => pickByLanguage(byMove.get(k.moveId) ?? [], k.language)?.effect ?? null,
      );
    },
    { cacheKeyFn: (k) => `${k.moveId}:${k.language}` },
  );

  /**
   * 登场版本。库里没有「这条招式在哪些版本里」这张表 —— 数值是按世代存的，
   * 某一代有它的数值，它在那一代的游戏里就存在。世代下面挂版本组，版本组下面挂版本。
   *
   * 版本组自带发售顺序，摊平前按它排一次，出来就是发售顺序
   */
  readonly #versionsLoader = new DataLoader<number, VersionRow[]>(async (moveIds) => {
    const rows = await Promise.all(moveIds.map((id) => this.#rowsOf(id)));
    return rows.map((list) => list.flatMap(({ group }) => group.versions));
  });

  /**
   * 数值表。一个世代摊到它下面的每个版本组，数值取该世代那一行 ——
   * 第一世代的四个版本组（日版红/绿、日版蓝、红/蓝、黄）各一行，值都是第一世代的。
   *
   * 招式还没登场的世代在 move_generation 里没有行，所以那些版本组不会进来
   */
  readonly #versionStatsLoader = new DataLoader<number, MoveVersionStatRow[]>(async (moveIds) => {
    const rows = await Promise.all(moveIds.map((id) => this.#rowsOf(id)));

    return rows.map((list) =>
      list.map(({ stat, group }) => ({
        versions: group.versions,
        type: stat.type,
        category: stat.damageClass,
        power: stat.power,
        accuracy: stat.accuracy,
        pp: stat.pp,
      })),
    );
  });

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.moveI18n.findMany({
      where: { moveId: { in: ids } },
      select: { moveId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.moveId, languageCode: r.languageCode, name: r.name }));
  });

  /**
   * 数值表的行：这条招式存在过的每个世代，摊到它下面的每个版本组，
   * 一个版本组一行，数值是该世代那一行的。按版本组的发售顺序排 ——
   * 跨世代也是同一把尺子（order 是全局的，第一世代 1~4、第二世代 5~6）。
   *
   * 登场版本和数值表都从它出发，两处共用上面那两个 loader 的缓存
   */
  async #rowsOf(moveId: number): Promise<{ stat: StatRow; group: GroupRow }[]> {
    const stats = await this.#statsLoader.load(moveId);
    const groups = await Promise.all(
      stats.map((stat) => this.#groupsLoader.load(stat.generationId)),
    );

    return stats
      .flatMap((stat, index) => (groups[index] ?? []).map((group) => ({ stat, group })))
      .sort((a, b) => a.group.order - b.group.order);
  }
}
