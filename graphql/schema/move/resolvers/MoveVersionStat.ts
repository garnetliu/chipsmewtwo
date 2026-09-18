import type { MoveVersionStatResolvers } from "./../../types.generated";

/**
 * 数值表的一行。versions / type / category / power / accuracy / pp
 * 都在 versionStatsOf 拼好的行里，不用写。
 *
 * note 单独写出来是为了留个记号：库里和 PokeAPI 都没有版本级的说明文案，
 * 这一列恒为 null，不是漏了取
 */
export const MoveVersionStat: MoveVersionStatResolvers = {
  note: () => null,
};
