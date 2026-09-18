import type { Metadata } from "next";
import { Suspense } from "react";

import { ItemList, ItemListSkeleton } from "@/app/item/component/item-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "道具列表",
};

/**
 * 列表读地址栏里的 gen 和 page，读的那一层要有 Suspense 边界兜着，
 * 边界只能套在页面这一层 —— 壳在列表里面，盖不住它
 */
export default function ItemPage() {
  return (
    <main data-slot="item-page" className="px-6 py-8">
      <Suspense fallback={<ItemListSkeleton />}>
        <ItemList />
      </Suspense>
    </main>
  );
}
