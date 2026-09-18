import type { AbilitySummaryResolvers } from "./../../types.generated";

/**
 * 列表项。库里跟 Ability 是同一行，所以走的也是同一批 loader ——
 * 两个类型只是为了在 SDL 上分开能取什么，取数那侧没有第二套实现
 */
export const AbilitySummary: AbilitySummaryResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.ability.nameOf(Number(parent.id), language ?? ctx.language),

  shortEffect: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.ability.effectOf(Number(parent.id), language ?? ctx.language);
    return row?.shortEffect ?? null;
  },

  versions: (parent, _arg, ctx) => ctx.dataSources.ability.versionsOf(Number(parent.id)),
};
