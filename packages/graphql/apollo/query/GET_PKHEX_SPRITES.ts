import { graphql } from "../../generated";

/**
 * 当前箱子 30 格加队伍 6 格里出现过的种族，一次问完。
 *
 * @unmask：过滤和拼 Map 都发生在 save-editor.tsx 这个父组件里，
 * dataMasking 开着的话父级只读得到 id，拿不到名字和图
 */
export const GET_PKHEX_SPRITES = graphql(`
  query GET_PKHEX_SPRITES($ids: [ID!]!) {
    pokemonByIds(ids: $ids) {
      id
      ...PKHEX_SPECIES_OPTION @unmask
    }
  }
`);
