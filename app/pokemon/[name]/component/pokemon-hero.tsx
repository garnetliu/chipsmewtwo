import { Card } from "@/components/pokedex/card";
import { DetailDescription, DetailImage } from "@/components/pokedex/detail-shell";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { typeGradient } from "@/components/pokedex/token";
import { TypeTag } from "@/components/pokedex/type-tag";
import { VersionBadges } from "@/components/pokedex/version-badges";

import type { Pokemon } from "../type";
import { PokemonStats } from "./pokemon-stats";

interface IProps {
  pokemon: Pokemon;
}

/**
 * 详情页最上面那张整宽卡：色块图 + 身份信息 + 图鉴说明 + 登场版本，右端挂一张种族值小卡。
 *
 * 名字、图鉴说明都在这里出，而且这是服务端组件 —— 爬虫和禁用 JS 拿到的 HTML 里
 * 就已经有这两样东西
 */
export function PokemonHero(props: Readonly<IProps>) {
  const { pokemon } = props;

  const form = pokemon.defaultForm;
  const name = pokemon.name ?? pokemon.slug;
  const types = form?.types ?? [];

  /** 色块底色取第一属性，照 prototype 的 135° 渐变，hero 这一档起始 15% */
  const background = typeGradient(types[0]?.slug ?? "unknown", 15);

  /**
   * 图鉴说明取第一条。库里一只有几十条（一个版本一条），
   * 查询已经按语言回退过，排头那条就是中文
   */
  const description = form?.descriptions[0]?.text;

  return (
    <Card data-slot="pokemon-hero" className="mb-5 p-6">
      <div className="flex flex-wrap items-center gap-6">
        {/* 这张图一直在首屏上、是详情页的 LCP 元素，不交给懒加载 */}
        <DetailImage src={form?.fullImageUrl} alt={name} loading="eager" style={{ background }} />

        <div className="min-w-65 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* id 就是全国图鉴编号，补到四位 */}
            <span className="font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
              {`No.${String(pokemon.id).padStart(4, "0")}`}
            </span>

            {pokemon.genus && <MiniBadge tone="success">{pokemon.genus}</MiniBadge>}

            {types.map((type) => (
              <TypeTag key={type.id} slug={type.slug}>
                {type.name ?? type.slug}
              </TypeTag>
            ))}
          </div>

          <h1 className="mt-1 text-[26px] font-bold tracking-tight">{name}</h1>

          <DetailDescription className="mt-1.5" text={description} />

          <VersionBadges versions={pokemon.versions} label="登场版本" className="mt-3" />
        </div>

        <PokemonStats stats={form?.stats} />
      </div>
    </Card>
  );
}
