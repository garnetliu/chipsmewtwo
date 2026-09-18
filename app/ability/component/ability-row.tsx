"use client";

import type { FragmentType } from "@apollo/client/masking";
import { useFragment } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { DataTableCell, DataTableRow } from "@/components/pokedex/data-table";
import {
  DetailDescription,
  DetailLink,
  rememberDetailSource,
} from "@/components/pokedex/detail-shell";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { ABILITY_ABILITY_ITEM } from "@/graphql/apollo/fragment";

/** 进详情之后面包屑上「← 返回」后面那几个字 */
const BACK_LABEL = "特性列表";

/**
 * 一行摆几个版本色块。
 *
 * 库里一条特性的登场版本是全量（适应力 37 个、沙穴 44 个），22% 宽的列里
 * 全摆出来一行要折八行 —— 实测整张表从 939px 撑到 3747px。摆四个，
 * 剩下的折成「+N」，完整列表在详情页
 */
const VERSION_LIMIT = 4;

interface IProps {
  /**
   * 父级传下来的是 fragment 引用，不是数据本身 —— dataMasking 开着，
   * 列表只读得到 id，字段在这一层自己解
   */
  ability: FragmentType<typeof ABILITY_ABILITY_ITEM>;
}

/** 特性列表的一行。整行可点，点哪都进详情 */
export function AbilityRow(props: Readonly<IProps>) {
  const router = useRouter();

  const { data, complete } = useFragment({
    fragmentName: "ABILITY_ABILITY_ITEM",
    fragment: ABILITY_ABILITY_ITEM,
    from: props.ability,
  });

  // 缓存里这条不全，当没数据处理，和 PokemonCard 一个口径
  if (!complete) return null;

  const href = `/ability/${data.slug}`;

  /**
   * 整行跳转。点在「查看详情」上时交给链接自己走 —— 那一下已经是一次导航，
   * 再 push 一遍是重复的，来源也已经由 DetailLink 记过了
   */
  function openDetail(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a")) return;

    rememberDetailSource({
      href: `${window.location.pathname}${window.location.search}`,
      label: BACK_LABEL,
    });
    router.push(href);
  }

  return (
    <DataTableRow
      data-slot="ability-row"
      className="cursor-pointer transition-colors hover:bg-primary/10"
      onClick={openDetail}
    >
      <DataTableCell className="font-bold whitespace-nowrap">
        {data.name ?? data.slug}
      </DataTableCell>

      {/*
        简短说明在库里基本是空的（数据源只给了英法德三种语言的一句话版），
        为空时由 DetailDescription 兜底 —— 那句话只在它里面实现一次
      */}
      <DataTableCell>
        <DetailDescription text={data.shortEffect} className="leading-5" />
      </DataTableCell>

      <DataTableCell>
        <VersionBadges versions={data.versions} limit={VERSION_LIMIT} />
      </DataTableCell>

      <DataTableCell className="text-right whitespace-nowrap">
        <DetailLink
          href={href}
          backLabel={BACK_LABEL}
          className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          查看详情
        </DetailLink>
      </DataTableCell>
    </DataTableRow>
  );
}
