"use client";

import { useSuspenseQuery } from "@apollo/client/react";

import { Button } from "@/components/ui/button";
import { GET_POKEMON } from "@/graphql/apollo/query";

export default function Home() {
  const { data } = useSuspenseQuery(GET_POKEMON, {
    variables: { id: "1" },
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {data.pokemon?.name}
      <Button size="lg">Pokemon</Button>
    </div>
  );
}
