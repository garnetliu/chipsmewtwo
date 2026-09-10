"use client";

import { useSuspenseQuery } from "@apollo/client/react";

import { PokemonCard } from "@/app/pokemon/component/pokemon-card";
import { PaginationList } from "@/components/pagination-list";
import { GET_POKEMON_LIST } from "@/graphql/apollo/query";

export function PokemonList() {
  const { data } = useSuspenseQuery(GET_POKEMON_LIST, { variables: { limit: 50, offset: 0 } });

  const pokemonList = data.pokemonList;

  if (!pokemonList?.data || !pokemonList?.pagination) {
    return <div>没找到数据。。。</div>;
  }

  console.log(pokemonList);

  return (
    <PaginationList pagination={pokemonList.pagination}>
      <div className="mx-auto w-7/8">
        {/* 这里只读得到 id —— 其余字段是卡片自己声明的，masking 遮住了 */}
        {pokemonList.data.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>
    </PaginationList>
  );
}
