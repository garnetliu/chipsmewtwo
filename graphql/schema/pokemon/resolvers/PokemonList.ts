import type { PokemonListResolvers } from "./../../types.generated";

/** data 和 pagination 都由 Query.pokemonList 一次性拼好 */
export const PokemonList: PokemonListResolvers = {
  pagination: async (parent, _arg, ctx) => {
    const { offset, limit, data } = parent;
    const { pokemon } = ctx.dataSources;

    const total = await pokemon.countAll();

    return {
      // offset/limit 换算成页码给前端用。limit 是 0 时页码没有意义，当第一页
      page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
      pageSize: limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      // 用实际拿到的条数算，而不是 offset + limit：最后一页凑不满时不能算还有下一页
      hasNext: offset + (data?.length ?? 0) < total,
      hasPrev: offset > 0,
    };
  },
  data: ({ data }) => {
    /* PokemonList.data resolver is required because PokemonList.data and PokemonListMapper.data are not compatible */
    return data;
  },
};
