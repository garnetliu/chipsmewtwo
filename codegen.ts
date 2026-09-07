import { defineConfig } from "@eddeee888/gcg-typescript-resolver-files";
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "**/schema.graphql",
  generates: {
    "graphql/generated/": {
      preset: "client",
      documents: ["app/**/*.{ts,tsx}", "graphql/apollo/**/*.{ts,tsx}"],
      config: { useTypeImports: true },
      presetConfig: { fragmentMasking: false },
    },
    "graphql/schema": defineConfig({
      mergeSchema: false,
      add: {
        "./types.generated.ts": {
          content: "/* eslint-disable @typescript-eslint/no-explicit-any */",
        },
      },
      typesPluginsConfig: {
        useTypeImports: true,
        contextType: "../context#MyContext",
      },
    }),
  },
  hooks: {
    afterAllFileWrite: ["eslint --fix"],
  },
};

export default config;
