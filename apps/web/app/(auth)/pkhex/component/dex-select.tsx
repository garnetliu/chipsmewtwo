"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

/** 一次最多铺多少条。招式 920 条、道具 2400 条，全渲染出来光 DOM 就卡住了 */
const MAX_VISIBLE = 100;

interface IProps {
  testId: string;
  value: number;
  /**
   * 下标即**游戏内部编号**的名字表，来自 session.stringTables。
   *
   * 招式/道具/性格/球一律走这张表，不许拿编号去查 Prisma ——
   * 库里 Move.id / Item.id 是 PokeAPI 的自增 id，跟游戏内部编号对不上，
   * 接错了不会报错，只会静默显示另一个招式的名字
   */
  names: readonly string[];
  /** 本作的编号上限。第九世代有的招式第六世代没有 */
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: number) => void;
}

/** 「编号 → 名字」这类字段的通用下拉。能搜，因为这些表动辄上千条 */
export function DexSelect(props: Readonly<IProps>) {
  const { testId, value, names, max, disabled, placeholder, onChange } = props;

  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const last = Math.min(names.length - 1, max ?? names.length - 1);
    const keyword = query.trim().toLowerCase();
    const found: { id: number; label: string }[] = [];

    for (let id = 0; id <= last && found.length < MAX_VISIBLE; id++) {
      const label = names[id];
      if (!label) continue;
      // 名字能搜，编号也能搜 —— 对着 PKHeX 抄数据的人手里往往只有编号
      if (keyword && !label.toLowerCase().includes(keyword) && !String(id).startsWith(keyword)) {
        continue;
      }
      found.push({ id, label });
    }

    return found;
  }, [names, max, query]);

  return (
    <Combobox
      value={value}
      disabled={disabled}
      // 自带的过滤只认已渲染的那批，这里是自己截断的窗口，所以关掉它自己来
      filter={null}
      onValueChange={(next) => onChange(Number(next))}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <ComboboxTrigger
        data-testid={testId}
        render={
          <Button variant="outline" size="sm" className="w-full justify-between font-normal" />
        }
      >
        <ComboboxValue>
          {(current: number | null) => (
            <span className="truncate">{names[current ?? 0] ?? `#${current}`}</span>
          )}
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent>
        <ComboboxInput placeholder={placeholder ?? "输入名字或编号"} showTrigger={false} />
        <ComboboxEmpty>没有匹配的条目</ComboboxEmpty>
        <ComboboxList>
          {matches.map((item) => (
            <ComboboxItem key={item.id} value={item.id}>
              <span className="truncate">{item.label}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{item.id}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
