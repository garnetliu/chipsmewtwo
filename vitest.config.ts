import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// 形状照 node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md。
// e2e 归 Playwright（DEC-012：Vitest 不支持 async Server Component），
// 所以这里把 tests/e2e 排除掉，否则 vitest 会把 .spec.ts 也捡走。
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
