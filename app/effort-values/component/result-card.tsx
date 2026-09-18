"use client";

import { CircleAlert } from "lucide-react";

import { Card } from "@/components/pokedex/card";
import type { StatKey } from "@/lib/stats";

import { FieldError, NumberField } from "./field";

/** 进度条按这个上限铺满。300 是六项能力值的实际天花板，照 prototype */
const BAR_MAX = 300;

export interface IStatRow {
  key: StatKey;
  /** 中文项目名 */
  name: string;
  /** 种族值，摆在项目名后面的小字 */
  base: number;
  /** 个体值输入框里的原文和它的错误文案 */
  iv: string;
  ivError: string | null;
  /** 努力值输入框里的原文和它的错误文案 */
  ev: string;
  evError: string | null;
  /** 算出来的能力值 */
  result: number;
}

interface IProps {
  rows: readonly IStatRow[];
  onIvChange: (key: StatKey, value: string) => void;
  onEvChange: (key: StatKey, value: string) => void;
  /** 参数卡上的等级、总和也算在内：任一项有错就在卡顶挂红条 */
  hasError: boolean;
}

/** 右边那张结果卡：六行，每行是项目名、个体值、努力值、进度条和实时能力值 */
export function ResultCard(props: Readonly<IProps>) {
  const { rows, onIvChange, onEvChange, hasError } = props;

  return (
    <Card data-slot="ev-result-card" className="p-5 md:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[15px] font-bold">计算结果</span>

        {/* 窄屏收起来：这两句是列头说明，挤在标题旁边会把「计算结果」压成两行 */}
        <div className="hidden grid-cols-2 gap-x-4 text-[11px] text-muted-foreground sm:grid">
          <span>中间两列：个体值 / 努力值</span>
          <span className="text-right">右侧：实时能力值</span>
        </div>
      </div>

      {hasError && (
        <div
          data-slot="ev-error-banner"
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-lg bg-destructive/10 px-4 py-3 text-[13px] font-medium text-destructive"
        >
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          输入有误，修正标红字段后将自动重新计算
        </div>
      )}

      <div className="space-y-3.5">
        {rows.map((row) => (
          <div
            key={row.key}
            data-slot="ev-stat-row"
            className="grid grid-cols-6 items-center gap-3 md:grid-cols-12"
          >
            <span className="col-span-6 text-[13px] font-semibold md:col-span-2">
              {row.name}{" "}
              <span className="text-[10px] font-normal text-muted-foreground tabular-nums">
                {row.base}
              </span>
            </span>

            <div className="col-span-3">
              <NumberField
                aria-label={`${row.name} 个体值`}
                min={0}
                max={31}
                value={row.iv}
                onValueChange={(value) => onIvChange(row.key, value)}
                invalid={row.ivError != null}
              />
              <FieldError>{row.ivError}</FieldError>
            </div>

            <div className="col-span-3">
              <NumberField
                aria-label={`${row.name} 努力值`}
                min={0}
                max={252}
                step={4}
                value={row.ev}
                onValueChange={(value) => onEvChange(row.key, value)}
                invalid={row.evError != null}
              />
              <FieldError>{row.evError}</FieldError>
            </div>

            <div className="col-span-6 flex items-center gap-3 md:col-span-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  data-slot="ev-stat-bar"
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((row.result / BAR_MAX) * 100))}%`,
                    // HP 那条绿、其余五条主色，和 prototype 一致
                    background:
                      row.key === "hp" ? "var(--color-stat-high)" : "var(--color-stat-mid)",
                  }}
                />
              </div>

              <span
                data-slot="ev-stat-result"
                className="w-12 text-right text-[17px] font-bold text-primary tabular-nums"
              >
                {row.result}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
