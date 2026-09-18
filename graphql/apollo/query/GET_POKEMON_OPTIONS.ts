import { graphql } from "@/graphql/generated";

/**
 * 努力值模拟器的「选择 Pokémon」下拉。一次把全量 1025 只的编号和译名取回来，
 * 之后在浏览器里过滤 —— 输入一个字就打一次库的话，选择器要么卡要么得防抖，
 * 而这一份只有名字和 slug 两列，一次取完再也不用请求。
 *
 * 取数的是客户端组件，limit 由调用方给（全量就是 1025）
 */
export const GET_POKEMON_OPTIONS = graphql(`
  query GET_POKEMON_OPTIONS($offset: Int!, $limit: Int!) {
    pokemonList(offset: $offset, limit: $limit) {
      data {
        id
        slug
        name
      }
      pagination {
        total
      }
    }
  }
`);
