import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { RootHeader } from "@/components/root-header";
import { RootProvider } from "@/components/root-privider";
import { SearchDialogProvider } from "@/components/search-modal";
import { cn } from "@/lib/utils";

/** 正文与 UI。variable 版本一次请求覆盖全部字重 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** 标题、宝可梦名、大数字 —— 与 logo 同源 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** 图鉴编号、种族值表、计算器 —— 等宽且数字对齐 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "chipsmewtwo", template: "%s · chipsmewtwo" },
  description: "宝可梦资料查询与小工具",
};

// theme-color 归 viewport 管，写在 metadata 里从 Next 14 起会告警
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6D28D9" },
    { media: "(prefers-color-scheme: dark)", color: "#110B22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <RootProvider>
          {/* 搜索模态框不占路由，挂在这一层：头部的触发框和 ⌘K 都指向同一个它 */}
          <SearchDialogProvider>
            <RootHeader />
            {children}
          </SearchDialogProvider>
        </RootProvider>
      </body>
    </html>
  );
}
