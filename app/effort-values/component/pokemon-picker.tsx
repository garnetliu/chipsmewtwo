"use client";

import { useQuery } from "@apollo/client/react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo } from "react";

import { GET_POKEMON_OPTIONS } from "@/graphql/apollo/query";

/** 全国图鉴现有的只数。一次取完，之后过滤全在浏览器里做 */
const TOTAL = 1025;

/**
 * 下拉里最多摆几条。1025 条全铺出来 DOM 太重，而用户要的那只靠输入两个字就能进前几条，
 * 摆不下的由下方那行提示交代
 */
const VISIBLE_LIMIT = 50;

interface IOption {
  /** 全国图鉴编号 */
  id: string;
  /** 英文 slug，选中之后拿它去查种族值 */
  slug: string;
  /** 中文名。库里没有译名的落回 slug */
  label: string;
}

interface IProps {
  /** 当前选中的 slug，没选是 null */
  value: string | null;
  onValueChange: (slug: string | null) => void;
}

/**
 * 「选择 Pokémon」选择器。
 *
 * prototype 摆的是 9 个按钮的网格 —— 那是演示数据只有 9 只，真库里 1025 只摆不下，
 * 换成带搜索的 Combobox：输入中文名、英文 slug 或编号都能过滤。
 *
 * 取数只发生在这个组件挂载的时候，1025 条只有编号、slug、译名三列（51.8 KB）
 */
export function PokemonPicker(props: Readonly<IProps>) {
  const { value, onValueChange } = props;

  const { data, loading, error } = useQuery(GET_POKEMON_OPTIONS, {
    variables: { offset: 0, limit: TOTAL },
  });

  const options = useMemo<IOption[]>(
    () =>
      (data?.pokemonList?.data ?? []).map((pokemon) => ({
        id: pokemon.id,
        slug: pokemon.slug,
        label: pokemon.name ?? pokemon.slug,
      })),
    [data],
  );

  // 选中的值存 slug 而不是整条 option，重新取数拿到新对象时选中状态不会掉
  const items = useMemo(
    () =>
      Combobox.createItems(options, {
        getValue: (option: IOption) => option.slug,
        getLabel: (option: IOption) => option.label,
      }),
    [options],
  );

  const failed = error != null || (!loading && options.length === 0);

  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(typeof next === "string" ? next : null)}
      limit={VISIBLE_LIMIT}
      filter={(option: IOption, query) => {
        const keyword = query.trim().toLowerCase();

        if (keyword === "") return true;

        return (
          option.label.toLowerCase().includes(keyword) ||
          option.slug.includes(keyword) ||
          option.id.includes(keyword)
        );
      }}
    >
      <Combobox.InputGroup className="relative block">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />

        <Combobox.Input
          data-slot="pokemon-picker-input"
          aria-label="选择 Pokémon"
          disabled={loading || failed}
          placeholder={
            loading ? "正在载入名录…" : failed ? "名录加载失败" : "输入名称、编号或英文名筛选…"
          }
          className="h-10 w-full rounded-md border border-border bg-card px-9 text-[13px] outline-none focus:border-primary focus:ring-3 focus:ring-ring/20 disabled:opacity-60"
        />

        <Combobox.Trigger
          aria-label="展开名录"
          disabled={loading || failed}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronsUpDown className="size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {failed
          ? "名录加载失败，刷新页面再试"
          : `共 ${data?.pokemonList?.pagination?.total ?? TOTAL} 只，下拉最多显示 ${VISIBLE_LIMIT} 条，继续输入可缩小范围`}
      </p>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup
            data-slot="pokemon-picker-popup"
            className="max-h-[min(20rem,var(--available-height))] w-(--anchor-width) overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-(--shadow-pokedex-lifted) outline-none"
          >
            <Combobox.Empty className="px-3 py-4 text-[13px] text-muted-foreground empty:hidden">
              没有匹配的 Pokémon
            </Combobox.Empty>

            <Combobox.List>
              {(option: IOption) => (
                <Combobox.Item
                  key={option.slug}
                  value={option.slug}
                  className="grid cursor-pointer grid-cols-[1rem_1fr_auto] items-center gap-2 px-2.5 py-1.5 text-[13px] outline-none select-none data-highlighted:bg-muted"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-3.5 text-primary" />
                  </Combobox.ItemIndicator>

                  <span className="col-start-2 truncate">{option.label}</span>

                  <span className="col-start-3 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {`No.${String(option.id).padStart(4, "0")}`}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
