import { graphql } from "@/graphql/generated";

export const POKEMON_POKEMON_ITEM = graphql(`
  fragment POKEMON_POKEMON_ITEM on Pokemon {
    id
    name
    slug
    defaultForm {
      id
      detailImageUrl
    }
  }
`);
