import { DEFAULT_LANGUAGE } from "@/lib/pokemon/defaults";

import type { PokemonTypeResolvers } from "./../../types.generated";

/**
 * id / slug / color 不用写 —— PokemonDbSource 返回的对象里就有。
 * 只有 name 要单独查译名，因为它带 language 参数。
 */
export const PokemonType: PokemonTypeResolvers = {
  name: (parent, { language }, ctx) => {
    return ctx.dataSources.pokemonDb.typeNameOf(Number(parent.id), language ?? DEFAULT_LANGUAGE);
  },
};
