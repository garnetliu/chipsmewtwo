# 批 6 · 收口

两条串行，都要看全量结果。

---

- [x] **T25 搜索引擎收录验证**

  **改哪里**：新建 `e2e/seo.spec.ts`；如果哪个页面不满足，改对应的
  `app/<域>/[name]/page.tsx` 把取数搬回服务端

  **达到什么效果**：四个详情页要能被搜索引擎收录 —— 爬虫和禁用 JavaScript 的客户端
  请求详情页时，服务端返回的 HTML 里必须已经包含对象名称和正文资料，
  不依赖客户端脚本二次获取。这是四个详情页用 RSC 而不是客户端取数的唯一原因，
  写完之后要真的验一遍。

  Playwright 用例在关闭 JavaScript 的上下文里请求四个详情页，逐个断言。

  **怎么算验证通过**：
  1. `pnpm test:e2e e2e/seo.spec.ts` 全绿
  2. 用例里四个页面各断言到两样东西：对象中文名、一处正文内容
     （精灵断言种族值某个数字、招式断言表格里某个威力值、
     道具断言「说明暂缺」、特性断言详细说明的一个片段）
  3. 命令行直接验一遍，不经过浏览器：
     - `curl -s localhost:3000/pokemon/bulbasaur | grep 妙蛙种子`
     - `curl -s localhost:3000/move/razor-leaf | grep 飞叶快刀`
     - `curl -s localhost:3000/ability/overgrow | grep 茂盛`
     - `curl -s localhost:3000/item/<某 slug> | grep <中文名>`

     四条都有命中

---

- [x] **T26 横向一致性复查**

  **改哪里**：按查出来的分叉改对应文件

  **达到什么效果**：批 5 的七条是并发做的。每条单独看都通过了 review，
  但合起来可能是七套写法 —— reviewer 手上只有一条任务的描述，横向分叉它看不见。
  这条专门查五项：

  1. **四个列表页** 用的是不是同一个 `GenFilter`、同一个 `ListShell`、同一个分页组件
  2. **四个详情页** 用的是不是同一个 `DetailShell`；「说明暂缺」和图片占位是不是
     同一处实现，而不是每个页面自己写了一个
  3. **四个 GraphQL 域** 的分页参数名是否一致；查不到时是否都返回 null 而不是抛错
  4. **「—」占位符** 在三处（精灵详情版本表的两列、道具详情版本表的两列、
     招式详情的版本说明列）是不是同一个写法
  5. **URL 查询参数名** 是否统一 —— 全站只能有 `gen` 和 `page` 两个

  查出分叉就改回来，统一到共享件上。

  **怎么算验证通过**：
  1. 五项逐项列出每处用的组件路径或写法，每项只有一种
  2. `grep -rn 'generation=' app/` 零命中（URL 上统一用 `gen`）
  3. `grep -rn '说明暂缺' app/` 零命中（只应该在 `components/pokedex/` 里出现）
  4. `grep -rn 'pagination' app/ | grep -v 'components/pagination-list'` 里没有自己实现的分页
  5. `pnpm lint` 零错误
  6. `pnpm tsc --noEmit` 零错误
  7. `pnpm test` 全绿
  8. `pnpm test:e2e` 全绿
