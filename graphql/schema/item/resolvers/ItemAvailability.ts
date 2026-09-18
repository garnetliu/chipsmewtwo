import type { ItemAvailabilityResolvers } from "./../../types.generated";

/**
 * 可用性表的一行。versions 在 availabilityOf 拼好的行里，不用写。
 *
 * 另外两列单独写出来是为了留个记号：库里和 PokeAPI 都没有道具的获取地点数据，
 * 这两列恒为 null，不是漏了取
 */
export const ItemAvailability: ItemAvailabilityResolvers = {
  obtainMethod: () => null,
  availability: () => null,
};
