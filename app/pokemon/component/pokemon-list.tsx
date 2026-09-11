"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { useSearchParams } from "next/navigation";

import { PokemonCard } from "@/app/pokemon/component/pokemon-card";
import { PaginationList } from "@/components/pagination-list";
import { GET_POKEMON_LIST } from "@/graphql/apollo/query";

/** 一页多少只。分页栏改地址栏里的 page，这里换算成 offset */
const PAGE_SIZE = 20;

export function PokemonList() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data } = useSuspenseQuery(GET_POKEMON_LIST, {
    variables: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
  });

  const pokemonList = data.pokemonList;

  if (!pokemonList?.data || !pokemonList?.pagination) {
    return <div>没找到数据。。。</div>;
  }

  return (
    <PaginationList className="mx-auto w-7/8" maxSlots={7} pagination={pokemonList.pagination}>
      {/* 这里只读得到 id —— 其余字段是卡片自己声明的，masking 遮住了 */}
      <div className="flex flex-col gap-2">
        {pokemonList.data.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>
    </PaginationList>
  );
}
