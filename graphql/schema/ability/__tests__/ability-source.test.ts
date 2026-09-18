import { beforeEach, expect, test, vi } from "vitest";

/**
 * AbilitySource 的取数规则。库换成一份假数据 —— 要验的是拿到行之后怎么收拢
 * （拥有者去重、版本排序），以及一页 20 条会打几次库，这两件事跟真实数据无关。
 *
 * 真实数据的核对走 GraphQL 端点手查，用例里不连库
 */
const prisma = {
  ability: { findMany: vi.fn(), count: vi.fn() },
  abilityI18n: { findMany: vi.fn() },
  abilityEffectI18n: { groupBy: vi.fn(), findMany: vi.fn() },
  formAbility: { findMany: vi.fn() },
  group: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const { AbilitySource } = await import("@/graphql/context/ability-source");

/** 一行 form_ability 查出来的样子，只有 loader 用得上的那几列 */
const owned = (abilityId: number, pokemonId: number, slug: string) => ({
  abilityId,
  form: { pokemon: { id: pokemonId, slug } },
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.ability.findMany.mockResolvedValue([]);
  prisma.ability.count.mockResolvedValue(0);
  prisma.abilityI18n.findMany.mockResolvedValue([]);
  prisma.abilityEffectI18n.groupBy.mockResolvedValue([]);
  prisma.abilityEffectI18n.findMany.mockResolvedValue([]);
  prisma.formAbility.findMany.mockResolvedValue([]);
  prisma.group.findMany.mockResolvedValue([]);
});

test("同一只宝可梦的多个形态、多个世代只算一次，按全国图鉴编号排", async () => {
  prisma.formAbility.findMany.mockResolvedValue([
    // 妙蛙花的超级形态和普通形态各一行，还各自跨了两代
    owned(206, 3, "venusaur"),
    owned(206, 3, "venusaur"),
    owned(206, 1, "bulbasaur"),
    owned(206, 3, "venusaur"),
    owned(206, 2, "ivysaur"),
    owned(206, 1, "bulbasaur"),
  ]);

  const owners = await new AbilitySource().ownersOf(206);

  expect(owners.map((p) => p.slug)).toEqual(["bulbasaur", "ivysaur", "venusaur"]);
});

test("没有宝可梦拥有这条特性时是空数组，不是 null", async () => {
  expect(await new AbilitySource().ownersOf(81)).toEqual([]);
});

test("登场版本只算有效果说明的世代，按版本组的发售顺序排", async () => {
  // 这条特性 Gen6 引入，所以 Gen3 的版本组不该出现
  prisma.abilityEffectI18n.groupBy.mockResolvedValue([
    { abilityId: 2, generationId: 7 },
    { abilityId: 2, generationId: 6 },
  ]);
  prisma.group.findMany.mockResolvedValue([
    {
      generationId: 6,
      versions: [
        { id: 23, slug: "x" },
        { id: 24, slug: "y" },
      ],
    },
    { generationId: 7, versions: [{ id: 27, slug: "sun" }] },
  ]);

  const source = new AbilitySource();

  expect((await source.versionsOf(2)).map((v) => v.slug)).toEqual(["x", "y", "sun"]);
  expect(await source.introducedGenerationOf(2)).toBe(6);
  // 世代集合查一次，引入世代和登场版本共用
  expect(prisma.abilityEffectI18n.groupBy).toHaveBeenCalledTimes(1);
});

test("数据源没收录效果说明时，登场版本是空数组、引入世代是 null", async () => {
  const source = new AbilitySource();

  expect(await source.versionsOf(999)).toEqual([]);
  expect(await source.introducedGenerationOf(999)).toBeNull();
});

test("效果说明取最新一代那一版", async () => {
  prisma.abilityEffectI18n.groupBy.mockResolvedValue([
    { abilityId: 206, generationId: 3 },
    { abilityId: 206, generationId: 9 },
  ]);
  prisma.abilityEffectI18n.findMany.mockResolvedValue([
    { abilityId: 206, languageCode: "zh-Hans", shortEffect: null, effect: "最新一版" },
  ]);

  expect(await new AbilitySource().effectOf(206, "zh-Hans")).toMatchObject({
    shortEffect: null,
    effect: "最新一版",
  });
  expect(prisma.abilityEffectI18n.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { OR: [{ abilityId: 206, generationId: 9 }] } }),
  );
});

test("整页的译名、说明、登场版本都是批量查，不按条数涨", async () => {
  const ids = Array.from({ length: 20 }, (_, i) => i + 1);
  prisma.ability.findMany.mockResolvedValue(ids.map((id) => ({ id, slug: `ability-${id}` })));
  prisma.abilityEffectI18n.groupBy.mockResolvedValue(
    ids.map((id) => ({ abilityId: id, generationId: 9 })),
  );

  const source = new AbilitySource();
  const page = await source.findPage(0, 20);
  await Promise.all([
    ...page.map((row) => source.nameOf(row.id, "zh-Hans")),
    ...page.map((row) => source.effectOf(row.id, "zh-Hans")),
    ...page.map((row) => source.versionsOf(row.id)),
  ]);

  expect(prisma.ability.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.abilityI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.abilityEffectI18n.groupBy).toHaveBeenCalledTimes(1);
  expect(prisma.abilityEffectI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.group.findMany).toHaveBeenCalledTimes(1);
});

test("翻页查出来的行进了 slug 缓存，再按 slug 查同一条不打库", async () => {
  prisma.ability.findMany.mockResolvedValue([{ id: 206, slug: "overgrow" }]);

  const source = new AbilitySource();
  await source.findPage(0, 1);

  expect(await source.findBySlug("overgrow")).toEqual({ id: 206, slug: "overgrow" });
  expect(prisma.ability.findMany).toHaveBeenCalledTimes(1);
});

test("库里没有这个 slug 时返回 null", async () => {
  expect(await new AbilitySource().findBySlug("no-such-ability")).toBeNull();
});
