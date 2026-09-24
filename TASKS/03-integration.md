# 批次 3 · 联调

批次 1 和批次 2 都已 PASS。这一批把 mock 换成真 runtime，跑端到端，收尾。

**串行，不并发。** 允许写入：`app/(auth)/pkhex/**`、`lib/pkhex/**`、`TASKS/**`。
`pkhex-wasm/**` 的 C# 源码非必要不动 —— 真要动，先说清楚为什么。

## 已经成立的事实（别重新验）

- wasm 产物在 `public/pkhex/_framework/`，19.60 MB 裸 / 5.26 MB gzip，已提交进 git
- 测试夹具在 `public/pkhex-fixtures/`（**gitignore，本地由 `pnpm pkhex:build` 生成**）。
  6 份能被识别：gen6-xy / gen6-oras / gen7-sm / gen7-usum / gen7b-lgpe / gen8b-bdsp。
  每份的**一号箱第 10 格是自动生成的合法样本**，0–5 格是捏造的不合法个体
- 真 wasm 上已验过：455 帧进度末帧 ratio 正好 1、六份夹具 byte-identical 往返、
  裁剪证伪一正一反都成立、verbose 报告里地点是中文
- 前端全套在 mock 上已验过（testid 零缺失、number-field 可达、合法性四条、
  进度条单调、切箱零请求）

---

## 3-1 换成真 runtime

**改哪里**：`app/(auth)/pkhex/component/use-pkhex-runtime.ts` 把 `loadPkhexMock`
换成 `lib/pkhex/index.ts` 的 `loadPkhex`；删掉 `lib/pkhex/runtime.mock.ts`。

**达到什么效果**：页面加载真 wasm，读真存档。

**怎么算验证通过**：
- `pnpm exec tsc --noEmit` 零错误、`pnpm lint` 干净
- 全仓 grep 不到 `runtime.mock`、`loadPkhexMock` 的残留引用
- 浏览器打开 `/pkhex`，拖 `public/pkhex-fixtures/gen8b-bdsp.sav` 进去能打开

## 3-2 端到端

**达到什么效果**：真存档上跑完整条链路。

**怎么算验证通过**（逐条，用真夹具）：

1. **打开**：六份夹具**逐个**传一遍，都能打开，toolbar 上的世代/箱数跟存档对得上
2. **箱子**：一号箱 0–5 格有捏造个体、第 10 格是合法样本，图和中文名出得来。
   切箱、翻回来，`/api/graphql` 的请求数贴出来 ——
   **这次要真正验到「切到新箱需要发一次新请求」那一支**（mock 覆盖不到，
   真存档里不同箱的种族不一样）
3. **合法性**：
   - 打开 0 号格（捏造的）→ `pkhex-legality` 红，issues 列得出原因
   - 打开第 10 格（合法样本）→ 绿或黄。**注意它可能带 2 条 fishy**
     （空白夹具把训练家名写成 "PKHeX"、ID 对撞上 PKHeX 硬编码的可疑值），
     这是夹具的产物不是 bug
   - **`×2` 合并在这里终于能验到** —— 那 2 条 fishy 三个字段完全相同，
     应该折成一行显示 `×2`，`data-count="2"`
   - 折叠区「PKHeX 完整报告」里应该有 `遭遇类型 / 地点 / PID类型` 三行，
     地点是中文。`遭遇类型` 是英文，那是上游行为，不要报
4. **改 → 应用 → 合法性 → 导出**：改个昵称和 IV，应用，导出，
   把导出的文件再传回去，值还在
5. **拦截**：把某只改成不合法 → 导出禁用且点名是哪一格 → 改回去 → 解除

## 3-3 补上欠的那条：重试按钮

**达到什么效果**：真造一次加载失败，点重试，确认第二次是真的重新下载，
不是拿到同一个已 reject 的 promise。

**怎么算验证通过**：

- **不要拦 `manifest.json`** —— 加载器对 manifest 失败是设计上吞掉的
  （退回 `totalBytes: 0`），boot 照样成功，测不出东西
- 拦 `_framework` 里的请求，`PKHeX.Core.wasm` 最合适，这样 `boot()` 才会真 reject、
  `booting` 才会被清空
- 用 `browser_network_request` 或 `browser_evaluate` 里改写 `fetch` 造失败
- 点 `pkhex-runtime-retry`，确认**第二次真的发出了新请求**（看 network），
  并且能成功进入编辑态

## 3-4 收尾

- 删掉临时的 `app/(auth)/pkhex/debug/page.tsx`（烟测脚手架，产品 UI 已就位）
- `pnpm codegen` && `pnpm exec tsc --noEmit` && `pnpm lint` 全绿
- `git status` 确认：`public/pkhex/` 在、`public/pkhex-fixtures/` 不在、
  `pkhex-wasm/{bin,obj,artifacts}` 不在、`.playwright-mcp/` 不在
- 横着看一遍：同一类东西有没有用同一个组件、同一个参数名、同一套错误语义

## 纪律

- **点导出会触发 blob 下载，把 Playwright MCP 连接冲断** —— 放整轮最后
- 可交互元素用 `browser_click` 验，不用 `fill`
- 用完 `browser_close`
