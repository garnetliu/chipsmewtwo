import type { QueryResolvers } from "./../../../types.generated";

export const pokemonList: NonNullable<QueryResolvers["pokemonList"]> = async (
  _parent,
  arg,
  ctx,
) => {
  const { offset, limit } = arg;
  const { pokemonDb, pokemonImporter } = ctx.dataSources;

  const page = await pokemonDb.findPage(offset, limit);
  // 凑满就算命中。凑不满可能是这段还没导入，也可能真的翻到底了 —— 分不清，
  // 所以交给下面补一次；数据源到底时也返回空，自然收敛
  if (page.length === limit || !pokemonImporter) return page;

  await pokemonImporter.importPokemonPage(offset, limit);
  // 列表查不到不抛错：翻到底返回空数组是正常结果，不是错误
  return pokemonDb.findPage(offset, limit);
};
