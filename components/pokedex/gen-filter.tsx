"use client";

import { cn } from "cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

import { Card } from "@/components/pokedex/card";
import { GenChip } from "@/components/pokedex/gen-chip";

/**
 * 九个世代。chip 上只写「Gen N」：prototype 写的是「Gen 1 · 红/绿/蓝」，
 * 九个全带版本名这一行在 1280px 下要换行两次
 */
const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * 地址栏里的 gen 读成世代号。认不出来的值（超范围、小数、空、非数字）一律返回 null，
 * 也就是「不筛选」。
 *
 * 读和写在同一个文件里：chip 亮哪一个和列表按哪一代查必须是同一条规则，
 * 否则会出现九个 chip 一个都不亮、列表却筛过的画面。小数尤其要挡住 ——
 * 3.5 送进 GraphQL 的 Int 变量会被服务端拒掉，整页变成失败卡。
 */
export function readGen(value: string | null): number | null {
  const gen = Number(value);

  // Number(null) 和 Number("") 都是 0，落不进 1–9，和「认不出来」走同一条出口
  return Number.isInteger(gen) && gen >= 1 && gen <= 9 ? gen : null;
}

interface IProps extends Omit<ComponentProps<"div">, "children"> {
  /** 右端「当前共 N 条结果」的 N。列表还没取到数时不传，那句就只剩「单选筛选」 */
  total?: number | null;
}

/**
 * 列表页顶部的世代筛选行。选中的世代放在地址栏的 gen 参数里，
 * 刷新和分享链接都还在，和分页的 page 参数共用一套读写方式。
 *
 * 首次进入（地址栏没有 gen）九个都不选中，列表展示全量 —— 真实数据九个世代都有，
 * 没必要像 prototype 那样默认落在某一代上。
 *
 * 用到 useSearchParams，静态预渲染的页面要由调用方套一层 Suspense
 * （和 PaginationList 一样，列表页目前是 force-dynamic，不受这条约束）。
 */
export function GenFilter(props: Readonly<IProps>) {
  const { total, className, ...rest } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 地址栏没有 gen、或者是个不认识的值，就一个都不选中
  const current = readGen(searchParams.get("gen"));

  /** 点某一代之后该去的地址。其余 query 原样带着走，只换 gen 和 page */
  function hrefOf(gen: number): string {
    const next = new URLSearchParams(searchParams);

    // 再点一次当前选中项 = 取消筛选
    if (gen === current) {
      next.delete("gen");
    } else {
      next.set("gen", String(gen));
    }

    // 换了筛选条件，原来的页码多半越界，回第一页。page 缺省就是第一页，直接删掉
    next.delete("page");

    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <Card
      data-slot="gen-filter"
      className={cn("flex flex-wrap items-center gap-3 px-5 py-4", className)}
      {...rest}
    >
      <span className="mr-1 text-[13px] font-semibold text-foreground">世代筛选</span>

      <div className="flex flex-wrap items-center gap-2.5">
        {GENS.map((gen) => (
          <GenChip
            key={gen}
            selected={gen === current}
            onClick={() => router.push(hrefOf(gen))}
          >{`Gen ${gen}`}</GenChip>
        ))}
      </div>

      <span className="ml-auto text-xs text-muted-foreground">
        {typeof total === "number" ? `单选筛选 · 当前共 ${total} 条结果` : "单选筛选"}
      </span>
    </Card>
  );
}
