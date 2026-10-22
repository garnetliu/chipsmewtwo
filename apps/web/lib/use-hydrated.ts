"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * 判断组件是否已经完成 hydration。
 *
 * 服务端快照恒为 false，客户端快照恒为 true。React 在 SSR 和 hydration 首帧
 * 只读 getServerSnapshot，hydrate 完成后才改读 getSnapshot，于是首帧输出必然
 * 和服务端一致，不会触发 mismatch。
 *
 * 用于渲染依赖浏览器环境的值：localStorage、window 尺寸、用户时区、
 * 随机数等服务端算不出、或算出来必定和客户端不同的东西。
 *
 * @example
 * const hydrated = useHydrated();
 * <Tabs value={hydrated ? (theme ?? null) : null} />
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
