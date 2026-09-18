/**
 * GraphQL 类型的 parent 形状 —— 就是 PokemonSource 查出来的库里的行。
 *
 * 不写的话，codegen 会拿生成的 Pokemon 类型当 parent，于是每个字段都得由上一层
 * 塞好 —— 而 name 带 language 参数、要查译名表，findOne 只给 id 和 slug。
 * 声明成这样之后 codegen 就知道其余字段得各自写 resolver。
 *
 * 形态那批类型的 mapper 在 ../form/schema.mappers.ts
 */
import type { PokemonRow } from "@/graphql/context/pokemon-source";

export type PokemonMapper = PokemonRow;

/** 列表项。库里跟 Pokemon 是同一行，差别只在 GraphQL 那边能取哪些字段 */
export type PokemonSummaryMapper = PokemonRow;

/**
 * offset 和 limit 带下来给 pagination 算页码，data 是这一页的行。
 * generation 也带下来 —— 总数要按同一个筛选条件数，否则翻页翻到空页
 */
export type PokemonListMapper = {
  data: PokemonSummaryMapper[];
  offset: number;
  limit: number;
  generation: number | null;
};
