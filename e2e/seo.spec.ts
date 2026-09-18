import { expect, test } from "@playwright/test";

/**
 * 详情页的服务端渲染。四个详情页用 RSC 取数只有这一个理由：爬虫和关掉 JavaScript 的
 * 客户端请求过来时，服务端返回的 HTML 里就得有名字和正文资料，不靠客户端脚本再取一次。
 *
 * 整个文件跑在 javaScriptEnabled 关掉的上下文里，页面上不执行任何客户端代码，
 * 所以读到的 DOM 就是服务端那份 HTML 解析出来的，没有 hydration 这一步。
 *
 * 断言一律先用元素定位器再比文本：RSC 会把同一份数据序列化一遍塞进
 * <script>self.__next_f.push(...)</script>，整页 grep 中文名会命中那里而不是正文。
 * 元素定位器选不到 script 里的文本，命中的只可能是真实 DOM 段。
 *
 * 每条都还要求元素可见。可见性在这里不是样式检查，是防一类具体的回退：路由段上只要有
 * loading.tsx，Next 就给这一段套上 Suspense 边界、先发 fallback、把正文塞进
 * <div hidden id="S:n"> 等内联脚本挪位。关掉 JavaScript 那一步不会发生，正文留在
 * hidden 容器里 —— 元素找得到、文本读得出，但整页可见的只有那句 fallback。
 * 只比文本的话这种页面照样过，所以两样都要。仓库里原来就有个根级 app/loading.tsx，
 * 让每一条路由都落进这个坑，删掉之后才是现在这样。
 *
 * 列表页是客户端取数，HTML 里没有条目是正常的，不归这个文件管。
 */
test.use({ javaScriptEnabled: false });

interface ICase {
  /** 详情页地址 */
  path: string;
  /** 名字所在的那张 hero 卡 */
  hero: string;
  /** hero 的 h1 上应该是这个中文名 */
  name: string;
  /** 正文里挑出来的一处，取值要稳，不随数据量和重新 seed 变 */
  fact: { desc: string; selector: string; text: string };
}

const CASES: ICase[] = [
  {
    path: "/pokemon/bulbasaur",
    hero: '[data-slot="pokemon-hero"]',
    name: "妙蛙种子",
    // 种族值是游戏里的固定数值，妙蛙种子 HP 45 从第一世代起没改过
    fact: { desc: "种族值 HP", selector: '[data-slot="pokemon-stat"][data-stat="HP"]', text: "45" },
  },
  {
    path: "/move/razor-leaf",
    hero: '[data-slot="move-hero"]',
    name: "飞叶快刀",
    // 版本数值表第一行的威力列。飞叶快刀历代威力都是 55，命中 95%
    fact: {
      desc: "版本数值表第一行的威力",
      selector:
        '[data-slot="move-version-stats"] [data-slot="data-table-body"] [data-slot="data-table-row"]:first-child [data-slot="data-table-cell"]:nth-child(4)',
      text: "55",
    },
  },
  {
    path: "/ability/overgrow",
    hero: '[data-slot="ability-hero"]',
    name: "茂盛",
    // 特性说明的后半句。库里这条是简中原文，取一段不含全角字符的，免得比对时被写法绊住
    fact: {
      desc: "特性详细说明",
      selector: '[data-slot="ability-hero"] [data-slot="detail-description"]',
      text: "草属性招式的威力增长为1.5倍",
    },
  },
  {
    path: "/item/black-augurite",
    hero: '[data-slot="item-detail-hero"]',
    name: "黑奇石",
    /*
      道具这一条只验得到「说明这一段服务端渲染出来了」，验不到「说明的文案来自库里」——
      「说明暂缺」是 DetailDescription 写死的兜底，shortEffect 整个从查询里删掉它也照样出。
      换成断言真实文案的话这条用例活不过一次 seed：prisma/seed.ts 会
      deleteMany 整张 item_effect_i18n 再按 seed-data/items.json 写回，而且 shortEffect
      一律不写，跑完之后全部 2222 条道具的说明都是空的。
      黑奇石在 items.json 里（名字 seed 得回来），说明本来就是空的，seed 前后都是这一句。
      这一页「资料真的取回来了」由上面那条中文名断言负责 —— 名字是从库里查出来的
    */
    fact: {
      desc: "说明暂缺",
      selector: '[data-slot="item-detail-hero"] [data-slot="detail-description"]',
      text: "说明暂缺",
    },
  },
];

for (const item of CASES) {
  test(`${item.path} 关掉 JavaScript 也拿得到${item.name}和${item.fact.desc}`, async ({ page }) => {
    await page.goto(item.path);

    const title = page.locator(`${item.hero} h1`);
    const fact = page.locator(item.fact.selector);

    await expect(title).toBeVisible();
    await expect(title).toHaveText(item.name);

    await expect(fact).toBeVisible();
    await expect(fact).toContainText(item.fact.text);
  });
}
