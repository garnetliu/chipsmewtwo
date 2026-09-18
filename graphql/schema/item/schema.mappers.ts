/**
 * 道具那几个类型的 parent 形状，都是 ItemSource 查出来的库里的行。
 * 带参数的字段（name、shortEffect）不在里面，由字段 resolver 各自走 loader
 */
import type { ItemAvailabilityRow, ItemRow } from "@/graphql/context/item-source";

/** 详情用 */
export type ItemMapper = ItemRow;

/** 列表项。库里跟 Item 是同一行，差别只在 GraphQL 那边能取哪些字段 */
export type ItemSummaryMapper = ItemRow;

/** 可用性表的一行。版本是取数时就拼好的，另外两列恒为 null，不在行里 */
export type ItemAvailabilityMapper = ItemAvailabilityRow;

/**
 * offset 和 limit 带下来给 pagination 算页码，data 是这一页的行。
 * generation 也带下来 —— 总数要按同一个筛选条件数，否则翻页翻到空页
 */
export type ItemListMapper = {
  data: ItemSummaryMapper[];
  offset: number;
  limit: number;
  generation: number | null;
};
