/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
import { Ability } from "./ability/resolvers/Ability";
import { check as Mutation_check } from "./base/resolvers/Mutation/check";
import { PaginationMeta } from "./base/resolvers/PaginationMeta";
import { checks as Query_checks } from "./base/resolvers/Query/checks";
import { Form } from "./form/resolvers/Form";
import { FormAbility } from "./form/resolvers/FormAbility";
import { FormColor } from "./form/resolvers/FormColor";
import { FormDescription } from "./form/resolvers/FormDescription";
import { FormStats } from "./form/resolvers/FormStats";
import { Pokemon } from "./pokemon/resolvers/Pokemon";
import { PokemonList } from "./pokemon/resolvers/PokemonList";
import { pokemon as Query_pokemon } from "./pokemon/resolvers/Query/pokemon";
import { pokemonList as Query_pokemonList } from "./pokemon/resolvers/Query/pokemonList";
import { Type } from "./type/resolvers/Type";
import type { Resolvers } from "./types.generated";
import { Version } from "./version/resolvers/Version";
export const resolvers: Resolvers = {
  Query: { checks: Query_checks, pokemon: Query_pokemon, pokemonList: Query_pokemonList },
  Mutation: { check: Mutation_check },

  Ability: Ability,
  Form: Form,
  FormAbility: FormAbility,
  FormColor: FormColor,
  FormDescription: FormDescription,
  FormStats: FormStats,
  PaginationMeta: PaginationMeta,
  Pokemon: Pokemon,
  PokemonList: PokemonList,
  Type: Type,
  Version: Version,
};
