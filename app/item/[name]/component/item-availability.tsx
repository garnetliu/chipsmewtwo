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
import { VersionBadges } from "@/components/pokedex/version-badges";
import { VERSION_BADGE } from "@/graphql/apollo/fragment";
import type { DocumentType } from "@/graphql/generated";

type VersionBadge = DocumentType<typeof VERSION_BADGE>;

/** 可用性表的一行：一个版本组 */
interface IRow {
  versions: readonly VersionBadge[];
  obtainMethod?: string | null;
  availability?: string | null;
}

interface IProps {
  /**
   * 按版本组分行，按发售顺序。一条第二世代的道具是 28 行，第一世代的 32 行 ——
   * 行数不少，这张表只在详情页出
   */
  rows: readonly IRow[];
}

/**
 * 版本可用性表。
 *
 * 「获取方式」「可用性」两列库里没有数据（跟道具沾边的四张表里没有获取地点这类列），
 * 恒为 null，逐行显示「—」。prototype 上那两列写的「商店购买 / 野外拾取」「需 BP 兑换」
 * 是演示数据，不拿别的字段去凑
 */
export function ItemAvailability(props: Readonly<IProps>) {
  const { rows } = props;

  return (
    <Card data-slot="item-availability" className="overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold">具体版本可用性</span>
        <span className="text-[11px] text-muted-foreground">更完整的版本资料</span>
      </div>

      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>游戏版本</DataTableHead>
            <DataTableHead>获取方式</DataTableHead>
            <DataTableHead>可用性</DataTableHead>
          </DataTableRow>
        </DataTableHeader>

        <DataTableBody>
          {rows.map((row, index) => (
            <DataTableRow key={row.versions.map((version) => version.id).join("-") || index}>
              <DataTableCell>
                <VersionBadges versions={row.versions} />
              </DataTableCell>

              <DataTableCell className="text-muted-foreground">
                {blankText(row.obtainMethod)}
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">
                {blankText(row.availability)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </Card>
  );
}
