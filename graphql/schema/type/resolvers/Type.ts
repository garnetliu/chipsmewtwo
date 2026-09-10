import type { TypeResolvers } from "./../../types.generated";

/**
 * id / slug / color 不用写 —— typesOf 返回的对象里就有。
 * 只有 name 要单独查译名，因为它带 language 参数
 */
export const Type: TypeResolvers = {
  name: (parent, { language }, ctx) =>
    ctx.dataSources.pokemonDb.typeNameOf(Number(parent.id), language ?? ctx.language),
};
