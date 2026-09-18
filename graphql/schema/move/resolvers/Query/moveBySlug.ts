import type { QueryResolvers } from "./../../../types.generated";

/**
 * 库里没有这一条时返回 null，不抛错 —— 「查不到某一条」不是故障，
 * 前端靠字段是不是 null 展示「未找到该招式」，不解析 errors
 */
export const moveBySlug: NonNullable<QueryResolvers["moveBySlug"]> = (_parent, arg, ctx) =>
  ctx.dataSources.move.findBySlug(arg.slug);
