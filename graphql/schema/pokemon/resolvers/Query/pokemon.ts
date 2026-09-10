import { GraphQLError } from "graphql";

import type { QueryResolvers } from "./../../../types.generated";

export const pokemon: NonNullable<QueryResolvers["pokemon"]> = async (_parent, arg, ctx) => {
  const idOrSlug = String(arg.id);
  const { pokemonDb, pokemonImporter } = ctx.dataSources;

  let row = await pokemonDb.findOne(idOrSlug);

  // 查不到才去补数据。db-only 模式下 route.ts 压根不给 importer
  if (!row && pokemonImporter) {
    if (await pokemonImporter.importPokemon(idOrSlug)) {
      // 补完重查一次库而不是用 importer 的返回值：两条路径的输出
      // 都出自同一段查库代码，首查和二查必然一致
      row = await pokemonDb.findOne(idOrSlug);
    }
  }

  if (!row) {
    const hint = pokemonImporter
      ? "自己的数据库和外部数据源都没有这条记录"
      : "当前 POKEMON_FETCH_MODE=db-only，没有回源补数据";
    throw new GraphQLError(`找不到宝可梦 ${idOrSlug}：${hint}`, {
      extensions: { code: "NOT_FOUND", idOrSlug },
    });
  }

  return row;
};
