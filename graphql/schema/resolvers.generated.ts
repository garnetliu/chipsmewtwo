/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
import { check as Mutation_check } from "./base/resolvers/Mutation/check";
import { checks as Query_checks } from "./base/resolvers/Query/checks";
import { users as Query_users } from "./base/resolvers/Query/users";
import { User } from "./base/resolvers/User";
import { Pokemon } from "./pokemon/resolvers/Pokemon";
import { pokemon as Query_pokemon } from "./pokemon/resolvers/Query/pokemon";
import { pokemonList as Query_pokemonList } from "./pokemon/resolvers/Query/pokemonList";
import type { Resolvers } from "./types.generated";
export const resolvers: Resolvers = {
  Query: {
    checks: Query_checks,
    pokemon: Query_pokemon,
    pokemonList: Query_pokemonList,
    users: Query_users,
  },
  Mutation: { check: Mutation_check },

  Pokemon: Pokemon,
  User: User,
};
