import { GraphQLError } from "graphql";

import type { QueryResolvers } from "./../../../types.generated";

export const pokemon: NonNullable<QueryResolvers["pokemon"]> = async (_parent, arg, ctx) => {
  const idOrSlug = String(arg.id);
  const { pokemon: pokemonSource } = ctx.dataSources;

  const row = await pokemonSource.findOne(idOrSlug);

  if (!row) {
    throw new GraphQLError(`找不到宝可梦 ${idOrSlug}`, {
      extensions: { code: "NOT_FOUND", idOrSlug },
    });
  }

  return row;
};
