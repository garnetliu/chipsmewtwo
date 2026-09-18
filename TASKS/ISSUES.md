# 执行过程中发现的问题

跑 TASKS 时 implementer / reviewer 查出来、但不在当条任务可写范围内的事。
按严重程度排，每条写清楚证据和影响。

---

## 一、数据库与仓库的 schema 不是同一份

`_prisma_migrations` 里有两条**仓库里没有对应文件**的迁移，2026-09-17 02:50 应用：

- `20260917025025_add_flavor_tables`
- `20260917025443_add_full_moon_time`

后果：

- 库里有 `item_flavor_i18n`（52530 行）、`ability_flavor_i18n`、`move_flavor_i18n` 三张表，
  但 `prisma/schema.prisma` 里没有对应 model，Prisma client 访问不到
- `prisma/schema.prisma:526-529,541-542` 写着「`item_effect_i18n` 存游戏文案、10 种语言齐全、
  `shortEffect` 现在一直是空的」，两头都不对：实际是四种语言（en/fr/zh-Hans/zh-Hant），
  而 `shortEffect` 恰恰只有英法有文案、简中那两种语言一列都没填
- `move_learn_method` 是 0 行，而 `move_learn` 有 63 万行引用它

## 二、`pnpm seed` 会毁掉 item 域的数据

`prisma/seed.ts:314-356`。item 本身走 upsert，2222 行不会掉；
但 `itemEffectI18n.deleteMany({})` 会清掉全部 11236 行，再按
`prisma/seed-data/items.json`（仓库里那份还是旧的 156 条）写回 3724 行，
且 `shortEffect` 一律不写（seed.ts:341-343 的注释明说「shortEffect 一律 null」）。

跑一次的后果：`Item.shortEffect` 2222 条全变 null，
`Item.introducedGeneration` 只剩 137 条有值且只落在 gen3–gen8。

## 三、道具的世代筛选 gen7 / gen8 算少，gen9 是空的

库里道具没有 `generationId` 列，T11 走的是 `item_effect_i18n.generationId` 取 min。
各代条数：gen1 131 / gen2 91 / gen3 121 / gen4 219 / gen5 122 / gen6 128 /
**gen7 142 / gen8 1 / gen9 0**，另有 1267 条没有世代。

把 `item_flavor_i18n` 并进来才是 gen7 274 / gen8 528（armorite-ore 那些剑盾道具全在里面），
无世代的降到 608。但那张表正是问题一里 Prisma 访问不到的。

gen9 = 0 是真数据缺口：booster-energy / tera-orb / ability-shield / mirror-herb /
loaded-dice / fairy-feather 在 effect 和 flavor 两张表里都是 0 行。

**影响 T21**：道具列表页点 Gen9 永远是空态，点 Gen8 只有 1 条。

## 四、「重字段不进列表查询」这条口径当前就是被违反的

`graphql/apollo/fragment/POKEMON_POKEMON_ITEM.ts`（已提交，commit 9c86956）
在列表 fragment 里选了 `defaultForm { descriptions { id text } }`。
实测 20 条列表响应体 95 KB。

T08 改不到那个文件（不在可写路径）。**派给 T18（精灵列表）去掉。**

## 五、pokemon 域没拆 Summary 类型，与其余三域不一致 ✅ T26 已收

T09 起，ability / move / item 三个域都是 `XxxSummary`（进列表）+ `Xxx`（详情）两个类型，
重字段只挂详情上，SDL 层真正拦得住。

pokemon 域还是列表详情共用 `Pokemon`，只靠 description 写「列表页别取」的口头约定 ——
因为已提交的前端 fragment 绑死在 `fragment ... on Pokemon` 上，T08 动不了。

**方向已定：以 ability 域为准，T26 让 pokemon 域拆 `PokemonSummary`，不是让其余三域退回去。**

**T26 收法**：`graphql/schema/pokemon/schema.graphql` 加 `PokemonSummary`
（id / slug / name / genus / defaultForm / versions —— versions 进 Summary，
和另外三个域的 `XxxSummary.versions` 一个待遇，四个列表卡都要「登场版本」那一行），
`forms` 和 `evolutionChain` 只留在 `Pokemon` 上。

改到的引用：`PokemonList.data`、`Ability.pokemon`、`Pokemon.evolutionChain` 三处
全部改成 `[PokemonSummary!]`（后两处是反查和自引用，给完整 `Pokemon` 的话
一层层套下去没有尽头）。mapper 加 `PokemonSummaryMapper = PokemonRow`，
resolver 新增 `PokemonSummary.ts`，走的是和 `Pokemon.ts` 同一批 loader，取数没有第二套实现。

前端只动两个 fragment 的 `on` 类型（`POKEMON_POKEMON_ITEM`、`POKEMON_POKEMON_MINI`
从 `on Pokemon` 改成 `on PokemonSummary`），调用方代码一行没改 ——
`GET_POKEMON`（详情）、`GET_POKEMON_STATS`、`GET_POKEMON_OPTIONS` 走的字段
在两个类型上都有。当初判定「动不了」的两处（已提交的 `POKEMON_POKEMON_ITEM`、
`Ability.pokemon` 反查）在没有并发任务之后不成立了。

实测：`pokemonList{ data{ forms } }` 和 `{ evolutionChain }` 现在都被 SDL 拒
（`GRAPHQL_VALIDATION_FAILED`），精灵列表 24 张卡、特性详情 29 张拥有者卡、
进化链、努力值模拟器全部照常。

## 六、`version_i18n` 的 zh-Hans 行存的是繁体字

silver → 「銀」、ruby → 「紅寶石」、sapphire → 「藍寶石」。
不是回退问题，是 zh-Hans 那一行本身的数据错了。53 条版本都有 zh-Hans 行。

