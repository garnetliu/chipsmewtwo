import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * 资料表格。形态照 prototype 的 .data-table：表头浅灰底 12px，
 * 行 13px、上边框分隔。拆成几个小件是为了跟 shadcn 的 table 用法保持一致。
 *
 * 表自己套了一层横向滚动：列数固定（招式详情 7 列）而视口可以很窄，摆不下时
 * 让这张表自己横滚，不许它把整页顶出横向滚动条。包装收在这里，调用方不用各包各的
 */
export function DataTable(props: Readonly<ComponentProps<"table">>) {
  const { className, ...rest } = props;

  return (
    <div data-slot="data-table-scroll" className="w-full overflow-x-auto">
      <table
        data-slot="data-table"
        className={cn("w-full text-left text-[13px]", className)}
        {...rest}
      />
    </div>
  );
}

export function DataTableHeader(props: Readonly<ComponentProps<"thead">>) {
  const { className, ...rest } = props;

  return <thead data-slot="data-table-header" className={cn(className)} {...rest} />;
}

export function DataTableBody(props: Readonly<ComponentProps<"tbody">>) {
  const { className, ...rest } = props;

  return <tbody data-slot="data-table-body" className={cn(className)} {...rest} />;
}

export function DataTableRow(props: Readonly<ComponentProps<"tr">>) {
  const { className, ...rest } = props;

  return <tr data-slot="data-table-row" className={cn(className)} {...rest} />;
}

/** 表头单元格 */
export function DataTableHead(props: Readonly<ComponentProps<"th">>) {
  const { className, ...rest } = props;

  return (
    <th
      data-slot="data-table-head"
      className={cn(
        "bg-muted px-4 py-[0.65rem] text-[12px] font-semibold text-muted-foreground",
        className,
      )}
      {...rest}
    />
  );
}

/** 数据单元格 */
export function DataTableCell(props: Readonly<ComponentProps<"td">>) {
  const { className, ...rest } = props;

  return (
    <td
      data-slot="data-table-cell"
      className={cn("border-t border-border px-4 py-3", className)}
      {...rest}
    />
  );
}
