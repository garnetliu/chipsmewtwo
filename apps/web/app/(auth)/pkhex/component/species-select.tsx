"use client";

import { useLazyQuery } from "@apollo/client/react";
import { useMemo, useRef, useState } from "react";

import { GET_PKHEX_SPECIES_INDEX } from "@pkcw/graphql/apollo/query";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";

import { useEditorStore } from "./save-editor-context";
import { type SpeciesOption, toSpeciesEntries } from "./species-entries";

/** 一次最多铺多少条。1025 只全渲染出来，popup 一开就卡一下 */
const MAX_VISIBLE = 100;

/** 全国图鉴现在 1025 只，留点余量，免得新作一出就截断 */
const INDEX_LIMIT = 1500;

interface IProps {
  value: number;
  /** 本作的种族上限。第九世代 1025，第六世代只到 721 */
  maxSpeciesId: number;
  /** session.stringTables.species，GraphQL 还没拉到时的兜底名 */
  fallbackNames: readonly string[];
  onChange: (species: number) => void;
}

/**
 * 种族下拉。1025 条必须能搜，所以走 GraphQL 拉全量，在浏览器里 includes 过滤 ——
 * 这就是个子串匹配，不值得为它在 pokemon_i18n.name 上加一个带索引的后端查询。
 *
 * 全量只在下拉**第一次展开**时拉。进页面就发 1025 条的请求，对只想看看箱子的人是纯浪费
 */
export function SpeciesSelect(props: Readonly<IProps>) {
  const { value, maxSpeciesId, fallbackNames, onChange } = props;

  // 只订 species 这张表：下拉里的名字优先用查到的中文名
  const speciesMeta = useEditorStore((state) => state.species);
  const loadSpecies = useEditorStore((state) => state.loadSpecies);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SpeciesOption[]>([]);
  const requested = useRef(false);

  const [loadIndex, { loading }] = useLazyQuery(GET_PKHEX_SPECIES_INDEX);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setQuery("");
      return;
    }
    if (requested.current) return;
    requested.current = true;

    void loadIndex({ variables: { limit: INDEX_LIMIT } }).then(({ data }) => {
      const rows = (data?.pokemonList?.data ?? []).filter((row) => row !== null);
      setOptions(rows);
      // 顺手灌进箱子取图用的那张 Map —— 字段集跟 GET_PKHEX_SPRITES 一样，
      // 拉过全量之后切箱一个请求都不用再发
      loadSpecies(
        toSpeciesEntries(
          rows.map((row) => Number(row.id)),
          rows,
        ),
      );
    });
  }

  const matches = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const found: { id: number; label: string }[] = [];

    for (const row of options) {
      if (found.length >= MAX_VISIBLE) break;
      const id = Number(row.id);
      // 这一作没有的种族不能选，写回去 wasm 会直接抛 OUT_OF_RANGE
      if (id > maxSpeciesId) continue;

      const label = row.name ?? row.slug;
      if (
        keyword &&
        !label.toLowerCase().includes(keyword) &&
        !row.slug.includes(keyword) &&
        !String(id).startsWith(keyword)
      ) {
        continue;
      }
      found.push({ id, label });
    }

    return found;
  }, [options, maxSpeciesId, query]);

  /** 优先用查到的中文名，其次是 PKHeX 自带的表，最后退到编号 */
  function labelOf(id: number): string {
    return speciesMeta.get(id)?.name ?? fallbackNames[id] ?? `#${id}`;
  }

  return (
    <Combobox
      value={value}
      filter={null}
      onValueChange={(next) => onChange(Number(next))}
      onInputValueChange={setQuery}
      onOpenChange={handleOpenChange}
    >
      <ComboboxTrigger
        data-testid="pkhex-field-species"
        render={
          <Button variant="outline" size="sm" className="w-full justify-between font-normal" />
        }
      >
        <ComboboxValue>
          {(current: number | null) => <span className="truncate">{labelOf(current ?? 0)}</span>}
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent>
        <ComboboxInput
          data-testid="pkhex-field-species-search"
          placeholder="输入名字、slug 或图鉴号"
          showTrigger={false}
        />
        <ComboboxEmpty>{loading ? "正在加载全国图鉴…" : "没有匹配的种族"}</ComboboxEmpty>
        <ComboboxList>
          {matches.map((item) => (
            <ComboboxItem
              key={item.id}
              value={item.id}
              data-testid={`pkhex-field-species-option-${item.id}`}
            >
              <span className="truncate">{item.label}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                #{String(item.id).padStart(4, "0")}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
