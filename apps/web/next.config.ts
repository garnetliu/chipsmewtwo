import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// 环境变量只放仓库根的 .env（见 .env.example），Next 默认只读 apps/web 下的。
// 第四个参数 forceReload：Next 已经按 apps/web 加载过一次，不强制的话这次调用直接返回缓存
loadEnvConfig(
  path.resolve(import.meta.dirname, "../.."),
  process.env.NODE_ENV !== "production",
  console,
  true,
);

const nextConfig: NextConfig = {
  // workspace 包直接导出 TypeScript 源码，交给 Next 编译
  transpilePackages: ["@pkcw/graphql", "@pkcw/prisma"],
  async headers() {
    return [
      {
        // wasm 产物的文件名不带哈希（WasmFingerprintAssets=false），
        // 所以不能 immutable —— 重新构建后浏览器会一直吃旧缓存
        source: "/pkhex/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        // 测试用的空白存档，每次都要拿最新的那份
        source: "/pkhex-fixtures/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

// 刻意不设 COOP/COEP：开了会切进跨源隔离，Apollo 的请求和外链的宝可梦图片
// 全会被拦；而且 WasmEnableThreads 是关的，本来也不需要 SharedArrayBuffer

export default nextConfig;
