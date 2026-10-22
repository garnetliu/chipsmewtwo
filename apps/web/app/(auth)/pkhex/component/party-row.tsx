"use client";

import { PARTY_BOX_INDEX } from "@/lib/pkhex/slot";
import type { SlotSummary } from "@/lib/pkhex/types";

import { BoxSlot } from "./box-slot";
import type { NavTarget, SelectedSlot, SpeciesMeta } from "./save-editor-store";

interface IProps {
  slots: (SlotSummary | null)[];
  selected: SelectedSlot | null;
  species: ReadonlyMap<number, SpeciesMeta | null>;
  onSelect: (target: NavTarget) => void;
}

/**
 * 队伍那 6 格。跟箱子共用 BoxSlot，只是 box 传 -1 ——
 * 队伍在 wasm 那边就是用 -1 当箱号的，不是另一套控件
 */
export function PartyRow(props: Readonly<IProps>) {
  const { slots, selected, species, onSelect } = props;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">队伍</span>

      <div data-testid="pkhex-party-row" className="grid grid-cols-6 gap-1.5">
        {slots.map((summary, slot) => (
          <BoxSlot
            key={slot}
            testId={`pkhex-party-slot-${slot}`}
            box={PARTY_BOX_INDEX}
            slot={slot}
            summary={summary}
            selected={selected?.box === PARTY_BOX_INDEX && selected.slot === slot}
            species={summary ? species.get(summary.species) : undefined}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
