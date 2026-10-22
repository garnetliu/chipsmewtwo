#!/usr/bin/env bash
# 容器内的构建入口。宿主机用 `pnpm pkhex:build` 调起，不要直接在 macOS 上跑
# —— 这台机器（macOS 13.3 Intel）装不了 .NET 9/10 的 SDK。
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
OUT="$ROOT/public/pkhex"
FIXTURES="$ROOT/public/pkhex-fixtures"
PUBLISH="$(pwd)/artifacts/publish"

# 1. 测试当门禁。测不过就不出产物，免得把坏的 wasm 留在 public/ 里继续被加载
dotnet test PkhexBridge.slnx -c Release

# 2. publish wasm
rm -rf "$PUBLISH"
dotnet publish src/PkhexBridge.Wasm/PkhexBridge.Wasm.csproj -c Release -o "$PUBLISH"

# 3. 整目录重建。文件名不带指纹（WasmFingerprintAssets=false），
#    删掉的程序集不会自己消失，只能整个目录推倒重来
rm -rf "$OUT"
mkdir -p "$OUT"
cp -r "$PUBLISH/wwwroot/_framework" "$OUT/_framework"

# 4. 调试符号和预压缩副本不进仓库：.br/.gz 由 Next 的静态服务按需协商，
#    留着只会让 git 体积翻三倍
find "$OUT" -type f \( -name '*.pdb' -o -name '*.map' -o -name '*.br' -o -name '*.gz' \) -delete

# 5. 空白存档
dotnet run --project tools/FixtureGen -c Release -- "$FIXTURES"

# 6. 产物清单。加载器先取它拿到总字节数，才能画确定进度的进度条 ——
#    boot config 内联在 dotnet.js 里，下载开始前读不到
find "$OUT/_framework" -maxdepth 1 -type f -printf '%f %s\n' | sort | awk '
  BEGIN { print "{"; sep = "" }
  { total += $2; files = files sprintf("%s\n    \"%s\": %d", sep, $1, $2); sep = "," }
  END {
    printf "  \"totalBytes\": %d,\n", total
    printf "  \"files\": {%s\n  }\n}\n", files
  }
' > "$OUT/manifest.json"

# 7. 容器里是 root，产物落到 bind mount 上会变成 root 所有，宿主机改不动
if [ -n "${HOST_UID:-}" ] && [ -n "${HOST_GID:-}" ]; then
  chown -R "$HOST_UID:$HOST_GID" "$OUT" "$FIXTURES"
fi

# 8. 体积。gzip 总量超过 8 MB 基本就是有东西没被裁掉
echo
echo "=== public/pkhex/_framework ==="
find "$OUT/_framework" -maxdepth 1 -type f -printf '%f %s\n' | sort | awk '{ printf "  %-42s %8.2f KB\n", $1, $2 / 1024 }'

RAW=$(find "$OUT/_framework" -maxdepth 1 -type f -printf '%s\n' | awk '{ s += $1 } END { print s }')
GZ=$(find "$OUT/_framework" -maxdepth 1 -type f -exec gzip -9 -c {} \; | wc -c)
echo
awk -v raw="$RAW" -v gz="$GZ" 'BEGIN {
  printf "裸大小   %.2f MB\n", raw / 1048576
  printf "gzip 后  %.2f MB\n", gz / 1048576
}'
