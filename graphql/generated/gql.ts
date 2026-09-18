/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment ABILITY_ABILITY_ITEM on AbilitySummary {\n    id\n    slug\n    name\n    shortEffect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": typeof types.Ability_Ability_ItemFragmentDoc,
    "\n  fragment FORM_STATS on FormStats {\n    id\n    hp\n    attack\n    defense\n    specialAttack\n    specialDefense\n    speed\n  }\n": typeof types.Form_StatsFragmentDoc,
    "\n  fragment ITEM_ITEM_ITEM on ItemSummary {\n    id\n    slug\n    name\n    shortEffect\n    introducedGeneration\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": typeof types.Item_Item_ItemFragmentDoc,
    "\n  fragment MOVE_MOVE_ITEM on MoveSummary {\n    id\n    slug\n    name\n    effect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": typeof types.Move_Move_ItemFragmentDoc,
    "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n": typeof types.PaginationFragmentDoc,
    "\n  fragment POKEMON_POKEMON_ITEM on PokemonSummary {\n    ...POKEMON_POKEMON_MINI @unmask\n    genus\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": typeof types.Pokemon_Pokemon_ItemFragmentDoc,
    "\n  fragment POKEMON_POKEMON_MINI on PokemonSummary {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n      types {\n        ...TYPE_TAG @unmask\n      }\n    }\n  }\n": typeof types.Pokemon_Pokemon_MiniFragmentDoc,
    "\n  fragment TYPE_TAG on Type {\n    id\n    slug\n    name\n    color\n  }\n": typeof types.Type_TagFragmentDoc,
    "\n  fragment VERSION_BADGE on Version {\n    id\n    slug\n    name\n  }\n": typeof types.Version_BadgeFragmentDoc,
    "\n  query GET_ABILITY($slug: String!) {\n    abilityBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      pokemon {\n        ...POKEMON_POKEMON_MINI @unmask\n      }\n    }\n  }\n": typeof types.Get_AbilityDocument,
    "\n  query GET_ABILITY_LIST($offset: Int!, $limit: Int!) {\n    abilityList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...ABILITY_ABILITY_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": typeof types.Get_Ability_ListDocument,
    "\n  query GET_ITEM($slug: String!) {\n    itemBySlug(slug: $slug) {\n      id\n      slug\n      name\n      shortEffect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      availability {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        obtainMethod\n        availability\n      }\n    }\n  }\n": typeof types.Get_ItemDocument,
    "\n  query GET_ITEM_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    itemList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...ITEM_ITEM_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": typeof types.Get_Item_ListDocument,
    "\n  query GET_MOVE($slug: String!) {\n    moveBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      versionStats {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        type {\n          ...TYPE_TAG @unmask\n        }\n        category\n        power\n        accuracy\n        pp\n        note\n      }\n    }\n  }\n": typeof types.Get_MoveDocument,
    "\n  query GET_MOVE_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    moveList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...MOVE_MOVE_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": typeof types.Get_Move_ListDocument,
    "\n  query GET_POKEMON($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      genus\n      defaultForm {\n        id\n        slug\n        fullImageUrl\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n        descriptions {\n          id\n          text\n          languageCode\n        }\n        abilities {\n          id\n          slot\n          ability {\n            id\n            slug\n            name\n            effect\n          }\n        }\n      }\n      forms {\n        id\n        slug\n        name\n        isDefault\n      }\n      evolutionChain {\n        id\n        slug\n        name\n      }\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n    }\n  }\n": typeof types.Get_PokemonDocument,
    "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    pokemonList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": typeof types.Get_Pokemon_ListDocument,
    "\n  query GET_POKEMON_OPTIONS($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        slug\n        name\n      }\n      pagination {\n        total\n      }\n    }\n  }\n": typeof types.Get_Pokemon_OptionsDocument,
    "\n  query GET_POKEMON_STATS($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      defaultForm {\n        id\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n      }\n    }\n  }\n": typeof types.Get_Pokemon_StatsDocument,
    "\n  query GET_SEARCH($keyword: String!) {\n    search(keyword: $keyword) {\n      kind\n      name\n      slug\n      subtitle\n    }\n  }\n": typeof types.Get_SearchDocument,
};
const documents: Documents = {
    "\n  fragment ABILITY_ABILITY_ITEM on AbilitySummary {\n    id\n    slug\n    name\n    shortEffect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": types.Ability_Ability_ItemFragmentDoc,
    "\n  fragment FORM_STATS on FormStats {\n    id\n    hp\n    attack\n    defense\n    specialAttack\n    specialDefense\n    speed\n  }\n": types.Form_StatsFragmentDoc,
    "\n  fragment ITEM_ITEM_ITEM on ItemSummary {\n    id\n    slug\n    name\n    shortEffect\n    introducedGeneration\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": types.Item_Item_ItemFragmentDoc,
    "\n  fragment MOVE_MOVE_ITEM on MoveSummary {\n    id\n    slug\n    name\n    effect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": types.Move_Move_ItemFragmentDoc,
    "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n": types.PaginationFragmentDoc,
    "\n  fragment POKEMON_POKEMON_ITEM on PokemonSummary {\n    ...POKEMON_POKEMON_MINI @unmask\n    genus\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n": types.Pokemon_Pokemon_ItemFragmentDoc,
    "\n  fragment POKEMON_POKEMON_MINI on PokemonSummary {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n      types {\n        ...TYPE_TAG @unmask\n      }\n    }\n  }\n": types.Pokemon_Pokemon_MiniFragmentDoc,
    "\n  fragment TYPE_TAG on Type {\n    id\n    slug\n    name\n    color\n  }\n": types.Type_TagFragmentDoc,
    "\n  fragment VERSION_BADGE on Version {\n    id\n    slug\n    name\n  }\n": types.Version_BadgeFragmentDoc,
    "\n  query GET_ABILITY($slug: String!) {\n    abilityBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      pokemon {\n        ...POKEMON_POKEMON_MINI @unmask\n      }\n    }\n  }\n": types.Get_AbilityDocument,
    "\n  query GET_ABILITY_LIST($offset: Int!, $limit: Int!) {\n    abilityList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...ABILITY_ABILITY_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": types.Get_Ability_ListDocument,
    "\n  query GET_ITEM($slug: String!) {\n    itemBySlug(slug: $slug) {\n      id\n      slug\n      name\n      shortEffect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      availability {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        obtainMethod\n        availability\n      }\n    }\n  }\n": types.Get_ItemDocument,
    "\n  query GET_ITEM_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    itemList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...ITEM_ITEM_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": types.Get_Item_ListDocument,
    "\n  query GET_MOVE($slug: String!) {\n    moveBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      versionStats {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        type {\n          ...TYPE_TAG @unmask\n        }\n        category\n        power\n        accuracy\n        pp\n        note\n      }\n    }\n  }\n": types.Get_MoveDocument,
    "\n  query GET_MOVE_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    moveList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...MOVE_MOVE_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": types.Get_Move_ListDocument,
    "\n  query GET_POKEMON($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      genus\n      defaultForm {\n        id\n        slug\n        fullImageUrl\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n        descriptions {\n          id\n          text\n          languageCode\n        }\n        abilities {\n          id\n          slot\n          ability {\n            id\n            slug\n            name\n            effect\n          }\n        }\n      }\n      forms {\n        id\n        slug\n        name\n        isDefault\n      }\n      evolutionChain {\n        id\n        slug\n        name\n      }\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n    }\n  }\n": types.Get_PokemonDocument,
    "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    pokemonList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": types.Get_Pokemon_ListDocument,
    "\n  query GET_POKEMON_OPTIONS($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        slug\n        name\n      }\n      pagination {\n        total\n      }\n    }\n  }\n": types.Get_Pokemon_OptionsDocument,
    "\n  query GET_POKEMON_STATS($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      defaultForm {\n        id\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n      }\n    }\n  }\n": types.Get_Pokemon_StatsDocument,
    "\n  query GET_SEARCH($keyword: String!) {\n    search(keyword: $keyword) {\n      kind\n      name\n      slug\n      subtitle\n    }\n  }\n": types.Get_SearchDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ABILITY_ABILITY_ITEM on AbilitySummary {\n    id\n    slug\n    name\n    shortEffect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"): (typeof documents)["\n  fragment ABILITY_ABILITY_ITEM on AbilitySummary {\n    id\n    slug\n    name\n    shortEffect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FORM_STATS on FormStats {\n    id\n    hp\n    attack\n    defense\n    specialAttack\n    specialDefense\n    speed\n  }\n"): (typeof documents)["\n  fragment FORM_STATS on FormStats {\n    id\n    hp\n    attack\n    defense\n    specialAttack\n    specialDefense\n    speed\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ITEM_ITEM_ITEM on ItemSummary {\n    id\n    slug\n    name\n    shortEffect\n    introducedGeneration\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"): (typeof documents)["\n  fragment ITEM_ITEM_ITEM on ItemSummary {\n    id\n    slug\n    name\n    shortEffect\n    introducedGeneration\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment MOVE_MOVE_ITEM on MoveSummary {\n    id\n    slug\n    name\n    effect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"): (typeof documents)["\n  fragment MOVE_MOVE_ITEM on MoveSummary {\n    id\n    slug\n    name\n    effect\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n"): (typeof documents)["\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment POKEMON_POKEMON_ITEM on PokemonSummary {\n    ...POKEMON_POKEMON_MINI @unmask\n    genus\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"): (typeof documents)["\n  fragment POKEMON_POKEMON_ITEM on PokemonSummary {\n    ...POKEMON_POKEMON_MINI @unmask\n    genus\n    versions {\n      ...VERSION_BADGE @unmask\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment POKEMON_POKEMON_MINI on PokemonSummary {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n      types {\n        ...TYPE_TAG @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment POKEMON_POKEMON_MINI on PokemonSummary {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n      types {\n        ...TYPE_TAG @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TYPE_TAG on Type {\n    id\n    slug\n    name\n    color\n  }\n"): (typeof documents)["\n  fragment TYPE_TAG on Type {\n    id\n    slug\n    name\n    color\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment VERSION_BADGE on Version {\n    id\n    slug\n    name\n  }\n"): (typeof documents)["\n  fragment VERSION_BADGE on Version {\n    id\n    slug\n    name\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_ABILITY($slug: String!) {\n    abilityBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      pokemon {\n        ...POKEMON_POKEMON_MINI @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_ABILITY($slug: String!) {\n    abilityBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      pokemon {\n        ...POKEMON_POKEMON_MINI @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_ABILITY_LIST($offset: Int!, $limit: Int!) {\n    abilityList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...ABILITY_ABILITY_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_ABILITY_LIST($offset: Int!, $limit: Int!) {\n    abilityList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...ABILITY_ABILITY_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_ITEM($slug: String!) {\n    itemBySlug(slug: $slug) {\n      id\n      slug\n      name\n      shortEffect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      availability {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        obtainMethod\n        availability\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_ITEM($slug: String!) {\n    itemBySlug(slug: $slug) {\n      id\n      slug\n      name\n      shortEffect\n      introducedGeneration\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      availability {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        obtainMethod\n        availability\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_ITEM_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    itemList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...ITEM_ITEM_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_ITEM_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    itemList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...ITEM_ITEM_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_MOVE($slug: String!) {\n    moveBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      versionStats {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        type {\n          ...TYPE_TAG @unmask\n        }\n        category\n        power\n        accuracy\n        pp\n        note\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_MOVE($slug: String!) {\n    moveBySlug(slug: $slug) {\n      id\n      slug\n      name\n      effect\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n      versionStats {\n        versions {\n          ...VERSION_BADGE @unmask\n        }\n        type {\n          ...TYPE_TAG @unmask\n        }\n        category\n        power\n        accuracy\n        pp\n        note\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_MOVE_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    moveList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...MOVE_MOVE_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_MOVE_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    moveList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...MOVE_MOVE_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      genus\n      defaultForm {\n        id\n        slug\n        fullImageUrl\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n        descriptions {\n          id\n          text\n          languageCode\n        }\n        abilities {\n          id\n          slot\n          ability {\n            id\n            slug\n            name\n            effect\n          }\n        }\n      }\n      forms {\n        id\n        slug\n        name\n        isDefault\n      }\n      evolutionChain {\n        id\n        slug\n        name\n      }\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      genus\n      defaultForm {\n        id\n        slug\n        fullImageUrl\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n        descriptions {\n          id\n          text\n          languageCode\n        }\n        abilities {\n          id\n          slot\n          ability {\n            id\n            slug\n            name\n            effect\n          }\n        }\n      }\n      forms {\n        id\n        slug\n        name\n        isDefault\n      }\n      evolutionChain {\n        id\n        slug\n        name\n      }\n      versions {\n        ...VERSION_BADGE @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    pokemonList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!, $generation: Int) {\n    pokemonList(offset: $offset, limit: $limit, generation: $generation) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON_OPTIONS($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        slug\n        name\n      }\n      pagination {\n        total\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON_OPTIONS($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        slug\n        name\n      }\n      pagination {\n        total\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON_STATS($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      defaultForm {\n        id\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON_STATS($slug: String!) {\n    pokemonBySlug(slug: $slug) {\n      id\n      slug\n      name\n      defaultForm {\n        id\n        detailImageUrl\n        types {\n          ...TYPE_TAG @unmask\n        }\n        stats {\n          ...FORM_STATS @unmask\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_SEARCH($keyword: String!) {\n    search(keyword: $keyword) {\n      kind\n      name\n      slug\n      subtitle\n    }\n  }\n"): (typeof documents)["\n  query GET_SEARCH($keyword: String!) {\n    search(keyword: $keyword) {\n      kind\n      name\n      slug\n      subtitle\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;