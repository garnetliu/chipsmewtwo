import type { ItemSummaryResolvers } from "./../../types.generated";

/**
 * 列表项。库里跟 Item 是同一行，所以走的也是同一批 loader ——
 * 两个类型只是为了在 SDL 上分开能取什么，取数那侧没有第二套实现
 */
export const ItemSummary: ItemSummaryResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.item.nameOf(Number(parent.id), language ?? ctx.language),

  shortEffect: (parent, { language }, ctx) =>
    ctx.dataSources.item.shortEffectOf(Number(parent.id), language ?? ctx.language),

  introducedGeneration: (parent, _arg, ctx) =>
    ctx.dataSources.item.introducedGenerationOf(Number(parent.id)),

  versions: (parent, _arg, ctx) => ctx.dataSources.item.versionsOf(Number(parent.id)),
};
