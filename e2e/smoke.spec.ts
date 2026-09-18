import { expect, test } from "@playwright/test";

/**
 * 端到端链路自身的冒烟：浏览器起得来、dev server 起得来、服务端渲染出得来。
 * 首页只有静态链接，不查库，所以数据库没起时这条也该是绿的。
 *
 * 头部导航也指向同样这五个路由，同名链接在整页范围里会有两份，
 * 所以定位收在首页自己的内容区里 —— 这条验的是首页，不是头部。
 */
test("首页把五个入口指向各自的路由", async ({ page }) => {
  await page.goto("/");

  const entries = page.locator('[data-slot="home-entries"]');

  await expect(entries.getByRole("link", { name: "Pokemon" })).toHaveAttribute("href", "/pokemon");
  await expect(entries.getByRole("link", { name: "道具" })).toHaveAttribute("href", "/item");
  await expect(entries.getByRole("link", { name: "特性" })).toHaveAttribute("href", "/ability");
  await expect(entries.getByRole("link", { name: "招式" })).toHaveAttribute("href", "/move");
  await expect(entries.getByRole("link", { name: "努力值模拟器" })).toHaveAttribute(
    "href",
    "/effort-values",
  );
});
