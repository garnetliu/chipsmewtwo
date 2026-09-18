import type { PokemonResolvers } from "./../../types.generated";

/**
 * 物种只剩身份和译名，属性、种族值、图片全在 Form 上。
 *
 * id 和 slug 不用写 —— Query 那边 findOne 返回的对象里就有，
 * GraphQL 默认解析取同名属性。
 *
 * name 和 genus 调的是同一个 nameOf，DataLoader 会把两次调用合并成一次查询；
 * defaultForm 和 forms 同理共用 formsOf
 */
export const Pokemon: PokemonResolvers = {
  name: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemon.nameOf(Number(parent.id), language ?? ctx.language);
    return row?.name ?? null;
  },

  genus: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemon.nameOf(Number(parent.id), language ?? ctx.language);
    return row?.genus ?? null;
  },

  // formsOf 已经把默认形态排在第一位，这里再 find 一次而不是取 [0]：
  // 数据库没约束一个物种只能有一条 isDefault，排序靠不住时宁可返回 null
  defaultForm: async (parent, _args, ctx) => {
    const forms = await ctx.dataSources.form.ofPokemon(parent.id);
    return forms.find((f) => f.isDefault) ?? null;
  },

  forms: (parent, _args, ctx) => ctx.dataSources.form.ofPokemon(parent.id),

  // 下面两个是重字段，详情页才取 —— 进化链要把链上每只都查出来，
  // 登场版本要扫这只全部形态的招式表
  evolutionChain: (parent, _args, ctx) => ctx.dataSources.pokemon.chainOf(Number(parent.id)),

  versions: (parent, _args, ctx) => ctx.dataSources.pokemon.versionsOf(Number(parent.id)),
};
