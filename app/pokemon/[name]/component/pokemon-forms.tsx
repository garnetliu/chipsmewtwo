import { Card } from "@/components/pokedex/card";
import { CardEmpty } from "@/components/pokedex/card-empty";
import { DetailLink } from "@/components/pokedex/detail-shell";
import { GenChip } from "@/components/pokedex/gen-chip";

import type { Pokemon } from "../type";

interface IProps {
  pokemon: Pokemon;
}

/**
 * 左下卡：形态 chips + 进化链。
 *
 * 形态只展示不跳转 —— 属性、种族值这些还是按默认形态取，站内没有「按形态看」这一页。
 * 进化链上的其他成员是主色链接，点进去还是精灵详情
 */
export function PokemonForms(props: Readonly<IProps>) {
  const { pokemon } = props;

  return (
    <Card data-slot="pokemon-forms" className="p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[15px] font-bold">形态</span>
        <span className="text-[11px] text-muted-foreground">同一全国编号下不同形态</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {pokemon.forms.map((form, index) => (
          <GenChip
            key={form.id}
            // 默认形态排第一，就是这一页正在看的那个
            selected={index === 0}
            // 点不了，但也不是「不可用」，别按禁用态压暗
            disabled
            className="disabled:opacity-100"
          >
            {/*
              原形态在 form_i18n 里没有单独一行，name 是 null，回退成物种名；
              地区形态、超级进化这些有自己的名字，照原样出
            */}
            {form.name ?? pokemon.name ?? form.slug}
          </GenChip>
        ))}
      </div>

      <div className="mt-5 mb-2.5 text-[12px] font-bold">进化链</div>

      <div className="flex flex-wrap items-center gap-2">
        {pokemon.evolutionChain.map((member, index) => (
          <span key={member.id} className="flex items-center gap-2 text-[13px]">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted-foreground/60">
                ›
              </span>
            )}

            {member.id === pokemon.id ? (
              <span className="font-bold">{member.name ?? member.slug}</span>
            ) : (
              <DetailLink
                href={`/pokemon/${member.slug}`}
                backLabel="精灵详情"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {member.name ?? member.slug}
              </DetailLink>
            )}
          </span>
        ))}

        {pokemon.evolutionChain.length === 0 && (
          <CardEmpty className="w-full">没有收录进化关系</CardEmpty>
        )}
      </div>
    </Card>
  );
}
