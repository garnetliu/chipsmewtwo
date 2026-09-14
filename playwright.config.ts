import { defineConfig, devices } from "@playwright/test";

// 四个详情页是 async Server Component，Vitest 支持不了，按 DEC-012 归到这里。
export default defineConfig({
  testDir: "./tests/e2e",
  // Playwright 1.63 不支持 macOS 13（本机 13.3），自带的 chromium 与 headless shell 都装不上
  // （`Playwright does not support chromium on mac13`）。改走系统已安装的 Chrome。
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  use: { baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
  },
});
