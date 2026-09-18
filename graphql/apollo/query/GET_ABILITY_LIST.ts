import { graphql } from "@/graphql/generated";

/** 特性列表页。这个域没有世代筛选，列表页也没有筛选行，所以不收 generation */
export const GET_ABILITY_LIST = graphql(`
  query GET_ABILITY_LIST($offset: Int!, $limit: Int!) {
    abilityList(offset: $offset, limit: $limit) {
      data {
        id
        ...ABILITY_ABILITY_ITEM
      }
      pagination {
        ...PAGINATION @unmask
      }
    }
  }
`);
