import type { Metadata } from "next";
import { Suspense } from "react";

import { AbilityList, AbilityListSkeleton } from "@/app/ability/component/ability-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特性列表",
};

export default function AbilityPage() {
  return (
    <main className="px-6 py-8">
      {/* 列表组件读地址栏的 page，边界得套在它外面 */}
      <Suspense fallback={<AbilityListSkeleton />}>
        <AbilityList />
      </Suspense>
    </main>
  );
}
