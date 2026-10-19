import type { PKHEX_SPECIES_OPTION } from "@pkcw/graphql/apollo/fragment";
import type { DocumentType } from "@pkcw/graphql/generated";

import type { SpeciesMeta } from "./save-editor-store";

/**
 * 这个 fragment 在两条查询里都带 @unmask，所以父级拿到的就是完整数据，
 * 不用 useFragment 解
 */
export type SpeciesOption = DocumentType<typeof PKHEX_SPECIES_OPTION>;

/**
 * 查询结果拍平成 species 编号 → 展示资料。
 *
 * 后端保证返回顺序跟入参一致、查不到的位置是 null，所以按下标对；
 * null 的位置也要记进去 —— 那是「查过了库里没有」，跟「还没查」得分开，
 * 不然每次切箱都会为同一批缺失编号再发一次请求
 */
export function toSpeciesEntries(
  ids: number[],
  rows: readonly (SpeciesOption | null)[],
): [number, SpeciesMeta | null][] {
  return ids.map((id, index) => {
    const row = rows[index];
    if (!row) return [id, null];

    return [
      id,
      {
        // 这一语种没收录译名时退回英文 slug，总比空着强
        name: row.name ?? row.slug,
        imageUrl: row.defaultForm?.detailImageUrl ?? null,
      },
    ];
  });
}
