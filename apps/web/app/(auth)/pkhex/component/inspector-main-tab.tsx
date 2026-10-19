"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AbilityIndex,
  GenderValue,
  MonDetail,
  PkhexStringTables,
  SaveInfo,
  SlotDraft,
} from "@/lib/pkhex/types";

import { DexSelect } from "./dex-select";
import { SpeciesSelect } from "./species-select";

/** 0/1/2 是 PKHeX 的 EntityGender，别按数组下标理解 */
const GENDERS: { value: GenderValue; label: string }[] = [
  { value: 0, label: "♂ 雄性" },
  { value: 1, label: "♀ 雌性" },
  { value: 2, label: "无性别" },
];

const ABILITY_SLOTS = ["特性 1", "特性 2", "隐藏特性"];

interface INumberProps {
  testId: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** 等级/经验/亲密度都是「一个有上下限的数」，长得一样，抽一层省三遍 */
function PlainNumberField(props: Readonly<INumberProps>) {
  const { testId, value, min, max, onChange } = props;

  return (
    <NumberField
      id={testId}
      value={value}
      min={min}
      max={max}
      onValueChange={(next) => onChange(next ?? min)}
    >
      <NumberFieldGroup className="w-full">
        <NumberFieldDecrement />
        <NumberFieldInput data-testid={testId} />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}

interface IProps {
  detail: MonDetail;
  draft: SlotDraft;
  info: SaveInfo;
  tables: PkhexStringTables;
  onChange: (patch: Partial<SlotDraft>) => void;
}

export function InspectorMainTab(props: Readonly<IProps>) {
  const { detail, draft, info, tables, onChange } = props;

  return (
    <div className="grid grid-cols-[5rem_1fr] items-center gap-x-3 gap-y-2.5 pt-3">
      <Label>种族</Label>
      <SpeciesSelect
        value={draft.species}
        maxSpeciesId={info.maxSpeciesId}
        fallbackNames={tables.species}
        onChange={(species) => onChange({ species })}
      />

      <Label htmlFor="pkhex-field-nickname">昵称</Label>
      <Input
        id="pkhex-field-nickname"
        data-testid="pkhex-field-nickname"
        value={draft.nickname}
        onChange={(event) => onChange({ nickname: event.target.value })}
      />

      <Label htmlFor="pkhex-field-level">等级</Label>
      <PlainNumberField
        testId="pkhex-field-level"
        value={draft.level}
        min={1}
        max={100}
        onChange={(level) => onChange({ level })}
      />

      <Label htmlFor="pkhex-field-exp">经验</Label>
      <PlainNumberField
        testId="pkhex-field-exp"
        value={draft.exp}
        min={0}
        max={1_640_000}
        onChange={(exp) => onChange({ exp })}
      />

      <Label>性格</Label>
      <DexSelect
        testId="pkhex-field-nature"
        value={draft.nature}
        names={tables.natures}
        placeholder="输入性格名"
        onChange={(nature) => onChange({ nature, statNature: nature })}
      />

      <Label>特性</Label>
      {/* 特性不新增后端：本物种三个槽位的编号 wasm 已经给了，名字查 stringTables */}
      <Select
        items={detail.abilities.map((id, index) => ({
          label: tables.abilities[id] ?? `#${id}`,
          value: index,
        }))}
        value={draft.abilityIndex}
        onValueChange={(next) => onChange({ abilityIndex: Number(next) as AbilityIndex })}
      >
        <SelectTrigger data-testid="pkhex-field-ability" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {detail.abilities.map((id, index) => (
            <SelectItem key={index} value={index}>
              {tables.abilities[id] ?? `#${id}`}
              <span className="ml-auto text-xs text-muted-foreground">{ABILITY_SLOTS[index]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label>性别</Label>
      <Select
        items={GENDERS}
        value={draft.gender}
        // 无性别的物种改性别没有意义，直接禁掉，省得写回去被 wasm 打回来
        disabled={detail.genderRatio === 255}
        onValueChange={(next) => onChange({ gender: Number(next) as GenderValue })}
      >
        <SelectTrigger data-testid="pkhex-field-gender" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GENDERS.map((gender) => (
            <SelectItem key={gender.value} value={gender.value}>
              {gender.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label htmlFor="pkhex-field-shiny">闪光</Label>
      <div className="flex items-center gap-2">
        <Checkbox
          id="pkhex-field-shiny"
          data-testid="pkhex-field-shiny"
          checked={draft.isShiny}
          onCheckedChange={(checked) => onChange({ isShiny: checked === true })}
        />
        <span className="text-xs text-muted-foreground">异色个体</span>
      </div>

      <Label>持有物</Label>
      <DexSelect
        testId="pkhex-field-item"
        value={draft.heldItem}
        names={tables.items}
        max={info.maxItemId}
        placeholder="输入道具名或编号"
        onChange={(heldItem) => onChange({ heldItem })}
      />

      <Label>精灵球</Label>
      <DexSelect
        testId="pkhex-field-ball"
        value={draft.ball}
        names={tables.balls}
        max={info.maxBallId}
        placeholder="输入精灵球名"
        onChange={(ball) => onChange({ ball })}
      />

      <Label htmlFor="pkhex-field-friendship">亲密度</Label>
      <PlainNumberField
        testId="pkhex-field-friendship"
        value={draft.friendship}
        min={0}
        max={255}
        onChange={(friendship) => onChange({ friendship })}
      />
    </div>
  );
}
