import { fileURLToPath } from "node:url";

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
    // Next 的规则得知道应用在哪。单独一块、不限 files，所有文件都拿得到；
    // 写绝对路径：codegen 的钩子在 packages/graphql 里跑 eslint，相对路径会按那个目录解析
    settings: { next: { rootDir: fileURLToPath(new URL("apps/web", import.meta.url)) } },
  },
  {
    ...tailwind.configs.recommended,
    settings: {
      tailwindcss: {
        // Tailwind v4 has no tailwind.config.js — point the plugin at the CSS entry.
        // (default is "src/style.css"; cn/clsx/cva/tv are recognized out of the box.)
        // 绝对路径：插件按被检查文件所在的包解析相对路径，从 apps/web 起算会拼成 apps/web/apps/web
        cssConfigPath: fileURLToPath(new URL("apps/web/app/globals.css", import.meta.url)),
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
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // 副作用 import、node 内置模块
            ["^\\u0000"],
            ["^node:"],
            // 第三方包
            ["^@?\\w"],
            // 仓库里的包
            ["^@pkcw/"],
            // apps/web 内部的路径别名
            ["^@/"],
            // 相对路径
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Prisma Client 生成产物，schema.prisma 的 generator output 指到这里。
    "packages/prisma/generated/**",
    // PKHeX 的 C# 工程和它的 wasm 产物。里面的 dotnet*.js 是 .NET 运行时
    // 压出来的，不是我们写的代码；产物由 `pnpm pkhex:build` 在 Docker 里生成。
    "packages/pkhex-wasm/**",
    "apps/web/public/pkhex/**",
  ]),
]);

export default eslintConfig;
