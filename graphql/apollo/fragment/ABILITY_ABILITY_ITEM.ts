import { graphql } from "@/graphql/generated";

/**
 * 特性列表的一行：名称、简短说明、登场版本。
 *
 * 不取拥有该特性的宝可梦 —— 那个字段一条特性要扫两百多行 form_ability，
 * 是详情页的拥有者卡。列表类型是 AbilitySummary，SDL 上就没有那个字段
 */
export const ABILITY_ABILITY_ITEM = graphql(`
  fragment ABILITY_ABILITY_ITEM on AbilitySummary {
    id
    slug
    name
    shortEffect
    versions {
      ...VERSION_BADGE @unmask
    }
  }
`);