另有 6 个版本（red-japan / green-japan / blue-japan / colosseum / champions 等）
没有中文行，会按回退规则显示英文。

**影响四个域的登场版本 badges**，会出现繁简混排 + 英文混排。

## 七、`graphql/schema/form/schema.graphql` 的两条 description 已过期

- `Form.name` 写「form_i18n 还没有导入路径，这个字段目前恒为 null」—— 库里 3198 行
- `Form.abilities` 写「恒为空数组」—— 库里 form_ability 13768 行

数据导进来之后这两条都不成立了，是 T04 那轮没清到的地方。

## 八、前端要接住的数据实情

写给页面任务（批 5）用：

- **默认形态的 `Form.name` 不总是 null**。70 只有名字（castform、rotom、giratina 这类），
  955 只是 null。按「null 就回退 `Pokemon.name`」处理，别写死「默认形态一定没名字」
- **特性的 `shortEffect` 中文几乎全空**：374 条里请求中文时只有 4 条能拿到非 null
  （air-lock / aura-guard / corrosion / gorilla-tactics，且都是回退成的英文）。
  T22 特性列表页那一列「说明暂缺」是主路径，不是边缘情况
- **道具的「一句话说明」只有英法**：`item_effect_i18n` 的 `shortEffect` 列简中一行都没填，
  完整说明 `effect` 列简中是有的。T12 修了 `ItemSource.shortEffectOf` 的回退
  （挑语言前先滤掉没文案的行，否则会选中简中那一行拿到 null 就结束）。
  搜索的道具副文本改走完整说明 `effect`，能拿到中文；
  道具列表页和详情页要不要也改用 `effect`，是 T21 的取舍
- **`item_i18n` 里 `ability-urge` 的简中名是「？？？」**
- **prototype 的 `MOVES` 段是手写演示数据，不是事实基准**。它写「喷射火焰在金/银
  威力调整为 90」，库里和史实都是第六世代才降到 90。
  涉及具体数值、条目数时以库为准

## 九、`app/api/graphql/route.ts` 要列进后续 GraphQL 任务的可写路径

每加一个域都要在这里 new 一个 source，不改 `pnpm tsc --noEmit` 必红。
T10、T11 都已经各加了两行。

## 十、搜索只匹配当前语言的译名，敲英文名零结果

T12 的 `search(keyword)` 只在当前语言（默认 zh-Hans）那一行里做包含匹配，不做语言回退、
不匹配 slug。实测 `pikachu` / `Pikachu` / `Bulbasaur` 全返回空数组
（带 `NEXT_LOCALE=en` cookie 才搜得到）。

任务原文写的就是「按各自的 `*I18n.name` 做中文名模糊匹配」，T12 照做没问题。
但顶部搜索模态框上线后，用户敲英文名零结果是真实体感问题。

**T24 做搜索模态框前要定**：是补一条「同时匹配 slug」，还是对当前语言之外再兜一层回退。

另外有 3 条特性没有简中译名（eelevate、aura-guard、fire-mane），
招式 18 条、道具 95 条同样没有 —— 这些条目在简中下搜不到。

## 十一、`ability` 表的 id 有空洞，`max(id)` 不等于行数

`select count(*) from ability` = **314**，`max(id)` = 374。
T12 一开始拿 374 当总数，算出「63 条没有简中名」，实际是 3 条。

写涉及条目数的 description 时用 `count(*)`，别用 max(id)。

## 十二、库在执行期间被重导过，精确计数会失效

`item_effect_i18n` 在批 3 执行中途从 en/fr 两种语言（11236 行）变成四种语言（27926 行），
导致 T11 刚写进 SDL 的一批数字当场过期（1267 → 806、955 → 1416、gen1 131 → 593）。

**写 description 时优先用性质描述而不是精确计数。**
「简中那一行在库里但一列都没填」不会因为重导失效；「953 条」下次重导就错。
已经写进去的精确数字帮读者判断数量级，可以留，但别在新写的地方无谓地增加。

## 十三、属性色有两份真相：`type.color` 字段 vs CSS token

库里 `type` 表有 `color` 列，存的是 PokeAPI 官方色（fire `#EE8130`、ice `#96D9D6`），
而且已经通过 `graphql/schema/type/schema.graphql:7` 的 `color: String!` 暴露出去了，
注释写着「属性徽章的主题色」。

T13 按裁决规则（prototype 是视觉基准）把 18 种属性色落进了 `app/globals.css` 的
`--color-type-*`，跟库里那一列完全是两套值。

**风险**：批 5 做列表/详情页时，只要有人顺手取 `type.color` 往 `style` 上塞，
同一页就会出现两种火属性红。

**建议二选一**：把这个字段从 GraphQL schema 摘掉，或者让 resolver 直接返回 CSS 变量名。
批 5 的页面任务一律用 `components/pokedex/` 的 `TypeTag`，不要碰 `type.color`。

## 十四、T24 需要额外放开 `app/layout.tsx` 的写权限

T14 把搜索入口做成了 context：`OpenSearchProvider` 要在 `app/layout.tsx` 里包住
`<RootHeader />` 和 `{children}`，T24 才能把模态框接上去。

`components/root-header/` 三个文件确实一行都不用改，但 `app/layout.tsx` 必须改。
而 `TASKS/05-pages.md:13` 给 T24 的独占路径只有 `components/search-modal/`，
批 5 又是并发跑的 —— **派 T24 时要额外放开 `app/layout.tsx`，并确认没有别的并发任务碰它。**

## 十五、暗色下主色文字对比度 3.14:1，低于 AA

