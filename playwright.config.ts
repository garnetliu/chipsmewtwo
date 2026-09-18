import { defineConfig, devices } from "@playwright/test";

/** 和 .env 里的 NEXT_PUBLIC_BASE_URL 保持一致，改端口时只改一处 */
const BASE_URL = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";

/**
 * 端到端层。四个详情页是服务端渲染的 async 组件，Vitest 跑不了（见 vitest.config.ts），
 * 只能在真浏览器里验。纯函数和客户端组件不要写到这里来，起浏览器又慢又脆。
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // CI 上不接受被 .only 缩小过的测试集
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chrome",
      // 用系统装的 Google Chrome，不用 Playwright 自带的 chromium：
      // Playwright 1.63 的 chromium 和 chromium-headless-shell 都没有 macOS 13 的构建，
      // 本机装不上。Linux（CI）不受这条限制，但两边跑同一个 channel 省得行为分叉
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
