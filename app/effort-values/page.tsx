import type { Metadata } from "next";

import { EffortValueSimulator } from "@/app/effort-values/component/simulator";

export const metadata: Metadata = {
  title: "努力值模拟器",
  description: "输入等级、性格、个体值与努力值，实时计算六项能力值。",
};

export default function EffortValuesPage() {
  return (
    <main className="px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight">努力值模拟器</h1>

            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              独立工具
            </span>
          </div>

          <p className="mt-1.5 text-[13px] text-muted-foreground">
            选择 Pokémon 后输入等级、性格、个体值与努力值，系统实时计算六项能力值。
          </p>
        </div>
      </header>

      <EffortValueSimulator />
    </main>
  );
}
