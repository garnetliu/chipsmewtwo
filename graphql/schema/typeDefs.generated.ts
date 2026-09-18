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
          description: {
            kind: "StringValue",
            value:
              "按英文 slug 查一条，/ability/[name] 路由传下来的就是它。\n只查本地库，库里没有这一条时返回 null，不进 errors",
            block: true,
          },
          name: { kind: "Name", value: "abilityBySlug" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "slug" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
              },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "Ability" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "特性列表，按英文标识的字母序翻页，只查本地库。\noffset 超出库里的总数（374 条）时这一页没有数据。\n\n列表页没有筛选行，所以不收筛选参数",
            block: true,
          },
          name: { kind: "Name", value: "abilityList" },
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
          type: { kind: "NamedType", name: { kind: "Name", value: "AbilityList" } },
        },
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
              "按英文 slug 查一条，/item/[name] 路由传下来的就是它。\n只查本地库，库里没有这一条时返回 null，不进 errors",
            block: true,
          },
          name: { kind: "Name", value: "itemBySlug" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "slug" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
              },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "Item" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "道具列表，按英文标识的字母序翻页，只查本地库。\noffset 超出这个筛选条件下的总数（不筛就是 item 表的全部条数）时这一页没有数据。\n\ngeneration 给了就只留那一代引入的道具（第一代最多），不给是全量。\npagination.total 跟着筛选走。\n\n注意引入世代是从说明的世代推出来的（见 ItemSummary.introducedGeneration），\n数据源没收录说明的那一批推不出世代，任何 generation 都筛不到它们；\n第八代只筛得出 linking-cord 一条、第九代一条都没有，不是漏了筛",
            block: true,
          },
          name: { kind: "Name", value: "itemList" },
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
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "ItemList" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按英文 slug 查一条，/move/[name] 路由传下来的就是它。\n只查本地库，库里没有这一条时返回 null，不进 errors",
            block: true,
          },
          name: { kind: "Name", value: "moveBySlug" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "slug" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
              },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "Move" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "招式列表，按英文标识的字母序翻页，只查本地库。\noffset 超出这个筛选条件下的总数（全量 937 条）时这一页没有数据。\n\ngeneration 给了就只留那一代新增的招式（第一代 165 条，第九代 69 条），\n不给是全量。pagination.total 跟着筛选走",
            block: true,
          },
          name: { kind: "Name", value: "moveList" },
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
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "MoveList" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按全国图鉴编号（37）或英文 slug（vulpix）查一只。\n只查本地库，库里没有这一只时返回 null，不进 errors",
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
            value:
              "按英文 slug 查一只，/pokemon/[name] 路由传下来的就是它。\n只查本地库，库里没有这一只时返回 null，不进 errors",
            block: true,
          },
          name: { kind: "Name", value: "pokemonBySlug" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "slug" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
              },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "Pokemon" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按全国图鉴编号翻页，只查本地库。offset 超出库里的总数时这一页没有数据。\n\ngeneration 给了就只留那一代新增的宝可梦（第一代 151 只，第九代 120 只），\n不给是全量 1025 只。pagination.total 跟着筛选走",
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
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "generation" },
              type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
            },
          ],
          type: { kind: "NamedType", name: { kind: "Name", value: "PokemonList" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "顶部搜索框的入口：一次跨宝可梦、招式、道具、特性四类，按名称找。\n\nkeyword 拿去跟四张译名表里当前语言（NEXT_LOCALE cookie 决定，默认简体中文）\n那一行的名字做包含匹配，不分大小写。只匹配这一种语言的行、不做语言回退 ——\n所以搜不到英文标识（slug）；库里没有简中译名的条目也搜不出来 ——\n宝可梦和特性的简中译名是齐的，招式和道具各有少量条目没有。\n首尾空白会去掉，去掉后是空串就直接返回空数组，不打库。\n\n最多 10 条，四类轮转分名额：每一轮各类各拿一条最靠前的，取满 10 条为止，\n某一类候选取完就把名额让给别的类。所以搜「火」这种四类都命中一堆的词，\n拿到的是 3 + 3 + 2 + 2 条，不会被命中最多的宝可梦占满；\n搜「妙蛙」这种只有宝可梦和道具命中、加起来不到 10 条的词，两类全给。\n返回顺序按类型分组：宝可梦、招式、道具、特性；组内按关键词出现的位置排，\n位置相同时名字跟关键词完全相同的在前，再相同按各自表的主键\n（宝可梦是全国图鉴编号，招式和特性是英文标识的字母序，道具是数据源自己的编号）。\n参与排序的是全部命中，不是其中一批 —— 命中再多也是先排完再取前几条。\n\n一条都没命中就是空数组，不进 errors",
            block: true,
          },
          name: { kind: "Name", value: "search" },
          arguments: [
            {
              kind: "InputValueDefinition",
              name: { kind: "Name", value: "keyword" },
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
              },
            },
          ],
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "SearchResult" } },
              },
            },
          },
        },
      ],
      directives: [],
      interfaces: [],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "AbilityList" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "data" },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "AbilitySummary" } },
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
          "列表里的一条特性。跟 Ability 分成两个类型，为的是把「拥有该特性的宝可梦」\n挡在列表之外 —— 那个字段要扫整张 form_ability，共用一个类型的话，\nSDL 上拦不住列表页去取它",
        block: true,
      },
      name: { kind: "Name", value: "AbilitySummary" },
      fields: [
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "ability 表主键", block: true },
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "例如 overgrow", block: true },
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
            value: "特性译名，例如「茂盛」。回退规则同 Pokemon.name",
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
            value:
              "一句话说明，取最新一版效果说明里的。回退规则同 name。\n\n数据源只给了英法德三种语言的一句话版，中文那一版是空的，所以请求中文时\n基本都是 null；少数几条特性最新一代没有中文行，会按回退规则拿到英文。\n完整说明（Ability.effect）不受影响",
            block: true,
          },
          name: { kind: "Name", value: "shortEffect" },
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
              "登场版本，按发售顺序排。沿效果说明的世代走到版本组、再到版本 ——\n某一代有这条特性的说明，就说明它在那一代的游戏里存在。\n数据源没收录这条特性的说明时是空数组",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
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
        value:
          "特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormAbility），\n这里是特性本身",
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
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "完整效果说明，取最新一版 —— 说明是按世代存的，蓄电 Gen4 起才改成吸引电系招式。\n回退规则同 name，所以拿到的可能是别的语种的文本。\n数据源没收录这条特性的说明时是 null",
            block: true,
          },
          name: { kind: "Name", value: "effect" },
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
            value: "第几代引入 —— 最早有效果说明的那一代。\n数据源没收录这条特性的说明时是 null",
            block: true,
          },
          name: { kind: "Name", value: "introducedGeneration" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "登场版本，按发售顺序排，取法同 AbilitySummary.versions",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "拥有该特性的宝可梦，按全国图鉴编号排。普通特性和隐藏特性都算，\n任一形态、任一世代有这条特性就在里面，同一只只出现一次。\n没有宝可梦拥有它时是空数组。\n\n一条特性要扫它在 form_ability 里的全部行（多的有两百多行），\n这个字段留给详情页，列表页别取。\n给的是 PokemonSummary —— 这里摆的是卡片，两百多只每只再带上形态和进化链\n没有页面用得上",
            block: true,
          },
          name: { kind: "Name", value: "pokemon" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "PokemonSummary" } },
              },
            },
          },
        },
      ],
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
      name: { kind: "Name", value: "ItemList" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "data" },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "ItemSummary" } },
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
          "列表里的一条道具。跟 Item 分成两个类型，为的是把版本可用性表挡在列表之外 ——\n一条第一世代的道具要摊成 32 行，共用一个类型的话 SDL 上拦不住列表页去取它",
        block: true,
      },
      name: { kind: "Name", value: "ItemSummary" },
      fields: [
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "item 表主键", block: true },
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "例如 leftovers", block: true },
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
              "道具译名，例如「吃剩的东西」。回退规则同 Pokemon.name。\n绝大多数道具有简体中文名，少数没有的按回退规则给别的语种；\n一条译名都没有的才是 null",
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
            value:
              "一句话说明，取最新一版说明里的一句话版。\n\n这一列只有英法两种语言有文案，简中那一行在库里但一列都没填，所以请求简中时\n一律给英文。挑语言之前先把没文案的行滤掉，不是「简中行在就用简中行」——\n否则这个字段几乎永远是 null。\n\n给不出这一句的有三种：数据源没收录任何说明的、最新一代只有中文行没有英法行的，\n以及英法行在、这一列却是 NULL 的（honey）。三种都给 null。\n空文案一律给 null，不给空字符串 —— 前端靠是不是 null 决定要不要显示「说明暂缺」",
            block: true,
          },
          name: { kind: "Name", value: "shortEffect" },
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
              "第几代引入 —— 最早有说明的那一代。说明是按世代存的，某一代有它的说明，\n它在那一代的游戏里就存在；有说明的道具里没有一条世代是断开的，\n都是从引入那代一路排到第九代。\n数据源没收录说明的那一批是 null",
            block: true,
          },
          name: { kind: "Name", value: "introducedGeneration" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "登场版本，按发售顺序排。沿说明的世代走到版本组、再到版本。\n数据源没收录这条道具的说明时是空数组",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
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
        value: "道具。哪只宝可梦用它进化、进化时要携带它存在 evolution 里，这里是道具本身",
        block: true,
      },
      name: { kind: "Name", value: "Item" },
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
          description: { kind: "StringValue", value: "例如 thunder-stone", block: true },
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
            value: "道具译名。回退和缺数据的情况同 ItemSummary.name",
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
            value: "一句话说明。回退和缺数据的情况同 ItemSummary.shortEffect",
            block: true,
          },
          name: { kind: "Name", value: "shortEffect" },
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
            value: "第几代引入，取法同 ItemSummary.introducedGeneration",
            block: true,
          },
          name: { kind: "Name", value: "introducedGeneration" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "登场版本，按发售顺序排，取法同 ItemSummary.versions",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按版本组分行的可用性表，按游戏发售顺序排。一个版本组一行 ——\nthunder-stone 从第一世代活到现在，32 个版本组就是 32 行；\nleftovers 第二世代引入，前四个版本组没有它，是 28 行。\n数据源没收录这条道具的说明时是空数组。\n\n行数不少，留给详情页，列表页别取",
            block: true,
          },
          name: { kind: "Name", value: "availability" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "ItemAvailability" } },
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
        value: "可用性表的一行：一个版本组里这条道具能不能拿、怎么拿",
        block: true,
      },
      name: { kind: "Name", value: "ItemAvailability" },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "这个版本组包含的版本，按库里的顺序排。32 个版本组里 21 个含两条、11 个含一条，\n没有更多的 —— 红/蓝是两条，黄单独一组一条",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "获取方式。原型图上有这一列，但库里没有这个数据 —— 跟道具沾边的四张表\n（item / item_i18n / item_effect_i18n / item_flavor_i18n）里没有获取地点这一类列，\nseed 的 items.json 也没抓。所以恒为 null，前端渲染成「—」。不拿别的字段来凑",
            block: true,
          },
          name: { kind: "Name", value: "obtainMethod" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "可用性。同 obtainMethod，库里没有这个数据，恒为 null，前端渲染成「—」",
            block: true,
          },
          name: { kind: "Name", value: "availability" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      name: { kind: "Name", value: "MoveList" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "data" },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "MoveSummary" } },
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
          "列表里的一条招式。跟 Move 分成两个类型，为的是把数值表（versionStats）\n挡在列表之外 —— 一条招式要摊成三十几行，共用一个类型的话 SDL 上拦不住列表页去取它",
        block: true,
      },
      name: { kind: "Name", value: "MoveSummary" },
      fields: [
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "move 表主键", block: true },
          name: { kind: "Name", value: "id" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: { kind: "StringValue", value: "例如 razor-leaf", block: true },
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
            value: "招式译名，例如「飞叶快刀」。回退规则同 Pokemon.name",
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
            value:
              "说明，取最新一版效果说明里的完整版。回退规则同 name，\n所以拿到的可能是别的语种的文本：有说明的 844 条里，126 条最新一代没有简中行，\n请求简中时会回退成英文。数据源没收录这条招式的说明时（93 条）是 null\n\n取的是完整版 effect 而不是一句话版 shortEffect —— 后者数据源只给了英法两种语言，\n中文那一版 4432 行全是空的，列表页那一列会整列空着",
            block: true,
          },
          name: { kind: "Name", value: "effect" },
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
              "登场版本，按发售顺序排。沿招式有数值的世代走到版本组、再到版本。\n数据源没给这条招式数值时（18 条暗影招式）是空数组",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
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
        value: "招式。哪只宝可梦怎么学会它存在 move_learn 里，这里是招式本身",
        block: true,
      },
      name: { kind: "Name", value: "Move" },
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
          description: { kind: "StringValue", value: "例如 flamethrower", block: true },
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
            value: "招式译名。回退规则同 Pokemon.name",
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
            value: "说明，取最新一版效果说明里的完整版。回退和缺数据的情况同 MoveSummary.effect",
            block: true,
          },
          name: { kind: "Name", value: "effect" },
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
            value: "登场版本，按发售顺序排，取法同 MoveSummary.versions",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "按版本组分行的数值表，按游戏发售顺序排。库里数值是按世代存的，\n这里把一个世代摊到它下面的每个版本组：第一世代有四个版本组（日版红/绿、日版蓝、\n红/蓝、黄），就摊成四行，数值都取第一世代的值。\n招式还没登场的世代没有行，所以那些版本组不会出现在表里。\n\n一条从第一世代活到现在的招式有 32 行，留给详情页，列表页别取",
            block: true,
          },
          name: { kind: "Name", value: "versionStats" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "MoveVersionStat" } },
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
        value: "数值表的一行：一个版本组里这条招式的属性、分类和数值",
        block: true,
      },
      name: { kind: "Name", value: "MoveVersionStat" },
      fields: [
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "这个版本组包含的版本，按库里的顺序排。红/蓝是两条，黄单独一条 ——\n32 个版本组里 21 个含两条、11 个含一条，没有更多的",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "招式属性。跟着世代走 —— 咬住在第一世代是一般属性，第二世代起是恶属性。\n库里改过属性的只有 7 条（咬住、撒娇、起风、空手劈、月光、泼沙、天使之吻）",
            block: true,
          },
          name: { kind: "Name", value: "type" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Type" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "伤害分类。跟着世代走 —— 第四世代之前分类跟属性绑定，\n飞叶快刀在前三代是特殊、第四代起才是物理",
            block: true,
          },
          name: { kind: "Name", value: "category" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "MoveCategory" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "威力。变化招式没有威力，是 null，前端渲染成「—」",
            block: true,
          },
          name: { kind: "Name", value: "power" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "命中。必中招式（例如 swift）没有命中，是 null，前端渲染成「—」",
            block: true,
          },
          name: { kind: "Name", value: "accuracy" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "PP。库里这一列可空，目前 4925 行都有值",
            block: true,
          },
          name: { kind: "Name", value: "pp" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "版本说明。原型图上有这一列，但库里和 PokeAPI 都没有版本级的说明文案\n（move_effect_i18n 是按世代存的机制说明，不是版本级的），所以恒为 null，\n前端渲染成「—」。不拿招式的通用说明来填这一列",
            block: true,
          },
          name: { kind: "Name", value: "note" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
    },
    {
      kind: "EnumTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "招式的伤害分类。决定伤害用哪组种族值算：\nPHYSICAL 物理（攻击 打 防御）、SPECIAL 特殊（特攻 打 特防）、STATUS 变化（不直接造成伤害）。\n\n原样透出库里的枚举值，不在这里转成中文 —— 库里没有分类的译名表，\n中文只能写死，写死的展示文案归前端",
        block: true,
      },
      name: { kind: "Name", value: "MoveCategory" },
      values: [
        { kind: "EnumValueDefinition", name: { kind: "Name", value: "PHYSICAL" } },
        { kind: "EnumValueDefinition", name: { kind: "Name", value: "SPECIAL" } },
        { kind: "EnumValueDefinition", name: { kind: "Name", value: "STATUS" } },
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
              type: { kind: "NamedType", name: { kind: "Name", value: "PokemonSummary" } },
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
          "列表里的一只。跟 Pokemon 分成两个类型，为的是把 forms 和 evolutionChain\n挡在列表之外 —— 那两个字段一条要摊成好几行、还要把链上每只都查一遍，\n共用一个类型的话 SDL 上拦不住列表页去取它们。\n\nability / move / item 三个域都是这个形状（XxxSummary 进列表、Xxx 进详情）",
        block: true,
      },
      name: { kind: "Name", value: "PokemonSummary" },
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
          description: { kind: "StringValue", value: "译名。回退规则同 Pokemon.name", block: true },
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
            value: "默认形态。列表卡的缩略图和属性取这个。这只还没导入形态时是 null",
            block: true,
          },
          name: { kind: "Name", value: "defaultForm" },
          type: { kind: "NamedType", name: { kind: "Name", value: "Form" } },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "登场版本，按发售顺序排，取法同 Pokemon.versions。\n四个列表页的卡片上都有「登场版本」这一行，所以它进 Summary ——\n和 AbilitySummary / MoveSummary / ItemSummary 的 versions 一个待遇",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
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
            value:
              "全部形态，默认形态排第一。喷火龙有四条（喷火龙、超极巨化的样子、\n超级喷火龙 X、超级喷火龙 Y），只有默认形态的宝可梦返回一条。\n种族值、属性、图鉴说明都在形态上，按需要挑一条取",
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
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "进化链上的全部成员，按进化顺序排，这只自己也在里面；分叉（伊布那一支）\n按全国图鉴编号排。链挂在形态上 —— 关都六尾和阿罗拉六尾各走一条 ——\n这里取默认形态那条。库里没有这只的进化关系时是空数组。\n\n一次要把链上每只的身份查出来，留给详情页，列表页别取。\n链上的成员给的是 PokemonSummary —— 页面只用得到编号、译名和 slug，\n给完整 Pokemon 的话这个字段可以一层层套下去",
            block: true,
          },
          name: { kind: "Name", value: "evolutionChain" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "PokemonSummary" } },
              },
            },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "登场版本，按发售顺序排。沿形态的招式表走到版本组、再到版本 ——\n有招式表就说明这只在那个版本组的游戏里能用。任一形态算数，不限默认形态。\n\n一只要扫上千行招式记录，留给详情页，列表页别取",
            block: true,
          },
          name: { kind: "Name", value: "versions" },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: { kind: "NamedType", name: { kind: "Name", value: "Version" } },
              },
            },
          },
        },
      ],
    },
    {
      kind: "EnumTypeDefinition",
      description: {
        kind: "StringValue",
        value: "结果属于哪一类。前端据此挑徽章文案和跳转路径，值原样透出，中文文案归前端",
        block: true,
      },
      name: { kind: "Name", value: "SearchResultKind" },
      values: [
        {
          kind: "EnumValueDefinition",
          description: { kind: "StringValue", value: "宝可梦，跳 /pokemon/[name]", block: true },
          name: { kind: "Name", value: "POKEMON" },
        },
        {
          kind: "EnumValueDefinition",
          description: { kind: "StringValue", value: "招式，跳 /move/[name]", block: true },
          name: { kind: "Name", value: "MOVE" },
        },
        {
          kind: "EnumValueDefinition",
          description: { kind: "StringValue", value: "道具，跳 /item/[name]", block: true },
          name: { kind: "Name", value: "ITEM" },
        },
        {
          kind: "EnumValueDefinition",
          description: { kind: "StringValue", value: "特性，跳 /ability/[name]", block: true },
          name: { kind: "Name", value: "ABILITY" },
        },
      ],
    },
    {
      kind: "ObjectTypeDefinition",
      description: {
        kind: "StringValue",
        value:
          "搜索结果的一条，只够渲染模态框里的一行：类型徽章、名字、一句副文本、跳转用的 slug。\n\n没有 id —— 四类的主键各自从 1 开始，混在一个类型里当不了唯一键。\n要更多字段拿 slug 回 pokemonBySlug / moveBySlug / itemBySlug / abilityBySlug 取。\n\n也没有登场版本：模态框那一行没有版本徽章，版本要扫各自的说明表或数值表，\n为一个下拉列表不值当",
        block: true,
      },
      name: { kind: "Name", value: "SearchResult" },
      fields: [
        {
          kind: "FieldDefinition",
          name: { kind: "Name", value: "kind" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "SearchResultKind" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value:
              "命中的那个名字，也就是当前语言译名表里的那一行，所以它一定包含 keyword，\n不会是别的语种回退来的",
            block: true,
          },
          name: { kind: "Name", value: "name" },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "FieldDefinition",
          description: {
            kind: "StringValue",
            value: "英文标识，前端拼跳转路径用，例如 bulbasaur / flamethrower",
            block: true,
          },
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
              "副文本。宝可梦是「No.0001 · 草/毒」—— 全国图鉴编号补到四位，加默认形态\n最新世代（第九世代）的属性译名，多属性用 / 连。每只的默认形态第九世代都有\n属性行，18 个属性的简中译名也齐，所以这一行不会缺。\n属性译名跟着当前语言走，跟名字一样\n\n其余三类是说明的首句，切到第一个句末标点为止（英文的句点要后面跟空白才算，\n免得把「1/16 (6.25%)」切开）：\n\n- 招式取完整说明（Move.effect）。绝大多数招式都有说明，多数最新一代有简中，\n  其余按译名的回退规则拿到英文\n- 特性取完整说明（Ability.effect）。每条特性都有说明，只有个别几条最新一代\n  没有简中、要回退成英文。不取 Ability.shortEffect，那一列简中一行都没有\n- 道具取完整说明（道具说明表的 effect 列，也就是游戏里显示的那句文案）。\n  有说明的道具大多最新一代有简中。同样不取一句话版，那一列只有英法两种语言\n\n取不到说明就是 null",
            block: true,
          },
          name: { kind: "Name", value: "subtitle" },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
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
