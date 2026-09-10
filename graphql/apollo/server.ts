import { ApolloLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { headers } from "next/headers";

import { authLink } from "@/graphql/apollo/links/auth-link";
import { httpLink } from "@/graphql/apollo/links/http-link";

export const { getClient, query, PreloadQuery } = registerApolloClient(async () => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    defaultContext: { headers: Object.fromEntries((await headers()).entries()) },
    // Use an absolute URL for SSR (relative URLs cannot be used in SSR)
    link: ApolloLink.from([authLink, httpLink]),
    // fetchOptions: {
    //   // Optional: Next.js-specific fetch options for caching and revalidation
    //   // See: https://nextjs.org/docs/app/api-reference/functions/fetch
    // },
    // fragment 里的字段只有声明它的那个组件读得到，父级拿到的是引用。
    // 类型那一侧靠 codegen 的 inlineFragmentTypes: "mask" 和 type/apollo.d.ts 对齐，
    // 三处缺一个就会「运行时删了字段、类型上还看得见」。
    // 见 https://www.apollographql.com/docs/react/data/fragments
    dataMasking: true,
  });
});
