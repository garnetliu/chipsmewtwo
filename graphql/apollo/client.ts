import { ApolloLink } from "@apollo/client";
import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs";

import { authLink } from "@/graphql/apollo/links/auth-link";
import { httpLink } from "@/graphql/apollo/links/http-link";
import { multipartLink } from "@/graphql/apollo/links/SSR-multipart-link";

export function makeClient() {
  let links: ApolloLink;

  if (typeof window === "undefined") {
    links = ApolloLink.from([multipartLink, authLink, httpLink]);
  } else {
    links = ApolloLink.from([authLink, httpLink]);
  }

  return new ApolloClient({
    cache: new InMemoryCache(),
    // fragment 里的字段只有声明它的那个组件读得到，父级拿到的是引用。
    // 类型那一侧靠 codegen 的 inlineFragmentTypes: "mask" 和 type/apollo.d.ts 对齐，
    // 三处缺一个就会「运行时删了字段、类型上还看得见」。
    // 见 https://www.apollographql.com/docs/react/data/fragments
    dataMasking: true,
    link: links,
  });
}
