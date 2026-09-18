import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ListShell, ListSkeleton } from "@/components/pokedex/list-shell";

const route = vi.hoisted(() => ({ pathname: "/pokemon", query: "" }));
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(route.query),
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  route.pathname = "/pokemon";
  route.query = "";
  push.mockClear();
});

// vitest 没开 globals，RTL 注册不上自动清理，得自己来
afterEach(cleanup);

const PAGINATION = {
  page: 1,
  pageSize: 20,
  total: 151,
  totalPages: 8,
  hasNext: true,
  hasPrev: false,
};

const SKELETON = <ListSkeleton count={6} className="grid grid-cols-3 gap-4" itemClassName="h-28" />;

/** 四个列表页里最全的那套 props：三项统计 + 世代筛选 */
function renderShell(overrides: Partial<Parameters<typeof ListShell>[0]> = {}) {
  return render(
    <ListShell
      title="精灵列表"
      description="按全国编号浏览 Pokémon 条目。"
      stats={[
        { value: 151, label: "当前条目" },
        { value: "Gen 1", label: "当前世代" },
        { value: "编号序", label: "排序方式" },
      ]}
      genFilter
      skeleton={SKELETON}
      retry={() => {}}
      {...overrides}
    >
      <div data-testid="list-content">卡片</div>
    </ListShell>,
  );
}

test("页头照 prototype：标题、P0 徽章、说明、统计块之间有竖分隔线", () => {
  const { container } = renderShell({ result: { data: [{}], pagination: PAGINATION } });

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("精灵列表");
  expect(screen.getByRole("heading", { level: 1 }).className).toContain("text-[26px]");
  expect(screen.getByText("P0 · 核心资料")).toBeTruthy();
  expect(screen.getByText("按全国编号浏览 Pokémon 条目。")).toBeTruthy();

  // 三项统计，中间两条分隔线
  expect(container.querySelectorAll('[data-slot="list-shell-stat"]').length).toBe(3);
  expect(container.querySelectorAll('[data-slot="list-shell-stat-divider"]').length).toBe(2);
  expect(screen.getByText("151").className).toContain("tabular-nums");
  expect(screen.getByText("当前条目").className).toContain("text-[11px]");
});

test("统计块不传就整块不出（招式/特性那种只有一项的页面也只出一项、没有分隔线）", () => {
  const { container, rerender } = renderShell({ stats: undefined, result: { data: [{}] } });
  expect(container.querySelector('[data-slot="list-shell-stats"]')).toBeNull();

  rerender(
    <ListShell
      title="特性列表"
      description="浏览特性条目。"
      stats={[{ value: 367, label: "当前条目" }]}
      skeleton={SKELETON}
      retry={() => {}}
      result={{ data: [{}] }}
    >
      <div data-testid="list-content">表格</div>
    </ListShell>,
  );

  expect(container.querySelectorAll('[data-slot="list-shell-stat"]').length).toBe(1);
  expect(container.querySelectorAll('[data-slot="list-shell-stat-divider"]').length).toBe(0);
});

test("筛选行：传 genFilter 才出，特性列表不传就没有", () => {
  const { container } = renderShell({ result: { data: [{}], pagination: PAGINATION } });
  expect(container.querySelector('[data-slot="gen-filter"]')).toBeTruthy();

  cleanup();

  const plain = renderShell({ genFilter: false, result: { data: [{}], pagination: PAGINATION } });
  expect(plain.container.querySelector('[data-slot="gen-filter"]')).toBeNull();
});

test("筛选行右端的条数来自 pagination.total，没取到数时降级成只有「单选筛选」", () => {
  renderShell({ result: { data: [{}], pagination: PAGINATION } });
  expect(screen.getByText("单选筛选 · 当前共 151 条结果")).toBeTruthy();

  cleanup();

  renderShell({ loading: true });
  expect(screen.getByText("单选筛选")).toBeTruthy();
});

test("加载中铺骨架，一个字都不写，也不渲染 children", () => {
  const { container } = renderShell({ loading: true });

  const skeleton = container.querySelector('[data-slot="list-skeleton"]');
  expect(skeleton).toBeTruthy();
  expect(skeleton?.textContent).toBe("");
  expect(container.querySelectorAll('[data-slot="list-skeleton-item"]').length).toBe(6);

  expect(screen.queryByTestId("list-content")).toBeNull();
  expect(screen.queryByText("当前筛选条件下暂无结果")).toBeNull();
  expect(screen.queryByText("列表加载失败，请稍后再试")).toBeNull();
});

