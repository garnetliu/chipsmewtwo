"use client";

import { useSuspenseQuery } from "@apollo/client/react";

import { PaginationList } from "@/components/pagination-list";
import { GET_POKEMON_LIST } from "@/graphql/apollo/query";

export function PokemonList() {
  const { data } = useSuspenseQuery(GET_POKEMON_LIST, { variables: { limit: 50, offset: 0 } });

  const pokemonList = data.pokemonList;

  if (!pokemonList?.data || !pokemonList?.pagination) {
    return <div>没找到数据。。。</div>;
  }

  return (
    <PaginationList pagination={pokemonList.pagination}>
      <div>
        {pokemonList.data.map((pokemon) => (
          <div key={pokemon.id}>{pokemon.name}</div>
        ))}
      </div>
    </PaginationList>
  );
}
