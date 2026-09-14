/**
 * AT-052 ~ AT-055：能力值计算（AC-068 / AC-069 / AC-070）
 *
 * RED 阶段：lib/pokemon/stats.ts 与 natures.ts 还不存在（T-015 承诺创建）。
 * 这里的 import 会让 tsc 报「找不到模块」——按 tdd，那不是编译失败。
 */
import { describe, expect, it } from "vitest";

import { NATURES } from "@/lib/pokemon/natures";
import { calcStats, clampEffort, clampIv, EFFORT_MAX_PER_STAT, EFFORT_MAX_TOTAL } from "@/lib/pokemon/stats";

// 妙蛙种子的种族值，来自 form_stat
const BULBASAUR = { hp: 45, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45 };

describe("AT-052 单项上限截断（AC-068）", () => {
  it("单项努力值调到 252 以上被截断在 252", () => {
    expect(clampEffort(300)).toBe(EFFORT_MAX_PER_STAT);
    expect(clampEffort(252)).toBe(252);
    expect(clampEffort(-1)).toBe(0);
  });

  it("个体值调到 31 以上被截断在 31", () => {
    expect(clampIv(99)).toBe(31);
    expect(clampIv(31)).toBe(31);
    expect(clampIv(-5)).toBe(0);
  });
});

describe("AT-053 总和上限（AC-069）", () => {
  it("六项努力值总和达 510 后任一项无法再增加", () => {
    const atCap = { hp: 252, attack: 252, defense: 6, specialAttack: 0, specialDefense: 0, speed: 0 };
    expect(Object.values(atCap).reduce((a, b) => a + b, 0)).toBe(EFFORT_MAX_TOTAL);
    const result = calcStats({
      base: BULBASAUR,
      level: 50,
      nature: "hardy",
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      efforts: { ...atCap, defense: 60 }, // 想把 defense 从 6 提到 60，总和会超 510
    });
    // 超出总和上限的那部分不生效：defense 仍按 6 点努力值计算
    const expected = calcStats({
      base: BULBASAUR,
      level: 50,
      nature: "hardy",
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      efforts: atCap,
    });
    expect(result.defense).toBe(expected.defense);
  });
});

describe("AT-054 计算结果与游戏一致（AC-070）", () => {
  it("妙蛙种子 50 级、个体值 31、努力值 0、无修正性格", () => {
    const s = calcStats({
      base: BULBASAUR,
      level: 50,
      nature: "hardy",
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      efforts: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    });
    // HP  = floor((2*45 + 31) * 50 / 100) + 50 + 10 = 120
    // 其余 = floor((floor((2*B + 31) * 50 / 100) + 5) * 1.0)
    expect(s.hp).toBe(120);
    expect(s.attack).toBe(69);
    expect(s.defense).toBe(69);
    expect(s.specialAttack).toBe(85);
    expect(s.specialDefense).toBe(85);
    expect(s.speed).toBe(65);
  });
});

describe("AT-055 HP 与其余五项公式不同、性格修正（AC-070）", () => {
  it("性格修正是一项 ×1.1、一项 ×0.9，且不作用于 HP", () => {
    const args = {
      base: BULBASAUR,
      level: 50,
      ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
      efforts: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    };
    const neutral = calcStats({ ...args, nature: "hardy" });
    // 固执：攻击 ×1.1、特攻 ×0.9
    const adamant = calcStats({ ...args, nature: "adamant" });
    expect(adamant.attack).toBe(Math.floor(neutral.attack * 1.1));
    expect(adamant.specialAttack).toBe(Math.floor(neutral.specialAttack * 0.9));
    expect(adamant.hp).toBe(neutral.hp);
  });

  it("25 种性格齐全，其中 5 种无修正", () => {
    expect(Object.keys(NATURES)).toHaveLength(25);
    // NATURES 的类型要等 T-015 建出 natures.ts 才有，这里先声明期望的形状
    const entries = Object.values(NATURES) as { increased: string; decreased: string }[];
    const neutral = entries.filter((n) => n.increased === n.decreased);
    expect(neutral).toHaveLength(5);
  });
});
