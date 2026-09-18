import type { Metadata } from "next";

import { DetailShell } from "@/components/pokedex/detail-shell";
import { loadDetail } from "@/components/pokedex/load-detail";
import { GET_POKEMON } from "@/graphql/apollo/query";

import { PokemonAbilities } from "./component/pokemon-abilities";
import { PokemonForms } from "./component/pokemon-forms";
import { PokemonHero } from "./component/pokemon-hero";
import { PokemonVersions } from "./component/pokemon-versions";
import type { Pokemon } from "./type";

/**
 * 取这一只。四个详情页共用 loadDetail，「查不到 / 故障」的分辨口径只有那一处实现。
 *
 * 页面和 generateMetadata 各调一次，registerApolloClient 一次请求一个 client，
 * 第二次直接命中它的缓存，不会真的发两趟
 */
function loadPokemon(slug: string): Promise<{ data: Pokemon | null } | null> {
  return loadDetail(GET_POKEMON, { slug }, (data) => data.pokemonBySlug);
}

export async function generateMetadata(props: PageProps<"/pokemon/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const pokemon = (await loadPokemon(name))?.data;

  if (!pokemon) return { title: "未找到该 Pokémon" };

  return {
    title: pokemon.name ?? pokemon.slug,
    description: pokemon.defaultForm?.descriptions[0]?.text ?? pokemon.genus ?? undefined,
  };
}

export default async function PokemonDetailPage(props: PageProps<"/pokemon/[name]">) {
  const { name } = await props.params;

  const result = await loadPokemon(name);
  const pokemon = result?.data ?? null;

  return (
    <main className="px-6 py-8">
      {/* 壳只看 data 是不是 null，给它 id 就够了 —— 整条再序列化一遍到客户端是白搭 */}
      <DetailShell
        kind="pokemon"
        title={pokemon?.name ?? pokemon?.slug}
        result={result && { data: pokemon?.id ?? null }}
      >
        {pokemon && (
          <>
            <PokemonHero pokemon={pokemon} />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <PokemonForms pokemon={pokemon} />
              <PokemonAbilities abilities={pokemon.defaultForm?.abilities ?? []} />
            </div>

            <PokemonVersions versions={pokemon.versions} />
          </>
        )}
      </DetailShell>
    </main>
  );
}
