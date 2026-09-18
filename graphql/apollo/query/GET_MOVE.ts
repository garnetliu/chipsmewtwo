import { graphql } from "@/graphql/generated";

/**
 * 招式详情页。RSC 取数，fragment 一律 @unmask。
 *
 * hero 上那个属性胶囊和分类徽章库里没有「招式当前的属性」这一说 ——
 * 属性和分类都跟着世代走，取 versionStats 最后一行（最新版本组）的值
 */
export const GET_MOVE = graphql(`
  query GET_MOVE($slug: String!) {
    moveBySlug(slug: $slug) {
      id
      slug
      name
      effect
      versions {
        ...VERSION_BADGE @unmask
      }
      versionStats {
        versions {
          ...VERSION_BADGE @unmask
        }
        type {
          ...TYPE_TAG @unmask
        }
        category
        power
        accuracy
        pp
        note
      }
    }
  }
`);
