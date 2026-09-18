import type { MoveSummaryResolvers } from "./../../types.generated";

/**
 * 列表项。库里跟 Move 是同一行，所以走的也是同一批 loader ——
 * 两个类型只是为了在 SDL 上分开能取什么，取数那侧没有第二套实现
 */
export const MoveSummary: MoveSummaryResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.move.nameOf(Number(parent.id), language ?? ctx.language),

  effect: (parent, { language }, ctx) =>
    ctx.dataSources.move.effectOf(Number(parent.id), language ?? ctx.language),

  versions: (parent, _arg, ctx) => ctx.dataSources.move.versionsOf(Number(parent.id)),
};
