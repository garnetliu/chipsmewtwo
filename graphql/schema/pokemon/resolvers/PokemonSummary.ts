import type { PokemonSummaryResolvers } from "./../../types.generated";

/**
 * 列表项。库里跟 Pokemon 是同一行，所以走的也是同一批 loader ——
 * 两个类型只是为了在 SDL 上分开能取什么，取数那侧没有第二套实现。
 *
 * id 和 slug 不用写，查出来的行里就有
 */
export const PokemonSummary: PokemonSummaryResolvers = {
  name: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemon.nameOf(Number(parent.id), language ?? ctx.language);
    return row?.name ?? null;
  },

  genus: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemon.nameOf(Number(parent.id), language ?? ctx.language);
    return row?.genus ?? null;
  },

  // 取法和 Pokemon.defaultForm 一样：排序靠不住时宁可返回 null
  defaultForm: async (parent, _args, ctx) => {
    const forms = await ctx.dataSources.form.ofPokemon(parent.id);
    return forms.find((f) => f.isDefault) ?? null;
  },

  versions: (parent, _args, ctx) => ctx.dataSources.pokemon.versionsOf(Number(parent.id)),
};
