import { beforeEach, expect, test, vi } from "vitest";

/**
 * MoveSource 的取数规则。库换成一份假数据 —— 要验的是拿到行之后怎么摊开
 * （世代摊到版本组、按发售顺序排），以及一页 20 条会打几次库，
 * 这两件事跟真实数据无关。
 *
 * 真实数据的核对走 GraphQL 端点手查，用例里不连库
 */
const prisma = {
  move: { findMany: vi.fn(), count: vi.fn() },
  moveI18n: { findMany: vi.fn() },
  moveGeneration: { findMany: vi.fn() },
  moveEffectI18n: { groupBy: vi.fn(), findMany: vi.fn() },
  group: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const { MoveSource } = await import("@/graphql/context/move-source");

const fire = { id: 10, slug: "fire", color: "#EE8130" };

/** 一行 move_generation 查出来的样子 */
const stat = (moveId: number, generationId: number, power: number | null) => ({
  moveId,
  generationId,
  damageClass: "SPECIAL" as const,
  power,
  accuracy: 100,
  pp: 15,
  type: fire,
});

/** 一行 group 查出来的样子 */
const group = (generationId: number, order: number, versions: string[]) => ({
  generationId,
  order,
  versions: versions.map((slug, index) => ({ id: order * 10 + index, slug })),
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.move.findMany.mockResolvedValue([]);
  prisma.move.count.mockResolvedValue(0);
  prisma.moveI18n.findMany.mockResolvedValue([]);
  prisma.moveGeneration.findMany.mockResolvedValue([]);
  prisma.moveEffectI18n.groupBy.mockResolvedValue([]);
  prisma.moveEffectI18n.findMany.mockResolvedValue([]);
  prisma.group.findMany.mockResolvedValue([]);
});

test("一个世代摊成它下面的每个版本组，各取该世代的数值，按发售顺序排", async () => {
  prisma.moveGeneration.findMany.mockResolvedValue([stat(271, 1, 95), stat(271, 2, 90)]);
  prisma.group.findMany.mockResolvedValue([
    group(1, 3, ["red", "blue"]),
    group(1, 4, ["yellow"]),
    group(2, 5, ["gold", "silver"]),
  ]);

  const rows = await new MoveSource().versionStatsOf(271);

  expect(rows.map((row) => [row.versions.map((v) => v.slug).join("/"), row.power])).toEqual([
    ["red/blue", 95],
    ["yellow", 95],
    ["gold/silver", 90],
  ]);
  expect(rows[0]?.type).toEqual(fire);
  expect(rows[0]?.category).toBe("SPECIAL");
});

test("招式还没登场的世代没有行，那些版本组不进数值表也不进登场版本", async () => {
  // 第二世代才有的招式
  prisma.moveGeneration.findMany.mockResolvedValue([stat(500, 2, 60)]);
  prisma.group.findMany.mockResolvedValue([group(2, 5, ["gold", "silver"])]);

  const source = new MoveSource();

  expect(await source.versionStatsOf(500)).toHaveLength(1);
  expect((await source.versionsOf(500)).map((v) => v.slug)).toEqual(["gold", "silver"]);
  // 第一世代没问过，批出去的 key 只有它存在的那一代
  expect(prisma.group.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { generationId: { in: [2] } } }),
  );
});

test("数据源没给数值时，数值表和登场版本都是空数组，不是 null", async () => {
  const source = new MoveSource();

  expect(await source.versionStatsOf(686)).toEqual([]);
  expect(await source.versionsOf(686)).toEqual([]);
});

test("变化招式的威力、必中招式的命中原样是 null", async () => {
  prisma.moveGeneration.findMany.mockResolvedValue([
    { ...stat(429, 1, null), accuracy: null, damageClass: "STATUS" as const },
  ]);
  prisma.group.findMany.mockResolvedValue([group(1, 3, ["red", "blue"])]);

  expect(await new MoveSource().versionStatsOf(429)).toMatchObject([
    { power: null, accuracy: null, category: "STATUS" },
  ]);
});

