# 批 1 · 地基

四条串行。互不相干，但 T02 要改 `package.json`、T04 要跑 codegen，串行做省事。

---

- [x] **T01 修订 PRD 到 v7**

  **改哪里**：`docs/PRD.md`

  **达到什么效果**：这份 PRD 是 prototype 出现之前写的，里面十几条验收标准和 prototype
  画出来的东西不一致。本轮以 prototype 为准，把 PRD 改成跟 prototype 一致，
  免得后面有人拿旧 PRD 来质疑实现。

  版本号从 6.0 升到 7.0，在最前面加一节「版本更新说明（v6 → v7）」，
  第一句写「本轮视觉与交互以 `docs/prototype-stage3.html` 为准，下列条目按 prototype 口径重写」。

  逐条改（左边是现在的原文，右边是改成什么）：

  | 位置 | 现在写的 | 改成 |
  |---|---|---|
  | AC-016 | 招式列表展示名称与说明，不展示版本名称 | 招式列表展示名称、说明和登场版本 badges |
  | AC-030 | 道具列表展示名称与说明，不展示版本名称 | 道具列表展示名称、说明和登场版本 badges |
  | AC-044 | 特性列表展示名称与简短说明，不展示版本名称 | 特性列表展示名称、简短说明和登场版本 badges |
  | AC-024 | 招式详情是一张世代表格，一行一个世代（Gen1–Gen9），列为 属性/分类/威力/命中/PP，表格列不含说明 | 招式详情是一张版本组表格，一行一个版本组（红/绿/蓝、剑/盾、朱/紫…），列为 游戏版本/属性/分类/威力/命中/PP/版本说明 |
  | AC-051 | 特性详情展示拥有该特性的 Form 列表（小图 + 中文名 + `slot=3` 标「隐藏」） | 特性详情展示拥有该特性的 Pokémon 卡片（小图 + 全国编号 + 中文名 + 属性标签），不标隐藏 |
  | AC-066 | 进入模拟器默认选中列表第一只 Pokémon 并展示六项能力值 | 进入模拟器是未选择态，选完 Pokémon 才出结果，选完后可「更换 Pokémon」回到未选择态 |
  | AC-068 | 单项努力值调到 252 以上或个体值调到 31 以上时，控件把取值截断在上限，不产生错误提示 | 允许输入超范围，超出后输入框标红并在下方显示提示文案 |
  | AC-069 | 六项努力值总和已达 510 时，控件不允许继续增加 | 允许超过 510，超出后显示「努力值总和不能超过 510（当前 N）」 |
  | §核心对象状态机 | 写着模拟器的「未选择 / 可计算 / 输入非法」三态「经确认后作废」 | 删掉作废那段，恢复三态描述 |
  | §数据模型 · Pokémon | 没有进化链字段 | 加「进化链」字段，来源是库里的 `EvolutionChain` / `Evolution` 表 |
  | §数据模型 · Pokémon | 没有获取方式、可用性字段 | 加这两个字段，并标注：prototype 的版本表有这两列，但库里 52 张表和 PokeAPI seed 数据源里都没有对应数据，本期页面上显示「—」 |
  | §数据模型 · 道具 | 同上 | 同上 |
  | §数据模型 · 招式 | 没有版本说明字段 | 加「版本说明」字段，同样标注数据源缺失、显示「—」 |
  | §详情页 · Pokémon 返回路径 | 面包屑固定回 `/pokemon` | 面包屑返回来源页：从特性详情进来就回特性详情，从列表进来就回列表 |
  | §详情页 · 其余三个对象 | 同上，固定回对应列表 | 同上，改成返回来源页 |

  **AC-003（首次进入精灵列表时筛选器处于未选中状态，列表展示全国图鉴全量）不改。**
  prototype 里三个列表页的世代筛选都默认选中了某一代，但那是因为演示数据只有 Gen 1 和 Gen 2
  两代的几条，默认不选会让首屏看起来是空的 —— prototype 自己的空态文案就写着
  「演示数据集中在 Gen 1，请切换筛选查看」。真实数据全世代都有，保留未选中展示全量。

  改完在文末「信息来源说明」加一句 v7 的来源。

  **怎么算验证通过**：
  1. `grep -c "AC-" docs/PRD.md` 的结果和改之前一样（只改内容，不增删条目）
  2. `grep -n "不展示版本名称" docs/PRD.md` 零命中
  3. `grep -n "一行一个世代" docs/PRD.md` 零命中
  4. `grep -n "默认选中列表第一只" docs/PRD.md` 零命中
  5. `grep -n "控件截断" docs/PRD.md` 零命中
  6. `grep -n "面包屑固定回" docs/PRD.md` 零命中
  7. AC-003 的原文一字未动
  8. 文件开头版本号是 7.0，v6 → v7 更新说明里上表 15 行改动都提到了

