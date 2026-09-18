import type { ItemListResolvers } from "./../../types.generated";

/** data 由 Query.itemList 拼好传下来，pagination 在这里算 */
export const ItemList: ItemListResolvers = {
  pagination: async (parent, _arg, ctx) => {
    const { offset, limit, data, generation } = parent;

    const total = await ctx.dataSources.item.countAll(generation);

    return {
      // offset/limit 换算成页码给前端用。limit 是 0 时页码没有意义，当第一页
      page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
      pageSize: limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      // 用实际拿到的条数算，而不是 offset + limit：最后一页凑不满时不能算还有下一页
      hasNext: offset + data.length < total,
      hasPrev: offset > 0,
    };
  },
};
