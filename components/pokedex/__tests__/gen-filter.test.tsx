import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { GenFilter, readGen } from "@/components/pokedex/gen-filter";

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

function chip(gen: number) {
  return screen.getByRole("button", { name: `Gen ${gen}` });
}

test("九个 chip 只写 Gen N，不带版本名", () => {
  render(<GenFilter />);

  const labels = screen.getAllByRole("button").map((button) => button.textContent);
  expect(labels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => `Gen ${gen}`));
});

test("地址栏没有 gen 时九个都不选中", () => {
  render(<GenFilter />);

  for (const gen of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    expect(chip(gen).hasAttribute("data-selected")).toBe(false);
    expect(chip(gen).getAttribute("aria-pressed")).toBe("false");
  }
});

test("点某一代把 gen 写进地址栏", () => {
  render(<GenFilter />);

  fireEvent.click(chip(3));
  expect(push).toHaveBeenCalledWith("/pokemon?gen=3");
});

test("地址栏上的 gen 决定谁选中", () => {
  route.query = "gen=3";
  render(<GenFilter />);

  expect(chip(3).getAttribute("data-selected")).toBe("true");
  expect(chip(1).hasAttribute("data-selected")).toBe(false);
});

test("再点一次当前选中项就把 gen 从地址栏去掉", () => {
  route.query = "gen=3";
  render(<GenFilter />);

  fireEvent.click(chip(3));
  expect(push).toHaveBeenCalledWith("/pokemon");
});

test("不认识的 gen 值当作没筛选", () => {
  route.query = "gen=abc";
  render(<GenFilter />);

  expect(screen.queryByRole("button", { pressed: true })).toBeNull();
});

test("readGen 只认 1–9 的整数，其余一律不筛", () => {
  for (const gen of [1, 5, 9]) {
    expect(readGen(String(gen))).toBe(gen);
  }

  // 小数是列表页真出过事故的那一类：3.5 送进 GraphQL 的 Int 变量会让整页变失败卡
  for (const value of ["3.5", "0", "10", "-1", "abc", "", " ", null]) {
    expect(readGen(value)).toBeNull();
  }
});

test("小数 gen 不点亮任何 chip（和列表页读到的 null 对得上）", () => {
  route.query = "gen=3.5";
  render(<GenFilter />);

  expect(screen.queryByRole("button", { pressed: true })).toBeNull();
});

test("换世代时其余 query 留着，page 回第一页", () => {
  route.query = "q=pika&page=4";
  render(<GenFilter />);

  fireEvent.click(chip(5));
  expect(push).toHaveBeenCalledWith("/pokemon?q=pika&gen=5");
});

test("取消筛选时 page 也一起回第一页", () => {
  route.query = "gen=1&page=2";
  render(<GenFilter />);

  fireEvent.click(chip(1));
  expect(push).toHaveBeenCalledWith("/pokemon");
});

test("连点同一个 chip 五次，每次都推同一个地址", () => {
  render(<GenFilter />);

  for (let i = 0; i < 5; i += 1) {
    fireEvent.click(chip(3));
  }

  expect(push).toHaveBeenCalledTimes(5);
  expect(push.mock.calls.map(([href]) => href)).toEqual(new Array(5).fill("/pokemon?gen=3"));
});

test("右端那句话带上条数，没有条数时只剩前半句", () => {
  const { rerender } = render(<GenFilter total={1302} />);
  expect(screen.getByText("单选筛选 · 当前共 1302 条结果")).toBeTruthy();

  rerender(<GenFilter />);
  expect(screen.getByText("单选筛选")).toBeTruthy();
});

test("整行装在 Card 里，内边距上下 1rem、左右 1.25rem", () => {
  const { container } = render(<GenFilter className="mb-6" />);
  const row = container.querySelector('[data-slot="gen-filter"]');

  expect(row?.className).toContain("shadow-(--shadow-pokedex)");
  expect(row?.className).toContain("px-5");
  expect(row?.className).toContain("py-4");
  expect(row?.className).toContain("mb-6");
});
