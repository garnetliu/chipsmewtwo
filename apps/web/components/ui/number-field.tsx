"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { cn } from "cn";
import { Minus, Plus } from "lucide-react";

/**
 * 数字输入。shadcn 的 base-vega 注册表里没有这一项（只有 input），
 * 但 Base UI 有 NumberField 原语 —— 照 tabs.tsx 的写法自己包一层。
 *
 * 比裸 input[type=number] 值的地方：自带 min/max 钳位、步进按钮、
 * 方向键与滚轮步进，IV/EV 这种有硬上限的字段不用自己写边界代码。
 *
 * 禁用态用 `data-disabled:` 而不是 `has-disabled:`，**这一条别改回去**：
 * Base UI 在值触底时会自动 disable 减号按钮、触顶时 disable 加号按钮，
 * `has-disabled:` 会因此命中，把整个 group（连同里面的 input）
 * pointer-events 干成 none —— 结果是 IV 满 31、EV 归 0 这种边界值上
 * 整个字段再也点不进去。Group 的 state 继承自 Root，字段自身被禁用时
 * 才会有 data-disabled，这才是我们要的语义。
 */
function NumberField({ className, ...props }: NumberFieldPrimitive.Root.Props) {
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      className={cn("inline-flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function NumberFieldGroup({ className, ...props }: NumberFieldPrimitive.Group.Props) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      className={cn(
        "inline-flex h-9 items-stretch rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function NumberFieldInput({ className, ...props }: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      className={cn(
        // 数字走等宽字体，一列 IV/EV 才对得齐；居中是因为位数会变
        "w-full min-w-0 bg-transparent text-center font-mono text-sm tabular-nums outline-none",
        className,
      )}
      {...props}
    />
  );
}

const stepperClass =
  "flex w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors select-none hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5";

function NumberFieldDecrement({ className, ...props }: NumberFieldPrimitive.Decrement.Props) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot="number-field-decrement"
      className={cn(stepperClass, "rounded-l-md border-r border-input", className)}
      {...props}
    >
      <Minus />
    </NumberFieldPrimitive.Decrement>
  );
}

function NumberFieldIncrement({ className, ...props }: NumberFieldPrimitive.Increment.Props) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot="number-field-increment"
      className={cn(stepperClass, "rounded-r-md border-l border-input", className)}
      {...props}
    >
      <Plus />
    </NumberFieldPrimitive.Increment>
  );
}

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
};
