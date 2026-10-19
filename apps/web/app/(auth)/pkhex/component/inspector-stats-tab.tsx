"use client";

import { cn } from "cn";

import { Separator } from "@/components/ui/separator";
import { EV_TOTAL_LIMIT, evTotal } from "@/lib/pkhex/slot";
import type { SaveInfo, SlotDraft, StatTuple } from "@/lib/pkhex/types";
import { STAT_ORDER } from "@/lib/pkhex/types";

import { StatNumberField } from "./stat-number-field";

/** 顺序跟 STAT_ORDER 一一对应，全线都是 HP/攻/防/特攻/特防/速 */
const STAT_LABELS = ["HP", "攻击", "防御", "特攻", "特防", "速度"];

interface IProps {
  draft: SlotDraft;
  info: SaveInfo;
  onChange: (patch: Partial<SlotDraft>) => void;
}

export function InspectorStatsTab(props: Readonly<IProps>) {
  const { draft, info, onChange } = props;

  const total = evTotal(draft.evs);
  const overLimit = total > EV_TOTAL_LIMIT;

  function replace(tuple: StatTuple, index: number, value: number): StatTuple {
    const next = [...tuple] as StatTuple;
    next[index] = value;
    return next;
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">个体值</span>
        {STAT_ORDER.map((stat, index) => (
          <StatNumberField
            key={stat}
            testId={`pkhex-iv-${stat}`}
            label={STAT_LABELS[index]}
            value={draft.ivs[index]}
            max={info.maxIv}
            onChange={(value) => onChange({ ivs: replace(draft.ivs, index, value) })}
          />
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">努力值</span>
        {STAT_ORDER.map((stat, index) => (
          <StatNumberField
            key={stat}
            testId={`pkhex-ev-${stat}`}
            label={STAT_LABELS[index]}
            value={draft.evs[index]}
            max={info.maxEv}
            // 单项都没超但加起来超了，六项一起标红，用户才知道该从哪儿匀
            invalid={overLimit}
            onChange={(value) => onChange({ evs: replace(draft.evs, index, value) })}
          />
        ))}

        <div
          data-testid="pkhex-ev-total"
          data-invalid={overLimit || undefined}
          className={cn(
            "grid grid-cols-[4rem_1fr_3.5rem] items-center gap-2 text-xs",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span>合计</span>
          <span className="text-right font-mono">{total}</span>
          <span className="font-mono">/ {EV_TOTAL_LIMIT}</span>
        </div>

        {overLimit && (
          <p className="text-xs text-destructive">
            努力值总和超过 {EV_TOTAL_LIMIT}，游戏不认这份数据，先减下来再应用
          </p>
        )}
      </div>
    </div>
  );
}
