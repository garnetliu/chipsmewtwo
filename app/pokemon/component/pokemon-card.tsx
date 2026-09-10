"use client";

import type { FragmentType } from "@apollo/client/masking";
import { useFragment } from "@apollo/client/react";
import Image from "next/image";

import { POKEMON_POKEMON_ITEM } from "@/graphql/apollo/fragment";

interface IProps {
  /**
   * 父级传下来的是 fragment 引用，不是数据本身 —— dataMasking 开着，
   * 列表页读不到这里面的字段，只能原样往下传
   */
  pokemon: FragmentType<typeof POKEMON_POKEMON_ITEM>;
}

export function PokemonCard(props: Readonly<IProps>) {
  /**
   * 拿引用去缓存里读自己声明的那几个字段。
   *
   * complete 为 false 表示缓存里这条不全（比如别的查询只写进了一部分），
   * 这时 data 是残缺的，当没数据处理
   */
  const { data, complete } = useFragment({
    fragmentName: "POKEMON_POKEMON_ITEM",
    fragment: POKEMON_POKEMON_ITEM,
    from: props.pokemon,
  });

  if (!complete) return null;

  return (
    <div className="flex items-center gap-2">
      {data.defaultForm?.detailImageUrl && (
        <Image src={data.defaultForm.detailImageUrl} alt="" width={96} height={96} unoptimized />
      )}
      <span>{data.name ?? data.slug}</span>
    </div>
  );
}
