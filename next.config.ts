import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
