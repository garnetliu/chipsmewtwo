"use client";

import { ChevronRight } from "lucide-react";

import { DetailLink } from "@/components/pokedex/detail-shell";
import { MiniBadge } from "@/components/pokedex/mini-badge";

import { KINDS, type SearchHit } from "./kind";

interface IProps {
  hit: SearchHit;
  /** 点下去之后除了跳转还要做什么 —— 模态框得关掉 */
  onNavigate: () => void;
}

/**
 * 结果区的一行：类型徽章 + 中文名 + 副文本 + 右端箭头。
 *
 * 用 DetailLink 而不是 Link：进详情页之前要把来源记成「搜索结果」，
 * 详情页的面包屑才会写「← 返回搜索结果」并回到搜索时站着的那一页
 */
export function SearchHitRow(props: Readonly<IProps>) {
  const { hit, onNavigate } = props;

  const meta = KINDS[hit.kind];

  return (
    <DetailLink
      href={`${meta.path}/${hit.slug}`}
      backLabel="搜索结果"
      onClick={onNavigate}
      data-slot="search-hit"
      data-kind={hit.kind}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-primary/10"
    >
      {/* 底色按四个类型各取一色，形态还是 MiniBadge 那一份 */}
      <MiniBadge
        data-slot="search-hit-badge"
        className="shrink-0 leading-none"
        style={{
          background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
          color: meta.color,
        }}
      >
        {meta.label}
      </MiniBadge>

      <span className="shrink-0 text-[13.5px] font-bold">{hit.name}</span>

      {/* 副文本可以为 null（说明缺失），这一格留空但位置还在，箭头不会往左跑 */}
      <span data-slot="search-hit-subtitle" className="truncate text-[12px] text-muted-foreground">
        {hit.subtitle}
      </span>

      <ChevronRight
        aria-hidden="true"
        className="ml-auto size-3.5 shrink-0 text-muted-foreground"
      />
    </DetailLink>
  );
}