---

- [x] **T02 测试框架落地**

  **改哪里**：`package.json`，新建 `vitest.config.ts`、`playwright.config.ts`、
  `lib/__tests__/smoke.test.ts`、`e2e/smoke.spec.ts`

  **达到什么效果**：这个仓库现在一套测试框架都没有 —— 没有 test script、没有测试依赖、
  没有一个测试文件。后面每条任务的验收都要跑测试，先把地基搭起来。

  分两层，不是偏好是硬约束：

  - **Vitest + React Testing Library** 跑单元与集成层 —— 能力值公式这种纯函数、
    GraphQL resolver、客户端列表组件
  - **Playwright** 跑端到端层 —— 四个详情页是服务端渲染的 async 组件，
    Vitest 不支持 async Server Components（Next 自带的 `vitest.md` 里明确建议这种情况用 E2E），
    只上 Vitest 的话那四个页面一条都验不了。反过来只上 Playwright 也不行 ——
    为一个纯函数起浏览器既慢又脆

  `playwright.config.ts` 用 `channel: "chrome"`：Playwright 1.63 不支持 macOS 13，
  自带的 chromium 和 chromium-headless-shell 都装不上，只能用系统已安装的 Google Chrome。
  本机开发要先装好 Chrome。CI 上是 Linux，不受这条限制。

  `package.json` 加 `"test": "vitest run"` 和 `"test:e2e": "playwright test"`。
  两个冒烟用例各断言一件真事，不要写 `expect(true).toBe(true)`。

  **怎么算验证通过**：
  1. `pnpm test` 退出码 0，输出里至少 1 个 passed
  2. `pnpm test:e2e` 退出码 0
  3. `pnpm test -- lib/__tests__/smoke.test.ts -t <用例名>` 能单独跑起来
  4. `pnpm playwright test e2e/smoke.spec.ts` 能单独跑起来
  5. `grep '"test"' package.json` 有命中

---

- [x] **T03 关掉 /api/auth 端点**

  **改哪里**：`app/api/auth/[...all]/route.ts`

  **达到什么效果**：首版不做登录，但这个端点还是活的 —— `lib/auth.ts` 里
  `emailAndPassword` 和 GitHub OAuth 都开着，任何人都能匿名 POST 往 `user` 表写行。
  一个没有任何验收标准、没有页面入口、却允许匿名写库的端点是纯风险。让它不再挂载。

  `lib/auth.ts` 的配置保留不删，后面要做登录时再启用。

  **怎么算验证通过**：
  1. `pnpm dev` 起来后 `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/auth/sign-up/email -d '{}'` 返回 404
  2. `ls lib/auth.ts` 文件还在
  3. `pnpm build` 通过

---

- [x] **T04 清掉 schema 里没人兑现的承诺**

  **改哪里**：`graphql/schema/pokemon/schema.graphql` 第 4 行附近，
  改完跑 `pnpm codegen` 带出 `graphql/schema/types.generated.ts` 和
  `graphql/schema/typeDefs.generated.ts`

  **达到什么效果**：`pokemon` 查询的文档字符串里写着「库里没有时会尝试补数据
  （见 `POKEMON_FETCH_MODE`），两边都没有则报 `NOT_FOUND`」。全仓 grep 只命中这段注释本身 ——
  没有这个实现，没有这个环境变量，也没有任何地方会抛 `NOT_FOUND`。

  schema 的 description 是对客户端的承诺，会被 codegen 带进类型、被下游当成要建的东西。
  改写成如实描述：只查本地库，按全国图鉴编号或英文 slug 查一只，查不到返回 null。

  **怎么算验证通过**：
  1. `grep -rn POKEMON_FETCH_MODE --include=*.ts --include=*.graphql . | grep -v node_modules` 零命中
  2. `grep -n "NOT_FOUND" graphql/schema/pokemon/schema.graphql` 零命中
  3. `pnpm codegen` 跑完 `git diff --stat` 里两个 generated 文件有变化
  4. `pnpm tsc --noEmit` 零错误