test("data 是空数组是空态：一句 14px 粗体 + 一句 12px 灰提示", () => {
  renderShell({ result: { data: [], pagination: { ...PAGINATION, total: 0, totalPages: 0 } } });

  const title = screen.getByText("当前筛选条件下暂无结果");
  expect(title.className).toContain("text-[14px]");
  expect(title.className).toContain("font-semibold");

  const hint = screen.getByText("换一个世代筛选条件再试试");
  expect(hint.className).toContain("text-[12px]");
  expect(hint.className).toContain("text-muted-foreground");

  // 空态不出分页，也不出 children
  expect(screen.queryByRole("navigation", { name: "pagination" })).toBeNull();
  expect(screen.queryByTestId("list-content")).toBeNull();
});

test("空态的第二句可以换（没有筛选的页面用得上）", () => {
  renderShell({ result: { data: [] }, emptyHint: "这一页没有数据，翻回第一页看看" });

  expect(screen.getByText("这一页没有数据，翻回第一页看看")).toBeTruthy();
});

test("字段是 null 是故障：出失败态，点重试回调被调用", () => {
  const retry = vi.fn();
  renderShell({ result: null, retry });

  expect(screen.getByText("列表加载失败，请稍后再试")).toBeTruthy();
  expect(screen.queryByText("当前筛选条件下暂无结果")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(retry).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(retry).toHaveBeenCalledTimes(2);
});

test("请求根本没发出去（result 是 undefined）也是故障，不是空态", () => {
  renderShell({ result: undefined });

  expect(screen.getByText("列表加载失败，请稍后再试")).toBeTruthy();
});

test("data 是 null 同样算故障 —— 空态只认空数组", () => {
  renderShell({ result: { data: null, pagination: null } });

  expect(screen.getByText("列表加载失败，请稍后再试")).toBeTruthy();
  expect(screen.queryByText("当前筛选条件下暂无结果")).toBeNull();
});

test("loading 期间就算 result 还是空的也不许判成故障", () => {
  const { container } = renderShell({ loading: true, result: undefined });

  expect(screen.queryByText("列表加载失败，请稍后再试")).toBeNull();
  expect(container.querySelector('[data-slot="list-skeleton"]')).toBeTruthy();
});

test("正常态渲染 children，后面跟着分页", () => {
  renderShell({ result: { data: [{}, {}], pagination: PAGINATION } });

  expect(screen.getByTestId("list-content")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "pagination" })).toBeTruthy();
  expect(screen.getByText("第 1 / 8 页，共 151 条")).toBeTruthy();
});

test("分页链接把地址栏里的 gen 带着走，只换 page", () => {
  route.query = "gen=1";
  renderShell({ result: { data: [{}], pagination: { ...PAGINATION, page: 2, hasPrev: true } } });

  // 页码是渲染成 <a> 的 base-ui Button，无障碍角色是 button
  expect(screen.getByRole("button", { name: "3" }).getAttribute("href")).toBe(
    "/pokemon?gen=1&page=3",
  );
});

test("只有一页时分页栏收起来，但正常态的内容照出", () => {
  renderShell({
    result: { data: [{}], pagination: { ...PAGINATION, total: 3, totalPages: 1, hasNext: false } },
  });

  expect(screen.getByTestId("list-content")).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "pagination" })).toBeNull();
  expect(screen.getByText("第 1 / 1 页，共 3 条")).toBeTruthy();
});

test("pagination 缺失但有数据时照样渲染 children，只是没有分页栏", () => {
  renderShell({ result: { data: [{}] } });

  expect(screen.getByTestId("list-content")).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "pagination" })).toBeNull();
});

test("四种状态的内容区都挂在同一个容器上，上下留白一样 —— 切换时不跳", () => {
  const states = [
    { loading: true },
    { result: null },
    { result: { data: [] } },
    { result: { data: [{}], pagination: PAGINATION } },
  ];

  for (const state of states) {
    const { container } = renderShell(state);
    const content = container.querySelector('[data-slot="list-shell-content"]');

    expect(content?.className).toContain("py-4");
    // 正常态里 PaginationList 自带的 py-4 被归零，免得内容区多出一截
    expect(container.querySelector('[data-slot="list-shell-content"] > .py-4')).toBeNull();

    cleanup();
  }
});
