/**
 * 形态那批类型的 parent 形状：查库实际给的列。
 * 带参数的字段（name、types、stats…）都不在里面，由字段 resolver 各自走 loader
 */
import type { AbilityMapper } from "../ability/schema.mappers";
import type { VersionMapper } from "../version/schema.mappers";

/** 图片存的是文件名，resolver 拼前缀（lib/pokemon/sprites.ts） */
export type FormMapper = {
  id: string;
  slug: string;
  isDefault: boolean;
  fullImage: string | null;
  detailImage: string | null;
};

export type FormColorMapper = { id: string; slug: string; color: string };

/** ability 在 loader 里就 join 出来了，不用再多一层字段解析 */
export type FormAbilityMapper = { id: string; slot: number; ability: AbilityMapper };

/** version 同上，跟着说明一起查出来 */
export type FormDescriptionMapper = {
  id: string;
  text: string;
  languageCode: string;
  version: VersionMapper;
};
