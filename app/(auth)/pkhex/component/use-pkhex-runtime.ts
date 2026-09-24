"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadPkhex } from "@/lib/pkhex";
import { type PkhexError, toPkhexError } from "@/lib/pkhex/errors";
import type { PkhexApi, PkhexLoadProgress } from "@/lib/pkhex/types";

export type RuntimeStatus = "idle" | "loading" | "ready" | "error";

/** 进度最快多久往 state 里刷一次。60fps 级别的重绘对一条进度条没有意义 */
const PROGRESS_FLUSH_MS = 100;

/**
 * 整个页面共用一份 runtime。放模块级而不是 ref：这东西 6 MB，
 * 组件重挂一次就再下一次太亏
 */
let pending: Promise<PkhexApi> | null = null;

/**
 * 进度回调登记在模块级：同一次下载可能被 ensure 调用多次（预热一次、选文件再一次），
 * 但 loadPkhex 只跑一回，后来的订阅者得挂到**正在进行的那次**上，不能另起一份
 */
const progressListeners = new Set<(progress: PkhexLoadProgress) => void>();

function loadOnce(): Promise<PkhexApi> {
  pending ??= loadPkhex({
    onProgress: (progress) => {
      for (const listener of progressListeners) listener(progress);
    },
  }).catch((cause: unknown) => {
    // 失败的 promise 必须从缓存里摘掉，否则「重试」点一万次
    // 拿到的都是同一个已经 reject 的 promise，按钮等于坏的
    pending = null;
    throw toPkhexError(cause);
  });
  return pending;
}

export interface PkhexRuntime {
  status: RuntimeStatus;
  api: PkhexApi | null;
  error: PkhexError | null;
  /** 还没开始下载时是 null。totalBytes 为 0 表示清单没给总量，UI 该退回不确定进度条 */
  progress: PkhexLoadProgress | null;
  /** 拿 api，没加载就顺手加载。重复调只会下载一次 */
  ensure: () => Promise<PkhexApi>;
}

export function usePkhexRuntime(): PkhexRuntime {
  const [status, setStatus] = useState<RuntimeStatus>("idle");
  const [api, setApi] = useState<PkhexApi | null>(null);
  const [error, setError] = useState<PkhexError | null>(null);
  const [progress, setProgress] = useState<PkhexLoadProgress | null>(null);

  /**
   * 进度回调每个 chunk 来一次，直接 setState 一次加载就是上千次渲染。
   * 最新值先落进 ref，再按 PROGRESS_FLUSH_MS 节流刷出去
   */
  const latest = useRef<PkhexLoadProgress | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const ensure = useCallback(async () => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    setError(null);

    const onProgress = (next: PkhexLoadProgress) => {
      latest.current = next;
      // 已经排着一次刷新就不再排 —— 那次刷新读的是 ref，拿到的自然是最新值。
      // 最后一个回调即使被并进上一次刷新，也还有 ensure 结束时的兜底
      if (timer.current !== null) return;
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setProgress(latest.current);
      }, PROGRESS_FLUSH_MS);
    };

    progressListeners.add(onProgress);

    try {
      const loaded = await loadOnce();
      setApi(loaded);
      setStatus("ready");
      // 节流可能把最后一帧压掉，收尾时补一次，免得进度条停在 99%
      setProgress(latest.current);
      return loaded;
    } catch (cause) {
      const failure = toPkhexError(cause);
      setError(failure);
      setStatus("error");
      throw failure;
    } finally {
      progressListeners.delete(onProgress);
    }
  }, []);

  return { status, api, error, progress, ensure };
}
