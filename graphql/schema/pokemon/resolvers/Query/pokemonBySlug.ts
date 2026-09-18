import type { QueryResolvers } from "./../../../types.generated";

/** 查不到返回 null，理由同 Query.pokemon */
export const pokemonBySlug: NonNullable<QueryResolvers["pokemonBySlug"]> = (_parent, arg, ctx) =>
  ctx.dataSources.pokemon.findBySlug(arg.slug);
