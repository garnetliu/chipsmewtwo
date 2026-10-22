import type { FormColorResolvers } from "./../../types.generated";

/**
 * id / slug / color 不用写 —— colorOf 返回的对象里就有。
 * 只有 name 要单独查译名，因为它带 language 参数
 */
export const FormColor: FormColorResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.form.colorNameOf(Number(parent.id), language ?? ctx.language),
};
