import { cn } from "cn";
import type { ComponentProps } from "react";

interface IProps extends ComponentProps<"button"> {
  /** 选中态：实心主色、白字、主色投影 */
  selected?: boolean;
}

/** 筛选 chip。世代筛选用，详情页的形态列表也用它的静态形 */
export function GenChip(props: Readonly<IProps>) {
  const { selected = false, className, type = "button", ...rest } = props;

  return (
    <button
      data-slot="gen-chip"
      data-selected={selected || undefined}
      aria-pressed={selected}
      type={type}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center rounded-full border border-border bg-card px-[0.85rem] text-[13px] font-semibold text-foreground select-none",
        "transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-selected:border-primary data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-(--shadow-pokedex-chip)",
        className,
      )}
      {...rest}
    />
  );
}
