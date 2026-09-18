import { cn } from "cn";
import type { ComponentProps } from "react";

import { versionColorVar, versionInkVar } from "./token";

interface IProps extends ComponentProps<"span"> {
  /** 库里的 version.slug，例如 "sword"。底色按它取 --color-version-sword */
  slug: string;
}

/** 版本色块。浅底版本（黄、白、珍珠等）自动换成深色字，见 versionInkVar */
export function VerBadge(props: Readonly<IProps>) {
  const { slug, className, style, children, ...rest } = props;

  return (
    <span
      data-slot="ver-badge"
      data-version={slug}
      className={cn(
        "inline-flex h-5 min-w-6 items-center justify-center rounded-[6px] px-[0.3rem] text-[10px] leading-none font-bold tracking-[0.02em]",
        className,
      )}
      style={{ background: versionColorVar(slug), color: versionInkVar(slug), ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
