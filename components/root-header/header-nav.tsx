"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/** 五个一级入口。顺序照 prototype：精灵、招式、道具、特性、努力值模拟器 */
const NAV_ITEMS = [
  { href: "/pokemon", label: "精灵" },
  { href: "/move", label: "招式" },
  { href: "/item", label: "道具" },
  { href: "/ability", label: "特性" },
  { href: "/effort-values", label: "努力值模拟器" },
] as const;

/**
 * 详情页跟着所属列表一起高亮：站在 /pokemon/bulbasaur 上时用户仍然在「精灵」这一栏里，
 * 导航该告诉他现在在哪一栏，而不是五项全灭。
 */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav(props: Readonly<Omit<ComponentProps<"nav">, "children">>) {
  const { className, ...rest } = props;
  const pathname = usePathname();

  return (
    <nav
      data-slot="header-nav"
      className={cn("flex shrink-0 items-center gap-7", className)}
      {...rest}
    >
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            data-active={active || undefined}
            className={cn(
              "relative py-1 text-sm/normal font-semibold text-foreground",
              "transition-colors hover:text-primary data-active:text-primary",
            )}
          >
            {label}
            {/* 当前项下方的短横线。1.28rem 的偏移让它正好压在头部的下边框上 */}
            {active ? (
              <span
                aria-hidden="true"
                data-slot="header-nav-underline"
                className="absolute bottom-[-1.28rem] left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-[2px] bg-primary"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
