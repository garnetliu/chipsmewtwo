# 系统设计：Pokémon 中文资料站

本文只写**为什么这么选**。接口形状在 `_contracts/api-routes.json`，系统分块在
`.ab/arch.json`，决策索引在 `.ab/design.json`，需求在 `docs/PRD.md`。

每条决策的裁决过程记在 `.ab/questions.json`（Q-025 ～ Q-035）。

---

## DEC-001 技术栈沿用仓库既有事实：ts + next-app + prisma + graphql

**选了**：TypeScript · Next.js 16 App Router · Prisma 7 · GraphQL（Apollo Server 5）。
无独立后端框架，数据入口是 Next 的 Route Handler。

**为什么**：这五项全部已经在仓库里跑着 —— `app/` 目录、52 个 Prisma model、
已建的 GraphQL SDL 与 codegen 流水线。选型的第一判据是「既有事实优先，探到了就不推翻」，
推翻需要单独论证「为什么值得重写」，而这里没有任何理由。

**被拒的替代**：换 REST（要重写整条 codegen 与 Apollo 链路）；换 Drizzle
（52 个 model 加 migration 历史要重来，而你已明确说过库不改）。

**顺带修的一处**：`.abrc.json` 原先没有 `stack` 字段，而自动探测报的是
`ts+js / next-app / prisma` —— **`api: graphql` 这一维探不出来**。已写进
`.abrc.json` 的 `stack`，否则 GraphQL 相关的知识包与门禁挂不上去。

---

## DEC-002 单端点 GraphQL，不做 REST

**选了**：所有数据操作走同一个 `POST /api/graphql`。契约里按 GraphQL 根字段拆成
10 条，`endpoint` 写成 `POST /api/graphql#pokemonList` 这种形式。

**为什么**：`app/api/graphql/route.ts` 的首行注释早就引用了这条决策编号，而
`docs/DESIGN.md` 一直不存在 —— 这份文件补上的正是那个悬空引用。契约拆到字段级
是因为下游的任务拆解与覆盖率判定靠这张表干活，一条笼统的 `POST /api/graphql`
等于什么都没说。

**被拒的替代**：只写一条真实 HTTP 端点（诚实但信息量为零，字段级契约全落在
SDL 里，`api-routes.json` 变成摆设）；两者都写（端点归属会重叠，`arch-closure`
的「端点归属唯一」就要想办法绕）。

**已知代价**：`#字段名` 不是标准 HTTP 路径写法。按路径去代码里找实现的门禁
可能对不上这 10 条 —— 这是为了换取字段级信息而接受的代价，不是疏忽。

---

## DEC-003 列表分页用 offset/limit，不用 cursor

**选了**：`(offset: Int!, limit: Int!)` 配 `PaginationMeta { page, pageSize, total,
totalPages, hasNext, hasPrev }`，四个列表页共用。

**为什么**：资料在 seed 导入后是静态的，cursor 要解决的「翻页时数据在变」这里
不存在；而「跳到第 5 页」「共 1025 条」恰恰是资料站真需要的，cursor 给不了。
现有 `pokemonList` 已是这个形状且分页已接上地址栏。

**被拒的替代**：cursor 分页（要改 schema、resolver 和已接地址栏的分页组件，
换来一个这个项目用不上的性质，还丢掉页码跳转）。

---

## DEC-004 查不到返回 null，真错才进 GraphQL errors

**选了**：两层错误语义。查不到某一条 → 返回 `null`，不算错误，由前端展示
「未找到该 X」（AC-010 / AC-025 / AC-039 / AC-052）。真出错（库连不上、参数非法）
→ 进 GraphQL `errors` 数组，带 `extensions.code`。HTTP 一律 200。

**为什么**：HTTP 一律 200 是 GraphQL 惯例；而 schema 里 `pokemon(id: ID!): Pokemon`
本来就是可空的 —— 把「没有这一条」表达成 null 与类型一致。前端因此能用
「字段是不是 null」区分空态与故障，不必解析 errors。

**被拒的替代**：查不到也算错误、统一走 `errors` + `NOT_FOUND` 码（每个详情页都要
解析 errors 才能区分「没这个东西」和「库挂了」，而这两种要展示完全不同的界面）。

---

## DEC-005 数据只来自本地库，运行时不回源 PokeAPI

**选了**：运行时只查本地 Postgres。外部数据源（PokeAPI）只在 `pnpm seed:refresh`
时接触，不在请求路径上。

