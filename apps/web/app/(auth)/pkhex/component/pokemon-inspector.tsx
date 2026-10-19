"use client";

import { Undo2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EV_TOTAL_LIMIT, evTotal } from "@/lib/pkhex/slot";

import { InspectorMainTab } from "./inspector-main-tab";
import { InspectorMovesTab } from "./inspector-moves-tab";
import { InspectorRawTab } from "./inspector-raw-tab";
import { InspectorStatsTab } from "./inspector-stats-tab";
import { LegalityStatus } from "./legality-status";
import { useEditorStore } from "./save-editor-context";
import { describeSlot } from "./save-editor-store";

export function PokemonInspector() {
  // 右栏吃草稿，所以每敲一个字都会重画这一侧 —— 左边的箱子订的是另一组字段，不受连累
  const { session, selected, detail, draft, dirtyFields, legality } = useEditorStore(
    useShallow((state) => ({
      session: state.session,
      selected: state.selected,
      detail: state.detail,
      draft: state.draft,
      dirtyFields: state.dirtyFields,
      legality: state.legality,
    })),
  );

  const changeDraft = useEditorStore((state) => state.changeDraft);
  const applyDraft = useEditorStore((state) => state.applyDraft);
  const discardDraft = useEditorStore((state) => state.discardDraft);

  const dirty = dirtyFields.length > 0;
  // 总和超 510 的草稿写回去游戏不认，拦在应用之前而不是让 wasm 抛错
  const evOverLimit = draft ? evTotal(draft.evs) > EV_TOTAL_LIMIT : false;

  return (
    <div
      data-testid="pkhex-inspector"
      className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10"
    >
      {!session || !selected || !detail || !draft ? (
        <p
          data-testid="pkhex-inspector-empty"
          className="py-12 text-center text-sm text-muted-foreground"
        >
          在左边点一个格子，属性会显示在这里
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span data-testid="pkhex-inspector-title" className="font-heading font-medium">
              {detail.nickname}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              #{String(detail.species).padStart(4, "0")}
            </span>
            {/* 位置文案只有 describeSlot 一处出处，跟导出被拦时点名的那句对齐 */}
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {describeSlot(selected.box, selected.slot)}
            </span>
          </div>

          {legality && <LegalityStatus report={legality} />}

          {/* Base UI 的 Tabs 只挂载激活的那一块，原始标签那坨 JSON 不会白渲染 */}
          <Tabs defaultValue="main">
            <TabsList data-testid="pkhex-inspector-tabs" className="w-full">
              <TabsTrigger data-testid="pkhex-tab-main" value="main">
                主要
              </TabsTrigger>
              <TabsTrigger data-testid="pkhex-tab-stats" value="stats">
                能力
              </TabsTrigger>
              <TabsTrigger data-testid="pkhex-tab-moves" value="moves">
                招式
              </TabsTrigger>
              <TabsTrigger data-testid="pkhex-tab-raw" value="raw">
                原始
              </TabsTrigger>
            </TabsList>

            <TabsContent value="main">
              <InspectorMainTab
                detail={detail}
                draft={draft}
                info={session.info}
                tables={session.stringTables}
                onChange={changeDraft}
              />
            </TabsContent>

            <TabsContent value="stats">
              <InspectorStatsTab draft={draft} info={session.info} onChange={changeDraft} />
            </TabsContent>

            <TabsContent value="moves">
              <InspectorMovesTab
                draft={draft}
                info={session.info}
                tables={session.stringTables}
                onChange={changeDraft}
              />
            </TabsContent>

            <TabsContent value="raw">
              <InspectorRawTab detail={detail} />
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {dirty ? `${dirtyFields.length} 处改动还没写回存档` : "没有未应用的改动"}
            </span>

            <Button
              data-testid="pkhex-discard-button"
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={!dirty}
              onClick={discardDraft}
            >
              <Undo2 />
              还原
            </Button>

            <Button
              data-testid="pkhex-apply-button"
              data-dirty={dirty}
              size="sm"
              disabled={!dirty || evOverLimit}
              onClick={() => void applyDraft()}
            >
              应用修改
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
