import { cn } from "cn";
import type { ComponentProps } from "react";

import { VerBadge } from "@/components/pokedex/ver-badge";
import { VERSION_BADGE } from "@/graphql/apollo/fragment";
import type { DocumentType } from "@/graphql/generated";

/** 查询里 spread 的时候一律带 @unmask，拿到的就是完整的三个字段 */
type VersionBadge = DocumentType<typeof VERSION_BADGE>;

interface IProps extends Omit<ComponentProps<"div">, "children"> {
  /** 这一条的登场版本，按发售顺序。空数组时整行不出 */
  versions: readonly VersionBadge[];
  /** 前面那几个字，一般是「登场版本」。表格单元格里不要标签，不传就只有色块 */
  label?: string;
  /**
   * 最多摆几块，多出来的收成「+N」。
   *
   * 截断口径：**列表页截断、详情页全摆**。库里一条的登场版本是全量（妙蛙种子 41 个、
   * 飞叶快刀 53 个），列表里一行全摆会把整张表撑到几千 px，所以列表调用方按自己
   * 那一格实测摆得下几块就传几块；详情页是「看全部」的地方，不传这个参数
   */
  limit?: number;
  /**
   * 两档尺寸，照 prototype：
   * 列表卡是 gap-1 + 10px 标签，详情 hero 和表格是 gap-1.5 + 11px 标签
   */
  size?: "card" | "detail";
}

/**
 * 「登场版本」那一行。四个域的列表卡、表格单元格和详情 hero 共用这一处实现 ——
 * 标签有无、间距、截断与否全由 props 决定，各页面不再自己拼一遍。
 */
export function VersionBadges(props: Readonly<IProps>) {
  const { versions, label, limit, size = "detail", className, ...rest } = props;

  if (versions.length === 0) return null;

  const shown = limit == null ? versions : versions.slice(0, limit);
  const hidden = versions.length - shown.length;

  return (
    <div
      data-slot="version-badges"
      className={cn(
        "flex items-center",
        size === "card" ? "gap-1" : "gap-1.5",
        // 截断的那一档不换行：摆不下的直接裁掉，同一行的卡片高度才对得齐
        limit == null ? "flex-wrap" : "overflow-hidden",
        className,
      )}
      {...rest}
    >
      {label != null && (
        <span
          className={cn(
            "mr-1 shrink-0 text-muted-foreground",
            size === "card" ? "text-[10px]" : "text-[11px]",
          )}
        >
          {label}
        </span>
      )}

      {shown.map((version) => (
        <VerBadge key={version.id} slug={version.slug} className="shrink-0">
          {/* 少数版本没有中文名，回退规则给不出译名时退到 slug，不留空块 */}
          {version.name ?? version.slug}
        </VerBadge>
      ))}

      {hidden > 0 && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{`+${hidden}`}</span>
      )}
    </div>
  );
}
