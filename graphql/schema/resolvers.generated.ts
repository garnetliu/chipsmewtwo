/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
import { Ability } from "./ability/resolvers/Ability";
import { AbilityList } from "./ability/resolvers/AbilityList";
import { AbilitySummary } from "./ability/resolvers/AbilitySummary";
import { abilityBySlug as Query_abilityBySlug } from "./ability/resolvers/Query/abilityBySlug";
import { abilityList as Query_abilityList } from "./ability/resolvers/Query/abilityList";
import { check as Mutation_check } from "./base/resolvers/Mutation/check";
import { PaginationMeta } from "./base/resolvers/PaginationMeta";
import { checks as Query_checks } from "./base/resolvers/Query/checks";
import { Form } from "./form/resolvers/Form";
import { FormAbility } from "./form/resolvers/FormAbility";
import { FormColor } from "./form/resolvers/FormColor";
import { FormDescription } from "./form/resolvers/FormDescription";
import { FormStats } from "./form/resolvers/FormStats";
import { Item } from "./item/resolvers/Item";
import { ItemAvailability } from "./item/resolvers/ItemAvailability";
import { ItemList } from "./item/resolvers/ItemList";
import { ItemSummary } from "./item/resolvers/ItemSummary";
import { itemBySlug as Query_itemBySlug } from "./item/resolvers/Query/itemBySlug";
import { itemList as Query_itemList } from "./item/resolvers/Query/itemList";
import { Move } from "./move/resolvers/Move";
import { MoveList } from "./move/resolvers/MoveList";
import { MoveSummary } from "./move/resolvers/MoveSummary";
import { MoveVersionStat } from "./move/resolvers/MoveVersionStat";
import { moveBySlug as Query_moveBySlug } from "./move/resolvers/Query/moveBySlug";
import { moveList as Query_moveList } from "./move/resolvers/Query/moveList";
import { Pokemon } from "./pokemon/resolvers/Pokemon";
import { PokemonList } from "./pokemon/resolvers/PokemonList";
import { PokemonSummary } from "./pokemon/resolvers/PokemonSummary";
import { pokemon as Query_pokemon } from "./pokemon/resolvers/Query/pokemon";
import { pokemonBySlug as Query_pokemonBySlug } from "./pokemon/resolvers/Query/pokemonBySlug";
import { pokemonList as Query_pokemonList } from "./pokemon/resolvers/Query/pokemonList";
import { search as Query_search } from "./search/resolvers/Query/search";
import { SearchResult } from "./search/resolvers/SearchResult";
import { Type } from "./type/resolvers/Type";
import type { Resolvers } from "./types.generated";
import { Version } from "./version/resolvers/Version";
export const resolvers: Resolvers = {
  Query: {
    abilityBySlug: Query_abilityBySlug,
    abilityList: Query_abilityList,
    checks: Query_checks,
    itemBySlug: Query_itemBySlug,
    itemList: Query_itemList,
    moveBySlug: Query_moveBySlug,
    moveList: Query_moveList,
    pokemon: Query_pokemon,
    pokemonBySlug: Query_pokemonBySlug,
    pokemonList: Query_pokemonList,
    search: Query_search,
  },
  Mutation: { check: Mutation_check },

  Ability: Ability,
  AbilityList: AbilityList,
  AbilitySummary: AbilitySummary,
  Form: Form,
  FormAbility: FormAbility,
  FormColor: FormColor,
  FormDescription: FormDescription,
  FormStats: FormStats,
  Item: Item,
  ItemAvailability: ItemAvailability,
  ItemList: ItemList,
  ItemSummary: ItemSummary,
  Move: Move,
  MoveList: MoveList,
  MoveSummary: MoveSummary,
  MoveVersionStat: MoveVersionStat,
  PaginationMeta: PaginationMeta,
  Pokemon: Pokemon,
  PokemonList: PokemonList,
  PokemonSummary: PokemonSummary,
  SearchResult: SearchResult,
  Type: Type,
  Version: Version,
};
