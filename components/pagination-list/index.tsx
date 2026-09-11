"use client";

import { cn } from "cn";
import { usePathname, useSearchParams } from "next/navigation";
import { ComponentProps, type PropsWithChildren } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PAGINATION } from "@/graphql/apollo/fragment";
import type { DocumentType } from "@/graphql/generated";

/**
 * 这个 fragment 在查询里带 @unmask，所以父级拿到的就是完整数据，
 * 不用 useFragment 解 —— PaginationMeta 没有 id，进不了规范化缓存，
 * useFragment 也读不出来
 */
type PaginationMeta = DocumentType<typeof PAGINATION>;

/**
 * 算出页码栏里从左到右摆什么。
 *
 * 页数多的时候首末页固定露出来，中间跟着当前页滑动，断开处补省略号。
 * 当前页贴着两端时把另一侧多补两个，免得栏子一会儿长一会儿短。
 */
function buildSlots(page: number, totalPages: number, maxSlots: number): number[] {
  const slots = Math.floor(Math.max(maxSlots, 5) / 2);

  const fillArray = new Array(slots - 1).fill(null);
  const wanted = new Set([
    1,
    totalPages,
    page,
    ...fillArray.map((_, i) => page + (i + 1)).filter((p) => p <= totalPages),
    ...fillArray.map((_, i) => page - (i + 1)).filter((p) => p >= 1),
  ]);

  new Array(slots * 2 + 1 - wanted.size).fill(null).forEach((_, i) => {
    wanted.add(page + (page <= slots + 1 ? i + 1 + (slots - 1) : -(i + 1 + (slots - 1))));
  });

  return [...wanted].sort((a, b) => a - b);
}

interface IProps extends PropsWithChildren, ComponentProps<"div"> {
  maxSlots?: number;
  pagination: PaginationMeta;
}

export function PaginationList(props: Readonly<IProps>) {
  const { children, className, pagination, maxSlots = 5 } = props;
  const { page, total, totalPages, hasNext, hasPrev } = pagination;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 其余 query 原样带着走，只有 page 是这里换的。前缀拼一次，
  // 后面每个页码接个数字就完事
  const rest = new URLSearchParams(searchParams);
  rest.delete("page");

  const pageHrefPrefix = `${pathname}?${rest.toString()}&page=`;

  return (
    <div className={cn("flex flex-col gap-4 py-4", className)}>
      {children}

      <div className="flex items-center justify-end gap-4">
        {totalPages > 1 && (
          <Pagination className="m-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="上一页"
                  href={`${pageHrefPrefix}${page - 1}`}
                  aria-disabled={!hasPrev}
                  tabIndex={hasPrev ? undefined : -1}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                />
              </PaginationItem>

              {buildSlots(page, totalPages, maxSlots).map((slot, index, arr) => {
                if (index === 1 || index === arr.length - 2) {
                  if (slot - arr[0] === 1 || totalPages - slot === 1) {
                    return (
                      <PaginationItem key={slot}>
                        <PaginationLink href={`${pageHrefPrefix}${slot}`} isActive={slot === page}>
                          {slot}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={`slot-${slot}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                } else {
                  return (
                    <PaginationItem key={slot}>
                      <PaginationLink href={`${pageHrefPrefix}${slot}`} isActive={slot === page}>
                        {slot}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
              })}

              <PaginationItem>
                <PaginationNext
                  text="下一页"
                  href={`${pageHrefPrefix}${page + 1}`}
                  aria-disabled={!hasNext}
                  tabIndex={hasNext ? undefined : -1}
                  className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <div className="text-center text-sm text-muted-foreground">
          第 {page} / {totalPages} 页，共 {total} 条
        </div>
      </div>
    </div>
  );
}