`app/globals.css` 里 dark 的 `--primary` 是 rgb(124,58,237)，压在头部底色 rgb(26,18,48) 上
只有 3.14:1，低于 WCAG AA 的 4.5:1（浅色下 7.10:1 没问题）。

头部导航的「当前项」用主色是任务要求的，T14 照做没错，问题在 token 本身。
**影响范围是全站所有用 `text-primary` 的小字**，不只是头部。
要修得动 `app/globals.css` 的 dark `--primary`，会影响所有 shadcn 组件，建议单独处理。

## 十六、`gen` 参数的解析规则必须全站一致 ✅ T26 已收

`GenFilter`（T15）对 `?gen=10`、`?gen=-1`、`?gen=3.5`、`?gen=abc` 这类值的处理是
「不认识 = 不筛选，九个 chip 都不亮」，而且**不会改写地址栏**。

**批 5 的四个列表页读同一个参数时必须用同一条解析规则**（`Number(gen)` 落不进 1–9 就不筛），
否则会出现 chip 行一个都不亮、列表却是空的这种自相矛盾的画面。

`?gen=1&gen=2` 这种重复键 GenFilter 取首值；取消筛选时两个重复键会一起被删掉。

**T26 收法**：解析规则提成 `components/pokedex/gen-filter.tsx` 导出的 `readGen()`
（`Number.isInteger` + 1–9），`GenFilter` 自己和精灵 / 招式 / 道具三个列表页都调它，
各页面不再有第二份判断。

## 十七、`components/pagination-list/index.tsx` 两个小毛病 ✅ T26 已收

reviewer 在 T16 里复现了，严重度都不高，但批 5 会碰到：

1. **`index.tsx:57` 声明的 `ComponentProps<"div">` 是假的** —— 只解构了
   `children/className/pagination/maxSlots` 四个，没有 `{...rest}`。
   传 `data-slot`、`id` 进去没有任何效果（T16 本想拿它当测试锚点，发现不生效，改用外层容器兜）。
2. **`index.tsx:69` 在没有其他 query 时会拼出 `/pokemon?&page=2`**（多一个 `&`）。
   `URLSearchParams` 会忽略空对所以功能不受影响，`gen` 共存也正常（`?gen=1&page=3` 是标准的），
   只是地址栏难看、和 T16 验收 5 字面写的 `?page=2` 对不上。
   修法：空串时不拼 `&`（`rest.size ? ... : ...`）。

**T26 收法**：`...rest` 真的透传到外层 div 上（并补了 `data-slot="pagination-list"`）；
页码前缀改成没有其他 query 时直接拼 `?page=`。

## 十八、`GET_POKEMON_LIST` 还没接 `generation` 变量 ✅ T18 已接，T26 复验

`graphql/apollo/query/GET_POKEMON_LIST.ts:4` 的文档只有 `$offset/$limit`，
而 schema 里 `pokemonList(offset, limit, generation)` 的 `generation: Int` 是有的
（`graphql/schema/pokemon/schema.graphql:20`）。

所以 T15、T16 都没法用「gen 筛一个没数据的组合」验空态，只能用越界 offset 代替。
**T18 接列表页时要把 `generation` 接上**，其余三个域的列表 document 同理。

## 十九、`ListShell` 的 `loading` 是可选的，默认 false

用 `useQuery` 的页面**忘了传 `loading` 会闪一下失败卡**（`useSuspenseQuery` 则不需要）。
批 5 四个列表页接 `ListShell` 时注意传。

## 二十、批 5 四个详情页必须全部走 `DetailLink` / `rememberDetailSource` ✅ 已做到

`components/pokedex/detail-shell.tsx:83` 的 `pendingSource` 写入与导航不是原子的：
点了 `DetailLink` 但那次导航被取消（用户改点别处），残留的来源会被下一个
「非 DetailLink 进入」的详情页消费，面包屑指到上一次那条。reviewer 实测可复现。

prototype 是 `push` 与 `go` 同步发生、且点主导航时 `navStack = []`，没有这个窗口。

**只要 T19–T22 所有进详情的入口都走 `DetailLink` / `rememberDetailSource`，
残留值总会被新值覆盖，影响很小。** 反之如果混用普通 `Link`，面包屑会指错。

## 二十一、列表卡片建议直接换成 `DetailLink`

`app/pokemon/component/pokemon-card.tsx` 现在是 `div` 不是链接。
接 T17 可以走 `rememberDetailSource` + `router.push`（reviewer 实测可用），
但那样会丢掉 `Link` 的预取和中键新开页。

**T18 重写列表卡时直接换成 `DetailLink`。**

另：`components/root-header/index.tsx` 和 `pokemon-card.tsx` 用 `next/image` 时都没有失败兜底，
远程 sprite 404（156 个道具里 38 个没图）会留破图占位。
T17 的 `DetailImage` 有兜底，列表卡片要不要统一走它，批 5 自己判断。

## 二十二、批 5 的验收数字有几处对不上库（待 reviewer 确认）

前置任务实测出来的，批 5 判定时要按实际的来：

- **`moveList` 全量 865**（move 域 SDL 注释写的是 937）
- **`abilityList` 全量 314**（SDL 注释写 374 —— 那是 `max(id)`，见第十一条）
- **`itemList` 全量 2222**（T21 验收写 156）
- **charizard 的 `forms` 是 4 条**（多一条「超极巨化的样子」），
  T19 验收第 7 条写的「三个 chip（喷火龙、超级喷火龙 X、超级喷火龙 Y）」对不上数据。
  要不要过滤 gmax 由 T19 定
- **`AbilitySummary.shortEffect` 20 条里 19 条是 null** —— T22 列表的「简短说明」列
  几乎整列「说明暂缺」。`AbilitySummary` 上没有 `effect`，列表层面补不了
