import { graphql } from "@/graphql/generated";

/**
 * 特性详情页。RSC 取数，fragment 一律 @unmask。
 *
 * pokemon 是拥有该特性的宝可梦，同一只只出现一次，多的有两百多只 ——
 * 卡片只要编号、译名、缩略图和属性，走 POKEMON_POKEMON_MINI，
 * 不带登场版本那种要扫招式表的字段
 */
export const GET_ABILITY = graphql(`
  query GET_ABILITY($slug: String!) {
    abilityBySlug(slug: $slug) {
      id
      slug
      name
      effect
      introducedGeneration
      versions {
        ...VERSION_BADGE @unmask
      }
      pokemon {
        ...POKEMON_POKEMON_MINI @unmask
      }
    }
  }
`);
