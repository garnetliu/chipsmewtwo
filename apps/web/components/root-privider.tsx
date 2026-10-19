"use client";

import { ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import { makeClient } from "@pkcw/graphql/apollo/client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export function RootProvider({ children }: Readonly<PropsWithChildren>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>
    </NextThemesProvider>
  );
}
