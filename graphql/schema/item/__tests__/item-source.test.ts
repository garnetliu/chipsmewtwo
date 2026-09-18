import { beforeEach, expect, test, vi } from "vitest";

/**
 * ItemSource 的取数规则。库换成一份假数据 —— 要验的是拿到行之后怎么收拢
 * （版本组排序、空说明归一成 null），以及一页 20 条会打几次库，这两件事跟真实数据无关。
 *
 * 真实数据的核对走 GraphQL 端点手查，用例里不连库
 */
const prisma = {
  item: { findMany: vi.fn(), count: vi.fn() },
  itemI18n: { findMany: vi.fn() },
  itemEffectI18n: { groupBy: vi.fn(), findMany: vi.fn() },
  group: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const { ItemSource } = await import("@/graphql/context/item-source");

beforeEach(() => {
  vi.clearAllMocks();
  prisma.item.findMany.mockResolvedValue([]);
  prisma.item.count.mockResolvedValue(0);
  prisma.itemI18n.findMany.mockResolvedValue([]);
  prisma.itemEffectI18n.groupBy.mockResolvedValue([]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([]);
  prisma.group.findMany.mockResolvedValue([]);
});

test("登场版本只算有说明的世代，按版本组的发售顺序排", async () => {
  // 这条道具第二世代引入，所以第一世代的版本组不该出现
  prisma.itemEffectI18n.groupBy.mockResolvedValue([
    { itemId: 234, generationId: 3 },
    { itemId: 234, generationId: 2 },
  ]);
  prisma.group.findMany.mockImplementation(({ where }) =>
    [
      { generationId: 2, order: 5, versions: [{ id: 4, slug: "gold" }] },
      { generationId: 3, order: 7, versions: [{ id: 7, slug: "ruby" }] },
    ].filter((g) => where.generationId.in.includes(g.generationId)),
  );

  const source = new ItemSource();

  expect((await source.versionsOf(234)).map((v) => v.slug)).toEqual(["gold", "ruby"]);
  expect(await source.introducedGenerationOf(234)).toBe(2);
  // 世代集合查一次，引入世代和登场版本共用
  expect(prisma.itemEffectI18n.groupBy).toHaveBeenCalledTimes(1);
});

test("可用性表一个版本组一行，获取方式和可用性不在行里", async () => {
  prisma.itemEffectI18n.groupBy.mockResolvedValue([{ itemId: 234, generationId: 1 }]);
  prisma.group.findMany.mockResolvedValue([
    {
      generationId: 1,
      order: 3,
      versions: [
        { id: 1, slug: "red" },
        { id: 2, slug: "blue" },
      ],
    },
    { generationId: 1, order: 4, versions: [{ id: 3, slug: "yellow" }] },
  ]);

  const rows = await new ItemSource().availabilityOf(234);

  expect(rows).toEqual([
    {
      versions: [
        { id: 1, slug: "red" },
        { id: 2, slug: "blue" },
      ],
    },
    { versions: [{ id: 3, slug: "yellow" }] },
  ]);
});

test("数据源没收录说明时，登场版本和可用性表都是空数组、引入世代是 null", async () => {
  const source = new ItemSource();

  expect(await source.versionsOf(999)).toEqual([]);
  expect(await source.availabilityOf(999)).toEqual([]);
  expect(await source.introducedGenerationOf(999)).toBeNull();
});

test("说明取最新一代那一版", async () => {
  prisma.itemEffectI18n.groupBy.mockResolvedValue([
    { itemId: 234, generationId: 2 },
    { itemId: 234, generationId: 9 },
  ]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([
    { itemId: 234, languageCode: "en", shortEffect: "最新一版" },
  ]);

  expect(await new ItemSource().shortEffectOf(234, "zh-Hans")).toBe("最新一版");
  expect(prisma.itemEffectI18n.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { OR: [{ itemId: 234, generationId: 9 }] } }),
  );
});

test("说明行在但一句话版是 NULL 时给 null", async () => {
  prisma.itemEffectI18n.groupBy.mockResolvedValue([{ itemId: 96, generationId: 9 }]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([
    { itemId: 96, languageCode: "en", shortEffect: null },
  ]);

  expect(await new ItemSource().shortEffectOf(96, "zh-Hans")).toBeNull();
});

test("简中行在但一句话版是空的，落到有文案的英文行", async () => {
  // 库里每条道具的简中行都在，shortEffect 那一列却一列没填。只按语言挑会挑中
  // 简中行拿到 null，一句话说明就几乎永远是 null
  prisma.itemEffectI18n.groupBy.mockResolvedValue([{ itemId: 234, generationId: 9 }]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([
    { itemId: 234, languageCode: "en", shortEffect: "Held: Heals the holder.", effect: "Held" },
    { itemId: 234, languageCode: "zh-Hans", shortEffect: null, effect: "携带后每回合回复体力。" },
  ]);

  const source = new ItemSource();

  expect(await source.shortEffectOf(234, "zh-Hans")).toBe("Held: Heals the holder.");
  // 完整说明简中有，就还是给简中
  expect(await source.effectOf(234, "zh-Hans")).toBe("携带后每回合回复体力。");
  // 两个字段共用一次查询
  expect(prisma.itemEffectI18n.findMany).toHaveBeenCalledTimes(1);
});

test("完整说明简中没有时也落英文，两列都没文案才给 null", async () => {
  prisma.itemEffectI18n.groupBy.mockResolvedValue([{ itemId: 96, generationId: 9 }]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([
    { itemId: 96, languageCode: "en", shortEffect: null, effect: "Holds Apricorns." },
    { itemId: 96, languageCode: "zh-Hans", shortEffect: null, effect: "" },
  ]);

  const source = new ItemSource();

  expect(await source.effectOf(96, "zh-Hans")).toBe("Holds Apricorns.");
  expect(await source.shortEffectOf(96, "zh-Hans")).toBeNull();
});

test("说明是空字符串时也给 null，不把空字符串透出去", async () => {
  prisma.itemEffectI18n.groupBy.mockResolvedValue([{ itemId: 96, generationId: 9 }]);
  prisma.itemEffectI18n.findMany.mockResolvedValue([
    { itemId: 96, languageCode: "en", shortEffect: "" },
  ]);

  expect(await new ItemSource().shortEffectOf(96, "zh-Hans")).toBeNull();
});

test("整页的译名、说明、登场版本都是批量查，不按条数涨", async () => {
  const ids = Array.from({ length: 20 }, (_, i) => i + 1);
  prisma.item.findMany.mockResolvedValue(ids.map((id) => ({ id, slug: `item-${id}` })));
  prisma.itemEffectI18n.groupBy.mockResolvedValue(
    ids.map((id) => ({ itemId: id, generationId: 9 })),
  );

  const source = new ItemSource();
  const page = await source.findPage(0, 20, null);
  await Promise.all([
    ...page.map((row) => source.nameOf(row.id, "zh-Hans")),
    ...page.map((row) => source.shortEffectOf(row.id, "zh-Hans")),
    ...page.map((row) => source.versionsOf(row.id)),
    ...page.map((row) => source.introducedGenerationOf(row.id)),
  ]);

  expect(prisma.item.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.itemI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.itemEffectI18n.groupBy).toHaveBeenCalledTimes(1);
  expect(prisma.itemEffectI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.group.findMany).toHaveBeenCalledTimes(1);
});

test("翻页按 slug 排 —— item.id 是数据源编号，不是字母序", async () => {
  await new ItemSource().findPage(0, 20, null);

  expect(prisma.item.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ orderBy: { slug: "asc" } }),
  );
});

test("按世代筛的是「这一代有说明、更早的世代没有」", async () => {
  await new ItemSource().findPage(0, 20, 2);

  expect(prisma.item.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        effects: { some: { generationId: 2 } },
        NOT: { effects: { some: { generationId: { lt: 2 } } } },
      },
    }),
  );
});

test("翻页查出来的行进了 slug 缓存，再按 slug 查同一条不打库", async () => {
  prisma.item.findMany.mockResolvedValue([{ id: 234, slug: "leftovers" }]);

  const source = new ItemSource();
  await source.findPage(0, 1, null);

  expect(await source.findBySlug("leftovers")).toEqual({ id: 234, slug: "leftovers" });
  expect(prisma.item.findMany).toHaveBeenCalledTimes(1);
});

test("库里没有这个 slug 时返回 null", async () => {
  expect(await new ItemSource().findBySlug("no-such-item")).toBeNull();
});
