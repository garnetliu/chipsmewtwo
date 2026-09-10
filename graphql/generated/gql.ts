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
    "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n": typeof types.PaginationFragmentDoc,
    "\n  fragment POKEMON_POKEMON_ITEM on Pokemon {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n    }\n  }\n": typeof types.Pokemon_Pokemon_ItemFragmentDoc,
    "\n  query GET_POKEMON($id: ID!) {\n    pokemon(id: $id) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.Get_PokemonDocument,
    "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": typeof types.Get_Pokemon_ListDocument,
};
const documents: Documents = {
    "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n": types.PaginationFragmentDoc,
    "\n  fragment POKEMON_POKEMON_ITEM on Pokemon {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n    }\n  }\n": types.Pokemon_Pokemon_ItemFragmentDoc,
    "\n  query GET_POKEMON($id: ID!) {\n    pokemon(id: $id) {\n      id\n      name\n      slug\n    }\n  }\n": types.Get_PokemonDocument,
    "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n": types.Get_Pokemon_ListDocument,
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
export function graphql(source: "\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n"): (typeof documents)["\n  fragment PAGINATION on PaginationMeta {\n    page\n    pageSize\n    total\n    totalPages\n    hasNext\n    hasPrev\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment POKEMON_POKEMON_ITEM on Pokemon {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n    }\n  }\n"): (typeof documents)["\n  fragment POKEMON_POKEMON_ITEM on Pokemon {\n    id\n    name\n    slug\n    defaultForm {\n      id\n      detailImageUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON($id: ID!) {\n    pokemon(id: $id) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON($id: ID!) {\n    pokemon(id: $id) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"): (typeof documents)["\n  query GET_POKEMON_LIST($offset: Int!, $limit: Int!) {\n    pokemonList(offset: $offset, limit: $limit) {\n      data {\n        id\n        ...POKEMON_POKEMON_ITEM\n      }\n      pagination {\n        ...PAGINATION @unmask\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;