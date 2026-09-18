import type { Metadata } from "next";

import { blankText } from "@/components/pokedex/blank";
import { Card } from "@/components/pokedex/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/pokedex/data-table";
import { DetailDescription, DetailShell } from "@/components/pokedex/detail-shell";
import { loadDetail } from "@/components/pokedex/load-detail";
import { MiniBadge } from "@/components/pokedex/mini-badge";
import { TypeTag } from "@/components/pokedex/type-tag";
import { VersionBadges } from "@/components/pokedex/version-badges";
import { GET_MOVE } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

type Move = NonNullable<DocumentType<typeof GET_MOVE>["moveBySlug"]>;

/** 一个版本组的数值。versionStats 里一行一组 */
type VersionStat = Move["versionStats"][number];

/**
 * 取这一条招式。四个详情页共用 loadDetail，「查不到 / 故障」的分辨口径只有那一处实现。
 *
 * 页面和 generateMetadata 各调一次，一次请求共用一个 client，第二次命中它的缓存
 */
function loadMove(slug: string): Promise<{ data: Move | null } | null> {
  return loadDetail(GET_MOVE, { slug }, (data) => data.moveBySlug);
}

export async function generateMetadata(props: PageProps<"/move/[name]">): Promise<Metadata> {
  const { name } = await props.params;
  const move = (await loadMove(name))?.data;

  if (!move) return { title: "未找到该招式" };

  return {
    title: move.name ?? move.slug,
    description: move.effect ?? undefined,
  };
}

/** 分类的中文。库里只有枚举值，译名表没有，中文归前端 */
const CATEGORY_TEXT: Record<VersionStat["category"], string> = {
  PHYSICAL: "物理",
  SPECIAL: "特殊",
  STATUS: "变化",
};

export default async function MoveDetailPage(props: PageProps<"/move/[name]">) {
  const { name } = await props.params;

  const result = await loadMove(name);
  const move = result?.data ?? null;

  /**
   * hero 上的属性和分类。招式类型上没有「当前属性」这种字段 —— 属性和分类跟着世代走，
   * 取 versionStats 最后一行，也就是最新那个版本组的值
   */
  const latest = move?.versionStats.at(-1) ?? null;

  return (
    <main className="px-6 py-8">
      {/* 壳只看 data 是不是 null，给它 id 就够了 —— 整条再序列化一遍到客户端是白搭 */}
      <DetailShell
        kind="move"
        title={move?.name ?? move?.slug}
        result={result && { data: move?.id ?? null }}
      >
        {move && (
          <>
            <Card data-slot="move-hero" className="mb-5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                {latest && (
                  <>
                    <TypeTag slug={latest.type.slug}>
                      {latest.type.name ?? latest.type.slug}
                    </TypeTag>

                    <MiniBadge tone="muted">{`${CATEGORY_TEXT[latest.category]}招式`}</MiniBadge>
                  </>
                )}
              </div>

              <h1 className="mt-2 text-[26px] font-bold tracking-tight">
                {move.name ?? move.slug}
              </h1>

              <DetailDescription className="mt-1.5" text={move.effect} />

              <VersionBadges versions={move.versions} label="登场版本" className="mt-3" />
            </Card>

            <Card data-slot="move-version-stats" className="p-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-[15px] font-bold">按游戏版本组织的招式资料</span>
                <span className="text-[11px] text-muted-foreground">
                  属性 / 分类 / 威力 / 命中 / PP
                </span>
              </div>

              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>游戏版本</DataTableHead>
                    <DataTableHead>属性</DataTableHead>
                    <DataTableHead>分类</DataTableHead>
                    <DataTableHead>威力</DataTableHead>
                    <DataTableHead>命中</DataTableHead>
                    <DataTableHead>PP</DataTableHead>
                    <DataTableHead className="w-[34%]">版本说明</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>

                {/* 一行一个版本组。versionStats 没有 id，key 取这一组的头一个版本 */}
                <DataTableBody>
                  {move.versionStats.map((stat) => (
                    <DataTableRow key={stat.versions[0]?.slug ?? stat.type.slug}>
                      <DataTableCell>
                        <VersionBadges versions={stat.versions} />
                      </DataTableCell>

                      <DataTableCell>
                        <TypeTag slug={stat.type.slug}>{stat.type.name ?? stat.type.slug}</TypeTag>
                      </DataTableCell>

                      <DataTableCell className="font-semibold">
                        {CATEGORY_TEXT[stat.category]}
                      </DataTableCell>

                      <DataTableCell className="font-bold tabular-nums">
                        {blankText(stat.power)}
                      </DataTableCell>

                      <DataTableCell className="tabular-nums">
                        {blankText(stat.accuracy, "%")}
                      </DataTableCell>

                      <DataTableCell className="tabular-nums">{blankText(stat.pp)}</DataTableCell>

                      <DataTableCell className="text-[12px] text-muted-foreground">
                        {blankText(stat.note)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </Card>
          </>
        )}
      </DetailShell>
    </main>
  );
}
