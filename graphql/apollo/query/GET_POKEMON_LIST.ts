import { graphql } from "@/graphql/generated";

/**
 * 精灵列表页。generation 是地址栏 gen 参数换过来的，不筛世代时传 null。
 *
 * 卡片字段在 POKEMON_POKEMON_ITEM 上，列表这一层只读得到 id —— dataMasking 开着
 */
export const GET_POKEMON_LIST = graphql(`
  query GET_POKEMON_LIST($offset: Int!, $limit: Int!, $generation: Int) {
    pokemonList(offset: $offset, limit: $limit, generation: $generation) {
      data {
        id
        ...POKEMON_POKEMON_ITEM
      }
      pagination {
        ...PAGINATION @unmask
      }
    }
  }
`);
