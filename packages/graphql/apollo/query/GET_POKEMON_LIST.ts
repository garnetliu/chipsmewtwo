import { graphql } from "../../generated";

export const GET_POKEMON_LIST = graphql(`
  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {
    pokemonList(offset: $offset, limit: $limit) {
      data {
        id
        ...POKEMON_POKEMON_ITEM
      }
      pagination {
        ...PAGINATION @unmask
      }
    }
  }
`);
