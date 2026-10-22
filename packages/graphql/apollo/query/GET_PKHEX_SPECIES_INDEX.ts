import { graphql } from "../../generated";

/**
 * 种族下拉的全量索引。1025 条一次拉完，搜索在浏览器里做 ——
 * 这就是个子串匹配，不值得为它在 pokemon_i18n.name 上加一个带索引的后端查询。
 *
 * 只在下拉第一次展开时发（useLazyQuery），进页面不发
 */
export const GET_PKHEX_SPECIES_INDEX = graphql(`
  query GET_PKHEX_SPECIES_INDEX($limit: Int!) {
    pokemonList(offset: 0, limit: $limit) {
      data {
        id
        ...PKHEX_SPECIES_OPTION @unmask
      }
    }
  }
`);
