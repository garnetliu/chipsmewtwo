"use client";

import { useQuery } from "@apollo/client/react";

import { Card } from "@/components/pokedex/card";
import { Button } from "@/components/ui/button";
import { GET_POKEMON_STATS } from "@/graphql/apollo/query";
import {
  calcStats,
  DEFAULT_NATURE_ID,
  EV_RANGE,
  EV_TOTAL_MAX,
  findNature,
  IV_RANGE,
  LEVEL_RANGE,
  STAT_KEYS,
  STAT_NAMES,
  type StatKey,
  type StatSet,
  totalEv,
} from "@/lib/stats";

import { ParamCard } from "./param-card";
import { type IStatRow, ResultCard } from "./result-card";

/**
 * 输入框里的原文。存字符串不存数字：超范围的值要原样留在框里标红，
 * 存数字的话清空输入框这种中间状态没法表示
 */
export interface ISimForm {
  level: string;
  natureId: string;
  ivs: Record<StatKey, string>;
  evs: Record<StatKey, string>;
}

/** 六项同一个值 */
function fillStats<T>(value: T): Record<StatKey, T> {
  return {
    hp: value,
    attack: value,
    defense: value,
    specialAttack: value,
    specialDefense: value,
    speed: value,
  };
}

/** 初值，也是「重置全部输入」回到的那一组：50 级、无修正性格、个体值满、努力值空 */
export const DEFAULT_FORM: ISimForm = {
  level: "50",
  natureId: DEFAULT_NATURE_ID,
  ivs: fillStats("31"),
  evs: fillStats("0"),
};

/** 输入框里的原文转数字。空框和非数字都当 0，和 prototype 的 parseInt||0 一致 */
function parseInput(raw: string): number {
  const value = Number.parseInt(raw, 10);

  return Number.isNaN(value) ? 0 : value;
}

function toNumbers(raw: Record<StatKey, string>): StatSet {
  const result = {} as StatSet;

  for (const key of STAT_KEYS) result[key] = parseInput(raw[key]);

  return result;
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

interface IProps {
  /** 选中的那只 */
  slug: string;
  form: ISimForm;
  onFormChange: (next: ISimForm) => void;
  /** 「更换 Pokémon」，回到未选择态 */
  onRepick: () => void;
  /** 「重置全部输入」 */
  onReset: () => void;
}

/**
 * 已选择态：左 1/3 参数卡 + 右 2/3 结果卡。
 *
 * 种族值单独查一条（450 B）—— 精灵详情那条查询还拖着图鉴说明、形态、进化链和
 * 登场版本，算能力值一个都用不上。
 *
 * 校验和 prototype 一样不拦输入：超范围的值留在框里标红，右边照样出数（按边界算）
 */
export function StatsPanel(props: Readonly<IProps>) {
  const { slug, form, onFormChange, onRepick, onReset } = props;

  const { data, loading, error, refetch } = useQuery(GET_POKEMON_STATS, { variables: { slug } });

  const pokemon = data?.pokemonBySlug;
  const stats = pokemon?.defaultForm?.stats;

  if (loading && !pokemon) {
    return (
      <div
        data-slot="ev-panel-loading"
        aria-hidden="true"
        className="grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted md:col-span-2" />
      </div>
    );
  }

  if (error) {
    return (
      <Card data-slot="ev-panel-failed" className="p-12 text-center">
        <div className="text-[14px] font-semibold">种族值加载失败，请稍后再试</div>
        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
          重试
        </Button>
      </Card>
    );
  }

  if (!pokemon || !stats) {
    return (
      <Card data-slot="ev-panel-not-found" className="p-12 text-center">
        <div className="text-[14px] font-semibold">未找到该 Pokémon</div>
        <div className="mt-1.5 text-[12px] text-muted-foreground">换一只再试试</div>
        <Button variant="secondary" className="mt-4" onClick={onRepick}>
          更换 Pokémon
        </Button>
      </Card>
    );
  }

  // 第一世代没有特攻特防（那时只有 special），查询取的是最新世代，这里的 null 只是兜底
  const base: StatSet = {
    hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    specialAttack: stats.specialAttack ?? 0,
    specialDefense: stats.specialDefense ?? 0,
    speed: stats.speed,
  };

  const level = parseInput(form.level);
  const ivs = toNumbers(form.ivs);
  const evs = toNumbers(form.evs);
  const evTotal = totalEv(evs);
  const nature = findNature(form.natureId);

  const levelError = inRange(level, LEVEL_RANGE) ? null : "等级需在 1–100 之间";
  const evTotalError =
    evTotal > EV_TOTAL_MAX ? `努力值总和不能超过 ${EV_TOTAL_MAX}（当前 ${evTotal}）` : null;

  const results = calcStats({ base, ivs, evs, level, nature });

  const rows: IStatRow[] = STAT_KEYS.map((key) => ({
    key,
    name: STAT_NAMES[key],
    base: base[key],
    iv: form.ivs[key],
    ivError: inRange(ivs[key], IV_RANGE) ? null : "个体值需在 0–31 之间",
    ev: form.evs[key],
    evError: inRange(evs[key], EV_RANGE) ? null : "单项努力值需在 0–252 之间",
    result: results[key],
  }));

  const hasError =
    levelError != null ||
    evTotalError != null ||
    rows.some((row) => row.ivError != null || row.evError != null);

  return (
    <div data-slot="ev-panel" className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <ParamCard
        pokemon={{
          id: pokemon.id,
          name: pokemon.name ?? pokemon.slug,
          imageUrl: pokemon.defaultForm?.detailImageUrl,
          typeNames: (pokemon.defaultForm?.types ?? []).map((type) => type.name ?? type.slug),
        }}
        level={form.level}
        onLevelChange={(value) => onFormChange({ ...form, level: value })}
        levelError={levelError}
        natureId={form.natureId}
        onNatureChange={(natureId) => onFormChange({ ...form, natureId })}
        evTotal={evTotal}
        evTotalError={evTotalError}
        onRepick={onRepick}
        onReset={onReset}
      />

      <ResultCard
        rows={rows}
        hasError={hasError}
        onIvChange={(key, value) => onFormChange({ ...form, ivs: { ...form.ivs, [key]: value } })}
        onEvChange={(key, value) => onFormChange({ ...form, evs: { ...form.evs, [key]: value } })}
      />
    </div>
  );
}
