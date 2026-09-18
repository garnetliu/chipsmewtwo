import { graphql } from "@/graphql/generated";

/**
 * 一只宝可梦的最小卡片：编号、中文名、缩略图、属性。
 * 特性详情页的「拥有该特性的 Pokémon」用它，精灵列表卡片在它上面加分类和登场版本。
 *
 * 挂在 PokemonSummary 上 —— 列表卡和特性详情里的拥有者卡拿到的都是这个类型。
 *
 * 这里不取 versions —— 那个字段一只要扫上千行招式记录，
 * 一张特性详情页可能有两百多只
 */
export const POKEMON_POKEMON_MINI = graphql(`
  fragment POKEMON_POKEMON_MINI on PokemonSummary {
    id
    name
    slug
    defaultForm {
      id
      detailImageUrl
      types {
        ...TYPE_TAG @unmask
      }
    }
  }
`);
