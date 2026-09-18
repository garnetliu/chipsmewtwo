import { graphql } from "@/graphql/generated";

/**
 * 精灵详情页，路由段传下来的是英文 slug。RSC 取数，所以 fragment 一律 @unmask ——
 * 服务端组件里没有 useFragment，遮住就读不出来了。
 *
 * 库里没有这一条时 pokemonBySlug 是 null，不进 errors
 */
export const GET_POKEMON = graphql(`
  query GET_POKEMON($slug: String!) {
    pokemonBySlug(slug: $slug) {
      id
      slug
      name
      genus
      defaultForm {
        id
        slug
        fullImageUrl
        detailImageUrl
        types {
          ...TYPE_TAG @unmask
        }
        stats {
          ...FORM_STATS @unmask
        }
        descriptions {
          id
          text
          languageCode
        }
        abilities {
          id
          slot
          ability {
            id
            slug
            name
            effect
          }
        }
      }
      forms {
        id
        slug
        name
        isDefault
      }
      evolutionChain {
        id
        slug
        name
      }
      versions {
        ...VERSION_BADGE @unmask
      }
    }
  }
`);
