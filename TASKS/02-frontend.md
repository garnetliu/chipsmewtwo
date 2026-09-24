# 批次 2 · 前端界面

**可与批次 1 并发。** 允许写入：`app/(auth)/pkhex/**`（**除了** `app/(auth)/pkhex/debug/`，
那是批次 1 的）、`graphql/**`、`lib/pkhex/slot.ts`。
**不许碰** `lib/pkhex/types.ts`、`lib/pkhex/exports.ts`、`lib/pkhex/runtime.ts`、
`lib/pkhex/index.ts`、`next.config.ts`、`pkhex-wasm/**`。

整个批次**吃 `lib/pkhex/runtime.mock.ts`**，不碰真 wasm。批次 3 才换。

参考对象是 PKHeX 桌面版的界面（左箱子网格 + 下方队伍，右多标签属性面板）。
要求简单复原这套布局，不是像素级还原 WinForms。

---

## 2-1 布局骨架 + 空态

**改哪里**：`app/(auth)/pkhex/page.tsx`（RSC 壳，只有 `metadata` + `<SaveEditor />`）、
`component/save-editor.tsx`、`save-editor-reducer.ts`、`save-editor-context.tsx`、
`use-pkhex-runtime.ts`、`save-toolbar.tsx`、`save-dropzone.tsx`、`editor-alert.tsx`。

**达到什么效果**：

- 外层 `container mx-auto flex flex-1 flex-col gap-4 py-4`；
  两栏 `grid flex-1 gap-4 lg:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] lg:items-start`
- 状态用 `useReducer` + 路由私有 Context，**不引全局状态库**（项目里一个都没有，
  为一个页面引第一个不划算）。Context 不拆，一个 `{ state, dispatch }`
- **两级脏标记不能合并**：`dirtyFields`（草稿改了没应用，切格子时拦）和
  `hasUnexportedChanges`（写回了没导出，`beforeunload` 拦）触发时机和文案完全不同
- **不要用 URL searchParams 存选中格子**。存档只活在内存里，`?box=3&slot=7` 刷新后必然指向
  空状态，是假的可分享性。判据是「刷新后还成立吗」
- 6 MB runtime **不在进页面时加载**：`onPointerEnter` / `onDragEnter` 拖拽区时预热，
  选中文件时 `await`。加载器封装在 `use-pkhex-runtime.ts`，暴露 `status / api / error / ensure`
- 拖拽区**原地换态不弹层**（挪位置会让人以为点歪了）：
  `idle` 虚线框 +「把存档文件拖进来，或点击选择」+ 小字「支持第 6～9 世代」；
  `loading` 图标换 `Loader2 animate-spin` +「正在加载存档解析引擎…」+「约 6 MB，首次需要几秒，
  之后会走浏览器缓存」+ 不确定进度条；`parsing`「正在解析 xxx.sav」；
  `error` 边框变 `border-destructive/40` + `EditorAlert` + 重试按钮
- 选文件：`<label>` 包住 `sr-only` 的 `<input type="file">`，点整块开系统选择器，拖拽走 `onDrop`，
  两条路径汇进同一个 `openFile(file)`。整段包 try/catch，认不出的存档要报出**文件名和字节数**
  （「pokemon_sv.sav（57 KB）不是能识别的存档格式，支持第 6～9 世代」），不许只说「失败」
- 错误提示**不引 toast**：`editor-alert.tsx` 用 `components/ui/alert.tsx` 做底座，固定渲染在
  toolbar 下方，`role="alert"`，带关闭按钮。这页的错误全是阻塞性的，三秒飘走的浮层更差

**怎么算验证通过**：浏览器打开 `/pkhex`，快照里有 `pkhex-page`、`pkhex-dropzone`、
`pkhex-file-input`、`pkhex-runtime-status`。`pkhex-file-input` 必须是真实的
`<input type="file">` 且用 `sr-only` 藏（**不许 `display:none`**，否则 Playwright 驱动不了）。
用 `browser_file_upload` 传一个任意非空文件进去，能进到编辑态、toolbar 上出现文件名、
「第九世代」、「32 箱」。控制台无 error。

## 2-2 箱子网格 + 队伍 + 选中态

**改哪里**：`component/box-panel.tsx`、`box-slot.tsx`、`party-row.tsx`。

**达到什么效果**：

