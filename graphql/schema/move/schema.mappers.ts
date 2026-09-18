/**
 * 招式那几个类型的 parent 形状，都是 MoveSource 查出来的库里的行。
 * 带参数的字段（name、effect）不在里面，由字段 resolver 各自走 loader
 */
import type { MoveRow, MoveVersionStatRow } from "@/graphql/context/move-source";

/** 详情用 */
export type MoveMapper = MoveRow;

/** 列表项。库里跟 Move 是同一行，差别只在 GraphQL 那边能取哪些字段 */
export type MoveSummaryMapper = MoveRow;

/** 数值表的一行。版本、属性、分类都是取数时就拼好的 */
export type MoveVersionStatMapper = MoveVersionStatRow;

/**
 * offset 和 limit 带下来给 pagination 算页码，data 是这一页的行。
 * generation 也带下来 —— 总数要按同一个筛选条件数，否则翻页翻到空页
 */
export type MoveListMapper = {
  data: MoveSummaryMapper[];
  offset: number;
  limit: number;
  generation: number | null;
};
