import type { AbilityResolvers } from "./../../types.generated";

/**
 * 特性详情。id 和 slug 不用写 —— Query 那边查出来的行里就有，
 * 跟着 FormAbility 一起 join 出来的也一样。
 *
 * effect 和 AbilitySummary.shortEffect 调的是同一个 effectOf，
 * DataLoader 会把两次调用合并成一次查询
 */
export const Ability: AbilityResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.ability.nameOf(Number(parent.id), language ?? ctx.language),

  effect: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.ability.effectOf(Number(parent.id), language ?? ctx.language);
    return row?.effect ?? null;
  },

  introducedGeneration: (parent, _arg, ctx) =>
    ctx.dataSources.ability.introducedGenerationOf(Number(parent.id)),

  versions: (parent, _arg, ctx) => ctx.dataSources.ability.versionsOf(Number(parent.id)),

  // 重字段，详情页才取 —— 要扫这条特性在 form_ability 里的全部行
  pokemon: (parent, _arg, ctx) => ctx.dataSources.ability.ownersOf(Number(parent.id)),
};
