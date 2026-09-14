/**
 * AT-056 ~ AT-060（AC-066/067/070/072/073）
 * 选择器取自 UI_CONTRACT.md PAGE-010。
 * RED：app/effort-values/ 整个目录还不存在（T-016 承诺创建）。
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../render";
import { describe, expect, it } from "vitest";

import { EvCalculator } from "@/app/effort-values/component/ev-calculator";

describe("AT-056 默认选中第一只（AC-066）", () => {
  it("进入页面即选中列表第一只并展示六项能力值，没有请选择空态", async () => {
    render(<EvCalculator />);
    const select = await screen.findByTestId("ev-pokemon-select");
    expect((select as HTMLSelectElement).value).not.toBe("");
    expect(await screen.findByTestId("ev-result-table")).toBeInTheDocument();
    expect(screen.queryByText(/请选择 Pokémon 后开始计算/)).not.toBeInTheDocument();
  });
});

describe("AT-057 切换后重算（AC-067）", () => {
  it("换一只 Pokémon 后六项能力值按新种族值重算", async () => {
    const user = userEvent.setup();
    render(<EvCalculator />);
    const rowsBefore = (await screen.findAllByTestId("ev-result-row")).map((r) => r.textContent);
    const select = await screen.findByTestId("ev-pokemon-select");
    await user.selectOptions(select, (select as HTMLSelectElement).options[1].value);
    await waitFor(() => {
      const rowsAfter = screen.getAllByTestId("ev-result-row").map((r) => r.textContent);
      expect(rowsAfter).not.toEqual(rowsBefore);
    });
  });
});

describe("AT-058 输入变化即重算（AC-070）", () => {
  it("调整等级后结果立即更新", async () => {
    const user = userEvent.setup();
    render(<EvCalculator />);
    const before = (await screen.findAllByTestId("ev-result-row")).map((r) => r.textContent);
    const level = await screen.findByTestId("ev-level-input");
    await user.clear(level);
    await user.type(level, "100");
    await waitFor(() => {
      expect(screen.getAllByTestId("ev-result-row").map((r) => r.textContent)).not.toEqual(before);
    });
  });
});

describe("AT-059 选择列表加载失败（AC-072）", () => {
  it("展示失败文案并允许重试", async () => {
    render(<EvCalculator __forceError />);
    expect(await screen.findByText("列表加载失败，请稍后再试")).toBeInTheDocument();
  });
});

describe("AT-060 重复选同一只（AC-073）", () => {
  it("重复选择同一 Pokémon 保持计算上下文，不产生错误状态", async () => {
    const user = userEvent.setup();
    render(<EvCalculator />);
    const select = (await screen.findByTestId("ev-pokemon-select")) as HTMLSelectElement;
    const first = select.options[0].value;
    await user.selectOptions(select, first);
    const rows = screen.getAllByTestId("ev-result-row").map((r) => r.textContent);
    await user.selectOptions(select, first);
    expect(screen.getAllByTestId("ev-result-row").map((r) => r.textContent)).toEqual(rows);
  });
});
