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
  });
});
