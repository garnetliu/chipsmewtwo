import { graphql } from "../../generated";

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
