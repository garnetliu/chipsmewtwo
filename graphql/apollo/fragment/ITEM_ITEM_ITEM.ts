import { graphql } from "@/graphql/generated";

/**
 * 道具列表的一张卡：名称、引入世代、一句话说明、登场版本。
 *
 * 不取 availability —— 一条第一世代的道具要摊成 32 行，那是详情页的可用性表。
 * 列表类型是 ItemSummary，SDL 上就没有那个字段
 */
export const ITEM_ITEM_ITEM = graphql(`
  fragment ITEM_ITEM_ITEM on ItemSummary {
    id
    slug
    name
    shortEffect
    introducedGeneration
    versions {
      ...VERSION_BADGE @unmask
    }
  }
`);
