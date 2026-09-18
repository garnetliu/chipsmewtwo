import { graphql } from "@/graphql/generated";

/**
 * 努力值模拟器选中一只之后要的东西：种族值六项，加上参数卡那条小横条要的
 * 编号、译名、缩略图、属性。
 *
 * 不走精灵详情那条查询 —— 那边还带着图鉴说明、形态、进化链和登场版本，
 * 算个能力值用不上
 */
export const GET_POKEMON_STATS = graphql(`
  query GET_POKEMON_STATS($slug: String!) {
    pokemonBySlug(slug: $slug) {
      id
      slug
      name
      defaultForm {
        id
        detailImageUrl
        types {
          ...TYPE_TAG @unmask
        }
        stats {
          ...FORM_STATS @unmask
        }
      }
    }
  }
`);
