import { graphql } from "@/graphql/generated";

/**
 * 顶部搜索模态框。一次跨四类查，最多回 10 条，一条都没命中就是空数组。
 *
 * 结果里没有 id —— 四类主键各自从 1 开始，混在一起当不了唯一键，
 * 列表的 key 用 kind + slug 拼
 */
export const GET_SEARCH = graphql(`
  query GET_SEARCH($keyword: String!) {
    search(keyword: $keyword) {
      kind
      name
      slug
      subtitle
    }
  }
`);
