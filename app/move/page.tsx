import type { Metadata } from "next";
import { Suspense } from "react";

import { MoveList, MoveListSkeleton } from "@/app/move/component/move-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "招式列表",
};

export default function MovePage() {
  return (
    <main className="px-6 py-8">
      {/* 列表组件读地址栏的 gen 和 page，边界得套在它外面 */}
      <Suspense fallback={<MoveListSkeleton />}>
        <MoveList />
      </Suspense>
    </main>
  );
}
