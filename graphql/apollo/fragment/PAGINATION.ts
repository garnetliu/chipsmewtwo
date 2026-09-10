import { graphql } from "@/graphql/generated";

export const PAGINATION = graphql(`
  fragment PAGINATION on PaginationMeta {
    page
    pageSize
    total
    totalPages
    hasNext
    hasPrev
  }
`);