- **`ItemSummary.shortEffect` 是英文**（`Held: Doubles the money earned…`），
  不是 T21 里写的「全是空的」—— 当前库的数据比 seed 文件全

## 二十三、几处 GraphQL 层取不到、页面只能降级的数据

- **T19 ④ 版本可用性表的「世代」列取不到** —— `Version` 类型只有 `id/slug/name`，
  没有 generation；`Pokemon` 上也没有类似 `ItemAvailability` 的可用性表。
  那张表只能按 `versions` 一行一个版本铺，「世代」列要前端拿版本 slug 映射
- **`Move` 类型上没有「当前属性/分类」** —— T20 详情 hero 的属性胶囊和分类徽章
  只能取 `versionStats` 最后一行（razor-leaf 最后一行是 PHYSICAL，第一行是 SPECIAL）
- **`forms[].name` 在默认形态上是 null**，页面要回退成 `pokemon.name`

## 二十四、「登场版本」是重字段但四个列表页都要它

任务书把登场版本列进重字段（不进列表查询），但 `05-pages.md` 四个列表页全都要版本 badges，
T18 验收第 2 条还明确要「至少一个版本 badge」。

前置任务按页面需求取了 `versions`。代价：一只妙蛙种子 41 个版本 ≈ 2 KB，
列表响应体 pokemon 40 KB / move 45 KB / item 47 KB / ability 29 KB（每页 20 条）。

SDL 上 `versions` 没有 limit 参数，**前端截断省不了流量**。
要真降下来得改 schema（加 `versions(limit:)` 或 `versionCount`），归 T26。

---

# 批 5 并发暴露的横向分叉（T26 要收口）

七条并发做完后浮现的，逐条审看不出来 —— 这正是并发批的代价。

## 二十五、头部撑出 870px 最小宽度，全站窄屏横向滚动 ✅ T26 已收

`components/root-header/index.tsx` 那行是 `flex h-16 gap-8 px-6`，
brand + nav（5 项 `gap-7`）+ 搜索框 `w-96` + 主题切换都不换行。

T18、T21 各自独立量到：视口 <870px 时 `document.documentElement.scrollWidth = 870`，
**在没碰过的首页 `/` 上同样复现**，各页面自己的 `main.scrollWidth` 都等于 clientWidth。

**影响**：T18 验收 6（400/768px 不出横向滚动条）、T21 验收 7 在文档级别都挂。
两条任务都判定溢出源不在自己页面。**T26 要收窄头部**（搜索框让位、nav 换行或折叠）。

**T26 收法**：按这个顺序让位 —— 站名文字和主题切换的文字标签在 <1024 收起
（主题那三个词收成 `sr-only`，可访问名还在）、搜索框的提示文案和快捷键在 <640 收起、
导航整条在 <768 换到第二行（`flex-wrap` + `basis-full`）。
实测 400 / 768 / 1440 三档、14 个地址（含四个「未找到」页）`scrollWidth` 都等于视口宽。

**残留一条 dev-only 告警**：400px 下头部那对亮/暗 logo 会成为 LCP 元素，
Next 的开发期观察器提示「Please add `loading="eager"`」。但同一份文档
（`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md:1321`）
对这种亮/暗两张图的写法明确说**不能**用 `preload` / `loading="eager"`（两张都会被拉下来），
该用 `fetchPriority="high"`，仓库照它写了。
而 Next 那条告警的判断只看 `loading === "lazy"`
（`node_modules/next/dist/shared/lib/get-img-props.js:489`），不看 fetchPriority ——
按文档写就必然挨这条提示，生产构建没有这个观察器。
详情页 hero 是单张图不受这条限制，已改成 `loading="eager"`，1440px 下控制台是干净的。

## 二十六、列表页外层容器三家不一 ✅ T26 已收

- `app/pokemon/page.tsx`（T18）：`main.px-6 py-8`，不带 container
- `app/ability/page.tsx`（T22）：同上，跟的 pokemon
- `app/move/page.tsx`（T20）、`app/effort-values/page.tsx`（T23）：`div.container mx-auto px-6 py-8`
- `app/item/page.tsx`（T21）：`px-6 py-8`

**T18 的 reviewer 给了裁决依据**：`docs/prototype-stage3.html:101` 是
`<main class="px-6 py-8">`，没有 container。所以 **`main.px-6 py-8` 那一派是对的**
（按裁决规则第 1 条），带 `container mx-auto` 的是偏离。
- 详情页：`app/pokemon/[name]/`（T19）用 `container mx-auto px-6 py-8`、
  `app/ability/[name]/`（T22）用 `DetailShell className="px-6 py-8"` 不带 container

prototype 是整宽 `px-6` 没有 container。**T26 统一。**

**T26 收法**：十个路由（首页、四个列表、四个详情、努力值模拟器）的最外层统一成
`<main className="px-6 py-8">`，`container mx-auto` 全站零命中，每页也都有了 `<main>` 地标。
1440px 下十个页面的正文宽度都是 1440，列表和详情之间来回点不再左右跳。

## 二十七、版本 badge 的截断口径至少三种 ✅ T26 已收

reviewer 实测确认（三处都查过源码和渲染结果）：

- `app/pokemon/component/pokemon-card.tsx:24` —— `VERSION_LIMIT = **2**` + 「+N」。
  理由：两列布局下版本行只有 222px，4 块要 288px 会裁
- `app/ability/component/ability-row.tsx:27` —— `VERSION_LIMIT = **4**` + 「+N」。
  理由：22% 宽的列，截断时表高 939px、全摆 3747px（3.99 倍）
- `app/move/component/move-row.tsx:74` —— **全摆不截断**。
  实测招式列表第一行 **53 个 badge**，表高 **2863px**
