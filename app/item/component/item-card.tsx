"use client";

import type { FragmentType } from "@apollo/client/masking";
import { useFragment } from "@apollo/client/react";

import { PokeCard } from "@/components/pokedex/card";
import { DetailDescription, DetailLink } from "@/components/pokedex/detail-shell";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { ITEM_ITEM_ITEM } from "@/graphql/apollo/fragment";

/**
 * 一张卡摆几个版本色块。
 *
 * 库里一条道具的登场版本是全量（第二世代引入的一路活到第九代就是 28 个），
 * 全摆出来一张卡要长出三行色块。摆四个，剩下的折成「+N」，完整列表在详情页
 */
const VERSION_LIMIT = 4;

/**
 * 卡片高度。版本行截断到四块之后卡片只随说明的行数变，1440px 下采样一页 20 张是
 * 93 / 125 / 145（最小 / 中位 / 最大），取中位数抄给骨架，换上来时网格不整页跳
 */
export const ITEM_CARD_HEIGHT = "h-[125px]";

interface IProps {
  /**
   * 父级传下来的是 fragment 引用，不是数据本身 —— dataMasking 开着，
   * 列表读得到的只有 id，其余字段在这里解
   */
  item: FragmentType<typeof ITEM_ITEM_ITEM>;
}

/** 道具列表的一张卡：名称 + 引入世代 + 一句话说明 + 登场版本 */
export function ItemCard(props: Readonly<IProps>) {
  const { data, complete } = useFragment({
    fragmentName: "ITEM_ITEM_ITEM",
    fragment: ITEM_ITEM_ITEM,
    from: props.item,
  });

  // 缓存里这条不全，data 是残缺的，当没数据处理
  if (!complete) return null;

  return (
    <DetailLink
      href={`/item/${data.slug}`}
      backLabel="道具列表"
      className="block h-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <PokeCard className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[15px] font-bold">{data.name ?? data.slug}</span>

          {/* 世代是从说明的世代推的，数据源没收录说明的那一批推不出来，那就不出这个徽章 */}
          {data.introducedGeneration != null && (
            <MiniBadge className="shrink-0">{`Gen ${data.introducedGeneration}`}</MiniBadge>
          )}
        </div>

        {/*
          一句话说明库里只有英法两种语言，简中一列都没填，所以中文下看到的是英文原文；
          一半多的道具连英法也没有，那几条的兜底文案由 DetailDescription 出
        */}
        <DetailDescription text={data.shortEffect} className="mt-2 text-[12.5px] leading-5" />

        <VersionBadges
          versions={data.versions}
          label="登场版本"
          limit={VERSION_LIMIT}
          size="card"
          className="mt-3"
        />
      </PokeCard>
    </DetailLink>
  );
}
