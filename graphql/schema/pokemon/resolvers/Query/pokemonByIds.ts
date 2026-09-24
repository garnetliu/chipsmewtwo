import type { QueryResolvers } from "./../../../types.generated";

/**
 * 编号里混进非数字的（slug、空串）直接当查不到 —— 这个入口只收全国图鉴编号，
 * 不像 pokemon(id:) 那样兼容 slug，调用方是存档编辑器，手里只有数字
 */
export const pokemonByIds: NonNullable<QueryResolvers["pokemonByIds"]> = async (
  _parent,
  arg,
  ctx,
) => {
  const ids = arg.ids.map((id) => Number(id));
  const rows = await ctx.dataSources.pokemon.findMany(ids.filter(Number.isInteger));

  // 过滤掉的位置要补回来，否则返回数组跟入参对不上号
  const byId = new Map(rows.filter((row) => row !== null).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id) ?? null);
};
