import Image from "next/image";
import Link from "next/link";

import { HeaderNav } from "./header-nav";
import { HeaderSearch } from "./header-search";
import { HeaderTheme } from "./header-theme";

export { OpenSearchProvider } from "./header-search";

/**
 * 全站头部。三段：左边品牌、中间五个一级入口、右边搜索入口和主题切换。
 *
 * 外壳是服务端组件，只有需要浏览器状态的三块是客户端组件 ——
 * 导航要读当前路由，搜索要发点击，主题切换要读 localStorage。
 *
 * 三段在 1280px 下是 prototype 那一行；窗口变窄时按这个顺序让位：
 * 站名文字（<1024）→ 主题切换的文字标签（<1024）→ 搜索框的提示文案和快捷键（<640）
 * → 导航整条换到第二行（<768）。全站最窄支持到 360px 不出横向滚动条 ——
 * 头部是唯一一个五段内容都要摆下的地方，它撑出来的最小宽度就是全站的最小宽度。
 */
export function RootHeader() {
  return (
    <header data-slot="root-header" className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex min-h-16 flex-wrap items-center gap-x-8 gap-y-2 px-6 py-2 md:flex-nowrap md:py-0">
        {/* 站名点回 /pokemon —— 精灵列表是资料站的主入口 */}
        <Link
          href="/pokemon"
          data-slot="header-brand"
          className="flex shrink-0 items-center gap-1.5"
        >
          {/*
            亮/暗两张图靠 CSS 二选一。这种写法要保留默认的 loading="lazy" ——
            只有当前主题那张会真的发请求；改成 preload 或 loading="eager" 两张都会拉。
            标记在首屏上、窄屏下还是 LCP 元素，优先级用 fetchPriority 提，
            这是 Next 文档给这一场景的写法
          */}
          <Image
            src="/logo-mark-mono.svg"
            alt=""
            width={40}
            height={40}
            fetchPriority="high"
            className="dark:hidden"
          />
          <Image
            src="/logo-mark.svg"
            alt=""
            width={40}
            height={40}
            fetchPriority="high"
            className="hidden dark:block"
          />
          {/* 窄屏只留标记：这几个字让位给导航，logo 本身已经是回首页的入口 */}
          <span className="hidden font-heading text-xl font-bold tracking-tight lg:inline">
            chipsmewtwo
          </span>
        </Link>

        {/* 窄屏整条换到第二行，五个入口一个都不折进菜单 */}
        <HeaderNav className="order-last basis-full md:order-0 md:basis-auto" />

        <div data-slot="header-actions" className="ml-auto flex min-w-0 items-center gap-3">
          {/* 搜索框按 prototype 是 24rem 宽，但窗口不够宽时先让它让位，免得整行换行 */}
          <HeaderSearch className="w-96 min-w-0 shrink" />
          <div className="shrink-0">
            <HeaderTheme />
          </div>
        </div>
      </div>
    </header>
  );
}
