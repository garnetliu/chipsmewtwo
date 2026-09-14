/**
 * AT-045 ~ AT-050（AC-058/059/060/062/063/064）
 * 选择器取自 UI_CONTRACT.md 全站组件 顶部搜索。
 * RED：components/root-header/search-modal.tsx 不存在（T-014 承诺创建）。
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../render";
import { describe, expect, it } from "vitest";

import { SearchModal } from "@/components/root-header/search-modal";

describe("AT-045 打开模态框（AC-058）", () => {
  it("点顶部搜索框打开蒙层模态框", async () => {
    const user = userEvent.setup();
    render(<SearchModal />);
    await user.click(screen.getByTestId("search-trigger"));
    expect(await screen.findByTestId("search-modal")).toBeInTheDocument();
  });
});

describe("AT-046 未输入不出结果（AC-059）", () => {
  it("模态框已开但未输入关键词时不展示结果列表", async () => {
    const user = userEvent.setup();
    render(<SearchModal />);
    await user.click(screen.getByTestId("search-trigger"));
    expect(screen.queryByTestId("search-result-list")).not.toBeInTheDocument();
  });
});

describe("AT-047 展示匹配结果并标出类型（AC-060）", () => {
  it("输入可匹配名称后展示结果，每条带类型标记", async () => {
    const user = userEvent.setup();
    render(<SearchModal />);
    await user.click(screen.getByTestId("search-trigger"));
    await user.type(screen.getByTestId("search-input"), "妙蛙");
    const items = await screen.findAllByTestId("search-result-item");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].querySelector('[data-testid="search-result-kind"]')).not.toBeNull();
  });
});

describe("AT-048 无匹配（AC-062）", () => {
  it("展示未找到匹配结果", async () => {
    const user = userEvent.setup();
    render(<SearchModal />);
    await user.click(screen.getByTestId("search-trigger"));
    await user.type(screen.getByTestId("search-input"), "zzzzzz-no-such-thing");
    expect(await screen.findByTestId("search-empty")).toHaveTextContent("未找到匹配结果");
  });
});

describe("AT-049 搜索失败（AC-063）", () => {
  it("展示搜索暂时不可用并保留输入", async () => {
    const user = userEvent.setup();
    render(<SearchModal __forceError />);
    await user.click(screen.getByTestId("search-trigger"));
    await user.type(screen.getByTestId("search-input"), "妙蛙");
    expect(await screen.findByTestId("search-error")).toHaveTextContent("搜索暂时不可用，请稍后再试");
    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("妙蛙");
  });
});

describe("AT-050 重复输入同一关键词（AC-064）", () => {
  it("返回相同结果，不产生重复跳转", async () => {
    const user = userEvent.setup();
    render(<SearchModal />);
    await user.click(screen.getByTestId("search-trigger"));
    const input = screen.getByTestId("search-input");
    await user.type(input, "妙蛙");
    const first = (await screen.findAllByTestId("search-result-item")).map((i) => i.textContent);
    await user.clear(input);
    await user.type(input, "妙蛙");
    await waitFor(() => {
      expect(screen.getAllByTestId("search-result-item").map((i) => i.textContent)).toEqual(first);
    });
  });
});
