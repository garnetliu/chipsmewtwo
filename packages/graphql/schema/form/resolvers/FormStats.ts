import type { FormStatsResolvers } from "./../../types.generated";

/**
 * 种族值在库里是 (formId, generationId) 复合主键，没有单列 id。
 * 这个 id 是给 Apollo 客户端缓存用的键，库里没有对应的东西，所以在这层拼。
 * 其余字段的名字跟列名一样，默认解析器直接取
 */
export const FormStats: FormStatsResolvers = {
  id: (parent) => `${parent.formId}:${parent.generationId}`,
};
