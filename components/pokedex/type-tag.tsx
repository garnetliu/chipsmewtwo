import { cn } from "cn";
import type { ComponentProps } from "react";

import { typeColorVar } from "./token";

interface IProps extends ComponentProps<"span"> {
  /** 库里的 type.slug，例如 "fire"。底色按它取 --color-type-fire */
  slug: string;
}

/** 属性胶囊。底色是属性色，字一律白色 —— 和 prototype 一致 */
export function TypeTag(props: Readonly<IProps>) {
  const { slug, className, style, children, ...rest } = props;

  return (
    <span
      data-slot="type-tag"
      data-type={slug}
      className={cn(
        "inline-flex h-5.5 items-center rounded-full px-[0.55rem] text-[11px] leading-none font-semibold text-white",
        className,
      )}
      style={{ background: typeColorVar(slug), ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
