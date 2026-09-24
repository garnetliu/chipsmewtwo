"use client";

import { useApolloClient } from "@apollo/client/react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand/react";
import { useShallow } from "zustand/react/shallow";

import { GET_PKHEX_SPRITES } from "@/graphql/apollo/query";
import { isEmptySlot, PARTY_BOX_INDEX } from "@/lib/pkhex/slot";

import { BoxPanel } from "./box-panel";
import { DiscardChangesDialog } from "./discard-changes-dialog";
import { EditorAlert } from "./editor-alert";
import { PokemonInspector } from "./pokemon-inspector";
import { SaveDropzone } from "./save-dropzone";
import { EditorStoreProvider } from "./save-editor-context";
import { createEditorStore, readSlots, type SpeciesMeta } from "./save-editor-store";
import { SaveToolbar } from "./save-toolbar";
import { toSpeciesEntries } from "./species-entries";

/**
 * 存档编辑器的外壳。
 *
 * 选中格子**不进 URL**：存档只活在内存里，`?box=3&slot=7` 刷新之后必然落在空态，
 * 是假的可分享性。判据就是「刷新后还成立吗」，这里答案是否。
 *
 * store 在这儿建一次就锁住，往下用 Context 传 —— 不做成模块级单例，
 * 否则客户端路由离开再回来还端着上一份 session。
 *
 * 这里用 useState 的惰性初始化，**不要改回 zustand 文档里那个 `useRef` + `??=`**：
 * 那个写法是为了兼容旧版本 React 才留的，本仓库开着 React Compiler，
 * 渲染期间读 ref.current 会被 react-hooks/refs 直接判错（Cannot access refs during render），
 * 改回去过不了 lint。传工厂函数给 useState 本来就是更规范的写法，同样只调一次。
 *
 * 这一层自己不走 Context —— 组件读不到自己提供的 Context，所以直接拿着实例 useStore
 */
export function SaveEditor() {
  const [store] = useState(createEditorStore);

  const client = useApolloClient();

  const { session, boxIndex, revision, species, hasUnexportedChanges } = useStore(
    store,
    useShallow((state) => ({
      session: state.session,
      boxIndex: state.boxIndex,
      revision: state.revision,
      species: state.species,
      hasUnexportedChanges: state.hasUnexportedChanges,
    })),
  );
  const loadSpecies = useStore(store, (state) => state.loadSpecies);

  /**
   * 写回存档但还没导出时拦一下关页面。
   *
   * 只 preventDefault()，不设 returnValue 文案 —— 浏览器早就不显示自定义文案了，
   * 设了也只是多一行没人看得见的代码
   */
  useEffect(() => {
    if (!hasUnexportedChanges) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnexportedChanges]);

  // 当前箱 30 格 + 队伍 6 格出现过的种族，去重后合成一次查询 ——
  // 在这儿算而不是让箱子和队伍各查各的，否则一次切箱要打两条请求
  const visibleSpecies = useMemo(() => {
    void revision;
    if (!session) return [] as number[];

    const ids = new Set<number>();
    for (const summary of [
      ...readSlots(session, boxIndex),
      ...readSlots(session, PARTY_BOX_INDEX),
    ]) {
      // 蛋不按种族取图，跳过；空格子也没有种族
      if (summary && !isEmptySlot(summary) && !summary.isEgg) ids.add(summary.species);
    }
    return [...ids];
  }, [session, boxIndex, revision]);

  // 查过的（包括查过但库里没有的）不再问。翻回上一箱因此是零请求
  const missing = useMemo(
    () => visibleSpecies.filter((id) => !species.has(id)),
    [visibleSpecies, species],
  );

  useEffect(() => {
    if (missing.length === 0) return;

    let cancelled = false;
    client
      .query({ query: GET_PKHEX_SPRITES, variables: { ids: missing.map(String) } })
      .then(({ data }) => {
        if (!cancelled) loadSpecies(toSpeciesEntries(missing, data?.pokemonByIds ?? []));
      })
      .catch(() => {
        // 图没取到不该挡着编辑，格子自己会回落到编号占位。
        // 记成「查过了但没有」，免得每次切箱都重试一遍同一批
        if (!cancelled) {
          loadSpecies(missing.map((id) => [id, null] as [number, SpeciesMeta | null]));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, missing, loadSpecies]);

  return (
    <EditorStoreProvider store={store}>
      <div data-testid="pkhex-page" className="container mx-auto flex flex-1 flex-col gap-4 py-4">
        {session ? (
          <>
            <SaveToolbar />
            <EditorAlert />

            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] lg:items-start">
              <BoxPanel />
              <PokemonInspector />
            </div>

            <DiscardChangesDialog />
          </>
        ) : (
          <SaveDropzone />
        )}
      </div>
    </EditorStoreProvider>
  );
}
