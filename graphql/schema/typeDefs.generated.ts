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
          description: {
            kind: "StringValue",
            value:
              "按全国图鉴编号（37）或英文 slug（vulpix）查一只。\n库里没有时会尝试补数据（见 POKEMON_FETCH_MODE），两边都没有则报 NOT_FOUND。",
            block: true,
          },
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
          description: {
            kind: "StringValue",
            value: "按全国图鉴编号翻页。这一页在库里凑不满 limit 条时会尝试补数据",
            block: true,
          },
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
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "Pokemon" } },
            },
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
      name: { kind: "Name", value: "Pokemon" },
      fields: [
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "全国图鉴编号", block: true },
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "英文标识，例如 vulpix", block: true },
          name: { kind: "Name", value: "slug" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "译名。这个语言没收录就回退：默认语言 → 剩下的按语言表的 sortOrder 取最靠前的。\n所以拿到的可能是别的语种的文本，一条译名都没有才是 null",
            block: true,
          },
          name: { kind: "Name", value: "name" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "language" },
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "分类，例如「狐狸宝可梦」。回退规则同 name",
            block: true,
          },
          name: { kind: "Name", value: "genus" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "language" },
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "大图，475×475 的官方美术图，详情页用。取默认形态那张。\n数据源没收录这只的图、或者这只还没导入时是 null",
            block: true,
          },
          name: { kind: "Name", value: "fullImageUrl" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "小图，96×96 的点阵图，列表缩略图用。取默认形态那张",
            block: true,
          },
          name: { kind: "Name", value: "detailImageUrl" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按世代取。数组顺序就是属性槽位：第一个是第一属性、第二个是第二属性，\n单属性的宝可梦只有一个元素。那一代的数据没导入就是 null",
            block: true,
          },
          name: { kind: "Name", value: "types" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "PokemonType" } },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "按世代取。目前只导入了最新世代（数据源没有历史种族值），查老世代是 null",
            block: true,
          },
          name: { kind: "Name", value: "stats" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "PokemonStats" } },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value: "属性本体。18 个，全局复用，所以 id 用 type 表的主键",
        block: true,
      },
      name: { kind: "Name", value: "PokemonType" },
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
          description: { kind: "StringValue", value: "例如 fire", block: true },
          name: { kind: "Name", value: "slug" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "属性徽章的主题色，例如 #EE8130",
            block: true,
          },
          name: { kind: "Name", value: "color" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "属性译名。回退规则同 Pokemon.name",
            block: true,
          },
          name: { kind: "Name", value: "name" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "language" },
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: { kind: "StringValue", value: "一只宝可梦在某个世代的种族值", block: true },
      name: { kind: "Name", value: "PokemonStats" },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "formId:generationId 拼成的缓存键，例如 1:9",
            block: true,
          },
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "hp" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "attack" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "defense" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "Gen1 没有特攻特防之分，那一代是 null，看 special",
            block: true,
          },
          name: { kind: "Name", value: "specialAttack" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "specialDefense" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "speed" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "只有 Gen1 有", block: true },
          name: { kind: "Name", value: "special" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
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
