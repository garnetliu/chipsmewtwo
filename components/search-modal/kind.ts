import { GET_SEARCH } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

/** 搜索结果的一条。没有 id，列表的 key 由 kind + slug 拼 */
export type SearchHit = DocumentType<typeof GET_SEARCH>["search"][number];

interface IKindMeta {
  /** 徽章上的中文，schema 只透出枚举值，文案归前端 */
  label: string;
  /** 这一类详情页的路由前缀，后面接 slug */
  path: string;
  /** 徽章的色。四类要一眼分得开，所以各挑一个色相，字用它、底用它的淡色 */
  color: string;
}

/**
 * 四类各自的徽章和去处。
 *
 * 色值取 globals.css 里已有的属性色 token：prototype 那四个色（蓝橙紫青）在本仓库
 * 没有对应的语义色，而属性色是现成的同色相定值，深浅主题下都不变
 */
export const KINDS: Record<SearchHit["kind"], IKindMeta> = {
  POKEMON: { label: "精灵", path: "/pokemon", color: "var(--color-type-water)" },
  MOVE: { label: "招式", path: "/move", color: "var(--color-type-fire)" },
  ITEM: { label: "道具", path: "/item", color: "var(--color-type-poison)" },
  ABILITY: { label: "特性", path: "/ability", color: "var(--color-type-ice)" },
};
