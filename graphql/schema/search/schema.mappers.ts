/**
 * 搜索结果的 parent 形状 —— SearchSource 找出来的命中行。
 *
 * 行里多一个 id（各自表的主键），SDL 上没有这个字段，
 * subtitle 拿它回各自的 source 取属性和说明
 */
import type { SearchHitRow } from "@/graphql/context/search-source";

export type SearchResultMapper = SearchHitRow;
