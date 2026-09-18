import type { Metadata } from "next";

import { AbilityOwnerCard } from "@/app/ability/component/ability-owner-card";
import { Card } from "@/components/pokedex/card";
import { CardEmpty } from "@/components/pokedex/card-empty";
import { DetailDescription, DetailShell } from "@/components/pokedex/detail-shell";
import { loadDetail } from "@/components/pokedex/load-detail";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { GET_ABILITY } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

type Ability = NonNullable<DocumentType<typeof GET_ABILITY>["abilityBySlug"]>;

/**
 * 取一条特性。四个详情页共用 loadDetail，「查不到 / 故障」的分辨口径只有那一处实现。
 *
 * 页面和 generateMetadata 各调一次，一次请求共用一个 client，第二次命中它的缓存
 */
function loadAbility(slug: string): Promise<{ data: Ability | null } | null> {
  return loadDetail(GET_ABILITY, { slug }, (data) => data.abilityBySlug);
}

export async function generateMetadata(props: PageProps<"/ability/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const ability = (await loadAbility(name))?.data;

  if (!ability) return { title: "未找到该特性" };

  return {
    title: ability.name ?? ability.slug,
    description: ability.effect ?? undefined,
  };
}

export default async function AbilityDetailPage(props: PageProps<"/ability/[name]">) {
  const { name } = await props.params;

  const result = await loadAbility(name);
  const ability = result?.data ?? null;

  return (
    <main className="px-6 py-8">
      {/* 壳只看 data 是不是 null，给它 id 就够了 —— 整条再序列化一遍到客户端是白搭 */}
      <DetailShell
        kind="ability"
        title={ability?.name ?? ability?.slug}
        result={result && { data: ability?.id ?? null }}
      >
        {ability && (
          <>
            <Card data-slot="ability-hero" className="mb-5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <MiniBadge tone="success">特性</MiniBadge>

                {ability.introducedGeneration != null && (
                  <MiniBadge tone="muted">{`第 ${ability.introducedGeneration} 世代引入`}</MiniBadge>
                )}
              </div>

              <h1 className="mt-2 text-[26px] font-bold tracking-tight">
                {ability.name ?? ability.slug}
              </h1>

              {/* 说明为空时由 DetailDescription 兜底，那句话只在它里面实现一次 */}
              <DetailDescription text={ability.effect} className="mt-1.5" />

              <VersionBadges versions={ability.versions} label="登场版本" className="mt-3" />
            </Card>

            <Card data-slot="ability-owners" className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] font-bold">拥有该特性的 Pokémon</span>
                <span className="text-[11px] text-muted-foreground">点击条目进入精灵详情</span>
              </div>

              {ability.pokemon.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {ability.pokemon.map((pokemon) => (
                    <AbilityOwnerCard key={pokemon.id} pokemon={pokemon} />
                  ))}
                </div>
              ) : (
                <CardEmpty>暂无宝可梦拥有该特性</CardEmpty>
              )}
            </Card>
          </>
        )}
      </DetailShell>
    </main>
  );
}
