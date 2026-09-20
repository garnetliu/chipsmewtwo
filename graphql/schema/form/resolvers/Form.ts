import { LATEST_GENERATION } from "@/lib/pokemon/defaults";
import { detailImageUrl, fullImageUrl } from "@/lib/pokemon/sprites";

import type { FormResolvers } from "./../../types.generated";

/**
 * 每个字段自己拿参数、自己走 DataLoader，缺数据就返回 null。
 *
 * id、slug、isDefault 不用写 —— formsOf 返回的对象里就有。
 * 图片也一样，库里存的是文件名，这里只拼前缀（lib/pokemon/sprites.ts）
 */
export const Form: FormResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.form.nameOf(Number(parent.id), language ?? ctx.language),

  genus: (parent, { language }, ctx) =>
    ctx.dataSources.form.genusOf(Number(parent.id), language ?? ctx.language),

  fullImageUrl: (parent) => (parent.fullImage ? fullImageUrl(parent.fullImage) : null),

  detailImageUrl: (parent) => (parent.detailImage ? detailImageUrl(parent.detailImage) : null),

  types: (parent, { generation }, ctx) =>
    ctx.dataSources.form.typesOf(Number(parent.id), generation ?? LATEST_GENERATION),

  stats: (parent, { generation }, ctx) =>
    ctx.dataSources.form.statsOf(Number(parent.id), generation ?? LATEST_GENERATION),

  color: (parent, { generation }, ctx) =>
    ctx.dataSources.form.colorOf(Number(parent.id), generation ?? LATEST_GENERATION),

  abilities: (parent, { generation }, ctx) =>
    ctx.dataSources.form.abilitiesOf(Number(parent.id), generation ?? LATEST_GENERATION),

  descriptions: (parent, { language }, ctx) =>
    ctx.dataSources.form.descriptionsOf(Number(parent.id), language ?? ctx.language),
};
