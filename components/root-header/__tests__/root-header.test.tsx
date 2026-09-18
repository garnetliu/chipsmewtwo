import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { HeaderNav } from "@/components/root-header/header-nav";
import { HeaderSearch, OpenSearchProvider } from "@/components/root-header/header-search";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  pathname.current = "/";
});

// vitest 没开 globals，RTL 注册不上自动清理，得自己来
afterEach(cleanup);

test("只有当前所在的那一项拿到 aria-current 和短横线", () => {
  pathname.current = "/move";
  const { container } = render(<HeaderNav />);

  const active = screen.getByRole("link", { name: "招式" });
  expect(active.getAttribute("aria-current")).toBe("page");
  expect(active.getAttribute("data-active")).toBe("true");

  for (const label of ["精灵", "道具", "特性", "努力值模拟器"]) {
    const link = screen.getByRole("link", { name: label });
    expect(link.hasAttribute("aria-current")).toBe(false);
    expect(link.hasAttribute("data-active")).toBe(false);
  }

  expect(container.querySelectorAll('[data-slot="header-nav-underline"]')).toHaveLength(1);
});

test("详情页跟着所属列表一起高亮", () => {
  pathname.current = "/pokemon/bulbasaur";
  render(<HeaderNav />);

  expect(screen.getByRole("link", { name: "精灵" }).getAttribute("data-active")).toBe("true");
  expect(screen.getByRole("link", { name: "招式" }).hasAttribute("data-active")).toBe(false);
});

test("首页不属于任何一栏，五项都不高亮", () => {
  const { container } = render(<HeaderNav />);

  expect(container.querySelectorAll("[data-active]")).toHaveLength(0);
});

test("五个入口指向各自的路由", () => {
  render(<HeaderNav />);

  const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
  expect(hrefs).toEqual(["/pokemon", "/move", "/item", "/ability", "/effort-values"]);
});

test("点搜索框调用 onOpenSearch", () => {
  const onOpenSearch = vi.fn();
  render(<HeaderSearch onOpenSearch={onOpenSearch} />);

  fireEvent.click(screen.getByRole("button"));
  expect(onOpenSearch).toHaveBeenCalledTimes(1);
});

test("不传 prop 时走 OpenSearchProvider 注入的开关", () => {
  const onOpenSearch = vi.fn();
  render(
    <OpenSearchProvider onOpenSearch={onOpenSearch}>
      <HeaderSearch />
    </OpenSearchProvider>,
  );

  fireEvent.click(screen.getByRole("button"));
  expect(onOpenSearch).toHaveBeenCalledTimes(1);
});

test("没有 provider 也点得动，只是什么都不发生", () => {
  render(<HeaderSearch />);

  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Ctrl K")).toBeDefined();
});
