"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";

import { findNature, natureLabel, NATURES } from "@/lib/stats";

interface IProps {
  /** 当前选中的性格 id */
  value: string;
  onValueChange: (id: string) => void;
  /** 关联 label 的 id */
  id?: string;
}

/**
 * 性格下拉。25 种全列 —— 游戏里就是 25 种，prototype 只写 7 种是演示简化。
 *
 * 每项写成「固执（攻击↑ 特攻↓）」，无修正的写「认真（无修正）」，
 * 选中之后触发器上显示的是同一行字
 */
export function NatureSelect(props: Readonly<IProps>) {
  const { value, onValueChange, id } = props;

  // Select 用 items 把值映射回触发器上的文字，列表和触发器就不会各写一份拼接逻辑
  const items = useMemo(
    () => NATURES.map((nature) => ({ value: nature.id, label: natureLabel(nature) })),
    [],
  );

  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(typeof next === "string" ? next : value)}
    >
      <Select.Trigger
        id={id}
        data-slot="nature-select-trigger"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-[13px] outline-none select-none hover:bg-muted focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20"
      >
        <Select.Value className="truncate" />
        <Select.Icon className="shrink-0 text-muted-foreground">
          <ChevronsUpDown className="size-4" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner className="z-50 outline-none select-none" sideOffset={4}>
          <Select.Popup
            data-slot="nature-select-popup"
            className="max-h-[min(20rem,var(--available-height))] w-(--anchor-width) overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-(--shadow-pokedex-lifted) outline-none"
          >
            {NATURES.map((nature) => (
              <Select.Item
                key={nature.id}
                value={nature.id}
                className="grid cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 px-2.5 py-1.5 text-[13px] outline-none select-none data-highlighted:bg-muted"
              >
                <Select.ItemIndicator className="col-start-1">
                  <Check className="size-3.5 text-primary" />
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">
                  {natureLabel(findNature(nature.id))}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
