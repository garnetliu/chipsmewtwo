"use client";

import type { FragmentType } from "@apollo/client/masking";
import { useFragment } from "@apollo/client/react";

import { PokeCard } from "@/components/pokedex/card";
import { DetailImage, DetailLink } from "@/components/pokedex/detail-shell";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { typeColorVar, typeGradient } from "@/components/pokedex/token";
import { TypeTag } from "@/components/pokedex/type-tag";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { POKEMON_POKEMON_ITEM } from "@/graphql/apollo/fragment";

/**
 * 卡片上摆几个版本色块。
 *
 * 库里一只的登场版本是全量（妙蛙种子 41 个），剩下的折成「+N」，完整列表在详情页。
 *
 * prototype 摆的是四个，那是因为演示数据的版本名都是一个字（红/绿/蓝/黄）；
 * 真实译名是「红（日版）」这种五个字、单个色块 61px 宽，两列布局下这一行只有
 * 222px 可用，摆到第三个就得截断，所以取两个
 */
const VERSION_LIMIT = 2;

/**
 * 卡片高度。右栏四行文字比 80px 的色块图还高，卡片高度由它撑出来，
 * 这里只是把量出来的值抄给骨架，加载态和列表之间不跳行
 */
export const POKEMON_CARD_HEIGHT = "h-[137px]";

interface IProps {
  /**
   * 父级传下来的是 fragment 引用，不是数据本身 —— dataMasking 开着，
   * 列表页读不到这里面的字段，只能原样往下传
   */
  pokemon: FragmentType<typeof POKEMON_POKEMON_ITEM>;
}

export function PokemonCard(props: Readonly<IProps>) {
  /**
   * 拿引用去缓存里读自己声明的那几个字段。
   *
   * complete 为 false 表示缓存里这条不全（比如别的查询只写进了一部分），
   * 这时 data 是残缺的，当没数据处理
   */
  const { data, complete } = useFragment({
    fragmentName: "POKEMON_POKEMON_ITEM",
    fragment: POKEMON_POKEMON_ITEM,
    from: props.pokemon,
  });

  if (!complete) return null;

  // 一条译名都没有时回退到英文 slug，别把空白卡片摆出去
  const name = data.name ?? data.slug;
  const types = data.defaultForm?.types ?? [];
  const versions = data.versions;

  return (
    <DetailLink href={`/pokemon/${data.slug}`} backLabel="精灵列表">
      <PokeCard className="flex gap-4 p-4">
        <PokemonThumb src={data.defaultForm?.detailImageUrl} name={name} type={types[0]?.slug} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            {/* id 就是全国图鉴编号，补到四位 */}
            <span className="font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
              {`No.${String(data.id).padStart(4, "0")}`}
            </span>

            {data.genus && (
              <MiniBadge tone="success" className="truncate">
                {data.genus}
              </MiniBadge>
            )}
          </div>

          <div className="mt-0.5 truncate text-[16px] font-bold">{name}</div>

          <div className="mt-1.5 flex gap-1.5">
            {types.map((type) => (
              <TypeTag key={type.id} slug={type.slug}>
                {type.name ?? type.slug}
              </TypeTag>
            ))}
          </div>

          {/* 版本这一行不换行：摆不下就裁掉，卡片高度得跟同一行的其他卡一致 */}
          <VersionBadges
            versions={versions}
            label="登场版本"
            limit={VERSION_LIMIT}
            size="card"
            className="mt-2.5"
          />
        </div>
      </PokeCard>
    </DetailLink>
  );
}

interface IThumbProps {
  /** 形态图地址。这只还没导入形态、或者数据源没收录图时是 null */
  src?: string | null;
  /** 中文名，用来给读屏和缺图时的文字兜底 */
  name: string;
  /** 第一属性的 slug，色块底色的渐变按它取。没有属性就落到 unknown 灰 */
  type?: string;
}

/**
 * 卡片左边那块 80×80 的图。
 *
 * 图和 404 兜底都走 DetailImage，这里只给它这一处的尺寸、底色和缺图时摆什么 ——
 * 底色是第一属性色的 135° 渐变，缺图时退回名字末两字，照 prototype
 */
function PokemonThumb(props: Readonly<IThumbProps>) {
  const { src, name, type } = props;

  const slug = type ?? "unknown";

  return (
    <DetailImage
      data-slot="pokemon-thumb"
      src={src}
      alt={name}
      sizes="80px"
      className="size-20 rounded-lg"
      style={{ background: typeGradient(slug) }}
      fallback={
        <span
          className="text-[22px] font-black"
          style={{ color: typeColorVar(slug), opacity: 0.8 }}
        >
          {name.slice(-2)}
        </span>
      }
    />
  );
}