- `app/item/component/item-versions.tsx:37`（经 `item-card.tsx:53`）—— **不截断**。
  前四张卡 28/53/53/32 个
  （原记「不是同一场景不参与」**不成立** —— `item-card.tsx:53` 就是道具列表卡上的
  「登场版本」那一行，和 `pokemon-card.tsx` 同一场景同一件事，一个截到 2 个、一个摆 53 个）

**是四种不是三种。**

**同一类东西三种做法。T26 要定一个口径。**

**T26 收法**：`components/pokedex/version-badges.tsx` 一处实现，八处调用方全换。
口径写在组件里：**列表页截断、详情页全摆**；截断到几块由调用方按自己那一格的实测宽度传
（精灵卡 2、特性行 4、招式行 4、道具卡 4），不传就是全摆。
招式表第一行从 53 块降到 4 块 +「+N」，整张表 2863px → 1159px。

## 二十八、`MiniBadge` 被造了四次（原记两次，已更正）✅ T26 已收

- `app/item/component/mini-badge.tsx`（T21 新建，`tone="primary"/"muted"`）
- `app/ability/[name]/page.tsx` 里的 `BADGE` 类名常量（T22）

是同一个东西（prototype 的 `.badge-mini`）。T22 说它不愿跨页面 import 另一条并发任务的私有组件，
所以自己写了一份。**T26 把 `MiniBadge` 提到 `components/pokedex/`，两边都用。**

## 二十九、`PAGE_SIZE` 不一致 ✅ T26 已收（值保留，口径和位置统一）

- T18 精灵列表：**24**（改的，理由是 3 的倍数配 3 列网格）
- T20 招式 / T21 道具 / T22 特性：**20**

**T26 判断要不要统一** —— 3 列网格用 24、2 列用 20、表格用 20 也可能是合理的，
但要有明确口径而不是各写各的。

**T26 的判断**：值不统一，口径统一成「一页的条数取网格列数的整数倍，表格取 20」——
精灵三列网格 24，道具两列网格 20，两张表 20。位置和命名统一：四个域都是列表文件里
一个 `const PAGE_SIZE`，骨架也在同一个文件里（`item-list-skeleton.tsx` 已删，
`ITEM_PAGE_SIZE` 这个名字没了，卡片高度常量挪成 `ITEM_CARD_HEIGHT`，
和精灵那边的 `POKEMON_CARD_HEIGHT` 一个写法）。

## 三十、`DetailShell` 的「未找到」按钮报 Base UI 告警 ✅ T26 已收

`components/pokedex/detail-shell.tsx` 里
`<Button variant="secondary" render={<Link .../>}>` 渲染出非 `<button>`，控制台报
`A component that acts as a button expected a native <button> because the nativeButton prop is true`。

**四个详情页的未找到态都会报。** 属批 4 共享件，修法是加 `nativeButton={false}`。

**T26 收法**：不走 Base UI 的 Button，直接给 `Link` 套 `buttonVariants({ variant: "secondary" })`
的类名。视觉一致、无告警，而且无障碍角色保持 `link` —— 这一下本来就是纯导航。
（先试过 `nativeButton={false}`，它把角色降级成 button，是无障碍上的退步，已撤回。）

## 三十一、`DataTable` 在窄屏没有横向滚动包装 ✅ T26 已收

T20 的 reviewer 实测：招式详情页那张 7 列表格在 400px 下超出 20px（right=420），
来源是 `components/pokedex/data-table.tsx` 本身没有 `overflow-x-auto` 包装。

T21 在自己的可用性表外面手动包了一层 `overflow-x-auto` 兜住了，
其他用 `DataTable` 的地方没有。

**T26 要么把包装收进 `DataTable`，要么定一条「调用方自己包」的口径** —— 现在是各写各的。

**T26 收法**：包装收进 `DataTable`（表外面套一层 `overflow-x-auto` 的 div），
`item-availability.tsx` 手包的那层删掉。招式详情在 400px 下不再溢出 20px。

## 三十二、整行可点的固有代价（已确认，不算缺陷）

T20/T22 的表格行是 `<tr onClick>`，因此：
- Tab 到不了行（无 `tabindex`/`role`）
- Cmd+点、中键点行内空白不会新开页

只有行内那个「查看详情」真 `<a href>` 支持 Cmd+点、中键、键盘回车。
任务没要求行可键盘到达，prototype 也是 `tr.onclick`，**不算未完成**。
但如果以后要补无障碍，这是入口。

## 三十三、道具分类没暴露在 SDL 上，「携带道具」徽章因此挂错

**更正 T21 报告里的一个说法**：库里**有**分类字段 —— `item.categorySlug` 2222 条全非空，
另有 `item_category` / `item_category_i18n` 两张表（reviewer 查证）。

它只是没有暴露在 `graphql/schema/item/schema.graphql` 的 `Item` / `ItemSummary` 上。

后果：详情页 hero 的「携带道具」是 prototype 的固定文案，
实测 `/item/poke-ball` 也挂着「携带道具 / 第 1 世代引入」。

**这个区别很重要**：不是「要补数据」，只是「放开一个字段」。
T26 决定要不要在 SDL 上加 `category`，加了之后徽章文案就能跟着分类走。

## 三十四、`MiniBadge` 实际被造了四次不是两次 ✅ T26 已收

reviewer 在 T21 的复查里数出来的：
- `app/item/component/mini-badge.tsx`（T21）
- `app/ability/[name]/page.tsx:13` 的 `BADGE` 常量（T22，类名与 MiniBadge **逐字相同**）
- `app/move/[name]/page.tsx:81`（T20）
- `components/search-modal/search-hit-row.tsx:37`（T24）