- **箱子网格 6 列写死，不随断点变** —— 6×5 是语义，掉成 4 列就不是箱子了。
  `grid grid-cols-6 gap-1.5`，单格 `aspect-square`，`role="grid"`
- 单格是 `<button type="button">`，挂 `data-empty` / `data-selected` / `data-species`，
  用 `memo` 包一层
- 队伍 6 格复用 `BoxSlot`，`box` 传 `PARTY_BOX_INDEX`（-1）
- 箱子切换：左右箭头 + 一个下拉（箱名来自 `info.boxNames`）
- 键盘：方向键移动选中（左右 ±1、上下 ±6，**跨行不跨箱**），`Enter` 把焦点送到右栏第一个输入框
- 精灵图这一步先用编号占位，2-3 接上真图

**怎么算验证通过**：载入 mock 存档后快照里有 `pkhex-box-grid`、`pkhex-box-slot-0` 到
`pkhex-box-slot-29`（整 30 个）、`pkhex-party-slot-0` 到 `-5`、`pkhex-box-prev`、
`pkhex-box-next`、`pkhex-box-select`、`pkhex-box-label`。点一格后该格 `data-selected` 为真，
点下一箱后 `pkhex-box-label` 文案跟着变。控制台干净。

## 2-3 接 GraphQL 拿种族名和图标

**改哪里**：`graphql/schema/pokemon/schema.graphql`、
`graphql/schema/pokemon/resolvers/Query/pokemonByIds.ts`、`graphql/context/pokemon-source.ts`、
`graphql/apollo/fragment/PKHEX_SPECIES_OPTION.ts`、
`graphql/apollo/query/GET_PKHEX_SPRITES.ts`、`graphql/apollo/query/GET_PKHEX_SPECIES_INDEX.ts`、
两个 `index.ts` 的 re-export。**这条要跑 `pnpm codegen`，所以单独执行，不和别的任务并行。**

**达到什么效果**：

- 新增 `Query.pokemonByIds(ids: [ID!]!): [Pokemon]!`，顺序跟入参一致，查不到的位置是 null。
  一箱 30 只的编号是散的，`pokemonList(offset, limit)` 翻不出来
- `PokemonSource.findMany(ids)` 复用已有的 `#byIdLoader.loadMany()`（本来就会并成一条 `in` 查询，
  还顺手 prime `#bySlugLoader`），`loadMany` 返回的 Error 项压成 null
- `PKHEX_SPECIES_OPTION` fragment 字段集是 `id / slug / name / defaultForm { id detailImageUrl }`。
  **绝不能带 `descriptions`** —— schema 注释明说整页查会拉上千行
- 两个 query 都要 `@unmask`（过滤和拼 Map 发生在父组件里，dataMasking 开着父级只读得到 `id`；
  `PAGINATION` 已有这个先例），且**字段集必须保持一致** —— 靠这个让种族下拉加载过的全量索引
  直接喂给箱子取图
- 取图策略：切箱后收集当前箱 30 格 + 队伍 6 格的 species id 去重，**合并成同一次查询**
  （在 `save-editor.tsx` 里算，不在两个子组件各查一次），结果拍平成 `Map<number, string | null>`
  放进 context。不预取全国图鉴
- **form 序号这一版不用来换图**：`detailImage` 的文件名存在 `Form` 表里（阿罗拉六尾是
  `10103.png`，从 `37` 推不出来），而 wasm 给的是 PKHeX 的 form 序号，两者之间没有现成映射。
  只取默认形态的图，`form !== 0` 的格子右下角加 `font-mono text-[9px]` 的 `F1` 角标。
  硬猜映射会大面积错图，比「通用图 + 明确标注」糟
- 404 三层兜底共用同一个 `#0006` 编号占位：`detailImageUrl` 本来就 null / URL 有但 CDN 404
  （`onError`）/ species 在库里查不到。蛋格子单独画 `🥚`，不查图
- `next/image` **必须加 `unoptimized`**（`next.config.ts` 没配 `images.remotePatterns`），
  点阵图加 `style={{ imageRendering: "pixelated" }}`

**怎么算验证通过**：`pnpm codegen` 成功，`pnpm exec tsc --noEmit` 零错误。
浏览器里箱子格子显示出真的精灵图和中文名，`browser_network_requests` 里
**切箱只打一次 `/api/graphql`**（不是 30 次），翻回上一箱零请求。

