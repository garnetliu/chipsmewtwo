import { graphql } from "@/graphql/generated";

/** 道具列表页。generation 是地址栏 gen 参数换过来的，不筛世代时传 null */
export const GET_ITEM_LIST = graphql(`
  query GET_ITEM_LIST($offset: Int!, $limit: Int!, $generation: Int) {
    itemList(offset: $offset, limit: $limit, generation: $generation) {
      data {
        id
        ...ITEM_ITEM_ITEM
      }
      pagination {
        ...PAGINATION @unmask
      }
    }
  }
`);
