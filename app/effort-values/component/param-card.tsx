"use client";

import { Card } from "@/components/pokedex/card";
import { DetailImage } from "@/components/pokedex/detail-shell";
import { Button } from "@/components/ui/button";
import { EV_TOTAL_MAX } from "@/lib/stats";

import { FieldError, FieldLabel, NumberField } from "./field";
import { NatureSelect } from "./nature-select";

interface IProps {
  /** 小横条上那只：编号、译名、属性、图 */
  pokemon: {
    id: string;
    name: string;
    imageUrl?: string | null;
    typeNames: readonly string[];
  };
  /** 等级输入框里的原文 */
  level: string;
  onLevelChange: (value: string) => void;
  /** 等级的错误文案，没错是 null */
  levelError: string | null;
  /** 当前性格 id */
  natureId: string;
  onNatureChange: (id: string) => void;
  /** 六项努力值之和 */
  evTotal: number;
  /** 总和超限的错误文案，没超是 null */
  evTotalError: string | null;
  /** 「更换 Pokémon」 */
  onRepick: () => void;
  /** 「重置全部输入」 */
  onReset: () => void;
}

/** 左边那张参数卡：换人入口、当前这只、等级、性格、努力值总和、重置 */
export function ParamCard(props: Readonly<IProps>) {
  const {
    pokemon,
    level,
    onLevelChange,
    levelError,
    natureId,
    onNatureChange,
    evTotal,
    evTotalError,
    onRepick,
    onReset,
  } = props;

  return (
    <Card data-slot="ev-param-card" className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-bold">参数设置</span>

        <button
          type="button"
          onClick={onRepick}
          className="cursor-pointer text-[12px] font-semibold text-primary hover:underline"
        >
          更换 Pokémon
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-primary/10 p-3">
        <DetailImage
          src={pokemon.imageUrl}
          alt={pokemon.name}
          sizes="44px"
          className="size-11 rounded-lg bg-card"
        />

        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{pokemon.name}</div>
          <div className="truncate text-[10.5px] text-muted-foreground">
            {`No.${String(pokemon.id).padStart(4, "0")} · ${pokemon.typeNames.join(" / ")}`}
          </div>
        </div>
      </div>

      <FieldLabel htmlFor="ev-level">等级（1–100）</FieldLabel>
      <NumberField
        id="ev-level"
        min={1}
        max={100}
        value={level}
        onValueChange={onLevelChange}
        invalid={levelError != null}
      />
      <FieldError>{levelError}</FieldError>

      <FieldLabel htmlFor="ev-nature" className="mt-4">
        性格
      </FieldLabel>
      <NatureSelect id="ev-nature" value={natureId} onValueChange={onNatureChange} />

      <div className="mt-4 flex items-center justify-between text-[12px]">
        <span className="font-semibold text-muted-foreground">努力值总和</span>

        <span
          data-slot="ev-total"
          className={
            evTotal > EV_TOTAL_MAX
              ? "font-bold text-destructive tabular-nums"
              : "font-bold tabular-nums"
          }
        >
          {`${evTotal} / ${EV_TOTAL_MAX}`}
        </span>
      </div>
      <FieldError>{evTotalError}</FieldError>

      <Button variant="secondary" className="mt-4 w-full" onClick={onReset}>
        重置全部输入
      </Button>
    </Card>
  );
}
