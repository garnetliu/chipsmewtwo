"use client";

import { cn } from "cn";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { memo, useState } from "react";

import { isEmptySlot } from "@/lib/pkhex/slot";
import type { SlotSummary } from "@/lib/pkhex/types";

import type { NavTarget, SpeciesMeta } from "./save-editor-store";

interface IProps {
  testId: string;
  box: number;
  slot: number;
  summary: SlotSummary | null;
  selected: boolean;
  /** undefined = 还没查，null = 查过库里没有。两种都回落到编号占位 */
  species: SpeciesMeta | null | undefined;
  /**
   * 直接收 store 上的 requestNav —— 形状对齐之后父组件不用再包一层箭头函数，
   * 回调引用恒定，下面那个 memo 才真的拦得住重画
   */
  onSelect: (target: NavTarget) => void;
}

function padDex(species: number): string {
  return `#${String(species).padStart(4, "0")}`;
}

function BoxSlotBase(props: Readonly<IProps>) {
  const { testId, box, slot, summary, selected, species, onSelect } = props;

  // 图挂了就记下是哪个 URL 挂的。记 URL 而不是布尔，换种族之后不用手动重置
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  const mon = summary && !isEmptySlot(summary) ? summary : null;
  const imageUrl = species?.imageUrl && species.imageUrl !== brokenUrl ? species.imageUrl : null;

  return (
    <button
      type="button"
      data-testid={testId}
      data-empty={mon === null}
      data-selected={selected}
      data-species={mon?.species ?? 0}
      onClick={() => onSelect({ box, slot })}
      title={
        mon
          ? `${species?.name ?? padDex(mon.species)} ${padDex(mon.species)} · Lv.${mon.level}`
          : "空格子"
      }
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border border-border/60 bg-muted/30 p-1 text-center transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary bg-primary/10 ring-2 ring-primary",
        !mon && "border-dashed bg-transparent",
      )}
    >
      {mon && (
        <>
          {mon.isEgg ? (
            // 蛋不该按种族取图 —— 游戏里孵化前看不出是谁
            <span className="text-xl leading-none">🥚</span>
          ) : imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={40}
              height={40}
              unoptimized
              // 点阵图放大要保持锯齿，默认的平滑插值会糊成一团
              style={{ imageRendering: "pixelated" }}
              className="size-10 object-contain"
              onError={() => setBrokenUrl(imageUrl)}
            />
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground">
              {padDex(mon.species)}
            </span>
          )}

          <span className="w-full truncate text-[10px] leading-tight">{mon.nickname}</span>
          <span className="font-mono text-[9px] leading-none text-muted-foreground">
            Lv.{mon.level}
          </span>

          {mon.isShiny && <Sparkles className="absolute top-0.5 left-0.5 size-3 text-warning" />}

          {mon.form !== 0 && (
            // 形态序号是 PKHeX 的内部编号，跟库里的形态图对不上，所以只标不换图
            <span className="absolute right-0.5 bottom-0.5 font-mono text-[9px] leading-none text-muted-foreground">
              F{mon.form}
            </span>
          )}
        </>
      )}
    </button>
  );
}

/**
 * 一箱 30 格加队伍 6 格，改一只就把 36 个全重画不划算。
 * props 全是原始值加稳定回调，memo 才拦得住 —— 所以这里不读 context
 */
export const BoxSlot = memo(BoxSlotBase);
