import { PropsWithChildren } from "react";

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

interface IProps extends PropsWithChildren {
  pagination: PaginationMeta;
}

export function PaginationList(props: Readonly<IProps>) {
  const { children, pagination } = props;

  console.log(pagination);

  return (
    <div className="">
      <div>{children}</div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
