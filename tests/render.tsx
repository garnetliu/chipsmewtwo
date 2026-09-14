import { MockedProvider } from "@apollo/client/testing/react";
import { render as rtlRender } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Suspense } from "react";

/**
 * 测试基础设施，不是实现代码。
 *
 * 组件用 useSuspenseQuery，没有 ApolloProvider 会在渲染阶段直接抛 Invariant ——
 * 那种失败落在环境上，按 tdd 不算红。这里只把 provider 补上，
 * 不替任何业务行为兜底：断言该红还是红。
 */
export function renderWithProviders(ui: ReactElement, mocks: readonly unknown[] = []) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockedProvider mocks={mocks as never}>
        <Suspense fallback={<div data-testid="list-loading" />}>{children}</Suspense>
      </MockedProvider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper });
}
