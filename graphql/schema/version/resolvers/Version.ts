import type { VersionResolvers } from "./../../types.generated";

/** id 和 slug 跟着图鉴说明一起查出来了，只有 name 要单独取译名 */
export const Version: VersionResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.pokemonDb.versionNameOf(Number(parent.id), language ?? ctx.language),
};