四份。第二十八条记的「两次」要改成四次。
reviewer 也确认了确实无现成可复用（`components/ui/` 只有 button/pagination/tabs，
`components/pokedex/` 的 ver-badge / type-tag / gen-chip 形态都不是 `.badge-mini`）。

**T26 把 `MiniBadge` 提到 `components/pokedex/`，四处都改用它。**

**T26 收法**：`components/pokedex/mini-badge.tsx`，tone 三档 primary / muted / success。
四份 MiniBadge + 三份绿色 success 徽章共七处全换过来，
`app/item/component/mini-badge.tsx` 已删。精灵卡和 hero 那两处的 `px-1.5 py-0.5`
一并改回 prototype 的 `.badge-mini`（`px-[0.45rem] py-[0.15rem]`）。

## 三十五、`--warning` 在浅色面上对比度 1.81:1

T23 的三角警示图标（`--warning` = `#F59E09`）压在 `bg-warning/20` 的圆底（`#FBE9CE`）上，
浅色模式对比度 **1.81:1**，低于非文字元素的 3:1（暗色模式 6.41:1 没问题）。

**不是 T23 引入的**：prototype 同一处是 `#d9901a` 压 `--warning-soft: #fdf3e0`，
自己算也只有 2.40:1，本来就没到 3:1；仓库的 `--warning`（oklch 0.769）比 prototype 更浅，
所以落到 1.81。

回退成 `text-warning-foreground` 能拿到对比度，但那样图标是近黑的，
直接违反任务写死的「黄色三角警示图标」（上一轮已判过）。

真要修得动 `app/globals.css` 的 `--warning`，**会影响全站所有 `text-warning` 压浅色面的地方**
（种族值条第三档色也用它）。和第十五条（暗色 `--primary` 3.14:1）是同一类 token 级问题，
**归 T26**，不在并发批里单条任务改全局 token。


## 三十六、`pokemonList.versions` 偶发返回空数组（不可复现，先记一笔）

T18 的 reviewer 观察到：某一次浏览器里 24 张卡有 5 张只剩「登场版本」标签没有 badge，
同一时刻 curl 也复现 wartortle / weedle 的 `versions` 为 0。

事后 API 连打 11 次、浏览器复测 3 次都稳定 24/24，**不可复现**。

怀疑是并发批多个 agent 同时压同一台 dev server 时的连接池抖动。
可疑位置 `graphql/context/pokemon-source.ts`。并发批结束后如果还能复现再查。


---

# 批 5 集成检查的完整结论

全量命令六条全绿（codegen 幂等、tsc 0、**lint --fix 一个文件都没改**、test 136 passed、
e2e 1 passed、build 15 条路由）。

**但 `pnpm test:e2e` 只有 1 个 test**（T02 建的首页冒烟）——
批 5 七条任务一个 e2e 都没加，「全量命令通过」这个信号对批 5 基本是空的。
T25 会补四个详情页的 SEO 用例。

## 🔴 必须改（用户可见 / 阻碍后续）

### A. `gen` 解析三种口径，两个页面会白屏 —— 这是真 bug ✅ T26 已收

- `app/move/component/move-list.tsx:22-25` —— `Number.isInteger(gen) && 1<=gen<=9` ✅ 正确
- `app/pokemon/component/pokemon-list.tsx:30-31` —— `Number(...) || 0` 后只判区间，**不判整数**
- `app/item/component/item-list.tsx:20-21` —— 同上

实测 `?gen=3.5` 把 `3.5` 送进 `Int` 变量 → `BAD_USER_INPUT: Int cannot represent
non-integer value: 3.5` → **整页「列表加载失败」，九个 chip 一个都不亮**：

| 地址 | 实测 |
|---|---|
| `/pokemon?gen=3.5` | 失败卡 |
| `/item?gen=3.5` | 失败卡 |
| `/move?gen=3.5` | 正常展示全量 ✅ |

比第十六条记的更糟 —— 不是空列表，是失败卡。
**收法**：把 `readGen` 提到 `components/pokedex/gen-filter.tsx` 导出（和写入侧同文件），
三个列表页和 `GenFilter` 自己都用它。

**已按这个收法做完**。`?gen=3.5` 实测三个列表页都正常展示全量、九个 chip 一个都不亮；
`?gen=3` 三页都是一个 chip 亮、列表筛过。`gen-filter.test.tsx` 加了两条用例
（`readGen` 的取值表、小数不点亮 chip）。

### B. 五个页面没有 title，`try/catch` 有一处口径不同 ✅ T26 已收

`app/layout.tsx:35` 的 `template: "%s · chipsmewtwo"` 铺好了，但只有
`/pokemon`、`/ability`、`/effort-values`、`/pokemon/[name]` 接了。
**`/move`、`/item`、`/move/[name]`、`/item/[name]`、`/ability/[name]` 五个页面标题是光秃秃的
`chipsmewtwo`** —— 详情页要被搜索引擎收录，标题缺失直接影响这件事。

`try/catch` 三比一：pokemon / move / ability 的 `data` 为 `undefined` 时判成**未找到**，
`app/item/[name]/page.tsx:20` 判成**故障**。同一个输入，item 出「加载失败」另外三个出「未找到」。
**item 的写法更贴合全局口径**，但四个必须一致。

**收法**：`detail-shell.tsx` 导出一个 `loadDetail(query, variables, pick)`，四个页面调同一个，
metadata 的取法也在里面统一。

