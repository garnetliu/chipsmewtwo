import type { DocumentNode } from "graphql";
export const typeDefs = {
  kind: "Document",
  definitions: [
    {
      name: { kind: "Name", value: "Query" },
      kind: "ObjectTypeDefinition",
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "checks" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "users" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "User" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "pokemon" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "id" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
              },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "Pokemon" } },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "pokemonList" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "offset" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
              },
            },
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "limit" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
              },
            },
          ],
          type: {
            kind: "ListType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Pokemon" } },
          },
        },
      ],
      directives: [],
      interfaces: [],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Mutation" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "check" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "User" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "name" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "age" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "email" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "Pokemon" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "name" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "slug" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
    },
    {
      kind: "SchemaDefinition",
      operationTypes: [
        {
          kind: "OperationTypeDefinition",
          type: { kind: "NamedType", name: { kind: "Name", value: "Query" } },
          operation: "query",
        },
        {
          kind: "OperationTypeDefinition",
          type: { kind: "NamedType", name: { kind: "Name", value: "Mutation" } },
          operation: "mutation",
        },
      ],
    },
  ],
} as unknown as DocumentNode;
