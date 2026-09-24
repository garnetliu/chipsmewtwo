import { graphql } from "@/graphql/generated";

/**
 * 存档编辑器认一只种族需要的全部字段：显示名 + 默认形态的小图。
 *
 * 绝不能加 descriptions —— 那个字段一只就有几十个版本 × 十种语言的行，
 * 而这里最大的一次查询是整份全国图鉴。schema 里的注释也明说了别在列表场景带它。
 *
 * 种族下拉和箱子取图共用这一份，字段集必须保持一致：
 * 下拉拉过的全量索引就能直接喂给箱子，箱子那边一个请求都不用再发
 */
export const PKHEX_SPECIES_OPTION = graphql(`
  fragment PKHEX_SPECIES_OPTION on Pokemon {
    id
    slug
    name
    defaultForm {
      id
      detailImageUrl
    }
  }
`);
