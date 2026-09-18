# 批 3 · GraphQL 契约

**五条不能并发。** 每条只改自己域的 `graphql/schema/<域>/` 目录，看着互不重叠，
但 `pnpm codegen` 读的是**全仓 SDL**，生成单一产物 `graphql/generated/*`。
A 的 schema 写到一半，B 跑 codegen 就把半成品吃进去了，生成出来的类型是错的，
而两边当时都不会报错 —— 等都写完才炸。

统一口径（不再逐条重复）：查不到返回 `null` 不进 errors、HTTP 一律 200；
列表分页是 `(offset: Int!, limit: Int!)` 配 `PaginationMeta`；
筛选参数名叫 `generation`（GraphQL 层）对应 URL 上的 `gen`；
重字段不进列表查询。

---

- [x] **T08 pokemon 域：slug 查询、世代筛选、详情重字段**

  **改哪里**：`graphql/schema/pokemon/schema.graphql`、
  `graphql/schema/pokemon/resolvers/Query/pokemon.ts` 和 `pokemonList.ts`、
  `graphql/schema/pokemon/resolvers/Pokemon.ts`、`graphql/context/pokemon-source.ts`

  **达到什么效果**：现在只有 `pokemon(id: ID!)` 一个入口，而路由是 `/pokemon/[name]`
  传英文 slug。补按 slug 查的入口（`Pokemon.slug` 是唯一键）。

  `pokemonList` 加可选的世代筛选参数。

  详情页要用到的字段补齐：

  - `genus` —— 分类，中文是「种子宝可梦」这种，来自 `PokemonI18n`
  - 六项种族值 —— 来自 `FormStat`，顺序是 HP / 攻击 / 防御 / 特攻 / 特防 / 速度
  - 图鉴说明 —— 来自 `FormDescriptionI18n`
  - 形态列表 —— 来自 `Form`，同一个全国编号下的不同形态
  - 进化链 —— 来自 `EvolutionChain` / `Evolution`，返回这只 Pokémon 所在链条上的
    全部成员，按进化顺序排列，每个带 slug 和中文名
  - 登场版本 —— 沿 `Form → Group → Version` 取，返回 `VersionI18n` 的中文版本名

  种族值、图鉴说明、进化链、登场版本这四项都是重字段，**只在详情取，不进 `pokemonList`
  的选择集**。

  **怎么算验证通过**：
  1. `pnpm codegen` 通过，`pnpm tsc --noEmit` 零错误
  2. 用 slug `bulbasaur` 查，返回妙蛙种子，`name` 是中文
  3. 查一个不存在的 slug，`data.pokemon` 是 null，响应体里没有 `errors` 字段
  4. `pokemonList(generation: 1)` 返回的条目全部属于第一世代，`pagination.total` 是 151 或 153
  5. `bulbasaur` 的 `genus` 是「种子宝可梦」
  6. `bulbasaur` 的六项种族值是 45 / 49 / 49 / 65 / 65 / 45
  7. `bulbasaur` 的进化链返回三条：妙蛙种子、妙蛙草、妙蛙花，顺序不乱
  8. `charizard` 的形态列表有多条（喷火龙、超级喷火龙 X、超级喷火龙 Y）
  9. `pokemonList` 的 SDL 定义里没有种族值、进化链、登场版本这些字段

---

- [x] **T09 ability 域**

  **改哪里**：`graphql/schema/ability/schema.graphql`，新建
  `graphql/schema/ability/resolvers/Query/`，`graphql/context/ability-source.ts`

  **达到什么效果**：现有 SDL 只有 id / slug / name，注释写着「效果说明和特性列表查询
  等这个域自己建起来时再 extend」—— 现在建。

  - `abilityList(offset, limit)` —— 分页，**不带世代筛选**（prototype 的特性列表页
    没有筛选行）。每条返回中文名、`shortEffect`（可为 null）、登场版本
  - 按 slug 查单条 —— 返回中文名、`effect`（详细说明）、登场版本
  - **拥有该特性的 Pokémon 列表** —— 走 `FormAbility` 反查，但要**聚合到 Pokemon 级**：
    prototype 的特性详情展示的是 Pokémon 卡片（色块图 + 全国编号 + 中文名 + 属性标签），
    同一只 Pokémon 的多个形态在这里只出现一次。每条要带全国编号、中文名、属性 ——
    够渲染卡片

  拥有该特性的 Pokémon 列表是重字段，只在详情取。

  **怎么算验证通过**：
  1. `pnpm codegen` 通过，`pnpm tsc --noEmit` 零错误
  2. `abilityList(offset: 0, limit: 20)` 返回 20 条，每条有中文名
  3. 用 slug `overgrow` 查：`effect` 非空且是中文，拥有该特性的 Pokémon 里有
     妙蛙种子、妙蛙草、妙蛙花
  4. 同一只 Pokémon 在该列表里只出现一次
  5. 列表里每条带全国编号、中文名、属性
  6. 找一个没有任何 Pokémon 拥有的特性，返回空数组而不是 null（前端好判空态）
  7. 查不存在的 slug 返回 null，响应体里没有 `errors`
  8. `abilityList` 的 SDL 里没有「拥有该特性的 Pokémon」字段

