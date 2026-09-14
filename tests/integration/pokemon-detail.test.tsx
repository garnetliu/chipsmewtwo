/**
 * AT-011（AC-012 精灵详情取数失败）
 * 选择器取自 UI_CONTRACT.md PAGE-003。
 * RED：PokemonDetail 组件不存在（T-007 承诺创建）。
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders as render } from "../render";

import { PokemonDetail } from "@/app/pokemon/[name]/component/pokemon-detail";

describe("AT-011 精灵详情取数失败（AC-012）", () => {
  it("展示精灵资料加载失败，请稍后再试", async () => {
    render(<PokemonDetail id="1" __forceError />);
    expect(await screen.findByText("精灵资料加载失败，请稍后再试")).toBeInTheDocument();
  });
});
