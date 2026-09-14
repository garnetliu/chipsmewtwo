import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// jsdom 里没有 Next 的 Router context，useSearchParams() 会返回 null。
// 不 mock 的话组件在渲染阶段就炸，失败原因落在环境上而不是「行为还没实现」——
// 按 tdd，那种红不算红。这里只补环境，不替任何业务行为兜底。
const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

// 测试之间共享同一个实例，需要能改写
export function setSearchParams(init: Record<string, string>) {
  [...searchParams.keys()].forEach((k) => searchParams.delete(k));
  Object.entries(init).forEach(([k, v]) => searchParams.set(k, v));
}
