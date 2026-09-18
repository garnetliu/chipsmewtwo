import { graphql } from "@/graphql/generated";

/**
 * 招式列表的一行：名称、说明、登场版本。
 *
 * 不取 versionStats —— 一条招式要摊成三十几行，那是详情页的数值表。
 * 列表类型是 MoveSummary，SDL 上就没有那个字段
 */
export const MOVE_MOVE_ITEM = graphql(`
  fragment MOVE_MOVE_ITEM on MoveSummary {
    id
    slug
    name
    effect
    versions {
      ...VERSION_BADGE @unmask
    }
  }
`);
