# PKHeX 存档编辑器 · 全局口径

起 implementer 或 reviewer 时，这一整份要连同任务正文一起给过去。

## 批次表

| 批次 | 文件 | 能否并发 | 说明 |
|---|---|---|---|
| 0 | 已完成 | — | 修 `(auth)/layout.tsx`、装 shadcn 组件、定 `lib/pkhex/` 契约 |
| 1 | `01-wasm.md` ✅ PASS | — | C# 工程、JSExport、Docker 构建、真 runtime 加载器、合法性检查 |
| 2 | `02-frontend.md` ✅ PASS | — | 页面、箱子网格、属性面板、GraphQL 接数、合法性面板（吃 mock） |
| 3 | `03-integration.md` ✅ PASS | — | mock 换真 runtime、端到端、集成检查 |

批次 1 和批次 2 的写入路径互斥：

- 批次 1 只能写 `pkhex-wasm/**`、`lib/pkhex/runtime.ts`、`lib/pkhex/index.ts`、
  `next.config.ts`、`docker-compose.yml`、`package.json` 的 scripts、`.gitignore`
- 批次 2 只能写 `app/(auth)/pkhex/**`、`graphql/**`、`lib/pkhex/download.ts` 以外的
  `lib/pkhex/slot.ts` 补充、`components/ui/**`（只有确实缺组件时）

**两边都不许改 `lib/pkhex/types.ts` 和 `lib/pkhex/exports.ts`。** 那是两批之间的契约，
要改必须先停下来问，改完两边同步。

### 契约变更记录

契约改过之后，**两批必须在同一轮内都跟上**，否则整棵树编不过、谁都没法验收。
改契约的人负责通知两边，并且盯到 `tsc` 归零为止。

| 时间 | 改了什么 | 谁要跟 |
|---|---|---|
| 首版 | `SaveInfo` / `SlotSummary` / `MonDetail` / `PkhexStringTables` / `MonEditor` / `SaveSession` | — |
| 加进度 | `PkhexLoadProgress` / `LoadPkhexOptions`，`LoadPkhex` 收 `onProgress` | 批次 1 的 `runtime.ts`、批次 2 的 `use-pkhex-runtime.ts` |
| 加合法性 | `LegalitySeverity` / `LegalityIssue` / `LegalityReport`，`MonEditor.legality()`，`BridgeExports.GetLegality` | 批次 1 的 `index.ts` + C# 侧，批次 2 的合法性面板 |

## 技术栈事实

- Next **16.3.4** App Router（Turbopack 默认），React **19.2.8**，TypeScript strict，pnpm
- Tailwind **v4**，无 `tailwind.config.js`，token 全在 `app/globals.css` 的 `@theme inline`
- shadcn v4，style `base-vega`，底层是 **`@base-ui/react` 1.8.0**，不是 Radix
- `components/ui/` 现有：alert badge button card checkbox combobox dialog field input
  input-group label number-field pagination scroll-area select separator skeleton tabs
  textarea toggle toggle-group tooltip。**没有 table，也不要去装** —— Base UI 没这个原语
- 唯一 HTTP 数据入口是 `app/api/graphql/route.ts`（DEC-002：单端点 GraphQL，不做 REST）。
  **全仓零个 server action，不要新增**
- Apollo Client v4 开着 **dataMasking**：父组件拿到的是 `FragmentType<typeof X>`，
  子组件自己 `useFragment` 读；父组件要读字段必须 `@unmask`
- Prisma 7 + driver adapter，数据源封装在 `graphql/context/*-source.ts`（DataLoader，每请求新建）
- 没有任何测试框架，JS 侧也不装。验证手段见下文
- 主题紫色系全 oklch，自定义 token：`core`(青) / `success` / `warning`
- 字体三套：`font-sans`(Inter) / `font-heading`(Space Grotesk) / `font-mono`(JetBrains Mono)。
  **数字一律 `font-mono`**

## 代码风格（照着现有代码写，不要自创）

- 一律 `function Foo()`，**没有** `const Foo = () => {}`
- props 类型写成 `interface IProps`（I 前缀），放同文件组件上方；业务组件签名
  `function Foo(props: Readonly<IProps>)` 再在函数体里解构；ui 层组件直接在参数里解构
- ui 层文件底部统一 `export { A, B, C }`（字母序）；业务组件直接 `export function`
- 每个 ui 元素挂 `data-slot="xxx"`
- `cn` 从 **`"cn"`** 包导入，不是 `@/lib/utils`（ui 层的惯例）
- 导入顺序由 `simple-import-sort` 强制：第三方 → 空行 → `@/` → 空行 → `./`
- prettier：printWidth 100、双引号、trailingComma all、2 空格
- **中文注释密度要跟上现有代码**：解释「为什么」不是「是什么」。
  看 `components/pagination-list/index.tsx` 和 `graphql/context/pokemon-source.ts` 的密度
- 路由私有组件放 `app/<route>/component/`（**单数 component**）
- 页面外层惯用 `container mx-auto ... py-4`
- 文案全部中文硬编码，没有 i18n 库
- 已知拼写：`components/root-privider.tsx`（privider），import 时照抄，不要改

## wasm 边界契约

`lib/pkhex/types.ts` 是唯一事实来源，写代码前完整读一遍。要点：

- IV/EV/招式顺序统一 **HP, ATK, DEF, SPA, SPD, SPE**
- 队伍槽位的 `box` 是 **-1**（`PARTY_BOX_INDEX`）
- 所有编号都是**游戏内部编号**。只有 `species` 例外 —— 它就是全国图鉴编号，
  和 Prisma 的 `Pokemon.id` 同义。**招式/道具/特性/性格/球一律用 `stringTables` 里的名字，
  不许拿编号去查 Prisma** —— 库里那几张表的 id 是 PokeAPI 自增 id，对不上，会静默显示错的名字
