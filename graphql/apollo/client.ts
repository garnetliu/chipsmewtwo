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
    link: links,
  });
}
