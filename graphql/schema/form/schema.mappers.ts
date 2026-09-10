/**
 * 形态那批类型的 parent 形状，全是 FormSource 查出来的库里的行。
 * 带参数的字段（name、types、stats…）不在里面，由字段 resolver 各自走 loader
 */
import type { FormStat } from "@/generated/prisma/client";
import type {
  FormAbilityRow,
  FormColorRow,
  FormDescriptionRow,
  FormRow,
} from "@/graphql/context/form-source";

export type FormMapper = FormRow;

/** 复合主键，库里没有单列 id，GraphQL 的 id 由 FormStats.id 拼 */
export type FormStatsMapper = FormStat;

export type FormColorMapper = FormColorRow;

/** 同 FormStats，id 由 FormAbility.id 拼 */
export type FormAbilityMapper = FormAbilityRow;

export type FormDescriptionMapper = FormDescriptionRow;
