import { graphql } from "@/graphql/generated";

export const GET_POKEMON = graphql(`
  query GET_POKEMON($id: ID!) {
    pokemon(id: $id) {
      id
      name
      slug
    }
  }
`);
