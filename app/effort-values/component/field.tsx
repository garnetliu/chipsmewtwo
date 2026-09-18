"use client";

import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

/** 表单标签。12px 粗体，照 prototype 的 .field-label */
export function FieldLabel(props: Readonly<ComponentProps<"label">>) {
  const { className, ...rest } = props;

  return (
    <label
      data-slot="field-label"
      className={cn("mb-1.5 block text-[12px] font-semibold", className)}
      {...rest}
    />
  );
}

interface INumberFieldProps extends Omit<ComponentProps<"input">, "onChange" | "type"> {
  /** 输入框里的原文。超范围的值原样留着，不截断 —— 错了要让用户看见自己输了什么 */
  value: string;
  /** 只回传原文，怎么解析交给调用方 */
  onValueChange: (value: string) => void;
  /** 这一项当前是不是报错状态 */
  invalid?: boolean;
}

/**
 * 数字输入框。校验不拦输入：超范围照收，只是边框和字变红，
 * 错误文案由调用方用 FieldError 摆在下面
 */
export function NumberField(props: Readonly<INumberFieldProps>) {
  const { value, onValueChange, invalid = false, className, ...rest } = props;

  return (
    <input
      data-slot="number-field"
      type="number"
      inputMode="numeric"
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] tabular-nums outline-none",
        "focus:border-primary focus:ring-3 focus:ring-ring/20",
        invalid &&
          "border-destructive text-destructive focus:border-destructive focus:ring-destructive/20",
        className,
      )}
      {...rest}
    />
  );
}

interface IFieldErrorProps extends Omit<ComponentProps<"p">, "children"> {
  /** 没错就传 null，这一行连同它占的位置一起消失 */
  children?: ReactNode;
}

/** 输入框下方的红字。11px，照 prototype 的 .field-err */
export function FieldError(props: Readonly<IFieldErrorProps>) {
  const { children, className, ...rest } = props;

  if (!children) return null;

  return (
    <p
      data-slot="field-error"
      className={cn("mt-[0.3rem] text-[11px] text-destructive", className)}
      {...rest}
    >
      {children}
    </p>
  );
}
