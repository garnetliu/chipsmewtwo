"use client";

import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";

interface IProps {
  testId: string;
  label: string;
  value: number;
  max: number;
  /** 单项没超但总和超了 —— 这时六项一起标红，用户才知道该匀哪一格 */
  invalid?: boolean;
  onChange: (value: number) => void;
}

/** IV / EV 的一行。三列是「名字 / 输入框 / 上限」，十二行对齐成一张表 */
export function StatNumberField(props: Readonly<IProps>) {
  const { testId, label, value, max, invalid, onChange } = props;

  return (
    <div className="grid grid-cols-[4rem_1fr_3.5rem] items-center gap-2">
      <Label htmlFor={testId} className="text-xs text-muted-foreground">
        {label}
      </Label>

      <NumberField
        id={testId}
        value={value}
        min={0}
        max={max}
        // 清空输入框时 Base UI 给的是 null，当 0 处理，不要把 NaN 写回存档
        onValueChange={(next) => onChange(next ?? 0)}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput
            data-testid={testId}
            aria-label={label}
            aria-invalid={invalid || undefined}
          />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>

      <span className="font-mono text-xs text-muted-foreground">/ {max}</span>
    </div>
  );
}
