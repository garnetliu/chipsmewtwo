"use client";

import { ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { PropsWithChildren } from "react";

import { makeClient } from "@/graphql/apollo/client";

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
