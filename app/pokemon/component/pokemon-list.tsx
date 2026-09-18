"use client";

import { useQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";

import { POKEMON_CARD_HEIGHT, PokemonCard } from "@/app/pokemon/component/pokemon-card";
import { BLANK } from "@/components/pokedex/blank";
import { readGen } from "@/components/pokedex/gen-filter";
import { ListShell, ListSkeleton } from "@/components/pokedex/list-shell";
import { GET_POKEMON_LIST } from "@/graphql/apollo/query";

/** 一页多少只。卡片是三列网格，取 3 的倍数，最后一行才不会缺口 */
const PAGE_SIZE = 24;

/** 三列网格的排布。骨架和真实列表共用，两者之间换不掉行 */
const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

/** 加载态铺的卡片位。页面首屏的 Suspense fallback 也用它 */
export function PokemonListSkeleton() {
  return <ListSkeleton count={PAGE_SIZE} className={GRID} itemClassName={POKEMON_CARD_HEIGHT} />;
}

export function PokemonList() {
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // gen 的读法和写它的 GenFilter 共用一个 readGen，认不出来的值一律不筛
  const generation = readGen(searchParams.get("gen"));

  const { data, loading, refetch } = useQuery(GET_POKEMON_LIST, {
    variables: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, generation },
  });

  return (
    <ListShell
      title="精灵列表"
      description="按全国编号浏览 Pokémon 条目，查看各精灵在具体游戏版本中的可用性。"
      stats={[
        { value: data?.pokemonList?.pagination?.total ?? BLANK, label: "当前条目" },
        { value: generation ? `Gen ${generation}` : "全部", label: "当前世代" },
        { value: "编号序", label: "排序方式" },
      ]}
      genFilter
      loading={loading}
      result={data?.pokemonList}
      skeleton={<PokemonListSkeleton />}
      retry={() => refetch()}
      maxSlots={7}
    >
      {/* 这里只读得到 id —— 其余字段是卡片自己声明的，masking 遮住了 */}
      <div className={GRID}>
        {data?.pokemonList?.data?.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>
    </ListShell>
  );
}
