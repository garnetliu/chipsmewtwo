import { cn } from "cn";
import type { ComponentProps } from "react";

interface IProps extends ComponentProps<"span"> {
  /**
   * primary 主色淡底（Gen N、携带道具）、muted 灰底（第 N 世代引入）、
   * success 绿底（分类名、「特性」这类标签）
   */
  tone?: "primary" | "muted" | "success";
}

/**
 * prototype 的 `.badge-mini`：10px 粗体小标签，内边距 .15rem .45rem。
 *
 * 列表卡、详情 hero、搜索结果行上的小徽章都走它。要别的底色（搜索结果按类型取色）
 * 就把 background / color 从 style 传进来，内边距和字号还是这一份
 */
export function MiniBadge(props: Readonly<IProps>) {
  const { tone = "primary", className, ...rest } = props;

  return (
    <span
      data-slot="mini-badge"
      data-tone={tone}
      className={cn(
        "inline-flex items-center rounded-sm px-[0.45rem] py-[0.15rem] text-[10px] font-semibold",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "muted" && "bg-muted text-foreground",
        // 浅色下用深一档的字色才够对比度，暗色下底也深，回到原色
        tone === "success" && "bg-success/15 text-success-foreground dark:text-success",
        className,
      )}
      {...rest}
    />
  );
}
