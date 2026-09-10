import type { PokemonDbSource } from "@/graphql/context/PokemonDbSource";

/**
 * 库里数据不足时用来补库。唯一实现是 graphql/context/PokeAPISource.ts，
 * 等数据全导进库之后连这个接口一起删掉，查询主线不受影响。
 */
export interface PokemonImporter {
  /** 拉一只并写库。返回 false 表示外部数据源里也没有这只 */
  importPokemon(idOrSlug: string): Promise<boolean>;
  importPokemonPage(offset: number, limit: number): Promise<void>;
}

export interface MyContext {
  userID: string;
  /** 两个都必须每请求新建，实例化在 app/api/graphql/route.ts */
  dataSources: {
    pokemonDb: PokemonDbSource;
    /** POKEMON_FETCH_MODE=db-only 时不实例化，所以是可选的 */
    pokemonImporter?: PokemonImporter;
  };
}
