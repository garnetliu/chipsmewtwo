import type { Metadata } from "next";

import { ItemAvailability } from "@/app/item/[name]/component/item-availability";
import { Card } from "@/components/pokedex/card";
import { DetailDescription, DetailShell } from "@/components/pokedex/detail-shell";
import { loadDetail } from "@/components/pokedex/load-detail";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { GET_ITEM } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

type Item = NonNullable<DocumentType<typeof GET_ITEM>["itemBySlug"]>;

/**
 * 取这一条道具。四个详情页共用 loadDetail，「查不到 / 故障」的分辨口径只有那一处实现。
 *
 * 页面和 generateMetadata 各调一次，一次请求共用一个 client，第二次命中它的缓存
 */
function loadItem(slug: string): Promise<{ data: Item | null } | null> {
  return loadDetail(GET_ITEM, { slug }, (data) => data.itemBySlug);
}

export async function generateMetadata(props: PageProps<"/item/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const item = (await loadItem(name))?.data;

  if (!item) return { title: "未找到该道具" };

  return {
    title: item.name ?? item.slug,
    description: item.shortEffect ?? undefined,
  };
}

/** 道具详情。服务端取数、服务端渲染，禁用 JavaScript 也能看到正文 */
export default async function ItemDetailPage(props: PageProps<"/item/[name]">) {
  const { name } = await props.params;

  const result = await loadItem(name);
  const item = result?.data ?? null;

  return (
    <main data-slot="item-detail-page" className="px-6 py-8">
      {/* 壳只看 data 是不是 null，给它 id 就够了 —— 整条再序列化一遍到客户端是白搭 */}
      <DetailShell
        kind="item"
        title={item?.name ?? item?.slug}
        result={result && { data: item?.id ?? null }}
      >
        {item && (
          <>
            <Card data-slot="item-detail-hero" className="mb-5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <MiniBadge>携带道具</MiniBadge>

                {/* 世代是从说明的世代推的，推不出来的那批不出这个徽章 */}
                {item.introducedGeneration != null && (
                  <MiniBadge tone="muted">{`第 ${item.introducedGeneration} 世代引入`}</MiniBadge>
                )}
              </div>

              <h1 className="mt-2 text-[26px] font-bold tracking-tight">
                {item.name ?? item.slug}
              </h1>

              {/* 一句话说明库里只有英法两种语言，简中一列都没填，中文下看到的是英文原文 */}
              <DetailDescription text={item.shortEffect} className="mt-1.5" />

              <VersionBadges versions={item.versions} label="登场版本" className="mt-3" />
            </Card>

            {/* 数据源没收录这条道具的说明时可用性一行都排不出来，那就不出这张卡 */}
            {item.availability.length > 0 && <ItemAvailability rows={item.availability} />}
          </>
        )}
      </DetailShell>
    </main>
  );
}
