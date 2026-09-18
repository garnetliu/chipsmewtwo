import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * 单元与集成层。跑纯函数、GraphQL resolver、客户端组件。
 *
 * 服务端渲染的 async 组件不在这里 —— Vitest 不支持它们（见 Next 自带的
 * node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md），
 * 那四个详情页归 Playwright 管，用例放 e2e/。
 */
export default defineConfig({
  // 编译 tsx 里的 JSX
  plugins: [react()],
  resolve: {
    // 认 tsconfig.json 的 paths，测试里才能写 @/lib/...。
    // Vite 8 起这是内置能力，vite-tsconfig-paths 插件已经不需要了
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // e2e/ 下是 Playwright 的用例，文件名同样是 *.spec.ts，
    // 被 Vitest 捡走会因为拿不到 test fixture 直接报错
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**"],
  },
});
