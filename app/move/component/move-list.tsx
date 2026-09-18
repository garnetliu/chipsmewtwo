"use client";

import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";

import { MoveRow } from "@/app/move/component/move-row";
import { BLANK } from "@/components/pokedex/blank";
import { Card } from "@/components/pokedex/card";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/pokedex/data-table";
import { readGen } from "@/components/pokedex/gen-filter";
import { ListShell, ListSkeleton } from "@/components/pokedex/list-shell";
import { GET_MOVE_LIST } from "@/graphql/apollo/query";

/** 一页多少条。分页栏改地址栏里的 page，这里换算成 offset */
const PAGE_SIZE = 20;

/** 加载态。一行一块，高度和真实表格行对上，换成表格时页面不跳 */
export function MoveListSkeleton() {
  return (
    <ListSkeleton count={PAGE_SIZE} className="flex flex-col gap-1.5" itemClassName="h-[2.8rem]" />
  );
}

export function MoveList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const generation = readGen(searchParams.get("gen"));

  const { data, loading, refetch } = useQuery(GET_MOVE_LIST, {
    variables: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, generation },
  });

  const moveList = data?.moveList;

  return (
    <ListShell
      title="招式列表"
      description="浏览招式名称与说明，详情页按不同游戏版本组织属性、分类、威力、命中与 PP。"
      stats={[{ value: moveList?.pagination?.total ?? BLANK, label: "当前条目" }]}
      genFilter
      loading={loading}
      result={moveList}
      skeleton={<MoveListSkeleton />}
      retry={() => void refetch()}
      maxSlots={7}
    >
      <Card className="overflow-hidden">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead className="whitespace-nowrap">名称</DataTableHead>
              <DataTableHead className="w-[46%]">说明</DataTableHead>
              <DataTableHead>登场版本</DataTableHead>
              <DataTableHead className="text-right whitespace-nowrap">操作</DataTableHead>
            </DataTableRow>
          </DataTableHeader>

          {/* 这里只读得到 id —— 其余字段是行组件自己声明的，masking 遮住了 */}
          <DataTableBody>
            {moveList?.data?.map((move) => (
              <MoveRow key={move.id} move={move} />
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </ListShell>
  );
}
