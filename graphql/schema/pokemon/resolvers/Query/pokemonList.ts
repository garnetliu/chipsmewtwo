import type { QueryResolvers } from "./../../../types.generated";

export const pokemonList: NonNullable<QueryResolvers["pokemonList"]> = async (
  _parent,
  arg,
  ctx,
) => {
  const { offset, limit } = arg;
  // 不筛世代时统一成 null，翻页和总数两处的缓存键才对得上
  const generation = arg.generation ?? null;
  const { pokemon } = ctx.dataSources;

  const data = await pokemon.findPage(offset, limit, generation);

  return { data, offset, limit, generation };
};
