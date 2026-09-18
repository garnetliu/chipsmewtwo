import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  DetailDescription,
  DetailImage,
  DetailLink,
  DetailShell,
  rememberDetailSource,
} from "@/components/pokedex/detail-shell";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  // 来源栈是模块级的，用例之间不能互相串
  rememberDetailSource(null);
  refresh.mockClear();
});

// vitest 没开 globals，RTL 注册不上自动清理，得自己来
afterEach(cleanup);

/** 面包屑第一段 */
function backLink() {
  return screen.getByRole("link", { name: /← 返回/ });
}

test("没有来源时面包屑退化成回本类列表，四类各回各的", () => {
  const cases = [
    { kind: "pokemon", label: "← 返回精灵列表", href: "/pokemon", crumb: "精灵详情" },
    { kind: "move", label: "← 返回招式列表", href: "/move", crumb: "招式详情" },
    { kind: "item", label: "← 返回道具列表", href: "/item", crumb: "道具详情" },
    { kind: "ability", label: "← 返回特性列表", href: "/ability", crumb: "特性详情" },
  ] as const;

  for (const { kind, label, href, crumb } of cases) {
    render(<DetailShell kind={kind} title="妙蛙种子" result={{ data: {} }} />);

    expect(backLink().textContent).toBe(label);
    expect(backLink().getAttribute("href")).toBe(href);
    expect(screen.getByText(crumb)).toBeTruthy();

    cleanup();
  }
});

test("有来源时面包屑写来源，点回来源地址", () => {
  rememberDetailSource({ href: "/ability/overgrow", label: "特性详情" });

  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);

  expect(backLink().textContent).toBe("← 返回特性详情");
  expect(backLink().getAttribute("href")).toBe("/ability/overgrow");
  // 中段仍然是本页自己的类别
  expect(screen.getByText("精灵详情")).toBeTruthy();
  expect(screen.getByText("妙蛙种子")).toBeTruthy();
});

test("来源带查询参数时原样带回去", () => {
  rememberDetailSource({ href: "/pokemon?gen=1&page=3", label: "精灵列表" });

  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);

  expect(backLink().getAttribute("href")).toBe("/pokemon?gen=1&page=3");
});

test("搜索结果也能当来源", () => {
  rememberDetailSource({ href: "/pokemon?q=妙蛙", label: "搜索结果" });

  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);

  expect(backLink().textContent).toBe("← 返回搜索结果");
});

test("一次导航只认一次来源：再挂载一次就退化成回列表", () => {
  rememberDetailSource({ href: "/ability/overgrow", label: "特性详情" });

  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);
  expect(backLink().textContent).toBe("← 返回特性详情");
  cleanup();

  // 刷新等于整个模块重新来过，来源栈是空的；这里模拟的是「来源已经被消费掉」之后
  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);
  expect(backLink().textContent).toBe("← 返回精灵列表");
  expect(backLink().getAttribute("href")).toBe("/pokemon");
});

test("DetailLink 点下去把当前地址记成来源", () => {
  window.history.replaceState(null, "", "/ability/overgrow?gen=1");

  render(
    <DetailLink href="/pokemon/bulbasaur" backLabel="特性详情">
      妙蛙种子
    </DetailLink>,
  );

  const link = screen.getByRole("link", { name: "妙蛙种子" });
  // Link 自己会去走客户端跳转，测试里只关心点击时记下了什么，别让它真的跳
  link.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(link);
  cleanup();

  render(<DetailShell kind="pokemon" title="妙蛙种子" result={{ data: {} }} />);

  expect(backLink().textContent).toBe("← 返回特性详情");
  expect(backLink().getAttribute("href")).toBe("/ability/overgrow?gen=1");
});

test("未找到：居中卡片 + 返回列表，不出面包屑", () => {
  render(<DetailShell kind="pokemon" result={{ data: null }} />);

  expect(screen.getByText("未找到该 Pokémon")).toBeTruthy();
  // 「返回列表」是纯导航，角色就是 link
  expect(screen.getByRole("link", { name: "返回列表" }).getAttribute("href")).toBe("/pokemon");
  expect(screen.queryByRole("link", { name: /← 返回/ })).toBeNull();
});

test("四类的未找到文案各是各的", () => {
  for (const [kind, text] of [
    ["move", "未找到该招式"],
    ["item", "未找到该道具"],
    ["ability", "未找到该特性"],
  ] as const) {
    render(<DetailShell kind={kind} result={{ data: null }} />);
    expect(screen.getByText(text)).toBeTruthy();
    cleanup();
  }
});

test("加载失败：文案带类别、有重试、面包屑还在", () => {
  const retry = vi.fn();

  render(<DetailShell kind="ability" title="茂盛" result={null} retry={retry} />);

  expect(screen.getByText("特性资料加载失败，请稍后再试")).toBeTruthy();
  expect(backLink().getAttribute("href")).toBe("/ability");

  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("没传 retry 时重试就重跑这一页的服务端渲染", () => {
  render(<DetailShell kind="pokemon" result={undefined} />);

  fireEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(refresh).toHaveBeenCalledTimes(1);
});

test("正常态渲染正文，不出任何异常卡", () => {
  render(
    <DetailShell kind="pokemon" title="妙蛙种子" result={{ data: { id: 1 } }}>
      <div data-testid="detail-body">正文</div>
    </DetailShell>,
  );

  expect(screen.getByTestId("detail-body")).toBeTruthy();
  expect(screen.queryByText("未找到该 Pokémon")).toBeNull();
  expect(screen.queryByRole("button", { name: "重试" })).toBeNull();
});

test("说明为空（null、空串、只有空白）都渲染「说明暂缺」", () => {
  for (const text of [null, undefined, "", "   "]) {
    const { container } = render(<DetailDescription text={text} />);
    const node = container.querySelector('[data-slot="detail-description"]');

    expect(node?.textContent).toBe("说明暂缺");
    expect(node?.getAttribute("data-empty")).toBe("true");

    cleanup();
  }
});

test("有说明就原样渲染，不带空标记", () => {
  const { container } = render(<DetailDescription text="HP 低于三分之一时草属性招式威力提升。" />);
  const node = container.querySelector('[data-slot="detail-description"]');

  expect(node?.textContent).toBe("HP 低于三分之一时草属性招式威力提升。");
  expect(node?.hasAttribute("data-empty")).toBe(false);
});

test("图片字段为 null 时出占位图，盒子的尺寸类不变", () => {
  const { container } = render(<DetailImage src={null} alt="妙蛙种子" />);
  const box = container.querySelector('[data-slot="detail-image"]');

  expect(box?.getAttribute("data-placeholder")).toBe("true");
  expect(box?.className).toContain("size-28");
  expect(container.querySelector("img")).toBeNull();
  // 占位图不带信息，读屏得拿到条目名
  expect(screen.getByText("妙蛙种子").className).toContain("sr-only");
});

test("图片加载失败时换成占位图，盒子的尺寸类不变", () => {
  const { container } = render(<DetailImage src="/does-not-exist.png" alt="妙蛙种子" />);
  const box = container.querySelector('[data-slot="detail-image"]');
  const image = container.querySelector("img");

  expect(box?.hasAttribute("data-placeholder")).toBe(false);
  expect(image).toBeTruthy();

  fireEvent.error(image!);

  expect(box?.getAttribute("data-placeholder")).toBe("true");
  expect(box?.className).toContain("size-28");
  expect(container.querySelector("img")).toBeNull();
});
