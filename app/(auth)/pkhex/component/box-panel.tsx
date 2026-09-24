"use client";

import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTY_BOX_INDEX } from "@/lib/pkhex/slot";

import { BoxSlot } from "./box-slot";
import { PartyRow } from "./party-row";
import { useEditorStore } from "./save-editor-context";
import { readSlots } from "./save-editor-store";

/**
 * 一箱排几列。第六世代起都是 6×5 的 30 格，只有 LGPE 是 5×5 的 25 格 ——
 * 列数写死 6 的话它会排成四行半，末行孤零零挂一格，那不是箱子的形状
 */
function boxColumns(boxSlotCount: number): number {
  return boxSlotCount === 25 ? 5 : 6;
}

/** 方向键的位移。上下跨行，但一律夹在本箱之内 —— 跨箱移动太容易误触 */
function arrowDelta(key: string, columns: number): number | undefined {
  switch (key) {
    case "ArrowLeft":
      return -1;
    case "ArrowRight":
      return 1;
    case "ArrowUp":
      return -columns;
    case "ArrowDown":
      return columns;
    default:
      return undefined;
  }
}

export function BoxPanel() {
  // 箱子只吃这几项 —— 草稿每敲一个字都变，但跟格子无关，不能让它重画 36 格
  const { session, boxIndex, selected, revision, species } = useEditorStore(
    useShallow((state) => ({
      session: state.session,
      boxIndex: state.boxIndex,
      selected: state.selected,
      revision: state.revision,
      species: state.species,
    })),
  );
  // action 在 store 上引用恒定，直接当稳定回调传给 memo 过的 BoxSlot
  const requestNav = useEditorStore((state) => state.requestNav);

  const panelRef = useRef<HTMLDivElement>(null);

  // wasm 是原地改值、引用不换，光靠 session 这个依赖顶不掉缓存，得带上 revision
  const slots = useMemo(() => {
    void revision;
    return session ? readSlots(session, boxIndex) : [];
  }, [session, boxIndex, revision]);

  const partySlots = useMemo(() => {
    void revision;
    return session ? readSlots(session, PARTY_BOX_INDEX) : [];
  }, [session, revision]);

  if (!session) return null;

  const { boxNames, boxSlotCount } = session.info;
  const columns = boxColumns(boxSlotCount);

  /**
   * 箱名是存档里存的原文，桥如实透出来 —— 从没改过箱名的存档（空白档、刚开局的档）
   * 存的就是空串，直接拿去渲染下拉是一条条空白。给没名字的箱子编一个显示名是 UI 的事，
   * 界面全中文，默认名也得是中文
   */
  const boxLabels = boxNames.map((name, index) => name.trim() || `宝可梦盒子 ${index + 1}`);

  function goToBox(index: number) {
    requestNav({ box: index, slot: null });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;

    if (event.key === "Enter") {
      // 选好了就该去填表，把焦点直接送到右栏第一个字段，省得一路 Tab 过去。
      // 按 testid 找而不是 querySelector("input")：Base UI 的 Combobox 会额外藏一个
      // 表单用的 input，撞上它拿到的就不是用户看得见的那个控件
      event.preventDefault();
      document
        .querySelector<HTMLElement>(
          '[data-testid="pkhex-inspector"] :is([data-testid^="pkhex-field-"],[data-testid^="pkhex-iv-"],[data-testid^="pkhex-move-"])',
        )
        ?.focus();
      return;
    }

    const delta = arrowDelta(event.key, columns);
    if (delta === undefined) return;

    // 队伍只有一行，上下没有去处
    const inParty = selected.box === PARTY_BOX_INDEX;
    if (inParty && Math.abs(delta) === columns) return;

    const total = inParty ? partySlots.length : slots.length;
    const next = selected.slot + delta;
    if (next < 0 || next >= total) return;

    event.preventDefault();
    requestNav({ box: selected.box, slot: next });

    const prefix = inParty ? "pkhex-party-slot" : "pkhex-box-slot";
    panelRef.current?.querySelector<HTMLElement>(`[data-testid="${prefix}-${next}"]`)?.focus();
  }

  return (
    <div
      ref={panelRef}
      data-testid="pkhex-box-panel"
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2">
        <Button
          data-testid="pkhex-box-prev"
          variant="outline"
          size="icon-sm"
          aria-label="上一箱"
          disabled={boxIndex === 0}
          onClick={() => goToBox(boxIndex - 1)}
        >
          <ChevronLeft />
        </Button>

        <Select
          items={boxLabels.map((name, index) => ({ label: name, value: index }))}
          value={boxIndex}
          onValueChange={(value) => goToBox(Number(value))}
        >
          <SelectTrigger data-testid="pkhex-box-select" size="sm" className="w-52">
            <SelectValue data-testid="pkhex-box-label" />
          </SelectTrigger>
          <SelectContent>
            {boxLabels.map((name, index) => (
              <SelectItem key={index} value={index}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="font-mono text-xs text-muted-foreground">
          {boxIndex + 1} / {boxLabels.length}
        </span>

        <Button
          data-testid="pkhex-box-next"
          variant="outline"
          size="icon-sm"
          aria-label="下一箱"
          className="ml-auto"
          disabled={boxIndex === boxLabels.length - 1}
          onClick={() => goToBox(boxIndex + 1)}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* 列数只跟存档的箱容量走，不随断点变 —— 6×5 是箱子本身的形状，掉成 4 列就不是箱子了 */}
      <div
        data-testid="pkhex-box-grid"
        role="grid"
        aria-label={boxLabels[boxIndex]}
        className={cn("grid gap-1.5", columns === 5 ? "grid-cols-5" : "grid-cols-6")}
      >
        {slots.map((summary, slot) => (
          <BoxSlot
            key={slot}
            testId={`pkhex-box-slot-${slot}`}
            box={boxIndex}
            slot={slot}
            summary={summary}
            selected={selected?.box === boxIndex && selected.slot === slot}
            species={summary ? species.get(summary.species) : undefined}
            onSelect={requestNav}
          />
        ))}
      </div>

      <PartyRow slots={partySlots} selected={selected} species={species} onSelect={requestNav} />
    </div>
  );
}
