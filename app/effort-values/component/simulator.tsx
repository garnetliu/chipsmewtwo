"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/pokedex/card";

import { PokemonPicker } from "./pokemon-picker";
import { DEFAULT_FORM, type ISimForm, StatsPanel } from "./stats-panel";

/**
 * 努力值模拟器的主体，两态：
 *
 * 没选人时是左右两栏 —— 左边选择器、右边虚线空态卡；选中之后换成参数卡加结果卡。
 * 选中与否只看 slug，它是这一页唯一的「我在哪一态」的依据。
 *
 * 等级、性格、个体值、努力值不跟着换人清空：换一只接着比对是常见用法，
 * prototype 也是这样（那个 sim 对象只有 pokemon 被改写）
 */
export function EffortValueSimulator() {
  const [slug, setSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ISimForm>(DEFAULT_FORM);

  if (slug != null) {
    return (
      <StatsPanel
        slug={slug}
        form={form}
        onFormChange={setForm}
        onRepick={() => setSlug(null)}
        onReset={() => setForm(DEFAULT_FORM)}
      />
    );
  }

  return (
    <div data-slot="ev-picker" className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Card className="p-5">
        <div className="mb-3 text-[15px] font-bold">选择 Pokémon</div>
        <PokemonPicker value={slug} onValueChange={setSlug} />
      </Card>

      <Card
        data-slot="ev-empty"
        className="flex flex-col items-center justify-center border-dashed bg-background p-10 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-warning/20">
          {/* 图标本身就是那点黄，两个模式都用 --warning；warning-foreground 是深色字色，
              放在这里会把警示三角压成近黑 */}
          <TriangleAlert aria-hidden="true" className="size-[22px] text-warning" />
        </div>

        <div className="mt-4 text-[14px] font-semibold">请选择 Pokémon 后开始计算</div>
        <div className="mt-1.5 text-[12px] text-muted-foreground">
          从左侧选择一只 Pokémon，即可输入参数并查看计算结果
        </div>
      </Card>
    </div>
  );
}
