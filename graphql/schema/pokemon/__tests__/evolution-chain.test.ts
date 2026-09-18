import { expect, test } from "vitest";

// pokemon-source.ts 一路 import 到 lib/prisma，那边没有连接串就直接抛错。
// 排序是纯函数，不打库，给个占位值让模块加载得起来就行（PrismaClient 不会预连接）
process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";

const { orderEvolutionChain } = await import("@/graphql/context/pokemon-source");

/** 形态 id 跟全国编号不是一回事，用例里特意错开，免得排序碰巧靠形态 id 也对 */
const member = (formId: number, id: number, slug: string) => ({
  formId,
  pokemon: { id, slug },
});

test("直链按进化顺序排，跟传进来的顺序无关", () => {
  const members = [member(26, 3, "venusaur"), member(24, 1, "bulbasaur"), member(25, 2, "ivysaur")];
  const edges = [
    { fromFormId: 25, toFormId: 26 },
    { fromFormId: 24, toFormId: 25 },
  ];

  expect(orderEvolutionChain(members, edges).map((p) => p.slug)).toEqual([
    "bulbasaur",
    "ivysaur",
    "venusaur",
  ]);
});

test("分叉按全国图鉴编号排，链头在最前", () => {
  const members = [
    member(700, 700, "sylveon"),
    member(133, 133, "eevee"),
    member(196, 196, "espeon"),
    member(134, 134, "vaporeon"),
  ];
  const edges = [
    { fromFormId: 133, toFormId: 700 },
    { fromFormId: 133, toFormId: 196 },
    { fromFormId: 133, toFormId: 134 },
  ];

  expect(orderEvolutionChain(members, edges).map((p) => p.id)).toEqual([133, 134, 196, 700]);
});

test("同一对形态在多个版本组各有一行，不会重复输出", () => {
  const members = [member(24, 1, "bulbasaur"), member(25, 2, "ivysaur")];
  const edges = [
    { fromFormId: 24, toFormId: 25 },
    { fromFormId: 24, toFormId: 25 },
  ];

  expect(orderEvolutionChain(members, edges).map((p) => p.slug)).toEqual(["bulbasaur", "ivysaur"]);
});

test("一个物种的两个形态都在链上时只出现一次", () => {
  const members = [
    member(37, 10, "caterpie"),
    // 同一个物种的另一个形态，进化链是物种级展示，不该连着出现两次
    member(38, 10, "caterpie"),
    member(39, 11, "metapod"),
  ];
  const edges = [
    { fromFormId: 37, toFormId: 39 },
    { fromFormId: 38, toFormId: 39 },
  ];

  expect(orderEvolutionChain(members, edges).map((p) => p.slug)).toEqual(["caterpie", "metapod"]);
});

test("没有进化关系时按原样返回，不丢条目", () => {
  const members = [member(41, 151, "mew")];

  expect(orderEvolutionChain(members, []).map((p) => p.slug)).toEqual(["mew"]);
});

test("进化关系成环（数据出错）时也不丢条目", () => {
  const members = [member(1, 1, "a"), member(2, 2, "b")];
  const edges = [
    { fromFormId: 1, toFormId: 2 },
    { fromFormId: 2, toFormId: 1 },
  ];

  expect(orderEvolutionChain(members, edges).map((p) => p.slug)).toEqual(["a", "b"]);
});
