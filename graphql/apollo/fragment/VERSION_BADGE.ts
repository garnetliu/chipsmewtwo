import { graphql } from "@/graphql/generated";

/**
 * 版本色块要的三项。四个域的「登场版本」都是这一行，spread 的时候一律带 @unmask ——
 * VerBadge 收的是 slug 和文案两个普通 prop，不认 fragment 引用
 */
export const VERSION_BADGE = graphql(`
  fragment VERSION_BADGE on Version {
    id
    slug
    name
  }
`);
