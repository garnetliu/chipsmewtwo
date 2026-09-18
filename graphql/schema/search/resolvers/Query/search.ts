import type { QueryResolvers } from "./../../../types.generated";

/**
 * 名额怎么分、排序怎么定都在 SearchSource 里，这里只把当前语言带下去 ——
 * 匹配的是那一种语言的译名行。一条都没命中是空数组，不抛错
 */
export const search: NonNullable<QueryResolvers["search"]> = (_parent, arg, ctx) =>
  ctx.dataSources.search.search(arg.keyword, ctx.language);