**已收，但 `loadDetail` 放在新文件 `components/pokedex/load-detail.ts` 不是 detail-shell.tsx**
—— 后者是 `"use client"`，把服务端 Apollo client（`next/headers`）拖进客户端模块图会直接报错。
四个页面的取数和 `generateMetadata` 现在都走它，口径按 item 那份（`data` 为 `undefined` 判故障）。
顺带把四个页面传给壳的 `result` 也统一成 `result && { data: 条目 id }` ——
壳是客户端组件，整条资料当 prop 传进去会在 RSC 负载里再序列化一遍。

### C. 外层容器**五种**写法，正文宽度三个值并存 ✅ T26 已收（见第二十六条）

1440px 下：`main.px-6 py-8`（pokemon/ability 列表）= 1392、`div.px-6 py-8`（item 两页）= 1392、
`DetailShell className`（ability 详情）= 1440、`container mx-auto`（move 两页 / effort-values /
pokemon 详情 / move 详情）= **1232**。

**列表页和详情页之间来回点，内容左右跳 80px，肉眼可见。**

裁决依据：`docs/prototype-stage3.html:101` 是 `<main class="px-6 py-8">`，全文件只此一处
`<main>`、没有 container → **`main.px-6 py-8` 那一派对**。
另外 `app/layout.tsx` 没有 `<main>`，所以 move / item / effort-values / 四个详情页
**当前整页没有 main 地标**。

### D. 努力值模拟器是唯一没做响应式的页面 ✅ T26 已收

`simulator.tsx:37` 是 `grid grid-cols-2`、`stats-panel.tsx:105,174` 是 `grid grid-cols-3`，
全站其余每一处都是 `grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3`。

400px 实测：已选态参数栏 104px、结果栏 228px，输入框被压到几十 px 无法输入。

**现在因为头部把全站最小宽度顶到 870px 看不出来，一旦按第二十五条收窄头部，
这一页就是唯一暴露的破页。两条必须一起改。**

**T26 收法**（和第二十五条同一批做的）：`grid-cols-2` / `grid-cols-3` 全部改成
`grid-cols-1 ... md:grid-cols-N`，结果卡的 `col-span-2` 改成 `md:col-span-2`，
六行参数的 `grid-cols-12` 改成 `grid-cols-6 md:grid-cols-12`（窄屏名字独占一行、
个体值和努力值各半行、进度条独占一行）。400px 实测输入框从几十 px 回到 149px。

## 🟡 该收口（重复实现，不收会继续长）✅ T26 四条全收

- **「登场版本」那一行被写了七份**（`item-versions.tsx`、`pokemon-card.tsx:90`、
  `pokemon-hero.tsx:71`、`ability/[name]/page.tsx:67`、`move/[name]/page.tsx:35`、
  `ability-row.tsx:85`、`move-row.tsx:72`、`pokemon-versions.tsx:58`），
  标签有无、截断与否、间距 `gap-1` vs `gap-1.5` 各不相同。
  **收法**：`components/pokedex/version-badges.tsx`，props 收 `versions` / `label?` / `limit?`，
  八处全换，`item-versions.tsx` 删掉，截断口径一并落这里
  —— **✅ 按这个收法做完**，连道具可用性表那一格一共九处，`item-versions.tsx` 已删。
  另外收了 prototype 的两档尺寸（列表卡 gap-1 + 10px 标签、详情和表格 gap-1.5 + 11px 标签）
  成 `size` 参数，版本为空时整行不出
- **小徽章家族三个实现族九处拷贝**：MiniBadge 四份 + 绿色 success 徽章三份，
  其中 `pokemon-card.tsx:74` 和 `pokemon-hero.tsx:55` 的 padding 是 `px-1.5 py-0.5`（0.375/0.125rem），
  和 prototype `:62` 的 `.badge-mini{padding:.15rem .45rem}` 对不上；
  `ability/[name]/page.tsx:49` 那份才是对的
  —— **✅ 七处全换成 `components/pokedex/mini-badge.tsx`**（tone: primary / muted / success），
  padding 按 prototype 那一份
- **图片占位两套、渐变串三份**：渐变数值三个都对（13%/15%/13% 分别对应 prototype 的
  `22`/`26`/`22`），纯粹是模板字符串抄了三遍；
  `DetailImage` 和 `PokemonThumb` 的 404 兜底逻辑是逐字复制的 15 行。
  **收法**：`token.ts` 加 `typeGradient(slug, strength)`，`DetailImage` 加 `fallback?: ReactNode`
  —— **✅ 按这个收法做完**。三处渐变串换成 `typeGradient`（列表卡 13%、详情 hero 15%），
  `PokemonThumb` 改成 `DetailImage` + `fallback`，那 15 行复制的 404 兜底删掉了
- **卡内空态四份**，一个居中带留白、两个左对齐贴边、一个在表格里。收成 `CardEmpty`
  —— **✅ 收成 `components/pokedex/card-empty.tsx`**，四处全换

## 🟢 记一笔

- `PAGE_SIZE` 值和命名都不一：pokemon 24、其余 20；且 `ITEM_PAGE_SIZE` 定义在**骨架文件**里
  被列表反向 import，另外三个是列表和骨架同文件
  —— **✅ T26 收了命名和位置，值按「网格列数的整数倍」的口径保留**，见第二十九条
- 失败态判定三套：`list-shell` 和 `detail-shell` 靠 null，搜索模态框靠 `useQuery` 的 `error`
  （搜索确实只能这样 —— `search` 返回 `[Type!]!` 没法用 null 区分），但文案样式也不一致
  —— **T26 不收**：机制上搜索没法跟另外两个一样（SDL 层就不允许），
  剩下的只是文案和样式差异，改它要动搜索模态框的失败态呈现，收益不抵风险。留着
- 「—」占位三种写法共 9 处
  —— **✅ T26 收成 `components/pokedex/blank.ts` 的 `BLANK` / `blankText(value, suffix)`**，
  九处全换（招式详情四列、精灵版本表三列、种族值、道具可用性两列、四个列表页头的条目数）