---

- [x] **T10 move 域**

  **改哪里**：新建 `graphql/schema/move/schema.graphql`、
  `graphql/schema/move/resolvers/`、`graphql/schema/move/schema.mappers.ts`、
  `graphql/context/move-source.ts`

  **达到什么效果**：

  - `moveList(offset, limit, generation)` —— 每条返回中文名、说明（可为 null）、
    登场版本 badges
  - 按 slug 查单条 —— 返回中文名、说明、登场版本，以及**按版本组分行**的数值表

  版本组分行这里要做一次映射：prototype 的招式详情一行是一个版本组（红/绿/蓝、剑/盾、
  朱/紫…），而库里 `MoveGeneration` 是按**世代**存的。resolver 要沿
  世代 → `Group` → `Version` 展开：一个世代下的每个版本组各出一行，数值取该世代的值，
  第一列是这个版本组包含的中文版本名数组。

  每行的字段：版本名数组、属性、分类（物理 / 特殊 / 变化）、威力、命中、PP、版本说明。
  威力和命中可能是 null（变化招式没威力、必中招式没命中），原样返回 null，
  前端渲染成「—」。

  **「版本说明」这一列 prototype 有，但库里和 PokeAPI 数据源都没有这个字段** ——
  返回 null，前端显示「—」。不要拿招式的通用说明去填，那是招式级不是版本级的。

  数值表是重字段，不进 `moveList`。

  **怎么算验证通过**：
  1. `pnpm codegen` 通过，`pnpm tsc --noEmit` 零错误
  2. `moveList(offset: 0, limit: 20, generation: 1)` 返回的招式全部在第一世代存在
  3. 用 slug `razor-leaf` 查详情：返回多行，每行第一个字段是中文版本名数组
  4. `flamethrower` 的行里，第一世代那组威力 95，第二世代起的组威力 90
  5. `leech-seed` 的行里威力是 null
  6. 每行的「版本说明」字段存在且值是 null
  7. `moveList` 的 SDL 里没有数值表字段

---

- [x] **T11 item 域**

  **改哪里**：新建 `graphql/schema/item/schema.graphql`、
  `graphql/schema/item/resolvers/`、`graphql/schema/item/schema.mappers.ts`、
  `graphql/context/item-source.ts`

  **达到什么效果**：

  - `itemList(offset, limit, generation)` —— 每条返回中文名、说明、所属世代、
    登场版本 badges
  - 按 slug 查单条 —— 返回中文名、说明、登场版本，以及「具体版本可用性」表的行

  版本可用性表的列是 游戏版本 / 获取方式 / 可用性。**后两列库里没有数据**
  （52 张表里没有，PokeAPI seed 也没抓），返回 null，前端显示「—」。

  seed 里 156 条道具的 `descriptions` 目前全是空的，所以说明字段大多返回 null ——
  这是预期，前端走「说明暂缺」。**返回 null 不要返回空字符串**，前端靠 null 判断。

  **怎么算验证通过**：
  1. `pnpm codegen` 通过，`pnpm tsc --noEmit` 零错误
  2. `itemList(offset: 0, limit: 20)` 返回 20 条，`pagination.total` 是 156
  3. `itemList(generation: 2)` 只返回第二世代引入的道具
  4. 随便查一条道具详情：说明字段是 null 不是 `""`
  5. 版本可用性表的行里，「获取方式」「可用性」两个字段存在且都是 null
  6. 查不存在的 slug 返回 null，响应体里没有 `errors`

---

- [x] **T12 search 根字段**

  **改哪里**：`graphql/schema/base/schema.graphql` 或新建 `graphql/schema/search/`，
  加对应 resolver

  **达到什么效果**：一个跨 Pokémon / 招式 / 道具 / 特性 的按名称搜索入口，
  给顶部搜索模态框用。每条结果带四样东西：

  - 类型标记 —— 精灵 / 招式 / 道具 / 特性
  - 中文名
  - 一句副文本 —— Pokémon 是「No.0001 · 草/毒」这种（编号 + 属性），
    其余三类是说明的首句
  - slug —— 供前端拼跳转路径

  按各自的 `*I18n.name` 做中文名模糊匹配。**结果最多返回 10 条**（prototype 的模态框
  结果区就是按 10 条设计的高度）。结果里不含版本信息。

  **怎么算验证通过**：
  1. `pnpm codegen` 通过，`pnpm tsc --noEmit` 零错误
  2. 搜「妙蛙」返回 3 条，类型都是精灵，副文本形如「No.0001 · 草/毒」
  3. 搜「茂盛」返回类型是特性的结果
  4. 搜一个跨类型的词（如「火」），结果里同时出现精灵和招式
  5. 搜一个不存在的词，返回空数组，响应体里没有 `errors`
  6. 搜一个能命中 50 条以上的词，返回的结果不超过 10 条
  7. 返回的字段里没有任何版本信息
