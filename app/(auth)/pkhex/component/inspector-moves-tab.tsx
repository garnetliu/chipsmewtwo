"use client";

import { Label } from "@/components/ui/label";
import type { MoveTuple, PkhexStringTables, SaveInfo, SlotDraft } from "@/lib/pkhex/types";

import { DexSelect } from "./dex-select";

interface IProps {
  draft: SlotDraft;
  info: SaveInfo;
  tables: PkhexStringTables;
  onChange: (patch: Partial<SlotDraft>) => void;
}

export function InspectorMovesTab(props: Readonly<IProps>) {
  const { draft, info, tables, onChange } = props;

  function replace(index: number, move: number): MoveTuple {
    const next = [...draft.moves] as MoveTuple;
    next[index] = move;
    return next;
  }

  return (
    <div className="grid grid-cols-[3.5rem_1fr] items-center gap-x-3 gap-y-2.5 pt-3">
      {draft.moves.map((move, index) => (
        <div key={index} className="contents">
          <Label>招式 {index + 1}</Label>
          <DexSelect
            testId={`pkhex-move-${index}`}
            value={move}
            // 名字全部来自 stringTables，编号是游戏内部编号，查库会串成别的招式
            names={tables.moves}
            max={info.maxMoveId}
            placeholder="输入招式名或编号"
            onChange={(next) => onChange({ moves: replace(index, next) })}
          />
        </div>
      ))}

      <p className="col-span-2 text-xs text-muted-foreground">编号 0 是空招式槽。</p>
    </div>
  );
}
