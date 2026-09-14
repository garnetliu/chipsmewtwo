/**
 * AT-015 ~ AT-019、AT-023、AT-061（AC-016/017/018/020/021/022/024/027）
 * 选择器取自 UI_CONTRACT.md PAGE-004 / PAGE-005。
 * RED：app/move/component/ 与 move 域的 GraphQL 查询都不存在（T-008/T-009 承诺创建）。
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../render";
import { describe, expect, it } from "vitest";

import { MoveList } from "@/app/move/component/move-list";
import { MoveDetail } from "@/app/move/[name]/component/move-detail";

describe("AT-015 招式列表展示与排序（AC-016）", () => {
  it("展示名称与简短说明，按英文 slug 字母序", async () => {
    render(<MoveList page={1} />);
    const items = await screen.findAllByTestId("move-list-item");
    const slugs = items.map((i) => i.getAttribute("data-slug") ?? "");
    expect(slugs).toEqual([...slugs].sort());
  });
});

describe("AT-016 世代筛选与重复点击（AC-017 / AC-022）", () => {
  it("选中世代后刷新；重复点同一项筛选不丢", async () => {
    const user = userEvent.setup();
    render(<MoveList page={1} />);
    const options = await screen.findAllByTestId("generation-filter-option");
    await user.click(options[5]);
    await user.click(options[5]);
    expect(screen.getByTestId("generation-filter")).toHaveAttribute("data-selected", "6");
    expect(screen.queryByTestId("list-error")).not.toBeInTheDocument();
  });
});

describe("AT-017 未搜索时照常展示（AC-018）", () => {
  it("没有搜索关键词时招式列表按列表页规则展示", async () => {
    render(<MoveList page={1} />);
    expect(await screen.findByTestId("move-list")).toBeInTheDocument();
    expect((await screen.findAllByTestId("move-list-item")).length).toBeGreaterThan(0);
  });
});

describe("AT-018 筛选空态（AC-020）", () => {
  it("无结果时展示当前筛选条件下暂无结果", async () => {
    render(<MoveList page={1} generation={9} __forceEmpty />);
    expect(await screen.findByTestId("list-empty")).toHaveTextContent("当前筛选条件下暂无结果");
  });
});

describe("AT-019 列表加载失败（AC-021）", () => {
  it("展示失败文案与重试入口", async () => {
    render(<MoveList page={1} __forceError />);
    expect(await screen.findByTestId("list-error")).toHaveTextContent("列表加载失败，请稍后再试");
    expect(screen.getByTestId("list-retry-btn")).toBeInTheDocument();
  });
});

describe("AT-023 详情加载失败（AC-027）", () => {
  it("展示招式资料加载失败，请稍后再试", async () => {
    render(<MoveDetail slug="knock-off" __forceError />);
    expect(await screen.findByText("招式资料加载失败，请稍后再试")).toBeInTheDocument();
  });
});

describe("AT-061 世代表格按世代升序（AC-024）", () => {
  it("拍落的表格一行一个世代，最多 9 行，且按世代升序", async () => {
    render(<MoveDetail slug="knock-off" />);
    const rows = await screen.findAllByTestId("move-generation-row");
    expect(rows.length).toBeLessThanOrEqual(9);
    const gens = rows.map((r) => Number(r.getAttribute("data-generation")));
    expect(gens).toEqual([...gens].sort((a, b) => a - b));
  });

  it("拍落 Gen5 威力 20、Gen6 起 65（AC-024）", async () => {
    render(<MoveDetail slug="knock-off" />);
    const rows = await screen.findAllByTestId("move-generation-row");
    const byGen = (g: number) => rows.find((r) => r.getAttribute("data-generation") === String(g));
    await waitFor(() => {
      expect(byGen(5)?.querySelector('[data-testid="move-detail-power"]')?.textContent).toBe("20");
      expect(byGen(6)?.querySelector('[data-testid="move-detail-power"]')?.textContent).toBe("65");
    });
  });
});
