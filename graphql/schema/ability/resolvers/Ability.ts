import type { AbilityResolvers } from "./../../types.generated";

/** id 和 slug 跟着 FormAbility 一起查出来了，只有 name 要单独取译名 */
export const Ability: AbilityResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.pokemonDb.abilityNameOf(Number(parent.id), language ?? ctx.language),
};