**为什么**：`graphql/schema/pokemon/schema.graphql` 原先的文档字符串写着
「库里没有时会尝试补数据（见 `POKEMON_FETCH_MODE`）」，而全仓 grep 只命中那一处
注释 —— 没有实现、没有这个环境变量。schema 的 description 是对客户端的承诺，
会被 codegen 带进类型、被任务拆解当成要建的东西，所以不能留着。

裁决是删掉而非实现：seed 已把 3.3 MB 的 Pokémon 数据导进库，运行时回源会把一个
确定性的资料站变成依赖外部网络的站，而 PRD 的 NFR 要求详情页约 2 秒首屏。

**被拒的替代**：真的实现回源（要定回源条件、超时、失败处理、是否写回库，还要一个
新环境变量，换来的能力这个项目并不需要）；留着注释标「尚未实现」（契约里留一个
没人兑现的承诺）。

**已改**：那两段文档字符串已改写，不再提 `POKEMON_FETCH_MODE`。

---

## DEC-006 GraphQL 端点靠查询深度限制防护，不做频次限流

**选了**：契约里所有端点 `rateLimit: "none"`；改用 Apollo 插件限制查询嵌套深度
（`CON-004`：不超过 10 层，超出直接拒绝）。

**为什么**：`/api/graphql` 是匿名可调用的 POST，按 `stage-arch` 必须回答 `rateLimit`。
纯只读资料站里频次限制收益不大，而 GraphQL 特有的放大器是**嵌套深度**：
仓库自己的 schema 注释就写着「一只形态在库里有几十个版本 × 十种语言的行，
列表页整页一起查会拉出上千行」。深度限制成本极低、挡的正是这个。

`"none"` 在这里是一次明确声明，不是没人想过。

**被拒的替代**：加 IP 频次限流（要一个共享存储，内存计数在多实例下不准，
而挡的不是这个项目的真实风险面）；两样都不加（GraphQL 的放大器没有任何防护）。

---

## DEC-007 首版关闭 /api/auth 端点

**选了**：`/api/auth/[...all]` 首版不挂载。`lib/auth.ts` 的配置保留，供后续启用。

**为什么**：PRD 已裁决首版不做登录（Q-002），但当时只定了「不接入页面」，端点本身
仍然是活的 —— `emailAndPassword` 和 GitHub OAuth 都开着，匿名可 POST。
一个没有任何 `AC-*` 验收、没有页面入口、却允许匿名往 `user` 表写行的端点是纯风险：
别人能往你库里写数据，而你根本不会去看。

关掉之后契约里不再有匿名写端点，`rate-limit-declared` 那条判据的适用子集为空。

**被拒的替代**：留着加限流（限流只是让滥用变慢，不解决「这个功能本期根本不该存在」）；
留着不动（现状，即上面说的风险）。

---

## DEC-008 详情页服务端渲染，列表页客户端取数

**选了**：四个详情页用 RSC 在服务端取数；四个列表页的筛选与翻页走客户端 Apollo。

**为什么**：PRD 的 NFR 要求**详情页**具备基础搜索引擎收录能力（`CON-003`）——
那要求服务端渲染出完整 HTML。而列表页的筛选翻页是纯交互，客户端请求响应更快。
两条路仓库里都已搭好：`graphql/apollo/server.ts`（RSC）与
`graphql/apollo/client.ts`（浏览器）。

**被拒的替代**：全部 RSC（每次筛选翻页都是一次完整往返）；全部客户端
（详情页拿不到 PRD 要求的搜索引擎收录）。

---

## DEC-009 重字段只在详情页取，列表页不取

**选了**：`Form.descriptions`、招式的世代表这类「一行变几十行」的字段不进列表页
查询。客户端缓存维持 `InMemoryCache` + `dataMasking: true`。

**为什么**：这原本只是 schema 里的一句注释（「这个字段留给详情页」），而注释拦不住
下一个写查询的人。升成约束（`CON-005`）之后它有了落点，改那几个列表端点时会被找出来。
fragment masking 已开，字段归属由声明它的组件持有，天然支持这种分层。

**被拒的替代**：加一层服务端缓存（资料是静态的，确实可缓存，但列表页现在标着
`force-dynamic`，要一并改；而真正的问题是查询取了不该取的字段，缓存只是把它藏起来）。

---

## DEC-010 筛选与分页都放进 URL 查询参数

**选了**：`/pokemon?gen=9&page=2` 这种形式，四个列表页一致。

