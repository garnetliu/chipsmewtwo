This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 许可

本项目以 **GPL-3.0-or-later** 分发，全文见 [`LICENSE`](./LICENSE)。

选这个许可不是偏好，是义务传导的结果：`app/(auth)/pkhex` 这个存档编辑器把
[PKHeX.Core](https://github.com/kwsch/PKHeX)（GPL-3.0-or-later）编译进了
`public/pkhex/` 下的 WebAssembly 产物。浏览器打开这个页面就会下载那份产物，
在 GPL 的语义下这是一次分发，而产物静态链接了 PKHeX.Core，所以它是衍生作品，
必须按 GPLv3 分发，并提供对应源码。

### 对应源码（Corresponding Source）

重建 `public/pkhex/` 需要的一切都在本仓库里：

| 东西                  | 在哪                                                        |
| --------------------- | ----------------------------------------------------------- |
| C# 桥接层源码         | `pkhex-wasm/src/`                                           |
| 构建环境与脚本        | `pkhex-wasm/Dockerfile`、`pkhex-wasm/build.sh`              |
| PKHeX.Core 的确切版本 | `pkhex-wasm/src/PkhexBridge/PkhexBridge.csproj`（pin 死的） |
| 一条命令重建          | `pnpm pkhex:build`（在 Docker 里跑，本机不需要 .NET）       |

### 第三方

| 组件                                                       | 许可             | 用途                                                                                                        |
| ---------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| [PKHeX.Core](https://github.com/kwsch/PKHeX)               | GPL-3.0-or-later | 存档解析与读写、合法性检查                                                                                  |
| [BouncyCastle.Cryptography](https://www.bouncycastle.org/) | MIT              | 浏览器 wasm 上的纯托管 AES/MD5 —— `System.Security.Cryptography` 在那儿会抛 `PlatformNotSupportedException` |
| [PokeAPI/sprites](https://github.com/PokeAPI/sprites)      | 见其仓库         | 宝可梦图片，按固定 commit 从 CDN 取，不入库                                                                 |

本项目与 Nintendo / Creatures Inc. / GAME FREAK 无关，Pokémon 相关名称与形象归其各自所有者。
