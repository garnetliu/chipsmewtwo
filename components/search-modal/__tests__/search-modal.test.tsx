import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { SearchDialog } from "@/components/search-modal/search-dialog";

/**
 * 查询的返回由每条用例自己摆布 —— 五种状态里有三种取决于这一次查询回了什么，
 * 真发请求既慢又不可控
 */
const query = vi.hoisted(() => ({
  result: {} as {
    data?: { search: { kind: string; name: string; slug: string; subtitle: string | null }[] };
    loading?: boolean;
    error?: Error;
  },
  /** 最近一次传给 useQuery 的选项，用来数「什么词、查了几次」 */
  calls: [] as { keyword: string; skip: boolean }[],
  refetch: vi.fn(() => Promise.resolve()),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (_document: unknown, options: { variables: { keyword: string }; skip: boolean }) => {
    query.calls.push({ keyword: options.variables.keyword, skip: options.skip });

    return { loading: false, ...query.result, refetch: query.refetch };
  },
}));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  query.result = { data: { search: [] } };
  query.calls = [];
  query.refetch.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** 敲字。防抖靠假时钟推，不推就停在「搜索中」 */
function type(text: string) {
  fireEvent.change(screen.getByLabelText("搜索关键词"), { target: { value: text } });
}

/** 把防抖那 420ms 走完 */
function settle() {
  act(() => void vi.advanceTimersByTime(420));
}

function open() {
  return render(<SearchDialog open onOpenChange={() => {}} />);
}

test("没输入时是未输入态，且不打库", () => {
  open();

  expect(screen.getByText("输入名称开始搜索")).toBeTruthy();
  expect(screen.getByText(/支持 Pokémon \/ 招式 \/ 道具 \/ 特性，例如「妙蛙」/)).toBeTruthy();
  expect(query.calls.every((call) => call.skip)).toBe(true);
});

test("敲下去先是搜索中，且此时没有别的文案", () => {
  open();
  type("妙蛙");

  expect(screen.getByText("搜索中…")).toBeTruthy();
  expect(screen.queryByText("输入名称开始搜索")).toBeNull();
  expect(screen.queryByText("未找到匹配结果")).toBeNull();
});

test("420ms 内连敲五个字符只查一次", () => {
  open();

  for (const text of ["妙", "妙蛙", "妙蛙种", "妙蛙种子", "妙蛙种子的"]) {
    type(text);
    act(() => void vi.advanceTimersByTime(80));
  }

  settle();

  const queried = query.calls.filter((call) => !call.skip).map((call) => call.keyword);
  expect([...new Set(queried)]).toEqual(["妙蛙种子的"]);
});

test("有结果时一行一条，徽章按类型给中文，链接指向各自详情页", () => {
  query.result = {
    data: {
      search: [
        { kind: "POKEMON", name: "妙蛙种子", slug: "bulbasaur", subtitle: "No.0001 · 草/毒" },
        { kind: "ITEM", name: "妙蛙种子的糖果", slug: "exp-candy-s", subtitle: null },
      ],
    },
  };

  open();
  type("妙蛙");
  settle();

  // 模态框渲染在 portal 里，不在 render 返回的那个容器下，只能从文档上找
  const hits = document.body.querySelectorAll('[data-slot="search-hit"]');
  expect(hits).toHaveLength(2);
  expect(hits[0]?.getAttribute("href")).toBe("/pokemon/bulbasaur");
  expect(hits[1]?.getAttribute("href")).toBe("/item/exp-candy-s");
  expect(screen.getByText("精灵")).toBeTruthy();
  expect(screen.getByText("道具")).toBeTruthy();
  expect(screen.getByText("No.0001 · 草/毒")).toBeTruthy();
});

test("空数组是无结果态，不是失败态", () => {
  open();
  type("zzzzz");
  settle();

  expect(screen.getByText("未找到匹配结果")).toBeTruthy();
  expect(screen.queryByText("搜索暂时不可用，请稍后再试")).toBeNull();
});

test("查询抛错是失败态，输入还在，重试重新发请求", () => {
  query.result = { error: new Error("boom") };

  open();
  type("妙蛙");
  settle();

  expect(screen.getByText("搜索暂时不可用，请稍后再试")).toBeTruthy();
  expect(screen.getByText("已保留你的输入，可直接重试")).toBeTruthy();
  expect(screen.getByLabelText<HTMLInputElement>("搜索关键词").value).toBe("妙蛙");

  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
});

test("四条关闭路径都把输入清干净，再打开是空的搜索框", () => {
  query.result = {
    data: {
      search: [
        { kind: "POKEMON", name: "妙蛙种子", slug: "bulbasaur", subtitle: "No.0001 · 草/毒" },
      ],
    },
  };

  /** open 由外面持有，和 layout 上的 SearchDialogProvider 一个形状 */
  function Harness() {
    const [open, setOpen] = useState(true);

    return (
      <>
        <button onClick={() => setOpen(true)}>重新打开</button>
        <SearchDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  render(<Harness />);

  // 点结果这条路径不经过 Dialog 自己的交互，最容易漏掉清理
  type("妙蛙");
  settle();
  fireEvent.click(document.body.querySelector('[data-slot="search-hit"]')!);

  fireEvent.click(screen.getByRole("button", { name: "重新打开" }));
  expect(screen.getByLabelText<HTMLInputElement>("搜索关键词").value).toBe("");
  expect(screen.getByText("输入名称开始搜索")).toBeTruthy();

  // ESC、点关闭按钮两条走的是 Dialog 自己的 onOpenChange
  type("妙蛙");
  fireEvent.keyDown(screen.getByLabelText("搜索关键词"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "重新打开" }));
  expect(screen.getByLabelText<HTMLInputElement>("搜索关键词").value).toBe("");

  type("妙蛙");
  fireEvent.click(screen.getByRole("button", { name: "ESC 关闭" }));
  fireEvent.click(screen.getByRole("button", { name: "重新打开" }));
  expect(screen.getByLabelText<HTMLInputElement>("搜索关键词").value).toBe("");
});
