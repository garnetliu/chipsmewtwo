"use client";

import { useQuery } from "@apollo/client/react";
import { Dialog } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GET_SEARCH } from "@/graphql/apollo/query";

import { SearchHitRow } from "./search-hit-row";

/** 停手多久才真的发请求。照 prototype 的 420ms */
const DEBOUNCE_MS = 420;

interface IProps {
  open: boolean;
  /** 开关由外面那层持有 —— 头部的触发框和 ⌘K 都要能打开它 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 顶部搜索模态框。整屏蒙层 + 上方一张卡，不占路由。
 *
 * 结果区五态（未输入、搜索中、有结果、无结果、失败）由关键词、防抖进度和这一次
 * 查询的结果一起推出来，调用方不传状态。ESC、点蒙层关闭、焦点陷阱、打开时把焦点
 * 交给输入框，都由 Base UI 的 Dialog 负责，这里只声明初始焦点落在哪。
 */
export function SearchDialog(props: Readonly<IProps>) {
  const { open, onOpenChange } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const [keyword, setKeyword] = useState("");
  /** 防抖沉淀之后真正拿去查的词。它和 keyword 不一致就说明还在等 */
  const [settled, setSettled] = useState("");

  const trimmed = keyword.trim();

  useEffect(() => {
    // 已经查的就是当前这个词时不要再起表：删回上一个词、或者 effect 因为别的原因重跑，
    // 都不该凭空多发一次请求
    if (trimmed === settled) return;

    const timer = setTimeout(() => setSettled(trimmed), DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, settled]);

  const { data, loading, error, refetch } = useQuery(GET_SEARCH, {
    variables: { keyword: settled },
    // 空词不打库 —— resolver 那边也是直接返回空数组，这一趟请求本来就没有意义
    skip: settled === "",
  });

  const hits = data?.search ?? [];

  /**
   * 还在等结果：防抖没走完，或者请求在路上。
   *
   * 这两段合成一个「搜索中」，是因为对用户来说它们是同一件事 —— 敲完字到出结果之间
   * 屏幕上不该先闪一下旧结果或者空态
   */
  const waiting = trimmed !== settled || loading;

  /**
   * 关和开都走这里。
   *
   * 关掉就把词清干净：下次打开是一张空的搜索框，和 prototype 的 closeSearch 一致。
   * 点结果那条路径必须也调它 —— 受控的 Dialog 只在自己内部的交互（ESC、点蒙层、
   * 点关闭按钮）上触发 onOpenChange，外面直接把 open 改成 false 它是不响的，
   * 清理写在 Dialog.Root 的回调里就会漏掉这一条
   */
  function changeOpen(next: boolean) {
    onOpenChange(next);

    if (!next) {
      setKeyword("");
      setSettled("");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop data-slot="search-backdrop" className="fixed inset-0 z-50 bg-black/40" />

        <Dialog.Popup
          data-slot="search-dialog"
          initialFocus={inputRef}
          className="fixed top-24 left-1/2 z-50 w-160 max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none"
        >
          {/* 卡上没有可见标题，读屏要有一个 */}
          <Dialog.Title className="sr-only">全站搜索</Dialog.Title>

          <div className="flex h-14 items-center gap-3 border-b border-border px-5">
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-primary" />

            <input
              ref={inputRef}
              data-slot="search-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              type="text"
              autoComplete="off"
              aria-label="搜索关键词"
              placeholder="输入 Pokémon、招式、道具或特性名称…"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            />

            <Dialog.Close
              data-slot="search-close"
              className="shrink-0 cursor-pointer rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              ESC 关闭
            </Dialog.Close>
          </div>

          <div data-slot="search-body" className="max-h-95 overflow-y-auto">
            {trimmed === "" && (
              <div data-slot="search-idle" className="px-5 py-10 text-center">
                <div className="text-[13px] font-semibold">输入名称开始搜索</div>
                {/* 举的四个例子都是中文名 —— 库里只按当前语言的译名匹配，敲英文标识搜不到 */}
                <div className="mt-1.5 text-[12px] text-muted-foreground">
                  支持 Pokémon / 招式 / 道具 / 特性，例如「妙蛙」「飞叶快刀」「讲究头带」「茂盛」
                </div>
              </div>
            )}

            {trimmed !== "" && waiting && (
              <div data-slot="search-loading" className="px-5 py-10">
                <div className="flex items-center justify-center gap-3 text-[13px] text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-primary"
                  />
                  搜索中…
                </div>
              </div>
            )}

            {trimmed !== "" && !waiting && error != null && (
              <div data-slot="search-failed" className="px-5 py-10 text-center">
                <div className="text-[13px] font-semibold text-destructive">
                  搜索暂时不可用，请稍后再试
                </div>
                <div className="mt-1.5 text-[12px] text-muted-foreground">
                  已保留你的输入，可直接重试
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={() => {
                    // 再挂一次就再进失败态，rejection 本身不用管，别让它冒到控制台就行
                    refetch().catch(() => {});
                  }}
                >
                  重试
                </Button>
              </div>
            )}

            {trimmed !== "" && !waiting && error == null && hits.length === 0 && (
              <div data-slot="search-none" className="px-5 py-10 text-center">
                <div className="text-[13px] font-semibold">未找到匹配结果</div>
                <div className="mt-1.5 text-[12px] text-muted-foreground">
                  换个关键词试试，支持四类资料对象的名称搜索
                </div>
              </div>
            )}

            {trimmed !== "" && !waiting && error == null && hits.length > 0 && (
              // 条数不在这里截：resolver 已经封了 10 条，截两遍只会让两边的口径悄悄分叉
              <div data-slot="search-hits" className="py-2">
                {hits.map((hit) => (
                  <SearchHitRow
                    key={`${hit.kind}:${hit.slug}`}
                    hit={hit}
                    onNavigate={() => changeOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
