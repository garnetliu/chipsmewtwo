import { DEFAULT_LANGUAGE, LATEST_GENERATION } from "@/lib/pokemon/defaults";
import { detailImageUrl, fullImageUrl } from "@/lib/pokemon/sprites";

import type { PokemonResolvers } from "./../../types.generated";

/**
 * 每个字段自己拿参数、自己走 DataLoader，缺数据就返回 null。
 *
 * id 和 slug 不用写 —— Query 那边 findOne 返回的对象里就有，
 * GraphQL 默认解析取同名属性。
 *
 * name 和 genus 调的是同一个 nameOf，DataLoader 会把两次调用合并成一次查询。
 */
export const Pokemon: PokemonResolvers = {
  name: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemonDb.nameOf(
      Number(parent.id),
      language ?? DEFAULT_LANGUAGE,
    );
    return row?.name ?? null;
  },

  genus: async (parent, { language }, ctx) => {
    const row = await ctx.dataSources.pokemonDb.nameOf(
      Number(parent.id),
      language ?? DEFAULT_LANGUAGE,
    );
    return row?.genus ?? null;
  },

  // 库里存的是文件名，前缀在 lib/pokemon/sprites.ts。两个字段调同一个
  // DataLoader，一次查询就够
  fullImageUrl: async (parent, _args, ctx) => {
    const images = await ctx.dataSources.pokemonDb.imagesOf(Number(parent.id));
    return images?.fullImage ? fullImageUrl(images.fullImage) : null;
  },

  detailImageUrl: async (parent, _args, ctx) => {
    const images = await ctx.dataSources.pokemonDb.imagesOf(Number(parent.id));
    return images?.detailImage ? detailImageUrl(images.detailImage) : null;
  },

  types: (parent, { generation }, ctx) =>
    ctx.dataSources.pokemonDb.typesOf(Number(parent.id), generation ?? LATEST_GENERATION),

  stats: (parent, { generation }, ctx) =>
    ctx.dataSources.pokemonDb.statsOf(Number(parent.id), generation ?? LATEST_GENERATION),
};
