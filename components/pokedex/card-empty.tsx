import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * 卡片内部的空态：一行 13px 灰字，上下留白 2rem、居中。
 *
 * 和 ListShell 的空态卡不是一回事 —— 那是整页没有结果，这是一张卡里的某一段没有数据
 * （没有进化关系、没有收录特性、没有拥有者）。四处共用这一份
 */
export function CardEmpty(props: Readonly<ComponentProps<"div">>) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="card-empty"
      className={cn("py-8 text-center text-[13px] font-semibold text-muted-foreground", className)}
      {...rest}
    />
  );
}
