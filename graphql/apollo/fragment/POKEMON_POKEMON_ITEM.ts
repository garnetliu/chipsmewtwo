import { graphql } from "@/graphql/generated";

/**
 * 精灵列表的一张卡：编号、中文名、分类、属性、缩略图、登场版本。
 *
 * 挂在 PokemonSummary 上 —— forms 和 evolutionChain 在那个类型上根本没有，
 * 想取也取不到。
 *
 * 不取图鉴说明（defaultForm.descriptions）—— 一只形态有几十个版本 × 十种语言的行，
 * 一页 20 只拉下来响应体 95 KB，那是详情页才要的字段。
 * 这一条 SDL 拦不住（descriptions 在 Form 上，列表和详情共用 Form），
 * 由 graphql/apollo/__tests__/document.test.ts 的重字段用例挡着
 */
export const POKEMON_POKEMON_ITEM = graphql(`
  fragment POKEMON_POKEMON_ITEM on PokemonSummary {
    ...POKEMON_POKEMON_MINI @unmask
    genus
    versions {
      ...VERSION_BADGE @unmask
    }
  }
`);
