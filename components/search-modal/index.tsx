"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import { OpenSearchProvider } from "@/components/root-header/header-search";

import { SearchDialog } from "./search-dialog";

interface IProps {
  children: ReactNode;
}

/**
 * 搜索模态框的开关持有者，包住头部和页面内容。
 *
 * 开关在这里而不是在头部：模态框是全站一份、不占路由的东西，头部只是它的入口之一，
 * ⌘K 是另一个。头部通过 OpenSearchProvider 拿到「开」这个动作，它自己不存状态、
 * 也不监听键盘。
 */
export function SearchDialogProvider(props: Readonly<IProps>) {
  const { children } = props;

  const [open, setOpen] = useState(false);

  // 传给头部的东西要稳定，不然每次这里重渲染都会把整个头部一起拖下水
  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Mac 按 ⌘K，其余平台按 Ctrl K。两个都收，不按平台分支 ——
      // 头部的提示文案统一写 Ctrl K，但真按下 ⌘K 一样要开
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key.toLowerCase() !== "k") return;

      // 浏览器自己也认这个组合（Chrome 是跳到地址栏搜索），得拦下来
      event.preventDefault();
      setOpen(true);
    }

    // 挂在 window 上：不管焦点此刻在页面的哪一处，这个组合键都该开搜索
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <OpenSearchProvider onOpenSearch={openSearch}>
      {children}
      <SearchDialog open={open} onOpenChange={setOpen} />
    </OpenSearchProvider>
  );
}
