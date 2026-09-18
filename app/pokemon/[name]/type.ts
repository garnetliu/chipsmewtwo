import type { GET_POKEMON } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

/** 详情查询回来的那一只。document 里 fragment 全带 @unmask，字段在 RSC 里直接读 */
export type Pokemon = NonNullable<DocumentType<typeof GET_POKEMON>["pokemonBySlug"]>;
