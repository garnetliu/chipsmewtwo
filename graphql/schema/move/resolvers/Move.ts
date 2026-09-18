import type { MoveResolvers } from "./../../types.generated";

/**
 * 招式详情。id 和 slug 不用写 —— Query 那边查出来的行里就有。
 *
 * effect 和 MoveSummary.effect 调的是同一个 effectOf，
 * DataLoader 会把两次调用合并成一次查询
 */
export const Move: MoveResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.move.nameOf(Number(parent.id), language ?? ctx.language),

  effect: (parent, { language }, ctx) =>
    ctx.dataSources.move.effectOf(Number(parent.id), language ?? ctx.language),

  versions: (parent, _arg, ctx) => ctx.dataSources.move.versionsOf(Number(parent.id)),

  // 重字段，详情页才取 —— 一条从第一世代活到现在的招式摊成 32 行
  versionStats: (parent, _arg, ctx) => ctx.dataSources.move.versionStatsOf(Number(parent.id)),
};
