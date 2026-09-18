import { graphql } from "@/graphql/generated";

/**
 * 属性胶囊要的几项。color 是库里的属性色，色块图的渐变底色按它取。
 * 同 VERSION_BADGE，spread 时一律带 @unmask
 */
export const TYPE_TAG = graphql(`
  fragment TYPE_TAG on Type {
    id
    slug
    name
    color
  }
`);
