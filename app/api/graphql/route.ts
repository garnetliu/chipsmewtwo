// 本项目唯一的 HTTP 数据入口（DEC-002：单端点 GraphQL，不做 REST）。
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";

import {
  AbilitySource,
  FormSource,
  ItemSource,
  MoveSource,
  MyContext,
  PokemonSource,
  SearchSource,
  TypeSource,
  VersionSource,
} from "@/graphql/context";
import { resolvers } from "@/graphql/schema/resolvers.generated";
import { typeDefs } from "@/graphql/schema/typeDefs.generated";
import { DEFAULT_LANGUAGE } from "@/lib/pokemon/defaults";
import { LANGUAGE_COOKIE, resolveLanguageTag } from "@/lib/pokemon/language";

const apolloServer = new ApolloServer<MyContext>({ typeDefs, resolvers });

const handler = startServerAndCreateNextHandler<NextRequest, MyContext>(apolloServer, {
  context: async (request) => {
    return {
      userID: "",
      // cookie 由 graphql/apollo/server.ts 从 RSC 的请求头整份透传过来，浏览器
      // 直连时 authLink 的 credentials: "include" 让 fetch 带上，两条路径都拿得到。
      // 前端还没开始写这个 cookie，所以现在一律走 DEFAULT_LANGUAGE
      language: resolveLanguageTag(request.cookies.get(LANGUAGE_COOKIE)?.value) ?? DEFAULT_LANGUAGE,
      // 全都每请求新建，不是共享单例：DataLoader 的缓存按实例存，
      // 跨请求复用会把一个请求的数据喂给另一个
      dataSources: {
        pokemon: new PokemonSource(),
        form: new FormSource(),
        type: new TypeSource(),
        ability: new AbilitySource(),
        move: new MoveSource(),
        item: new ItemSource(),
        version: new VersionSource(),
        search: new SearchSource(),
      },
    };
  },
});

// 包一层而不是直接 `export { handler as POST }`：@as-integrations/next 的
// handler 类型是给 NextApiRequest（Pages Router）与 NextRequest（App Router）
// 共用的重载签名，Next 生成的路由类型校验器（.next/types/validator.ts）按
// App Router 单一签名核对，重载类型对不上会让 `next build` 直接类型检查失败。
export async function POST(request: NextRequest) {
  return handler(request);
}
