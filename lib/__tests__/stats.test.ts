import { describe, expect, test } from "vitest";

import {
  calcStats,
  findNature,
  natureLabel,
  NATURES,
  STAT_KEYS,
  type StatSet,
  totalEv,
} from "@/lib/stats";

/** 妙蛙种子的种族值 */
const BULBASAUR: StatSet = {
  hp: 45,
  attack: 49,
  defense: 49,
  specialAttack: 65,
  specialDefense: 65,
  speed: 45,
};

/** 六项同一个值的快捷写法 */
function fill(value: number): StatSet {
  return {
    hp: value,
    attack: value,
    defense: value,
    specialAttack: value,
    specialDefense: value,
    speed: value,
  };
}

describe("calcStats", () => {
  test("50 级、认真（无修正）、个体值全 31、努力值全 0 的妙蛙种子", () => {
    expect(
      calcStats({
        base: BULBASAUR,
        ivs: fill(31),
        evs: fill(0),
        level: 50,
        nature: findNature("serious"),
      }),
    ).toEqual({
      hp: 120,
      attack: 69,
      defense: 69,
      specialAttack: 85,
      specialDefense: 85,
      speed: 65,
    });
  });

  test("同样条件换成固执（攻击↑ 特攻↓），只有攻击和特攻变", () => {
    expect(
      calcStats({
        base: BULBASAUR,
        ivs: fill(31),
        evs: fill(0),
        level: 50,
        nature: findNature("adamant"),
      }),
    ).toEqual({
      hp: 120,
      attack: 75,
      defense: 69,
      specialAttack: 76,
      specialDefense: 85,
      speed: 65,
    });
  });

  test("努力值每 4 点才涨 1 —— 252 和 255 算出来一样", () => {
    const evs = { ...fill(0), attack: 252 };
    const more = { ...fill(0), attack: 255 };
    const common = { base: BULBASAUR, ivs: fill(31), level: 50, nature: findNature("serious") };

    expect(calcStats({ ...common, evs }).attack).toBe(calcStats({ ...common, evs: more }).attack);
  });

  test("超范围的输入按边界算，等级不合法时按 50 算", () => {
    const clamped = calcStats({
      base: BULBASAUR,
      ivs: fill(99),
      evs: fill(999),
      level: 150,
      nature: findNature("serious"),
    });

    expect(clamped).toEqual(
      calcStats({
        base: BULBASAUR,
        ivs: fill(31),
        evs: fill(252),
        level: 50,
        nature: findNature("serious"),
      }),
    );
  });
});

describe("NATURES", () => {
  test("25 种，id 不重名", () => {
    expect(NATURES).toHaveLength(25);
    expect(new Set(NATURES.map((nature) => nature.id)).size).toBe(25);
    expect(new Set(NATURES.map((nature) => nature.name)).size).toBe(25);
  });

  test("有修正的 20 种各修正两项不同的能力，且都不碰 HP", () => {
    const modified = NATURES.filter((nature) => nature.up !== null);

    expect(modified).toHaveLength(20);

    for (const nature of modified) {
      expect(nature.down).not.toBeNull();
      expect(nature.up).not.toBe(nature.down);
      expect(nature.up).not.toBe("hp");
      expect(nature.down).not.toBe("hp");
    }
  });

  test("五种无修正性格的 up 和 down 都是 null", () => {
    const neutral = NATURES.filter((nature) => nature.up === null);

    expect(neutral.map((nature) => nature.id)).toEqual([
      "hardy",
      "docile",
      "serious",
      "bashful",
      "quirky",
    ]);
    expect(neutral.every((nature) => nature.down === null)).toBe(true);
  });

  test("下拉里的那行字", () => {
    expect(natureLabel(findNature("adamant"))).toBe("固执（攻击↑ 特攻↓）");
    expect(natureLabel(findNature("serious"))).toBe("认真（无修正）");
  });
});

test("totalEv 把六项加起来", () => {
  expect(totalEv(fill(252))).toBe(252 * STAT_KEYS.length);
  expect(totalEv({ ...fill(0), hp: 252, speed: 252, attack: 6 })).toBe(510);
});
