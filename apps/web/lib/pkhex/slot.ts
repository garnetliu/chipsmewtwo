/**
 * 槽位与草稿的纯函数。不碰 wasm，不碰 React，可以随便单独调。
 */

import type { MonDetail, MonEditor, SlotDraft, SlotDraftField, SlotSummary } from "./types";

/** 队伍槽位在 wasm 那边用 box = -1 表示，这里也沿用同一个约定 */
export const PARTY_BOX_INDEX = -1;

/**
 * 缓存键。箱子和队伍是两套坐标系，合成一个字符串才好放进同一个 Record ——
 * 队伍第 0 格和一号箱第 0 格必须区分开
 */
export function slotKey(box: number, slot: number): string {
  return `${box}:${slot}`;
}

export function isEmptySlot(summary: SlotSummary | null): boolean {
  return summary === null || summary.species === 0;
}

/** 从读到的完整属性摘出可编辑的那一份，作为草稿初值 */
export function toDraft(detail: MonDetail): SlotDraft {
  return {
    species: detail.species,
    form: detail.form,
    nickname: detail.nickname,
    level: detail.level,
    exp: detail.exp,
    nature: detail.nature,
    statNature: detail.statNature,
    abilityIndex: detail.abilityIndex,
    gender: detail.gender,
    isShiny: detail.isShiny,
    heldItem: detail.heldItem,
    ball: detail.ball,
    ivs: [...detail.ivs],
    evs: [...detail.evs],
    moves: [...detail.moves],
    friendship: detail.friendship,
  };
}

/**
 * 草稿和基线的差集。数组按逐项比，不用引用相等 ——
 * 输入框每敲一下都会新建一个数组，引用比会把没改的也算成脏
 */
export function diffDraft(base: SlotDraft, draft: SlotDraft): SlotDraftField[] {
  const dirty: SlotDraftField[] = [];

  for (const key of Object.keys(base) as SlotDraftField[]) {
    const a = base[key];
    const b = draft[key];
    const changed =
      Array.isArray(a) && Array.isArray(b)
        ? a.length !== b.length || a.some((item, i) => item !== b[i])
        : a !== b;
    if (changed) dirty.push(key);
  }

  return dirty;
}

/** 草稿字段 → MonEditor 上对应的写方法。加字段时这张表和 SlotDraft 一起改 */
const WRITERS: { [K in SlotDraftField]: (editor: MonEditor, draft: SlotDraft) => void } = {
  // 换种族会连带重算形态/特性/性别，所以它必须排在这些字段前面写
  species: (e, d) => e.setSpecies(d.species),
  form: (e, d) => e.setForm(d.form),
  nickname: (e, d) => e.setNickname(d.nickname),
  level: (e, d) => e.setLevel(d.level),
  exp: (e, d) => e.setExp(d.exp),
  nature: (e, d) => e.setNature(d.nature),
  statNature: (e, d) => e.setStatNature(d.statNature),
  abilityIndex: (e, d) => e.setAbilityIndex(d.abilityIndex),
  gender: (e, d) => e.setGender(d.gender),
  isShiny: (e, d) => e.setShiny(d.isShiny),
  heldItem: (e, d) => e.setHeldItem(d.heldItem),
  ball: (e, d) => e.setBall(d.ball),
  ivs: (e, d) => e.setIvs(d.ivs),
  evs: (e, d) => e.setEvs(d.evs),
  moves: (e, d) => e.setMoves(d.moves),
  friendship: (e, d) => e.setFriendship(d.friendship),
};

/** WRITERS 的写入顺序。species 先写，其余按 SlotDraft 的声明顺序 */
const WRITE_ORDER = Object.keys(WRITERS) as SlotDraftField[];

/**
 * 把脏字段逐个写回 wasm。
 *
 * 按 WRITE_ORDER 而不是按 dirty 的顺序 —— 用户可能先改特性再改种族，
 * 但换种族会重算特性，反过来写就把特性冲掉了
 */
export function applyDraft(editor: MonEditor, draft: SlotDraft, dirty: SlotDraftField[]): void {
  const pending = new Set(dirty);
  for (const key of WRITE_ORDER) {
    if (pending.has(key)) WRITERS[key](editor, draft);
  }
}

/** EV 总和上限。超了游戏不认，UI 要拦在应用之前 */
export const EV_TOTAL_LIMIT = 510;

export function evTotal(evs: readonly number[]): number {
  return evs.reduce((sum, value) => sum + value, 0);
}