**为什么**：AC-002 要求「刷新列表并保留筛选条件」，URL 是最直接的兑现方式，
也最好测。分页已经在 URL 里了（见 git log「分页接上地址栏」），筛选留在组件 state
会让两套状态对不上。副作用是筛选后的页面能分享、能收藏。

**被拒的替代**：筛选只在组件 state（刷新即丢，链接分享不了，且与已在 URL 的分页
不一致）。

---

## DEC-011 首版只对外暴露简体中文

**选了**：不做语言切换 UI，URL 不带语言段，`name(language:)` 一律不传、走
`DEFAULT_LANGUAGE`。库里的 9 种译名留着备用。`LANGUAGE_COOKIE` 的读取逻辑保留
不动（已在 `route.ts` 里），但前端不写这个 cookie。

**为什么**：PRD 从标题到目标用户都只说「中文 Pokémon 资料站」，目标用户是中文
对战玩家。多语言要多一整套 URL 结构、切换 UI 和 SEO 处理，而 PRD 一个字都没要求。

**被拒的替代**：首版就做多语言（会给 PRD 加新需求，属于发明需求）。

---

## 没有记成 DEC 的那些

这些切面被逐项判断过，因为**没有替代方案**而没有写成决策：

| 切面 | 为什么不记 |
|---|---|
| 鉴权模型 | 首版无登录（Q-002），所有端点 `auth: "public"`。没有可选项 |
| 多租户隔离 | 单站公开资料，没有租户 |
| 事务与一致性 | 纯只读，没有写端点 |
| 幂等 | 同上 —— 没有会改变数据的 POST |
| 外部集成降级 | DEC-005 之后运行时没有外部依赖 |
| 部署拓扑 | 无服务端会话、无共享状态 |
| API 演进 | GraphQL 天然只加字段；本期不会有 v2 |
| 客户端会话 | 无登录，没有会话要存 |
| 写操作反馈 | 没有写操作 |

`.abrc.json` 的 `subsystem` 阈值（`minEndpoints: 15`）是按 REST 多端点项目设的，
与本项目的单端点架构不符，但目前没有造成任何报告，暂不改动（Q-026）。

---

## DEC-012 测试分两层：Vitest 跑 unit/integration，Playwright 跑 e2e

**选了**：Vitest + React Testing Library 承担单元与集成层（能力值公式、resolver、客户端列表组件）；
Playwright 承担端到端层（四个服务端渲染的详情页、跨页跳转、`CON-003` 的 SEO 约束）。
聚焦命令：`pnpm vitest run <file> -t <name>` 与 `pnpm playwright test <file>`。

**为什么**：这个仓库此前**一套测试框架都没有** —— 没有 test script、没有测试依赖、没有测试文件，
`tdd` 的第一步「从磁盘认出这一仓库的聚焦测试命令」认不出任何东西，而它禁止发明仓库没有的测试路径。

分两层不是偏好，是这个栈的硬约束。Next 16 自带的 `vitest.md` 原文写着：
「Vitest currently does not support async Server Components… we recommend using **E2E tests**
for async components」。而按 DEC-008，四个详情页全部是服务端渲染的 async 组件 ——
只上 Vitest 的话，那四个页面的 AC 一条也验不了。

反过来只上 Playwright 也不行：能力值公式（DEC-011 之外唯一的纯计算逻辑）是纯函数，
为它起一个浏览器既慢又脆。

**被拒的替代**：只上 Vitest（四个详情页与 `CON-003` 验不了）；只上 Playwright
（纯函数要起浏览器，且 RED 阶段要先把服务跑起来，而招式/特性现在连数据都没有）；
Jest / Cypress（Next 文档同样支持，但 Vitest 与本项目已有的 Vite 系工具链更近，
Playwright 的服务端渲染断言比 Cypress 直接）。

**已知代价**：测试框架这一维**不在 agb 的栈词表**（languages / frontend / backend / data /
chain / api 六维里没有它），所以门禁判不了这一项 —— 它属于「照实记成 DEC 并标注 agb 判不了」那一类。

**一个环境约束（RED 阶段实测撞到的）**：Playwright 1.63 **不支持 macOS 13**
（`Playwright does not support chromium on mac13`），自带的 chromium 与 chromium-headless-shell
都装不上。`playwright.config.ts` 因此走 `channel: "chrome"` 用系统已安装的 Google Chrome。
CI 上是 Linux，不受这条限制 —— 但本机开发要先装好 Chrome，否则 e2e 一条都跑不起来，
而那种失败落在环境上，按 `tdd` 不算红。
