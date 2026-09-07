import type { QueryResolvers } from "./../../../types.generated";

export const pokemon: NonNullable<QueryResolvers["pokemon"]> = async (_parent, _arg, _ctx) => {
  /* Implement Query.pokemon resolver logic here */
  return {
    id: "ds",
    name: "Pokemon-01",
    slug: "pokemon-01",
  };
};
