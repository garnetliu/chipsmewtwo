/**
 * 道具：AT-025 ~ AT-028、AT-032（AC-030/031/032/034/035/036/041）
 * 特性：AT-034 ~ AT-036、AT-041、AT-044（AC-044/045/047/048/051/054）
 * 通用：AT-014（AC-015/029/043/056 说明暂缺）、AT-013（AC-014 占位图）
 * 选择器取自 UI_CONTRACT.md PAGE-006 ~ PAGE-009 与 PAGE-003。
 * RED：这些组件都还不存在（T-010 ~ T-013、T-007 承诺创建）。
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders as render } from "../render";
import { describe, expect, it } from "vitest";

import { ItemList } from "@/app/item/component/item-list";
import { ItemDetail } from "@/app/item/[name]/component/item-detail";
import { AbilityList } from "@/app/ability/component/ability-list";
import { AbilityDetail } from "@/app/ability/[name]/component/ability-detail";
import { PokemonDetail } from "@/app/pokemon/[name]/component/pokemon-detail";

describe("AT-025 道具列表展示与排序（AC-030）", () => {
  it("展示 156 条道具的中文名，按 slug 字母序", async () => {
    render(<ItemList page={1} />);
    const items = await screen.findAllByTestId("item-list-item");
    const slugs = items.map((i) => i.getAttribute("data-slug") ?? "");
    expect(slugs).toEqual([...slugs].sort());
  });
});

describe("AT-026 道具世代筛选与重复点击（AC-031 / AC-036）", () => {
  it("重复点同一筛选项筛选不丢也不报错", async () => {
    const user = userEvent.setup();
    render(<ItemList page={1} />);
    const options = await screen.findAllByTestId("generation-filter-option");
    await user.click(options[2]);
    await user.click(options[2]);
    expect(screen.getByTestId("generation-filter")).toHaveAttribute("data-selected", "3");
    expect(screen.queryByTestId("list-error")).not.toBeInTheDocument();
  });
});

describe("AT-027 道具筛选空态（AC-034）", () => {
  it("无结果时展示当前筛选条件下暂无结果", async () => {
    render(<ItemList page={1} __forceEmpty />);
    expect(await screen.findByTestId("list-empty")).toHaveTextContent("当前筛选条件下暂无结果");
  });
});

describe("AT-028 道具列表加载失败（AC-035）", () => {
  it("展示失败文案与重试入口", async () => {
    render(<ItemList page={1} __forceError />);
    expect(await screen.findByTestId("list-error")).toHaveTextContent("列表加载失败，请稍后再试");
    expect(screen.getByTestId("list-retry-btn")).toBeInTheDocument();
  });
});

describe("AT-032 道具详情加载失败（AC-041）", () => {
  it("展示道具资料加载失败，请稍后再试", async () => {
    render(<ItemDetail slug="ability-shield" __forceError />);
    expect(await screen.findByText("道具资料加载失败，请稍后再试")).toBeInTheDocument();
  });
});

describe("AT-034 特性列表展示与排序（AC-044）", () => {
  it("展示名称与简短说明，按 slug 字母序", async () => {
    render(<AbilityList page={1} />);
    const items = await screen.findAllByTestId("ability-list-item");
    const slugs = items.map((i) => i.getAttribute("data-slug") ?? "");
    expect(slugs).toEqual([...slugs].sort());
  });

  it("特性列表没有世代筛选器（AC-045）", async () => {
    render(<AbilityList page={1} />);
    await screen.findByTestId("ability-list");
    expect(screen.queryByTestId("generation-filter")).not.toBeInTheDocument();
  });
});

describe("AT-035 特性表无数据（AC-047）", () => {
  it("展示当前暂无特性数据", async () => {
    render(<AbilityList page={1} __forceEmpty />);
    expect(await screen.findByTestId("ability-list-empty")).toHaveTextContent("当前暂无特性数据");
  });
});

describe("AT-036 特性列表加载失败（AC-048）", () => {
  it("展示失败文案与重试入口", async () => {
    render(<AbilityList page={1} __forceError />);
    expect(await screen.findByTestId("list-error")).toHaveTextContent("列表加载失败，请稍后再试");
    expect(screen.getByTestId("list-retry-btn")).toBeInTheDocument();
  });
});

describe("AT-041 特性详情加载失败（AC-054）", () => {
  it("展示特性资料加载失败，请稍后再试", async () => {
    render(<AbilityDetail slug="volt-absorb" __forceError />);
    expect(await screen.findByText("特性资料加载失败，请稍后再试")).toBeInTheDocument();
  });
});

describe("AT-044 隐藏特性标记（AC-051）", () => {
  it("slot 3 的形态条目带隐藏标记，slot 1/2 的没有", async () => {
    render(<AbilityDetail slug="volt-absorb" />);
    const items = await screen.findAllByTestId("ability-form-item");
    const hidden = items.filter((i) => i.getAttribute("data-slot") === "3");
    const normal = items.filter((i) => i.getAttribute("data-slot") !== "3");
    expect(hidden.length).toBeGreaterThan(0);
    hidden.forEach((i) => expect(i.querySelector('[data-testid="ability-form-hidden-badge"]')).not.toBeNull());
    normal.forEach((i) => expect(i.querySelector('[data-testid="ability-form-hidden-badge"]')).toBeNull());
  });
});

describe("AT-014 说明为空一律展示说明暂缺（AC-015/029/043/056）", () => {
  it("道具说明为空时展示说明暂缺", async () => {
    render(<ItemDetail slug="ability-shield" />);
    expect(await screen.findByTestId("item-detail-effect")).toHaveTextContent("说明暂缺");
  });

  it("精灵说明为空时展示说明暂缺", async () => {
    render(<PokemonDetail id="1" __emptyText />);
    expect(await screen.findByTestId("detail-empty-text")).toHaveTextContent("说明暂缺");
  });
});

describe("AT-013 图片资源异常（AC-014）", () => {
  it("Pokémon 图片加载失败时换占位图且布局不塌", async () => {
    render(<PokemonDetail id="1" />);
    const img = (await screen.findByTestId("pokemon-detail-image")) as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    expect(img.getAttribute("src")).toMatch(/placeholder/);
  });
});

describe("AT-062 列表不取重字段（CON-005）", () => {
  it("精灵列表的查询文档里没有 descriptions", async () => {
    // 读查询文档本身而不是组件导出：CON-005 约束的是「查了什么」，
    // 与组件怎么导出无关；也避免在 RED 期给 tsc 造出一条与行为无关的类型错误。
    const { readFileSync } = await import("node:fs");
    const doc = readFileSync("graphql/apollo/query/GET_POKEMON_LIST.ts", "utf8");
    expect(doc).not.toMatch(/\bdescriptions\b/);
    expect(doc).not.toMatch(/\bgenerations\b/);
  });
});