test("说明取最新一代那一版", async () => {
  prisma.moveEffectI18n.groupBy.mockResolvedValue([{ moveId: 271, _max: { generationId: 9 } }]);
  prisma.moveEffectI18n.findMany.mockResolvedValue([
    { moveId: 271, languageCode: "zh-Hans", effect: "最新一版" },
  ]);

  expect(await new MoveSource().effectOf(271, "zh-Hans")).toBe("最新一版");
  expect(prisma.moveEffectI18n.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { OR: [{ moveId: 271, generationId: 9 }] } }),
  );
});

test("这个语言没收录说明时按语言表回退，拿到的是别的语种的文本", async () => {
  prisma.moveEffectI18n.groupBy.mockResolvedValue([{ moveId: 271, _max: { generationId: 9 } }]);
  prisma.moveEffectI18n.findMany.mockResolvedValue([
    { moveId: 271, languageCode: "en", effect: "english only" },
  ]);

  expect(await new MoveSource().effectOf(271, "zh-Hans")).toBe("english only");
});

test("整页的译名、说明、登场版本都是批量查，不按条数涨", async () => {
  const ids = Array.from({ length: 20 }, (_, i) => i + 1);
  prisma.move.findMany.mockResolvedValue(ids.map((id) => ({ id, slug: `move-${id}` })));
  prisma.moveGeneration.findMany.mockResolvedValue(ids.map((id) => stat(id, 1, 50)));
  prisma.moveEffectI18n.groupBy.mockResolvedValue(
    ids.map((id) => ({ moveId: id, _max: { generationId: 1 } })),
  );
  prisma.group.findMany.mockResolvedValue([group(1, 3, ["red", "blue"])]);

  const source = new MoveSource();
  const page = await source.findPage(0, 20, null);
  await Promise.all([
    ...page.map((row) => source.nameOf(row.id, "zh-Hans")),
    ...page.map((row) => source.effectOf(row.id, "zh-Hans")),
    ...page.map((row) => source.versionsOf(row.id)),
  ]);

  expect(prisma.move.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.moveI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.moveGeneration.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.moveEffectI18n.groupBy).toHaveBeenCalledTimes(1);
  expect(prisma.moveEffectI18n.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.group.findMany).toHaveBeenCalledTimes(1);
});

test("登场版本和数值表共用同一批查询", async () => {
  prisma.moveGeneration.findMany.mockResolvedValue([stat(271, 1, 95)]);
  prisma.group.findMany.mockResolvedValue([group(1, 3, ["red", "blue"])]);

  const source = new MoveSource();
  await Promise.all([source.versionsOf(271), source.versionStatsOf(271)]);

  expect(prisma.moveGeneration.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.group.findMany).toHaveBeenCalledTimes(1);
});

test("筛世代时翻页和总数用同一个条件", async () => {
  const source = new MoveSource();
  await Promise.all([source.findPage(0, 20, 1), source.countAll(1)]);

  const introducedInGen1 = {
    generations: { some: { generationId: 1 } },
    NOT: { generations: { some: { generationId: { lt: 1 } } } },
  };
  expect(prisma.move.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: introducedInGen1 }),
  );
  expect(prisma.move.count).toHaveBeenCalledWith({ where: introducedInGen1 });
});

test("不筛世代时条件是空的，总数是全量", async () => {
  await new MoveSource().countAll(null);

  expect(prisma.move.count).toHaveBeenCalledWith({ where: {} });
});

test("翻页查出来的行进了 slug 缓存，再按 slug 查同一条不打库", async () => {
  prisma.move.findMany.mockResolvedValue([{ id: 271, slug: "flamethrower" }]);

  const source = new MoveSource();
  await source.findPage(0, 1, null);

  expect(await source.findBySlug("flamethrower")).toEqual({ id: 271, slug: "flamethrower" });
  expect(prisma.move.findMany).toHaveBeenCalledTimes(1);
});

test("库里没有这个 slug 时返回 null", async () => {
  expect(await new MoveSource().findBySlug("no-such-move")).toBeNull();
});
