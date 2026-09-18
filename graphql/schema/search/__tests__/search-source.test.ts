import { beforeEach, expect, test, vi } from "vitest";

/**
 * SearchSource 的取数规则。库换成一份假数据 —— 要验的是拿到命中行之后怎么排、
 * 10 个名额怎么分，以及交给库的条件长什么样，这几件事跟真实数据无关。
 *
 * 真实数据的核对走 GraphQL 端点手查，用例里不连库
 */
const prisma = {
  pokemonI18n: { findMany: vi.fn() },
  moveI18n: { findMany: vi.fn() },
  itemI18n: { findMany: vi.fn() },
  abilityI18n: { findMany: vi.fn() },
  pokemon: { findMany: vi.fn() },
  move: { findMany: vi.fn() },
  item: { findMany: vi.fn() },
  ability: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const { SearchSource, firstSentence } = await import("@/graphql/context/search-source");

/** 造 n 条命中行，名字都带上关键词，id 从 1 开始 */
function hits(count: number, key: string, keyword: string) {
  return Array.from({ length: count }, (_, index) => ({
    [`${key}Id`]: index + 1,
    name: `${keyword}${index + 1}`,
  }));
}

/** 基表按 id 给 slug，问什么给什么 */
function slugsFor(key: string) {
  return async ({ where }: { where: { id: { in: number[] } } }) =>
    where.id.in.map((id) => ({ id, slug: `${key}-${id}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.pokemonI18n.findMany.mockResolvedValue([]);
  prisma.moveI18n.findMany.mockResolvedValue([]);
  prisma.itemI18n.findMany.mockResolvedValue([]);
  prisma.abilityI18n.findMany.mockResolvedValue([]);
  prisma.pokemon.findMany.mockImplementation(slugsFor("pokemon"));
  prisma.move.findMany.mockImplementation(slugsFor("move"));
  prisma.item.findMany.mockImplementation(slugsFor("item"));
  prisma.ability.findMany.mockImplementation(slugsFor("ability"));
});

test("四类都命中时名额轮转分，最多 10 条，按类型分组返回", async () => {
  prisma.pokemonI18n.findMany.mockResolvedValue(hits(31, "pokemon", "火"));
  prisma.moveI18n.findMany.mockResolvedValue(hits(24, "move", "火"));
  prisma.itemI18n.findMany.mockResolvedValue(hits(25, "item", "火"));
  prisma.abilityI18n.findMany.mockResolvedValue(hits(5, "ability", "火"));

  const found = await new SearchSource().search("火", "zh-Hans");

  expect(found.map((h) => h.kind)).toEqual([
    "POKEMON",
    "POKEMON",
    "POKEMON",
    "MOVE",
    "MOVE",
    "MOVE",
    "ITEM",
    "ITEM",
    "ABILITY",
    "ABILITY",
  ]);
});

test("某一类候选取完，名额让给别的类，命中不足 10 条就全给", async () => {
  prisma.pokemonI18n.findMany.mockResolvedValue(hits(3, "pokemon", "妙蛙"));
  prisma.itemI18n.findMany.mockResolvedValue(hits(2, "item", "妙蛙"));

  const found = await new SearchSource().search("妙蛙", "zh-Hans");

  expect(found).toEqual([
    { kind: "POKEMON", id: 1, slug: "pokemon-1", name: "妙蛙1" },
    { kind: "POKEMON", id: 2, slug: "pokemon-2", name: "妙蛙2" },
    { kind: "POKEMON", id: 3, slug: "pokemon-3", name: "妙蛙3" },
    { kind: "ITEM", id: 1, slug: "item-1", name: "妙蛙1" },
    { kind: "ITEM", id: 2, slug: "item-2", name: "妙蛙2" },
  ]);
  // 一条都没进名额的类不查 slug
  expect(prisma.move.findMany).not.toHaveBeenCalled();
  expect(prisma.ability.findMany).not.toHaveBeenCalled();
});

test("组内排序：关键词靠前的在前，同位置时完全相同的在前，再同按主键", async () => {
  prisma.moveI18n.findMany.mockResolvedValue([
    { moveId: 7, name: "大火焰" },
    { moveId: 9, name: "火焰弹" },
    { moveId: 5, name: "火焰" },
    { moveId: 3, name: "火焰轮" },
  ]);

  const found = await new SearchSource().search("火焰", "zh-Hans");

  expect(found.map((h) => h.name)).toEqual(["火焰", "火焰轮", "火焰弹", "大火焰"]);
});

test("命中再多也是全部参与排序，不是先截一批再排", async () => {
  // 位置最靠前的那条排在库序最后，截断的话它就被丢了
  prisma.itemI18n.findMany.mockResolvedValue([
    ...Array.from({ length: 200 }, (_, index) => ({ itemId: index + 1, name: `牛奶果汁${index}` })),
    { itemId: 201, name: "果汁牛奶" },
  ]);

  const found = await new SearchSource().search("果", "zh-Hans");

  expect(found[0]).toEqual({ kind: "ITEM", id: 201, slug: "item-201", name: "果汁牛奶" });
  expect(found).toHaveLength(10);
});

test("关键词去掉首尾空白后是空的就不打库", async () => {
  expect(await new SearchSource().search("   ", "zh-Hans")).toEqual([]);
  expect(prisma.pokemonI18n.findMany).not.toHaveBeenCalled();
});

test("只查请求的那种语言，LIKE 的通配符转义掉", async () => {
  await new SearchSource().search("100%_", "ja");

  const { where } = prisma.itemI18n.findMany.mock.calls[0][0];
  expect(where.languageCode).toBe("ja");
  // 不转的话搜一个「%」等于把整张表捞出来
  expect(where.name.contains).toBe("100\\%\\_");
});

test("同一个词搜两次只打一次库", async () => {
  const source = new SearchSource();

  await Promise.all([source.search("火", "zh-Hans"), source.search("火", "zh-Hans")]);

  expect(prisma.pokemonI18n.findMany).toHaveBeenCalledTimes(1);
});

test("首句切到第一个句末标点，英文小数点不算句末", () => {
  expect(firstSentence("攻击目标造成伤害。喷射火焰有10%的几率使目标陷入灼伤状态。")).toBe(
    "攻击目标造成伤害。",
  );
  expect(firstSentence("Held: Restores 1/16 (6.25%) holder’s max HP. Second sentence.")).toBe(
    "Held: Restores 1/16 (6.25%) holder’s max HP.",
  );
  // 整段没有句末标点就整段返回，交给前端截断
  expect(firstSentence("Holds Apricorns")).toBe("Holds Apricorns");
  expect(firstSentence(null)).toBeNull();
  expect(firstSentence("")).toBeNull();
});
