"use client";

import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";

import { AbilityRow } from "@/app/ability/component/ability-row";
import { BLANK } from "@/components/pokedex/blank";
import { Card } from "@/components/pokedex/card";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/pokedex/data-table";
import { ListShell, ListSkeleton } from "@/components/pokedex/list-shell";
import { GET_ABILITY_LIST } from "@/graphql/apollo/query";

/** 一页多少条。分页栏改地址栏里的 page，这里换算成 offset */
const PAGE_SIZE = 20;

/** 加载态。一行一块，高度和真实表格行对上，换成表格时页面不跳 */
export function AbilityListSkeleton() {
  return (
    <ListSkeleton count={PAGE_SIZE} className="flex flex-col gap-1.5" itemClassName="h-[2.8rem]" />
  );
}

export function AbilityList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // 特性域不按世代分，这页没有筛选行，查询也就只收分页
  const { data, loading, refetch } = useQuery(GET_ABILITY_LIST, {
    variables: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
  });

  const abilityList = data?.abilityList;

  return (
    <ListShell
      title="特性列表"
      description="浏览特性条目，详情页可查看拥有该特性的 Pokémon 并跳转精灵详情。"
      stats={[{ value: abilityList?.pagination?.total ?? BLANK, label: "当前条目" }]}
      loading={loading}
      result={abilityList}
      skeleton={<AbilityListSkeleton />}
      retry={() => void refetch()}
      // 这页没有筛选条件可改，空只可能是页码翻过了头
      emptyHint="这一页超出了条目总数，回第一页看看"
      maxSlots={7}
    >
      <Card className="overflow-hidden">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead className="w-[22%]">名称</DataTableHead>
              <DataTableHead>简短说明</DataTableHead>
              <DataTableHead className="w-[22%]">登场版本</DataTableHead>
              <DataTableHead className="text-right">操作</DataTableHead>
            </DataTableRow>
          </DataTableHeader>

          {/* 这里只读得到 id —— 其余字段是行组件自己声明的，masking 遮住了 */}
          <DataTableBody>
            {abilityList?.data?.map((ability) => (
              <AbilityRow key={ability.id} ability={ability} />
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </ListShell>
  );
}
