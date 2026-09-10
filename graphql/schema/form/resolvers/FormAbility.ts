import type { FormAbilityResolvers } from "./../../types.generated";

/**
 * 库里不存 isHidden 列 —— 它跟 slot = 3 完全等价（见 prisma schema 的 FormAbility），
 * 所以在这里算，不在数据里冗余一份
 */
export const FormAbility: FormAbilityResolvers = {
  isHidden: (parent) => parent.slot === 3,
};
