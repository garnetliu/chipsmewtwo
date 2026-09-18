/**
 * 特性那几个类型的 parent 形状，都是 AbilitySource 查出来的库里的行。
 * 带参数的字段（name、effect…）不在里面，由字段 resolver 各自走 loader
 */
import type { AbilityRow } from "@/graphql/context/ability-source";

/** 详情用。跟着 FormAbility 一起 join 出来的也是它 */
export type AbilityMapper = AbilityRow;

/** 列表项。库里跟 Ability 是同一行，差别只在 GraphQL 那边能取哪些字段 */
export type AbilitySummaryMapper = AbilityRow;

/** offset 和 limit 带下来给 pagination 算页码，data 是这一页的行 */
export type AbilityListMapper = {
  data: AbilitySummaryMapper[];
  offset: number;
  limit: number;
};
