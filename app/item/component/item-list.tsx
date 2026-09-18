"use client";

import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";

import { ITEM_CARD_HEIGHT, ItemCard } from "@/app/item/component/item-card";
import { BLANK } from "@/components/pokedex/blank";
import { readGen } from "@/components/pokedex/gen-filter";
import { ListShell, ListSkeleton } from "@/components/pokedex/list-shell";
import { GET_ITEM_LIST } from "@/graphql/apollo/query";

/** 一页多少张卡。卡片是两列网格，取偶数，最后一行才不会缺口 */
const PAGE_SIZE = 20;

/** 两列网格的排布。骨架和真实列表共用，两者之间换不掉行 */
const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2";

/**
 * 加载态铺的卡片位。页面首屏的 Suspense fallback 也用它 ——
 * 块高取真实卡片的高度，换上来时网格不跳
 */
export function ItemListSkeleton() {
  return <ListSkeleton count={PAGE_SIZE} className={GRID} itemClassName={ITEM_CARD_HEIGHT} />;
}

/**
 * 道具列表。取数在客户端，筛选和页码都在地址栏里：gen 选世代、page 选页。
 *
 * gen 的读法和 GenFilter 写的那一侧对齐 —— 落不进 1–9 就当没筛
 */
export function ItemList() {
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const generation = readGen(searchParams.get("gen"));

  const { data, loading, refetch } = useQuery(GET_ITEM_LIST, {
    variables: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, generation },
  });

  const itemList = data?.itemList;

  return (
    <ListShell
      title="道具列表"
      description="浏览对战常用携带道具的名称、说明与登场版本。"
      stats={[{ value: itemList?.pagination?.total ?? BLANK, label: "当前条目" }]}
      genFilter
      loading={loading}
      result={itemList}
      skeleton={<ItemListSkeleton />}
      retry={() => void refetch()}
      maxSlots={7}
    >
      {/* 这里只读得到 id —— 其余字段是卡片自己声明的，masking 遮住了 */}
      <div className={GRID}>
        {itemList?.data?.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </ListShell>
  );
}
