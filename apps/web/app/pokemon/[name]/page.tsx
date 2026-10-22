"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import Image from "next/image";
import { use } from "react";

import { GET_POKEMON } from "@pkcw/graphql/apollo/query";

interface Props {
  params: Promise<{ name: string }>;
}

export default function PokemonDetailPage({ params }: Props) {
  const { name } = use(params);

  const { data } = useSuspenseQuery(GET_POKEMON, {
    variables: { id: name },
  });
  return (
    <div>
      {data.pokemon?.defaultForm?.fullImageUrl && (
        <Image
          src={data.pokemon.defaultForm.fullImageUrl}
          alt={`Pokemon ${data.pokemon.name}`}
          width={120}
          height={120}
          unoptimized
        />
      )}
      <span>{data.pokemon?.name ?? data.pokemon?.slug}</span>
    </div>
  );
}
