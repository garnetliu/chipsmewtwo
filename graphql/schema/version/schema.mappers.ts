import type { VersionRow } from "@/graphql/context/version-source";

/** 跟着图鉴说明一起 join 出来。译名由 Version.name 走 loader 取 */
export type VersionMapper = VersionRow;
