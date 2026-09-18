import { blankText } from "@/components/pokedex/blank";
import { Card } from "@/components/pokedex/card";

import type { Pokemon } from "../type";

/** 种族值条画满的刻度。照 prototype：160 是条的满格，不是库里的最大值 */
const STAT_FULL = 160;

interface IProps {
  /** 默认形态最新世代的六项。这只还没导入形态或者那一代没数据时是 null */
  stats?: NonNullable<Pokemon["defaultForm"]>["stats"];
}

/**
 * hero 卡右边那张「种族值」小卡。
 *
 * 六条横条，条长按 值 / 160，颜色分三档 —— 三档的色值在 globals.css 的
 * --color-stat-high / mid / low 上，阈值（100、80）在这里
 */
export function PokemonStats(props: Readonly<IProps>) {
  const { stats } = props;

  if (!stats) return null;

  /** 顺序照 prototype 的种族值表，跟游戏内一致 */
  const rows = [
    { label: "HP", value: stats.hp },
    { label: "攻击", value: stats.attack },
    { label: "防御", value: stats.defense },
    { label: "特攻", value: stats.specialAttack },
    { label: "特防", value: stats.specialDefense },
    { label: "速度", value: stats.speed },
  ];

  return (
    <Card data-slot="pokemon-stats" className="w-72 p-4 shadow-none">
      <div className="mb-2.5 text-[12px] font-bold">种族值</div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            data-slot="pokemon-stat"
            data-stat={row.label}
            className="flex items-center gap-3 text-[12px]"
          >
            <span className="w-12 shrink-0 text-muted-foreground">{row.label}</span>

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              {/*
                Gen1 的特攻特防在库里是 null，条画不出来就不画 ——
                留着空槽，六行的高度和对齐都不变
              */}
              {row.value != null && (
                <div
                  data-slot="pokemon-stat-bar"
                  data-tier={tierOf(row.value)}
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.round((row.value / STAT_FULL) * 100)}%`,
                    background: `var(--color-stat-${tierOf(row.value)})`,
                  }}
                />
              )}
            </div>

            <span className="w-8 shrink-0 text-right font-mono font-bold tabular-nums">
              {blankText(row.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 条色的三档：100 以上绿、80 以上主色、其余黄 */
function tierOf(value: number): "high" | "mid" | "low" {
  if (value >= 100) return "high";
  if (value >= 80) return "mid";

  return "low";
}