## 2-4 属性面板

**改哪里**：`component/pokemon-inspector.tsx`、`inspector-main-tab.tsx`、
`inspector-stats-tab.tsx`、`inspector-moves-tab.tsx`、`inspector-raw-tab.tsx`、
`species-select.tsx`、`dex-select.tsx`、`stat-number-field.tsx`。

**达到什么效果**：

- `components/ui/tabs.tsx` **直接用，不要改**。Base UI 的 Tabs 只挂载激活的 Panel，
  所以 raw tab 那坨 JSON 不会白渲染。四个标签：主要 / 能力 / 招式 / 原始
- 主要：种族、昵称、等级、经验、性格、特性、性别、闪光、持有物、精灵球、亲密度
- 能力：IV×6 + EV×6，用 `components/ui/number-field.tsx`，`grid grid-cols-[4rem_1fr_3.5rem]` 排。
  EV 总和超 510 时 `pkhex-ev-total` 带 `data-invalid` 并禁用「应用修改」
- 招式：四个槽，各一个 `dex-select`
- 原始：`JSON.stringify(detail, null, 2)` 只读展示，出问题时能看见实情
- **种族下拉走 GraphQL**（1025 条必须能搜），用 `components/ui/combobox.tsx`。
  前端一次拉全量在浏览器里 `includes` 过滤，**懒加载** —— 只在下拉第一次展开时用
  `useLazyQuery` 发。这就是个子串匹配，不值得在 `pokemon_i18n.name` 上加带索引的后端查询
- **招式/道具/性格/球的名字全部用 `session.stringTables`**，不许拿编号去查 Prisma ——
  库里 `Move.id` / `Item.id` 是 PokeAPI 自增 id，和游戏内部编号对不上，会静默显示错的名字
- 特性下拉零新增后端：从 `detail.abilities` 三选一，传 `abilityIndex`
- 数字（等级/经验/IV/EV/图鉴号）一律 `font-mono`
- 字段级校验错误走 `aria-invalid`（`button.tsx` 的 cva 里已经有这个分支）

**怎么算验证通过**：点一格后快照里有 `pkhex-inspector`、`pkhex-inspector-title`、
四个 `pkhex-tab-*`、`pkhex-field-*` 全套、`pkhex-iv-*` 和 `pkhex-ev-*` 各 6 个、
`pkhex-ev-total`、`pkhex-move-0` 到 `-3`。切 tab 内容跟着变。
把某个 EV 调到让总和超 510，`pkhex-ev-total` 出现 `data-invalid` 且 `pkhex-apply-button` 禁用。

## 2-5 应用 / 还原 / 导出 / 拦截

**改哪里**：`component/discard-changes-dialog.tsx`，以及 reducer 和 toolbar 的补完。

**达到什么效果**：

- 「应用修改」把脏字段写回 wasm —— **用 `lib/pkhex/slot.ts` 已有的 `applyDraft`**，
  它按固定顺序写（species 必须先写，因为换种族会重算形态特性性别，反过来写会冲掉）
- 应用后 `hasUnexportedChanges` 置真，`pkhex-dirty-badge` 出现；格子的昵称/图跟着刷新
- 「还原」把草稿退回基线
- 「导出存档」用 `lib/pkhex/download.ts` 的 `downloadBytes`，文件名沿用原名不加时间戳
  （用户拿它覆盖原存档）。导出后 `hasUnexportedChanges` 置假
- `dirtyFields.length > 0` 时点别的格子/切箱 → 弹 `discard-changes-dialog`，三个出口：
  保存并切换 / 丢弃并切换 / 留在当前格
- `hasUnexportedChanges` 为真时挂 `beforeunload`（只 `preventDefault()`，自定义文案早就不显示了）

**怎么算验证通过**：完整走一遍 —— 传文件 → 点格子 → 改昵称 → 点 `pkhex-apply-button` →
`pkhex-dirty-badge` 出现、格子上的昵称变了 → 不应用直接点另一格 → `pkhex-discard-dialog` 弹出，
三个按钮都在 → 选「丢弃并切换」能切走 → 点 `pkhex-export-button` 触发下载。
全程控制台无 error、无 4xx/5xx。

## 2-6 合法性检查（后加的需求，不在原来 5 条里）

