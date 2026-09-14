/**
 * AT-001 ~ AT-005（AC-001/002/003/005/006/007）
 * 选择器取自 UI_CONTRACT.md PAGE-002。
 * RED：PokemonList 目前不接受世代筛选，也不读 URL 参数（T-006 承诺补上）。
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../render";
import { describe, expect, it, vi } from "vitest";

import { PokemonList } from "@/app/pokemon/component/pokemon-list";

function renderList(overrides: Record<string, unknown> = {}) {
  // PokemonList 目前不接受任何 props（T-006 承诺加上 generation / page）。
  // 这行标注在实现完成后会变成「多余的 expect-error」而报错 —— 那时删掉它，
  // 正好强制测试与新签名同步。
  // @ts-expect-error 等 T-006
  return render(<PokemonList generation={undefined} page={1} {...overrides} />);
}

describe("AT-001 按全国编号升序（AC-001）", () => {
  it("列表条目按全国编号从小到大排列", async () => {
    renderList();
    const numbers = await screen.findAllByTestId("pokemon-list-item-number");
    const values = numbers.map((n) => Number(n.textContent));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe("AT-002 世代筛选与重复点击（AC-002 / AC-007）", () => {
  it("选中某个世代后列表按该世代刷新", async () => {
    const user = userEvent.setup();
    renderList();
    const options = await screen.findAllByTestId("generation-filter-option");
    await user.click(options[8]); // Gen9
    await waitFor(() => {
      expect(screen.getByTestId("generation-filter")).toHaveAttribute("data-selected", "9");
    });
  });

  it("请求进行中重复点同一筛选项，筛选条件不丢也不报错", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();
    renderList({ onFilterChange: onFilter });
    const options = await screen.findAllByTestId("generation-filter-option");
    await user.click(options[0]);
    await user.click(options[0]);
    expect(screen.getByTestId("generation-filter")).toHaveAttribute("data-selected", "1");
    expect(screen.queryByTestId("list-error")).not.toBeInTheDocument();
  });
});

describe("AT-003 默认不预选（AC-003）", () => {
  it("首次进入时筛选器未选中，列表是全量", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByTestId("generation-filter")).not.toHaveAttribute("data-selected");
    });
    expect(await screen.findByTestId("pokemon-list")).toBeInTheDocument();
  });
});

describe("AT-004 筛选空态（AC-005）", () => {
  it("当前筛选条件下无结果时展示空态文案", async () => {
    renderList({ generation: 9, __forceEmpty: true });
    expect(await screen.findByTestId("list-empty")).toHaveTextContent("当前筛选条件下暂无结果");
  });
});

describe("AT-005 加载失败（AC-006）", () => {
  it("请求失败时展示失败文案与重试入口", async () => {
    renderList({ __forceError: true });
    expect(await screen.findByTestId("list-error")).toHaveTextContent("列表加载失败，请稍后再试");
    expect(screen.getByTestId("list-retry-btn")).toBeInTheDocument();
  });
});
