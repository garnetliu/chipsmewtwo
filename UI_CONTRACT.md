# UI Contract

下游测试的稳定锚点。这里声明的是**必须实现**的元素，不是把现有 DOM 抄一遍。
页面编号与 `.ab/prd.json` 的 `PAGE-*` 对应。

## PAGE-001 首页导航 `/`

- `nav-pokemon-link` — 导航链接 a；点击进入精灵列表
- `nav-move-link` — 导航链接 a；点击进入招式列表
- `nav-item-link` — 导航链接 a；点击进入道具列表
- `nav-ability-link` — 导航链接 a；点击进入特性列表
- `nav-effort-values-link` — 导航链接 a；点击进入努力值模拟器

## 全站组件 顶部搜索

- `search-trigger` — 顶部搜索框 button；点击打开搜索模态框
- `search-modal` — 蒙层模态框容器 div；断言模态框已打开
- `search-input` — 关键词输入框 input；填写要搜索的名称
- `search-result-list` — 结果列表容器 ul；断言有无结果
- `search-result-item` — 单条结果 li；点击跳转对应详情页
- `search-result-kind` — 结果类型标记 span；断言这条是精灵还是招式
- `search-empty` — 无匹配提示容器；断言未找到匹配结果
- `search-error` — 搜索失败提示容器；断言搜索暂时不可用文案

## PAGE-002 精灵列表 `/pokemon`

- `pokemon-list` — 列表容器 ul；断言条目数量
- `pokemon-list-item` — 单条 Pokémon li；点击进入精灵详情
- `pokemon-list-item-number` — 全国编号 span；断言按编号升序
- `generation-filter` — 世代筛选器容器 div；断言当前选中项
- `generation-filter-option` — 单个世代选项 button；点击切换筛选
- `list-pagination` — 分页控件容器 nav；点击翻页
- `list-loading` — 骨架屏容器；断言加载中
- `list-empty` — 空结果提示容器；断言当前筛选条件下暂无结果
- `list-error` — 列表加载失败提示；断言失败文案与重试入口
- `list-retry-btn` — 重试按钮 button；点击重新加载

## PAGE-003 精灵详情 `/pokemon/[name]`

- `detail-breadcrumb` — 面包屑容器 nav；点击返回对应列表
- `pokemon-detail-name` — Pokémon 名称 h1；断言展示的是哪一只
- `pokemon-detail-image` — 官方美术图 img；断言资源异常时换占位图
- `pokemon-detail-stats` — 种族值区块容器；断言六项数值
- `pokemon-detail-types` — 属性徽章容器；断言属性组合
- `pokemon-detail-abilities` — 特性列表容器；断言特性槽位
- `pokemon-form-tab` — 形态切换项 button；点击切换同编号下的其他形态
- `detail-not-found` — 未找到提示容器；断言未找到该 Pokémon
- `detail-empty-text` — 说明缺失占位；断言说明暂缺

## PAGE-004 招式列表 `/move`

- `move-list` — 列表容器 ul；断言条目数量
- `move-list-item` — 单条招式 li；点击进入招式详情

## PAGE-005 招式详情 `/move/[name]`

- `move-detail-name` — 招式名称 h1；断言展示的是哪一招
- `move-generation-table` — 世代数值表 table；断言表格已渲染
- `move-generation-row` — 一个世代一行 tr；断言行数与各世代数值
- `move-detail-power` — 威力单元格 td；断言跨世代的数值变化

## PAGE-006 道具列表 `/item`

- `item-list` — 列表容器 ul；断言条目数量
- `item-list-item` — 单条道具 li；点击进入道具详情

## PAGE-007 道具详情 `/item/[name]`

- `item-detail-name` — 道具名称 h1；断言展示的是哪一个
- `item-detail-effect` — 效果说明容器；断言说明或说明暂缺
- `item-detail-versions` — 版本可用性容器；断言版本名称标签

## PAGE-008 特性列表 `/ability`

- `ability-list` — 列表容器 ul；断言条目数量
- `ability-list-item` — 单条特性 li；点击进入特性详情
- `ability-list-empty` — 空态容器；断言当前暂无特性数据

## PAGE-009 特性详情 `/ability/[name]`

- `ability-detail-name` — 特性名称 h1；断言展示的是哪一个
- `ability-detail-effect` — 详细说明容器；断言说明正文
- `ability-form-list` — 拥有该特性的形态列表 ul；断言条目数量
- `ability-form-item` — 单条形态 li；点击进入对应精灵详情
- `ability-form-hidden-badge` — 隐藏特性标记 span；断言槽位三的那几条带此标记
- `ability-form-empty` — 形态列表空态；断言暂无宝可梦拥有该特性

## PAGE-010 努力值模拟器 `/effort-values`

- `ev-pokemon-select` — Pokémon 选择器 select；切换要计算的对象
- `ev-level-input` — 等级输入 input；调整等级
- `ev-nature-select` — 性格选择器 select；切换性格修正
- `ev-iv-input` — 个体值输入 input；六项各一个，调整个体值
- `ev-effort-input` — 努力值输入 input；六项各一个，调整努力值
- `ev-effort-total` — 努力值总和显示 span；断言总和上限约束
- `ev-result-table` — 六项能力值结果表 table；断言计算结果
- `ev-result-row` — 单项能力值一行 tr；断言某一项的数值
