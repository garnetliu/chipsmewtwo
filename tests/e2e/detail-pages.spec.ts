/**
 * AT-008 ~ AT-010、AT-012、AT-020 ~ AT-022、AT-024、AT-029 ~ AT-031、AT-033、
 * AT-037 ~ AT-040、AT-042、AT-043、AT-051、AT-006、AT-007
 *
 * 这些页面按 DEC-008 是 async Server Component，Vitest 支持不了（见 DEC-012）。
 * 选择器取自 UI_CONTRACT.md。
 * RED：八个详情/列表页目前还是三行空壳（T-007 ~ T-014 承诺实现）。
 */
import { expect, test } from "@playwright/test";

const LIST = [
  { name: "精灵", list: "/pokemon", itemTid: "pokemon-list-item", detailTid: "pokemon-detail-name", notFound: "未找到该 Pokémon", badSlug: "/pokemon/zzz-nope" },
  { name: "招式", list: "/move", itemTid: "move-list-item", detailTid: "move-detail-name", notFound: "未找到该招式", badSlug: "/move/zzz-nope" },
  { name: "道具", list: "/item", itemTid: "item-list-item", detailTid: "item-detail-name", notFound: "未找到该道具", badSlug: "/item/zzz-nope" },
  { name: "特性", list: "/ability", itemTid: "ability-list-item", detailTid: "ability-detail-name", notFound: "未找到该特性", badSlug: "/ability/zzz-nope" },
];

for (const c of LIST) {
  test(`AT-008/020/029/038 从${c.name}列表点条目进入详情`, async ({ page }) => {
    await page.goto(c.list);
    await page.getByTestId(c.itemTid).first().click();
    await expect(page.getByTestId(c.detailTid)).toBeVisible();
  });

  test(`AT-010/022/031/040 ${c.name}详情访问不存在的 slug`, async ({ page }) => {
    await page.goto(c.badSlug);
    await expect(page.getByTestId("detail-not-found")).toContainText(c.notFound);
  });

  test(`AT-012/024/033/037 ${c.name}列表重复点同一条目只进同一个详情`, async ({ page }) => {
    await page.goto(c.list);
    const first = page.getByTestId(c.itemTid).first();
    await first.click({ clickCount: 2 });
    await expect(page.getByTestId(c.detailTid)).toBeVisible();
    await expect(page.getByTestId("detail-not-found")).toHaveCount(0);
  });

  test(`CON-003 ${c.name}详情服务端渲染出正文`, async ({ page, request }) => {
    await page.goto(c.list);
    const href = await page.getByTestId(c.itemTid).first().getAttribute("href");
    const res = await request.get(href!);
    const html = await res.text();
    // 关掉 JS 也要有正文：搜索引擎抓的是这个
    expect(html).toContain(`data-testid="${c.detailTid}"`);
  });
}

test("AT-009 同全国编号下多形态在同一页展示", async ({ page }) => {
  await page.goto("/pokemon/vulpix");
  await expect(page.getByTestId("pokemon-form-tab")).toHaveCount(2, { timeout: 10_000 });
});

test("AT-021 招式详情世代表格：拍落 Gen5 威力 20、Gen6 起 65", async ({ page }) => {
  await page.goto("/move/knock-off");
  const rows = page.getByTestId("move-generation-row");
  await expect(rows).not.toHaveCount(0);
  const gen5 = rows.filter({ has: page.locator('[data-generation="5"]') });
  await expect(gen5.getByTestId("move-detail-power")).toHaveText("20");
  const gen6 = rows.filter({ has: page.locator('[data-generation="6"]') });
  await expect(gen6.getByTestId("move-detail-power")).toHaveText("65");
});

test("AT-030 道具详情展示名称、说明与版本可用性", async ({ page }) => {
  await page.goto("/item/ability-shield");
  await expect(page.getByTestId("item-detail-name")).toBeVisible();
  await expect(page.getByTestId("item-detail-effect")).toBeVisible();
  await expect(page.getByTestId("item-detail-versions")).toBeVisible();
});

test("AT-039 特性详情展示说明与拥有该特性的形态列表", async ({ page }) => {
  await page.goto("/ability/volt-absorb");
  await expect(page.getByTestId("ability-detail-effect")).toBeVisible();
  await expect(page.getByTestId("ability-form-list")).toBeVisible();
});

test("AT-042 特性详情重复点同一形态条目只进同一个精灵详情", async ({ page }) => {
  await page.goto("/ability/volt-absorb");
  await page.getByTestId("ability-form-item").first().click({ clickCount: 2 });
  await expect(page.getByTestId("pokemon-detail-name")).toBeVisible();
});

test("AT-043 Gen1/Gen2 无关联形态时展示空态", async ({ page }) => {
  await page.goto("/ability/volt-absorb?gen=1");
  await expect(page.getByTestId("ability-form-empty")).toContainText("暂无宝可梦拥有该特性");
});

test("AT-051 点搜索结果按类型进入对应详情", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("search-trigger").click();
  await page.getByTestId("search-input").fill("妙蛙");
  await page.getByTestId("search-result-item").first().click();
  await expect(page.getByTestId("pokemon-detail-name")).toBeVisible();
});

test("AT-006 筛选进 URL 且刷新后仍在（AC-002）", async ({ page }) => {
  await page.goto("/pokemon");
  await page.getByTestId("generation-filter-option").nth(8).click();
  await expect(page).toHaveURL(/[?&]gen=9\b/);
  await page.reload();
  await expect(page.getByTestId("generation-filter")).toHaveAttribute("data-selected", "9");
});

test("AT-007 未登录可直达全部公开页面", async ({ page }) => {
  for (const path of ["/", "/pokemon", "/move", "/item", "/ability", "/effort-values"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).not.toHaveURL(/login|sign-in/);
  }
});