**改哪里**：`component/legality-status.tsx`（新建）、`save-editor-store.ts`、
`pokemon-inspector.tsx`、`save-toolbar.tsx`。

**达到什么效果**：精灵改完跑一次合法性检查，界面上给出错误原因，不合法不让导出存档。

- **拦截范围只限这次会话里改过的格子**。真实存档里本来就可能有不合法的个体
  （很多人用 PKHeX 恰恰因为存档被改过），因为用户压根没碰过的一只就不让导出，工具没法用。
  store 里记一张 `slotKey(box, slot) → { box, slot, report }` 的表，导出只看这张表。
  这张表跟着存档走，换存档要清掉（`species` 缓存相反，跨存档留着）
- **什么时候跑**：打开某格面板时跑一次、每次「应用修改」之后跑一次。
  **不在渲染里跑，不对整箱批量跑** —— 真实现要查遍相遇表，是 PKHeX 最重的一条路径
- **`fishy` 不拦**。PKHeX 的 `Severity` 有三档，`Fishy` 是「可疑但合法」，
  拦下它会误伤一堆正常个体。只有 `Invalid` 拦
- **「应用修改」本身不拦**，只拦导出。得让用户先把值写进去、看到错在哪、再去改。
  （例外：EV 总和超 510 是字段级硬约束，前端本地就能判，2-4 那条守卫保留 ——
  它拦的是「写入本地就知道非法的值」，和合法性检查管的不是一回事）
- 面板上是**常驻状态条不是新 tab**，放在 inspector 头部 tabs 上方。
  `valid` 用 `success`、`fishy` 用 `warning`、`invalid` 用 `destructive`，都是现成 token。
  `report` 整段文本折叠，默认收起
- 导出被拦时**要说清是哪一格**（`3 号箱第 7 格、队伍第 2 格不合法，改好才能导出`），
  不要只说「存在不合法的精灵」。名字多了截断成「等 N 处」
- `applyDraft` 的 catch 分支也要把格子记进表 —— setter 是 write-through，
  部分写入已经落盘了，那一格就是碰过的

**怎么算验证通过**：

- 把两个招式槽设成同一个招式 → 应用 → `pkhex-legality` 的 `data-valid` 是 false、
  列出「有重复的招式」、`pkhex-export-button` 禁用、`pkhex-export-blocked` 点名是哪一格
- 把其中一个改回不同的招式 → 应用 → 禁用解除，该格从拦截表里掉出去
- 某只改成 1 级 + 满亲密度 → 显示 fishy 警告但**导出不被拦**
- 从没动过的格子不进拦截表

---

## 复核交接（前一任 reviewer 留下的）

它的 Playwright MCP 连接被导出那步的 blob 下载冲断了，恢复不了，中途换人。

**浏览器证据全部作废，必须重跑。** 那批数据是对早一版的树取的，之后契约、
`save-editor-store.ts`、`pokemon-inspector.tsx`、`save-toolbar.tsx`、`number-field.tsx`
都动过，合法性面板还新占了 inspector 的版面。testid 覆盖、进度条、拖拽区命中、
apply/discard/export 这些结论看着漂亮但**不能复用**。

**静态那部分可以直接接**，跟这几次改动无关：

- `pokemonByIds` 的顺序 / null 契约（`["25","6","99999","1000","abc"]` curl 实打过）
- `form-source.ts` 的 `isBattleOnly` 是既有 bug 的修复（schema 声明 `Boolean!`、
  无自定义 resolver，不 select 这列默认 resolver 会拿到 `undefined` 违反 non-null）
- zustand 订阅切法、招式/道具/特性只走 `stringTables`、`next/image` 带 `unoptimized`、代码风格

**四项从头到尾没人验过**：真鼠标点 IV=31 / EV=0 两种边界态、`pkhex-move-0`…`-3`、
`pkhex-tab-raw`、`pkhex-error` + `pkhex-runtime-retry`。加上新派的 2-6，一条都没碰过。

**一条保留意见**：`number-field` 那份 Base UI 源码级的机制论证是够的，但它证的是
「`pointer-events-none` 不会再被误触发」，**不等于「这 13 个框现在都点得进去」** ——
中间还隔着 `data-disabled` 的实际渲染行为、以及合法性面板加进来之后的布局变化。
别让论证替掉点击验证，这个坑已经踩过一次。
