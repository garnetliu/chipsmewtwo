import type { FormAbilityResolvers } from "./../../types.generated";

/**
 * 库里是 (formId, generationId, slot) 复合主键，没有单列 id，
 * 客户端缓存要的那个键在这层拼 —— 同 FormStats.id
 */
export const FormAbility: FormAbilityResolvers = {
  id: (parent) => `${parent.formId}:${parent.generationId}:${parent.slot}`,
};
