import type { QueryResolvers } from "./../../../types.generated";

export const abilityList: NonNullable<QueryResolvers["abilityList"]> = async (
  _parent,
  arg,
  ctx,
) => {
  const { offset, limit } = arg;

  const data = await ctx.dataSources.ability.findPage(offset, limit);

  return { data, offset, limit };
};
