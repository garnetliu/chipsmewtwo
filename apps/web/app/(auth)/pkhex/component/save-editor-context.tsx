"use client";

import { createContext, type PropsWithChildren, use } from "react";
import { useStore } from "zustand/react";

import type { EditorStore, EditorStoreApi } from "./save-editor-store";

/**
 * 路由私有的 store 实例。只给 /pkhex 这一棵树用。
 *
 * Context 里放的是 store **实例**，不是 state —— 订阅由各组件自己用选择器切，
 * 换成把 state 塞进 Context 的写法，任何一个字段变动都会重画整棵树
 */
const EditorStoreContext = createContext<EditorStoreApi | null>(null);

interface IProps extends PropsWithChildren {
  store: EditorStoreApi;
}

export function EditorStoreProvider(props: Readonly<IProps>) {
  const { store, children } = props;
  return <EditorStoreContext value={store}>{children}</EditorStoreContext>;
}

/**
 * 按需订阅。选择器返回新建对象时记得套 useShallow，
 * 否则每次 set 都会因为引用不同而重画
 */
export function useEditorStore<T>(selector: (state: EditorStore) => T): T {
  const store = use(EditorStoreContext);
  if (!store) throw new Error("useEditorStore 只能在 EditorStoreProvider 里面调用");
  return useStore(store, selector);
}
