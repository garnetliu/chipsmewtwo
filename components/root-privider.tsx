"use client";

import { ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import type { PropsWithChildren } from "react";

import { makeClient } from "@/graphql/apollo/client";

export function RootProvider({ children }: Readonly<PropsWithChildren>) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
