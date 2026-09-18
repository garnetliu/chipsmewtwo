/**
 * 能力值计算。努力值模拟器用的那套公式和性格系数表都在这里，不依赖任何 React。
 *
 * 性格表是代码常量 —— 库里没有这张表，它也不随数据变：25 种性格是游戏规则的一部分。
 */

/** 六项能力的顺序和字段名，和 FormStats 上的字段一一对应 */
export const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** 六项的中文名。照 prototype 的写法 */
export const STAT_NAMES: Record<StatKey, string> = {
  hp: "HP",
  attack: "攻击",
  defense: "防御",
  specialAttack: "特攻",
  specialDefense: "特防",
  speed: "速度",
};

/** 一只 Pokémon 的六项数值：种族值、个体值、努力值、算出来的能力值都用这个形状 */
export type StatSet = Record<StatKey, number>;

export interface INature {
  /** 稳定标识，用作下拉的 value 和 React key */
  id: string;
  /** 中文名，例如「固执」 */
  name: string;
  /** ×1.1 的那一项。无修正性格是 null */
  up: StatKey | null;
  /** ×0.9 的那一项。无修正性格是 null */
  down: StatKey | null;
}

/**
 * 25 种性格。up 那项 ×1.1、down 那项 ×0.9，五种「无修正」两项都是 null。
 *
 * HP 不受性格影响，所以 up / down 里不会出现 hp。
 */
export const NATURES: readonly INature[] = [
  { id: "hardy", name: "勤奋", up: null, down: null },
  { id: "lonely", name: "怕寂寞", up: "attack", down: "defense" },
  { id: "brave", name: "勇敢", up: "attack", down: "speed" },
  { id: "adamant", name: "固执", up: "attack", down: "specialAttack" },
  { id: "naughty", name: "顽皮", up: "attack", down: "specialDefense" },
  { id: "bold", name: "大胆", up: "defense", down: "attack" },
  { id: "docile", name: "坦率", up: null, down: null },
  { id: "relaxed", name: "悠闲", up: "defense", down: "speed" },
  { id: "impish", name: "淘气", up: "defense", down: "specialAttack" },
  { id: "lax", name: "乐天", up: "defense", down: "specialDefense" },
  { id: "timid", name: "胆小", up: "speed", down: "attack" },
  { id: "hasty", name: "急躁", up: "speed", down: "defense" },
  { id: "serious", name: "认真", up: null, down: null },
  { id: "jolly", name: "爽朗", up: "speed", down: "specialAttack" },
  { id: "naive", name: "天真", up: "speed", down: "specialDefense" },
  { id: "modest", name: "内敛", up: "specialAttack", down: "attack" },
  { id: "mild", name: "慢吞吞", up: "specialAttack", down: "defense" },
  { id: "quiet", name: "冷静", up: "specialAttack", down: "speed" },
  { id: "bashful", name: "害羞", up: null, down: null },
  { id: "rash", name: "马虎", up: "specialAttack", down: "specialDefense" },
  { id: "calm", name: "温和", up: "specialDefense", down: "attack" },
  { id: "gentle", name: "温顺", up: "specialDefense", down: "defense" },
  { id: "sassy", name: "自大", up: "specialDefense", down: "speed" },
  { id: "careful", name: "慎重", up: "specialDefense", down: "specialAttack" },
  { id: "quirky", name: "浮躁", up: null, down: null },
];

/** 默认选中的性格：认真，六项都不修正 */
export const DEFAULT_NATURE_ID = "serious";

/**
 * 按 id 取性格。查不到落回「勤奋」—— 它同样是无修正性格，
 * 算出来的就是没有性格加成的那组数，比抛错更好排查
 */
export function findNature(id: string): INature {
  return NATURES.find((nature) => nature.id === id) ?? NATURES[0];
}

/** 下拉里那一行字：「固执（攻击↑ 特攻↓）」，无修正的是「认真（无修正）」 */
export function natureLabel(nature: INature): string {
  if (!nature.up || !nature.down) return `${nature.name}（无修正）`;

  return `${nature.name}（${STAT_NAMES[nature.up]}↑ ${STAT_NAMES[nature.down]}↓）`;
}

/** 各项输入的取值范围。校验和计算前的截断都读这里 */
export const LEVEL_RANGE = { min: 1, max: 100 } as const;
export const IV_RANGE = { min: 0, max: 31 } as const;
export const EV_RANGE = { min: 0, max: 252 } as const;
/** 六项努力值总和的上限 */
export const EV_TOTAL_MAX = 510;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 公式里 (2×种族值 + 个体值 + ⌊努力值/4⌋) × 等级 / 100 这一段，两条公式共用 */
function baseTerm(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
}

/** HP：⌊(2×种族值 + 个体值 + ⌊努力值/4⌋) × 等级/100⌋ + 等级 + 10 */
export function calcHp(base: number, iv: number, ev: number, level: number): number {
  return baseTerm(base, iv, ev, level) + level + 10;
}

/**
 * HP 以外的五项：⌊⌊(2×种族值 + 个体值 + ⌊努力值/4⌋) × 等级/100⌋ + 5⌋ × 性格系数，
 * 乘完再向下取整。
 *
 * 系数不写成 1.1 / 0.9 的浮点乘：×11/10 和 ×9/10 是同一个数学结果，
 * 但整数先乘再除不会出现 76.49999… 这种擦边到下一档的取整
 */
export function calcStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  modifier: "up" | "down" | "none",
): number {
  const raw = baseTerm(base, iv, ev, level) + 5;

  if (modifier === "up") return Math.floor((raw * 11) / 10);
  if (modifier === "down") return Math.floor((raw * 9) / 10);

  return raw;
}

interface ICalcInput {
  /** 六项种族值 */
  base: StatSet;
  /** 六项个体值 */
  ivs: StatSet;
  /** 六项努力值 */
  evs: StatSet;
  /** 等级 */
  level: number;
  /** 性格 */
  nature: INature;
}

/**
 * 六项一起算。
 *
 * 超范围的输入在这里截断到合法区间（等级不合法时按 50 算）—— 界面上仍然保留用户
 * 输错的那个值并标红，只是右边的数字得有个能看的结果，和 prototype 一致
 */
export function calcStats(input: Readonly<ICalcInput>): StatSet {
  const { base, ivs, evs, level, nature } = input;
  // 等级不合法时按 50 算：结果栏总得有个数，照 prototype
  const usedLevel = level >= LEVEL_RANGE.min && level <= LEVEL_RANGE.max ? level : 50;

  const result = {} as StatSet;

  for (const key of STAT_KEYS) {
    const iv = clamp(ivs[key], IV_RANGE.min, IV_RANGE.max);
    const ev = clamp(evs[key], EV_RANGE.min, EV_RANGE.max);

    result[key] =
      key === "hp"
        ? calcHp(base[key], iv, ev, usedLevel)
        : calcStat(
            base[key],
            iv,
            ev,
            usedLevel,
            nature.up === key ? "up" : nature.down === key ? "down" : "none",
          );
  }

  return result;
}

/** 六项努力值求和 */
export function totalEv(evs: StatSet): number {
  return STAT_KEYS.reduce((sum, key) => sum + evs[key], 0);
}