- 每个 setter 写完立刻回存档（write-through），没有单独的 commit 调用
- 加载器单例 **reject 时必须清空缓存的 promise**，否则「重试」按钮永远失效

## testid 契约

全部用 `data-testid`（Playwright MCP 的默认属性）。**一个都不许少，名字一个字符都不许改。**

```
pkhex-page / pkhex-dropzone / pkhex-file-input / pkhex-runtime-status / pkhex-runtime-retry / pkhex-error
pkhex-toolbar / pkhex-save-filename / pkhex-save-generation / pkhex-save-boxcount
pkhex-dirty-badge / pkhex-export-button / pkhex-change-file-button
pkhex-box-panel / pkhex-box-prev / pkhex-box-next / pkhex-box-select / pkhex-box-label / pkhex-box-grid
pkhex-box-slot-0 … pkhex-box-slot-29     带 data-empty / data-selected / data-species
pkhex-party-row / pkhex-party-slot-0 … pkhex-party-slot-5
pkhex-inspector / pkhex-inspector-empty / pkhex-inspector-title / pkhex-inspector-tabs
pkhex-tab-main / pkhex-tab-stats / pkhex-tab-moves / pkhex-tab-raw
pkhex-field-species / pkhex-field-species-search / pkhex-field-species-option-{id}
pkhex-field-nickname / pkhex-field-level / pkhex-field-exp / pkhex-field-nature
pkhex-field-ability / pkhex-field-gender / pkhex-field-shiny / pkhex-field-item
pkhex-field-ball / pkhex-field-friendship
pkhex-iv-hp pkhex-iv-atk pkhex-iv-def pkhex-iv-spa pkhex-iv-spd pkhex-iv-spe
pkhex-ev-hp pkhex-ev-atk pkhex-ev-def pkhex-ev-spa pkhex-ev-spd pkhex-ev-spe
pkhex-ev-total                            超过 510 时带 data-invalid
pkhex-move-0 … pkhex-move-3
pkhex-apply-button                        带 data-dirty
pkhex-discard-button
pkhex-legality                            带 data-valid / data-severity(valid|fishy|invalid)
pkhex-legality-issue-0 … -N               每条带自己的 data-severity
pkhex-legality-report-toggle              PKHeX 整段报告的折叠开关
pkhex-export-blocked                      role="status"，点名是哪几格不合法
pkhex-discard-dialog / pkhex-discard-save / pkhex-discard-drop / pkhex-discard-cancel
```

硬规则：`pkhex-file-input` 必须挂在**真实的 `<input type="file">`** 上，用 `sr-only` 藏，
**不许用 `display:none`** —— 否则 Playwright 的 `browser_file_upload` 驱动不了。

## 怎么算验证通过

- dev 服务：`pnpm dev`，端口看 `dev.log`。**后台起，不要占住 shell；已经起着就直接用**
- 页面任务必须在真浏览器里打开（Playwright MCP），四件事缺一不可：
  1. 页面渲染出来了，不是白屏
  2. 任务点名的 testid 在快照里都能找到
  3. 控制台没有 error，没有 4xx/5xx
  4. 任务写的交互真的走通了
### 浏览器验证的纪律（都是踩出来的，别省）

- **可交互元素一律用 `browser_click` 验，不要用 `fill`。**
  `fill()` 不做 pointer-events 命中检测 —— 元素被别的东西盖住、或者祖先挂了
  `pointer-events-none`，`fill` 照样能把值写进去，真人却点不了。
  IV/EV 那 12 个框就是这么漏过去一整轮的
- **要断言「点得到」，用 `document.elementFromPoint` 打坐标看命中的是谁**，
  不要满足于「快照里能找到这个元素」
- **点会触发文件下载的按钮放整轮最后。** blob 导航会把 Playwright MCP 的连接冲断，
  之后这个会话就再也拿不到浏览器工具了（不是 profile 占用，重试无效）
- **浏览器 profile 同一时刻只有一个人能用，用完必须 `browser_close`。**
  忘了关，下一个人全程拿到 `Browser is already in use`
- **`browser_file_upload` 不一定有。** 这个工具只在文件选择器弹出时才会出现，
  有的会话里压根不给 —— 这时候**不要去点那个 label 试图唤起它**：
  一旦弹出文件选择器，MCP 就卡在 file chooser 模态里，`evaluate` / `press_key` /
  `navigate` 全部被拒（报 "does not handle the modal state"），`navigate` 也解不开，
  只能新开一个 tab 才脱得了身。看着像浏览器挂了，其实不是。
  投文件改用真 `DragEvent`：`fetch` 出字节 → `new File(...)` → `DataTransfer` →
  往 `pkhex-dropzone` 上依次派发 `dragenter` / `dragover` / `drop`。
  走的是组件真正的 `onDrop` 分支，不是 `fill` 那种绕过命中检测的假动作
- **树动过之后，之前那批浏览器证据全部作废。** 静态结论（契约、代码风格、
  订阅切法这些）可以接着用，凡是「在页面上看到了什么」都要重跑

- 每条任务收尾跑：`pnpm exec tsc --noEmit` 和 `pnpm lint`。
  `tsc` 里 `.next/**/validator.ts` 关于 `app/effort-values/page.js` 的两条报错是**既有的陈旧产物**，
  跟本次改动无关，忽略；除此之外必须零错误
- 动了 `graphql/schema/**` 或 `graphql/apollo/**` 要跑 `pnpm codegen`。
  **这条是全局产物，并发批里任何人都不许跑** —— 需要 codegen 的任务单独成条、单独执行
