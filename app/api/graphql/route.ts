// 本项目唯一的 HTTP 数据入口（DEC-002：单端点 GraphQL，不做 REST）。
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";

import { MyContext } from "@/graphql/context";
import { PokeAPI } from "@/graphql/context/PokeAPISource";
import { PokemonDbSource } from "@/graphql/context/PokemonDbSource";
import { resolvers } from "@/graphql/schema/resolvers.generated";
import { typeDefs } from "@/graphql/schema/typeDefs.generated";
import { canUseSource, getPokemonFetchMode } from "@/lib/pokemon/fetch-mode";

const apolloServer = new ApolloServer<MyContext>({ typeDefs, resolvers });

const handler = startServerAndCreateNextHandler<NextRequest, MyContext>(apolloServer, {
  context: async () => {
    return {
      userID: "",
      // 两个都每请求新建，不是共享单例：DataLoader 的缓存和 RESTDataSource
      // 的请求去重都按实例存，跨请求复用会把一个请求的数据喂给另一个
      dataSources: {
        pokemonDb: new PokemonDbSource(),
        // db-only 模式下真的不实例化 HTTP 客户端，而不是实例化了不调用。
        // resolver 那边也就不用查 mode —— 有没有 importer 就是答案
        pokemonImporter: canUseSource(getPokemonFetchMode())
          ? new PokeAPI({ cache: apolloServer.cache })
          : undefined,
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
