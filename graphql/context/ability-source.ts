/**
 * 特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormSource），
 * 这里管特性本身：身份、译名、效果说明、翻页，以及反查拥有它的宝可梦。
 *
 * 必须每个请求新建实例，理由同 PokemonSource。返回的都是库里的行，字段名即列名
 */
import DataLoader from "dataloader";

import { createNameLoader, pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type { Ability, AbilityEffectI18n } from "@/prisma/generated/client";

import type { PokemonRow } from "./pokemon-source";
import type { VersionRow } from "./version-source";

export type AbilityRow = Ability;

/** 效果说明。一句话版数据源只给了英法德，中文那一版是 null */
export type AbilityEffectRow = Pick<AbilityEffectI18n, "shortEffect" | "effect">;

type PageKey = { offset: number; limit: number };
type EffectKey = { abilityId: number; language: string };

export class AbilitySource {
  /** 按英文 slug 找一条。/ability/[name] 路由传的就是 slug */
  findBySlug(slug: string): Promise<AbilityRow | null> {
    return this.#bySlugLoader.load(slug);
  }

  /** 按英文标识的字母序翻页 —— ability.id 就是按 slug 灌进去的，用它排等价且有索引 */
  findPage(offset: number, limit: number): Promise<AbilityRow[]> {
    return this.#pageLoader.load({ offset, limit });
  }

  /**
   * 一共多少条，翻页算总页数用。特性列表没有筛选条件，总数只有一个，
   * 记住这一个 promise 就够了 —— 换成 DataLoader 也只是同样的记忆化
   */
  countAll(): Promise<number> {
    return (this.#total ??= prisma.ability.count());
  }

  /** 特性译名，例如「引火」 */
  nameOf(abilityId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: abilityId, language });
  }

  /**
   * 最新一版的效果说明。说明按世代存（蓄电 Gen4 起才改成吸引电系招式），
   * 展示的是现在的行为，所以取这条特性有说明的最后一代。
   * shortEffect 和 effect 两个字段调它，DataLoader 会合并成一次查询
   */
  effectOf(abilityId: number, language: string): Promise<AbilityEffectRow | null> {
    return this.#effectLoader.load({ abilityId, language });
  }

  /** 第几代引入 —— 最早有效果说明的那一代。数据源没收录说明时是 null */
  async introducedGenerationOf(abilityId: number): Promise<number | null> {
    const generations = await this.#generationsLoader.load(abilityId);
    return generations[0] ?? null;
  }

  /** 这条特性登场过的游戏版本，按发售顺序排 */
  versionsOf(abilityId: number): Promise<VersionRow[]> {
    return this.#versionsLoader.load(abilityId);
  }

  /** 拥有这条特性的宝可梦，按全国图鉴编号排，同一只只出现一次 */
  ownersOf(abilityId: number): Promise<PokemonRow[]> {
    return this.#ownersLoader.load(abilityId);
  }

  // ── DataLoader ──────────────────────────────────────────────

  #total: Promise<number> | null = null;

  readonly #bySlugLoader = new DataLoader<string, AbilityRow | null>(async (slugs) => {
    const rows = await prisma.ability.findMany({
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
  readonly #pageLoader = new DataLoader<PageKey, AbilityRow[], string>(
    async (keys) =>
      Promise.all(
        keys.map(async ({ offset, limit }) => {
          const rows = await prisma.ability.findMany({
            orderBy: { id: "asc" },
            skip: offset,
            take: limit,
            select: { id: true, slug: true },
          });

          for (const row of rows) this.#bySlugLoader.prime(row.slug, row);
          return rows;
        }),
      ),
    { cacheKeyFn: (k) => `${k.offset}:${k.limit}` },
  );

  /**
   * 这条特性在哪些世代存在过，升序。
   *
   * 取自效果说明表而不是 form_ability：后者的世代是拿形态现在的特性摊到它
   * 存在过的每一代的，超级凯罗斯在里面从 Gen3 就带着「飞行皮肤」，
   * 而那条特性 Gen6 才有。效果说明表的世代跟着说明本身走，引入前的世代没有行。
   *
   * 引入世代、登场版本、效果说明三处都要这份世代集合，所以单拎出来一个 loader
   */
  readonly #generationsLoader = new DataLoader<number, number[]>(async (abilityIds) => {
    const rows = await prisma.abilityEffectI18n.groupBy({
      by: ["abilityId", "generationId"],
      where: { abilityId: { in: [...abilityIds] } },
    });

    const byAbility = new Map<number, number[]>();
    for (const row of rows) {
      const list = byAbility.get(row.abilityId);
      if (list) list.push(row.generationId);
      else byAbility.set(row.abilityId, [row.generationId]);
    }
    return abilityIds.map((id) => (byAbility.get(id) ?? []).sort((a, b) => a - b));
  });

  /**
   * 效果说明。先问出每条特性最后一代是哪一代，再只查那一代的行 ——
   * 一条特性七代十语言几十行，整页一起拉出来光 effect 的正文就上百 KB。
   *
   * 那一代的几条译文里挑语言，规则同译名
   */
  readonly #effectLoader = new DataLoader<EffectKey, AbilityEffectRow | null, string>(
    async (keys) => {
      const abilityIds = [...new Set(keys.map((k) => k.abilityId))];
      // 同一批 load 都落在这一个 tick 里，下面这些调用会合并成一次 groupBy
      const generations = await Promise.all(
        abilityIds.map((id) => this.#generationsLoader.load(id)),
      );

      const latest = new Map<number, number>();
      abilityIds.forEach((id, index) => {
        const last = generations[index]?.at(-1);
        if (last !== undefined) latest.set(id, last);
      });
      if (latest.size === 0) return keys.map(() => null);

      const rows = await prisma.abilityEffectI18n.findMany({
        where: {
          OR: [...latest].map(([abilityId, generationId]) => ({ abilityId, generationId })),
        },
        select: { abilityId: true, languageCode: true, shortEffect: true, effect: true },
      });

      const byAbility = new Map<number, typeof rows>();
      for (const row of rows) {
        const list = byAbility.get(row.abilityId);
        if (list) list.push(row);
        else byAbility.set(row.abilityId, [row]);
      }
      return keys.map((k) => pickByLanguage(byAbility.get(k.abilityId) ?? [], k.language));
    },
    { cacheKeyFn: (k) => `${k.abilityId}:${k.language}` },
  );

  /**
   * 登场版本。库里没有「这条特性在哪些版本里」这张表 —— 效果说明是按世代存的，
   * 某一代有它的说明，它在那一代的游戏里就存在。世代下面挂版本组，版本组下面挂版本。
   *
   * 版本组按发售顺序查出来，照它的顺序挑，出来就是发售顺序（同 PokemonSource.versionsOf）
   */
  readonly #versionsLoader = new DataLoader<number, VersionRow[]>(async (abilityIds) => {
    const generations = await Promise.all(abilityIds.map((id) => this.#generationsLoader.load(id)));

    const allGenerations = [...new Set(generations.flat())];
    if (allGenerations.length === 0) return abilityIds.map(() => []);

    const groups = await prisma.group.findMany({
      where: { generationId: { in: allGenerations } },
      orderBy: { order: "asc" },
      select: {
        generationId: true,
        versions: { orderBy: { id: "asc" }, select: { id: true, slug: true } },
      },
    });

    return generations.map((owned) => {
      const set = new Set(owned);
      return groups.filter((g) => set.has(g.generationId)).flatMap((g) => g.versions);
    });
  });

  /**
   * 拥有这条特性的宝可梦。form_ability 是形态 × 世代 × 槽位的，同一只宝可梦
   * 会因为多个形态、多个世代出现很多行（茂盛 148 行、只有 29 只宝可梦），
   * 所以在这里按物种去重 —— 详情页展示的是物种卡片，同一只出现两次没有意义。
   *
   * 去重放应用层而不是 SQL 的 distinct：要去的是关联表另一端的 pokemonId，
   * Prisma 的 distinct 只认本表的列。一条特性最多两百多行，拉回来再收拢很便宜。
   * 排序也在这里做，按全国图鉴编号，跟列表页的顺序一致
   */
  readonly #ownersLoader = new DataLoader<number, PokemonRow[]>(async (abilityIds) => {
    const rows = await prisma.formAbility.findMany({
      where: { abilityId: { in: [...abilityIds] } },
      select: {
        abilityId: true,
        form: { select: { pokemon: { select: { id: true, slug: true } } } },
      },
    });

    const byAbility = new Map<number, Map<number, PokemonRow>>();
    for (const row of rows) {
      let owners = byAbility.get(row.abilityId);
      if (!owners) {
        owners = new Map();
        byAbility.set(row.abilityId, owners);
      }
      owners.set(row.form.pokemon.id, row.form.pokemon);
    }

    return abilityIds.map((id) =>
      [...(byAbility.get(id)?.values() ?? [])].sort((a, b) => a.id - b.id),
    );
  });

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.abilityI18n.findMany({
      where: { abilityId: { in: ids } },
      select: { abilityId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.abilityId, languageCode: r.languageCode, name: r.name }));
  });
}
