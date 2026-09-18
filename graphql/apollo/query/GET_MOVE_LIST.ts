import { graphql } from "@/graphql/generated";

/** 招式列表页。generation 是地址栏 gen 参数换过来的，不筛世代时传 null */
export const GET_MOVE_LIST = graphql(`
  query GET_MOVE_LIST($offset: Int!, $limit: Int!, $generation: Int) {
    moveList(offset: $offset, limit: $limit, generation: $generation) {
      data {
        id
        ...MOVE_MOVE_ITEM
      }
      pagination {
        ...PAGINATION @unmask
      }
    }
  }
`);
