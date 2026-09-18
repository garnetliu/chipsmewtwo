import type { LanguageCode } from "@/lib/pokemon/language";

import type { AbilitySource } from "./ability-source";
import type { FormSource } from "./form-source";
import type { ItemSource } from "./item-source";
import type { MoveSource } from "./move-source";
import type { PokemonSource } from "./pokemon-source";
import type { SearchSource } from "./search-source";
import type { TypeSource } from "./type-source";
import type { VersionSource } from "./version-source";

export * from "./ability-source";
export * from "./form-source";
export * from "./item-source";
export * from "./move-source";
export * from "./pokemon-source";
export * from "./search-source";
export * from "./type-source";
export * from "./version-source";

export interface MyContext {
  userID: string;
  /**
   * 这次请求取译名用哪种语言，由 NEXT_LOCALE cookie 决定，没有或认不出就是 DEFAULT_LANGUAGE。
   * 字段上的 language 参数优先级更高，用来单点覆盖（同一页里显示一个日文名之类）
   */
  language: LanguageCode;
  /**
   * 按 GraphQL 的域一个 source，字段 resolver 找自己域那个。
   * 全都必须每请求新建 —— DataLoader 的缓存按实例存，实例化在 app/api/graphql/route.ts
   */
  dataSources: {
    pokemon: PokemonSource;
    form: FormSource;
    type: TypeSource;
    ability: AbilitySource;
    move: MoveSource;
    item: ItemSource;
    version: VersionSource;
    search: SearchSource;
  };
}
