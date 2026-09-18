import type { ItemResolvers } from "./../../types.generated";

/**
 * 道具详情。id 和 slug 不用写 —— Query 那边查出来的行里就有。
 *
 * name 和 shortEffect 跟 ItemSummary 调的是同一批 loader，
 * DataLoader 会把两处调用合并成一次查询
 */
export const Item: ItemResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.item.nameOf(Number(parent.id), language ?? ctx.language),

  shortEffect: (parent, { language }, ctx) =>
    ctx.dataSources.item.shortEffectOf(Number(parent.id), language ?? ctx.language),

  introducedGeneration: (parent, _arg, ctx) =>
    ctx.dataSources.item.introducedGenerationOf(Number(parent.id)),

  versions: (parent, _arg, ctx) => ctx.dataSources.item.versionsOf(Number(parent.id)),

  // 重字段，详情页才取 —— 一条第一世代的道具摊成 32 行
  availability: (parent, _arg, ctx) => ctx.dataSources.item.availabilityOf(Number(parent.id)),
};
