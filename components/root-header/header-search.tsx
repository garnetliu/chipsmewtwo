"use client";

import { cn } from "cn";
import { Search } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, use } from "react";

/**
 * 全站搜索模态框的开关。
 *
 * 头部只负责「点了要开」，模态框本身不占路由、挂在 layout 上，两者隔着一个
 * 服务端组件（RootHeader），函数没法当 prop 传下来，所以走 context。
 * 默认值是空实现 —— 模态框还没做出来时点击不做事，入口先留着。
 */
const OpenSearchContext = createContext<() => void>(() => {});

interface IProviderProps {
  /** 打开模态框的回调 */
  onOpenSearch: () => void;
  children: ReactNode;
}

/** 把真正的开关注入头部。模态框组件用它包住 children 即可 */
export function OpenSearchProvider(props: Readonly<IProviderProps>) {
  const { onOpenSearch, children } = props;

  return <OpenSearchContext value={onOpenSearch}>{children}</OpenSearchContext>;
}

interface IProps extends Omit<ComponentProps<"button">, "onClick"> {
  /** 直接指定开关。不传就用 OpenSearchProvider 给的那个 */
  onOpenSearch?: () => void;
}

/** 头部右侧的搜索触发框。它自己不是输入框，点开的是模态框里的那个 */
export function HeaderSearch(props: Readonly<IProps>) {
  const { onOpenSearch, className, type = "button", ...rest } = props;
  const openFromContext = use(OpenSearchContext);

  return (
    <button
      data-slot="header-search"
      type={type}
      onClick={onOpenSearch ?? openFromContext}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-muted px-3.5 text-muted-foreground",
        "transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      {...rest}
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      {/*
        640px 以下只留放大镜，提示文案收成 sr-only 而不是 hidden ——
        它同时是这个按钮的可访问名，hidden 掉按钮在读屏里就没名字了
      */}
      <span className="sr-only truncate text-[13px] sm:not-sr-only">
        搜索 Pokémon / 招式 / 道具 / 特性…
      </span>
      {/* 快捷键提示统一写 Ctrl K：SSR 阶段拿不到平台，按 navigator 改写会 hydration 不匹配 */}
      <kbd className="ml-auto hidden shrink-0 rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap sm:inline-block">
        Ctrl K
      </kbd>
    </button>
  );
}
