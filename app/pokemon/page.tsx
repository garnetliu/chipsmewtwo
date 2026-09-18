import type { Metadata } from "next";
import { Suspense } from "react";

import { PokemonList, PokemonListSkeleton } from "@/app/pokemon/component/pokemon-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "精灵列表",
};

export default function PokemonPage() {
  return (
    <main className="px-6 py-8">
      {/* 列表自己读地址栏的 gen / page，边界得套在它外面 */}
      <Suspense fallback={<PokemonListSkeleton />}>
        <PokemonList />
      </Suspense>
    </main>
  );
}
