import { graphql } from "@/graphql/generated";

export const GET_POKEMON_LIST = graphql(`
  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {
    pokemonList(offset: $offset, limit: $limit) {
      data {
        id
        name
        slug
        defaultForm {
          id
          detailImageUrl
        }
      }
      pagination {
        page
        pageSize
        total
        totalPages
        hasNext
        hasPrev
      }
    }
  }
`);
