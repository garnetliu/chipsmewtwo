import { graphql } from "@/graphql/generated";

/**
 * 道具详情页。RSC 取数，fragment 一律 @unmask。
 *
 * availability 每行的 obtainMethod / availability 库里没有这两个数据，恒为 null，
 * 页面上渲染成「—」
 */
export const GET_ITEM = graphql(`
  query GET_ITEM($slug: String!) {
    itemBySlug(slug: $slug) {
      id
      slug
      name
      shortEffect
      introducedGeneration
      versions {
        ...VERSION_BADGE @unmask
      }
      availability {
        versions {
          ...VERSION_BADGE @unmask
        }
        obtainMethod
        availability
      }
    }
  }
`);
