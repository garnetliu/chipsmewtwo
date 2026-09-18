import type { TypedDocumentNode } from "@apollo/client";

import { query } from "@/graphql/apollo/server";

/**
 * 四个详情页的取数口径。
 *
 * 只在服务端调用（RSC 和 generateMetadata）—— 它拿的是 registerApolloClient 那个
 * 每请求一份的 client，客户端组件不要 import。
 *
 * 返回值直接喂给 DetailShell 的 result：
 *
 * | 情形 | 返回 | 壳的表现 |
 * |---|---|---|
 * | 查到了 | `{ data: 那一条 }` | 正文 |
 * | 库里没有这个 slug | `{ data: null }` | 未找到 |
 * | 查询带着错误回来（data 是 undefined）或者直接抛了 | `null` | 加载失败 |
 *
 * 查不到返回 null 而不是抛错是全局口径，四个域的 xxxBySlug resolver 都照它写。
 * 所以「data 整个是 undefined」只可能是故障，跟「查不到」分得开。
 */
export async function loadDetail<TData, TVariables extends Record<string, unknown>, TEntity>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  pick: (data: TData) => TEntity | null | undefined,
): Promise<{ data: TEntity | null } | null> {
  try {
    const { data } = await query({ query: document, variables });

    return data ? { data: pick(data) ?? null } : null;
  } catch {
    return null;
  }
}
