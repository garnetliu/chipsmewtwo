import type { DocumentNode } from "graphql";
export const typeDefs = {
  kind: "Document",
  definitions: [
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "特性。这里只有身份和译名 —— 效果说明（AbilityEffectI18n）和特性列表查询\n等这个域自己建起来时再 extend",
        block: true,
      },
      name: { kind: "Name", value: "Ability" },
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
          description: { kind: "StringValue", value: "例如 flash-fire", block: true },
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
            value: "特性译名。回退规则同 Pokemon.name",
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
          type: { kind: "NamedType", name: { kind: "Name", value: "PokemonList" } },
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
      name: { kind: "Name", value: "PaginationMeta" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "page" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "pageSize" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "total" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "totalPages" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "hasNext" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "hasPrev" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
          },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。\n默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在",
        block: true,
      },
      name: { kind: "Name", value: "Form" },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "form 表主键。地区形态和原形态是两条不同的 Form，用它当缓存键",
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
          description: { kind: "StringValue", value: "例如 vulpix-alola", block: true },
          name: { kind: "Name", value: "slug" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "isDefault" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "形态名，例如「阿罗拉的样子」。原形态没有这一项。\n回退规则同 Pokemon.name。注意 form_i18n 还没有导入路径，这个字段目前恒为 null",
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
            value: "大图，475×475 的官方美术图，详情页用。\n数据源没收录这个形态的图时是 null",
            block: true,
          },
          name: { kind: "Name", value: "fullImageUrl" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "小图，96×96 的点阵图，列表缩略图用",
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
              type: { kind: "NamedType", name: { kind: "Name", value: "Type" } },
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
          type: { kind: "NamedType", name: { kind: "Name", value: "FormStats" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "图鉴颜色，按世代取。「按颜色查找图鉴」是 Gen3 才有的功能，\nGen1/Gen2 没有这一项，是 null",
            block: true,
          },
          name: { kind: "Name", value: "color" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "FormColor" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "特性，按世代取，按槽位排序。Gen1/Gen2 没有特性，那两代是空数组。\n注意 form_ability 还没有导入路径，这个字段目前恒为空数组",
            block: true,
          },
          name: { kind: "Name", value: "abilities" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "FormAbility" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "图鉴说明，每个版本一条，按版本排。回退规则同 name，\n拿到的可能是别的语种的文案，看 languageCode。\n\n一只形态在库里有几十个版本 × 十种语言的行，查一只没问题，\n但列表页整页一起查会拉出上千行 —— 这个字段留给详情页",
            block: true,
          },
          name: { kind: "Name", value: "descriptions" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "language" },
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "FormDescription" } },
              },
            },
          },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: { kind: "StringValue", value: "一只形态在某个世代的种族值", block: true },
      name: { kind: "Name", value: "FormStats" },
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
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "图鉴的颜色分类，10 种，游戏里「按颜色查找图鉴」筛的就是它。\n跟 Type.color（属性徽章的主题色）不是一回事：\n关都六尾的颜色分类是褐色，而它的火系徽章是橙红",
        block: true,
      },
      name: { kind: "Name", value: "FormColor" },
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
          description: { kind: "StringValue", value: "例如 white", block: true },
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
            value: "颜色筛选器上画色块用的色值，例如 #B1736C",
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
            value: "颜色译名。回退规则同 Pokemon.name",
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
      description: { kind: "StringValue", value: "形态在某个世代的一个特性槽位", block: true },
      name: { kind: "Name", value: "FormAbility" },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "formId:generationId:slot 拼成的缓存键，例如 1:9:3",
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
          description: {
            kind: "StringValue",
            value:
              "1、2 是普通特性，3 是隐藏特性。编号固定，缺哪个就没那一项 ——\n皮卡丘只有 slot 1 和 slot 3，隐藏特性不会顶上来变成 2",
            block: true,
          },
          name: { kind: "Name", value: "slot" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "ability" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Ability" } },
          },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value: "一条图鉴说明。游戏图鉴上给玩家看的那段介绍文案",
        block: true,
      },
      name: { kind: "Name", value: "FormDescription" },
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
          name: { kind: "Name", value: "text" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "这条文案实际是哪个语种。回退时跟请求的语言不一样",
            block: true,
          },
          name: { kind: "Name", value: "languageCode" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "出自哪个游戏版本", block: true },
          name: { kind: "Name", value: "version" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
          },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "PokemonList" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "data" },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "Pokemon" } },
            },
          },
        },
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "pagination" },
          type: { kind: "NamedType", name: { kind: "Name", value: "PaginationMeta" } },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "物种。只有身份和译名 —— 属性、种族值、图片这些都是形态的属性，\n关都六尾和阿罗拉六尾是同一个物种的两个形态，值完全不同，所以全在 Form 上",
        block: true,
      },
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
            value: "默认形态。列表页缩略图和详情页主视图取这个。这只还没导入形态时是 null",
            block: true,
          },
          name: { kind: "Name", value: "defaultForm" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Form" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "全部形态，默认形态排第一。\n目前库里只导了默认形态，所以实际只会返回一条",
            block: true,
          },
          name: { kind: "Name", value: "forms" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Form" } },
              },
            },
          },
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
      name: { kind: "Name", value: "Type" },
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
      description: {
        kind: "StringValue",
        value:
          "游戏版本，例如红/绿/皮卡丘。图鉴说明按版本存，将来招式表也按版本组走，\n所以单独成域，不挂在某一个域下面",
        block: true,
      },
      name: { kind: "Name", value: "Version" },
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
          description: { kind: "StringValue", value: "例如 red", block: true },
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
            value: "版本译名。回退规则同 Pokemon.name",
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
