import { BLANK } from "@/components/pokedex/blank";
import { Card } from "@/components/pokedex/card";
import { CardEmpty } from "@/components/pokedex/card-empty";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/pokedex/data-table";
import { VersionBadges } from "@/components/pokedex/version-badges";

import type { Pokemon } from "../type";
import { generationName, versionGeneration } from "../version-generation";

interface IProps {
  /** 登场版本，按发售顺序排 */
  versions: Pokemon["versions"];
}

/**
 * 底部整宽卡：具体版本可用性。
 *
 * 一行一个世代 —— 妙蛙种子有 40 个登场版本，一版一行摆不下，而表里唯一能把它们
 * 分组的列就是世代。
 *
 * 「获取方式」「可用性」两列库里没有数据，整列都是破折号。prototype 那里写的
 * 「初始伙伴 / 野外捕捉」「可正常获得」是它自己编的演示数据，不抄
 */
export function PokemonVersions(props: Readonly<IProps>) {
  const { versions } = props;

  const rows = groupByGeneration(versions);

  return (
    <Card data-slot="pokemon-versions" className="mt-5 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[15px] font-bold">具体版本可用性</span>
        <span className="text-[11px] text-muted-foreground">更完整的版本资料</span>
      </div>

      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-[46%]">游戏版本</DataTableHead>
            <DataTableHead>世代</DataTableHead>
            <DataTableHead>获取方式</DataTableHead>
            <DataTableHead>可用性</DataTableHead>
          </DataTableRow>
        </DataTableHeader>

        <DataTableBody>
          {rows.map((row) => (
            <DataTableRow key={row.generation ?? "unknown"}>
              <DataTableCell>
                <VersionBadges versions={row.versions} />
              </DataTableCell>

              <DataTableCell>{generationName(row.generation) ?? BLANK}</DataTableCell>
              <DataTableCell className="text-muted-foreground">{BLANK}</DataTableCell>
              <DataTableCell className="text-muted-foreground">{BLANK}</DataTableCell>
            </DataTableRow>
          ))}

          {rows.length === 0 && (
            <DataTableRow>
              <DataTableCell colSpan={4}>
                <CardEmpty>没有收录登场版本</CardEmpty>
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTable>
    </Card>
  );
}

interface IGenerationRow {
  /** 表里认不出这个版本的世代时是 null，那一行的世代列落破折号 */
  generation: number | null;
  versions: Pokemon["versions"];
}

/** 按世代归行。版本本来就按发售顺序排，扫一遍就是按世代升序，不用再排 */
function groupByGeneration(versions: Pokemon["versions"]): IGenerationRow[] {
  const rows: IGenerationRow[] = [];

  for (const version of versions) {
    const generation = versionGeneration(version.slug);
    const last = rows.at(-1);

    if (last && last.generation === generation) {
      last.versions = [...last.versions, version];
    } else {
      rows.push({ generation, versions: [version] });
    }
  }

  return rows;
}
