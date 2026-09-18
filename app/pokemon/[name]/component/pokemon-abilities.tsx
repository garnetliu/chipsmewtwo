import { Card } from "@/components/pokedex/card";
import { CardEmpty } from "@/components/pokedex/card-empty";
import { DetailLink } from "@/components/pokedex/detail-shell";

import type { Pokemon } from "../type";

/**
 * 行内那句说明留几个字。
 *
 * Ability 上没有 shortEffect，只有整段 effect —— 一行放不下，在这里切一刀，
 * 完整那段在特性详情页里看
 */
const EFFECT_LIMIT = 36;

interface IProps {
  /** 默认形态最新世代的特性槽位，按 slot 排。Gen1/Gen2 没有特性，那两代是空数组 */
  abilities: NonNullable<Pokemon["defaultForm"]>["abilities"];
}

/** 右下卡：特性资料。一行一个特性，右端链到特性详情 */
export function PokemonAbilities(props: Readonly<IProps>) {
  const { abilities } = props;

  return (
    <Card data-slot="pokemon-abilities" className="p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[15px] font-bold">特性资料</span>
        <span className="text-[11px] text-muted-foreground">第二项为隐藏特性</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {abilities.map((slot) => (
          <div
            key={slot.id}
            data-slot="pokemon-ability"
            data-ability-slot={slot.slot}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
          >
            {/* 名字和说明挤在一行，撑不下时由 truncate 收尾，右端的链接不被顶走 */}
            <div className="truncate">
              <span className="text-[13px] font-bold">
                {slot.ability.name ?? slot.ability.slug}
              </span>

              {slot.ability.effect && (
                <span
                  className="ml-2 text-[11px] text-muted-foreground"
                  title={slot.ability.effect}
                >
                  {shorten(slot.ability.effect)}
                </span>
              )}
            </div>

            <DetailLink
              href={`/ability/${slot.ability.slug}`}
              backLabel="精灵详情"
              className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              特性详情 →
            </DetailLink>
          </div>
        ))}

        {abilities.length === 0 && <CardEmpty>这一只没有收录特性</CardEmpty>}
      </div>
    </Card>
  );
}

/** 超过 EFFECT_LIMIT 个字就截断补省略号 */
function shorten(text: string): string {
  return text.length > EFFECT_LIMIT ? `${text.slice(0, EFFECT_LIMIT)}…` : text;
}