- 相对路径 import 两套约定（`./xxx` vs `@/app/...`）
  —— **T26 不收**：eslint 没有规则挡它，统一要动几十个 import 而行为一点不变，
  改动面大到会淹没这条任务里真正的修复。要收该配一条 lint 规则一次性做，单独开

## 批 5 范围外的新发现

**负数 `offset` 会把 Prisma 原始报错整串吐出来**，含本机绝对路径和 Turbopack 内部模块名，
`extensions.code` 是 `INTERNAL_SERVER_ERROR` 而不是 `BAD_USER_INPUT`。四个域一致复现。
页面不会发负数 offset（`page` 被 `Math.max(1,...)` 夹过），不影响批 5。
建议在 resolver 入口校验 `offset >= 0 && limit > 0`。

## 三十七、五个页面缺 `generateMetadata`，而且没有任何任务会补 ✅ T26 已收

`app/layout.tsx:35` 的 `template: "%s · chipsmewtwo"` 铺好了，但只有
`/pokemon`、`/ability`、`/effort-values`、`/pokemon/[name]` 接了。

**`/move`、`/item`、`/move/[name]`、`/item/[name]`、`/ability/[name]` 五个页面**
标题是默认的 `chipsmewtwo` + 默认 description。

T25 的 reviewer 指出：**「留给 T26」这个理由站不住** ——
T26 的五项验收里没有 metadata 这一项，照现在的排期**没有任何一条任务会补上**。

详情页是要被搜索引擎收录的（全局口径原话），标题缺失直接影响这件事。
**要么扩 T26 的范围，要么另开一条。**

**T26 收法**：`/move`、`/item` 两个列表页补静态 `metadata`；`/move/[name]`、`/item/[name]`、
`/ability/[name]` 补 `generateMetadata`，照精灵详情的模式（查不到出「未找到该 X」，
description 取 effect / shortEffect）。十个页面逐个 curl 过 `<title>`，全都带上了名字。

## 三十八、`app/loading.tsx` 把全站正文推进 hidden 容器

`app/loading.tsx:2` 是早期留下的调试占位（文案就是 `root loading...`）。
它给**每一条路由**套了 Suspense 边界，连 `/` 和 `/effort-values` 这两个静态预渲染页也一样，
整页正文因此被推进 `<div hidden id="S:n">`，靠 `$RS`/`$RC` 脚本挪位。

**后果**：不执行 JS 的爬虫拿到的 DOM 里，全站唯一可见的正文是一句 `root loading...`。
T25 的 reviewer 在**生产构建**上验了同一结构，不是 dev 独有。

**✅ T25 已删掉这个文件。** 删前逐页确认过：四个列表页各自在 `page.tsx` 里包了
`<Suspense fallback={骨架}>`，不会失去加载态；`/` 和 `/effort-values` 是同步页面。
删后 `<div hidden id="S:n">` 从 6 个降到 0，dev 和生产构建两边都复验过。

**为什么是删不是下沉**：四个详情页是 async RSC，一旦某个详情段加 loading.tsx，
正文立刻又回到 `<div hidden>`，跟 SSR 收录的口径直接冲突。

**代价**：详情页导航现在没有转圈了（点链接后停在旧页面直到新 HTML 到）。
reviewer 确认没有两全的办法 —— `loading.tsx` 是唯一能给路由级即时 fallback 的机制，
而它一存在就必然把正文推进 hidden 容器。正解是 `useLinkStatus()`（链接级 pending 状态，
不引入 Suspense 边界、不改 HTML）。代价本身不大：生产构建下四个详情页 TTFB 49–129ms。

`e2e/seo.spec.ts` 的断言已加硬成 `toBeVisible()` + 文本两样，
把 `loading.tsx` 放回去四条会立刻红 —— 这个回退有用例挡着了。


## 三十九、`detail-shell.tsx:166` 的注释已过期 ✅ T26 已收

`components/pokedex/detail-shell.tsx:166` 写着「没有加载态 —— 详情页是 RSC…
**转圈交给路由段的 loading.tsx**」。

T25 删掉根 loading 之后全仓没有任何 `loading.tsx`，而详情段又恰恰**不能**加
（加了正文就回 `<div hidden>`，`e2e/seo.spec.ts` 会立刻红）。

严重程度低（纯注释不影响行为），但照它去加 loading.tsx 的人会踩坑。T26 顺手改掉。

**T26 收法**：注释改成「不要给详情段加 loading.tsx」并写清原因，指向 `useLinkStatus()`。

## 四十、`Form` 上的重字段仍然只有一道用例挡着（T26 最终 review 查实）

四个域的列表类型都拆成 `XxxSummary` 之后，SDL 层能拦住 `forms` / `evolutionChain` /
`versionStats` / `availability` / `pokemon`（拥有者）这些。

**但 `Form` 是 `PokemonSummary.defaultForm` 和 `Pokemon.defaultForm` 共用的**，
所以挂在 `Form` 上的三个重字段 SDL 一点不拦，reviewer 实测都查得通：

```
pokemonList{ data{ defaultForm{ descriptions{id} } } }     ← 通
pokemonList{ data{ defaultForm{ stats{hp} abilities{id} } } }  ← 通
```

现在唯一挡着它们的是 `graphql/apollo/__tests__/document.test.ts` 的 `HEAVY_FIELDS` 用例。

**要真正在 SDL 层拦住，得再拆一个 `FormSummary`**（`defaultForm` 在列表上返回它）。
没做，记在这里。用例这道防线是有效的（往 document 里注一个重字段会立刻红），
但它拦的是仓库内的 document，拦不住直接打端点的调用方。
