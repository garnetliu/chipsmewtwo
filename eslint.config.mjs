import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tailwind from "eslint-plugin-tailwindcss";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  {
    ...tailwind.configs.recommended,
    settings: {
      tailwindcss: {
        // Tailwind v4 has no tailwind.config.js — point the plugin at the CSS entry.
        // (default is "src/style.css"; cn/clsx/cva/tv are recognized out of the box.)
        cssConfigPath: "app/globals.css",
      },
    },
    plugins: {
      // Preserve the tailwindcss plugin registered by the recommended config,
      // otherwise the tailwindcss/* rules below can't resolve it.
      ...tailwind.configs.recommended.plugins,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...tailwind.configs.recommended.rules,
      // Class ordering is already handled by prettier-plugin-tailwindcss.
      "tailwindcss/classnames-order": "off",
      // Noisy with custom utilities and misfires on `cn()` helper definitions.
      "tailwindcss/no-custom-classname": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma Client 生成产物，schema.prisma 的 generator output 指到这里。
    "prisma/generated/**",
  ]),
]);

export default eslintConfig;
