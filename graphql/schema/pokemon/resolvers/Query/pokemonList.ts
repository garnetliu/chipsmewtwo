import type { QueryResolvers } from "./../../../types.generated";

export const pokemonList: NonNullable<QueryResolvers["pokemonList"]> = async (
  _parent,
  arg,
  ctx,
) => {
  const { offset, limit } = arg;
  const { pokemonDb } = ctx.dataSources;

  const data = await pokemonDb.findPage(offset, limit);

  return { data, offset, limit };
};
