/**
 * PKHeX 运行时的门面。**UI 只该碰这一层。**
 *
 * 下面一层（lib/pkhex/exports.ts）是 [JSExport] 的原始形状：PascalCase 方法名、
 * 裸编号、读取返回 JSON 字符串。这里把它包成 lib/pkhex/types.ts 里那套接口，
 * 顺手把跨边界抛出来的东西归一成 PkhexError。
 */

import { toPkhexError } from "./errors";
import type { BridgeExports } from "./exports";
import { loadBridge } from "./runtime";
import type {
  AbilityIndex,
  GenderValue,
  LegalityReport,
  LoadPkhexOptions,
  MonDetail,
  MonEditor,
  MoveTuple,
  PkhexApi,
  PkhexStringTables,
  SaveInfo,
  SaveSession,
  SlotSummary,
  StatTuple,
} from "./types";

export type { PkhexErrorCode } from "./errors";
export { PkhexError, toPkhexError } from "./errors";
export { resetBridge } from "./runtime";

/**
 * 所有跨边界的调用都过这里。
 *
 * [JSExport] 只把托管异常的 message 字符串带过来，类型和堆栈全丢了，
 * 归一成 PkhexError 之后 UI 才能按错误码分支。
 */
function call<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    throw toPkhexError(error);
  }
}

function parse<T>(json: string): T {
  return JSON.parse(json) as T;
}

class Editor implements MonEditor {
  readonly #bridge: BridgeExports;
  readonly handle: number;

  constructor(bridge: BridgeExports, handle: number) {
    this.#bridge = bridge;
    this.handle = handle;
  }

  read(): MonDetail {
    return call(() => parse<MonDetail>(this.#bridge.GetMon(this.handle)));
  }

  setSpecies(value: number): void {
    call(() => this.#bridge.SetSpecies(this.handle, value));
  }

  setForm(value: number): void {
    call(() => this.#bridge.SetForm(this.handle, value));
  }

  setNickname(value: string): void {
    call(() => this.#bridge.SetNickname(this.handle, value));
  }

  setLevel(value: number): void {
    call(() => this.#bridge.SetLevel(this.handle, value));
  }

  setExp(value: number): void {
    call(() => this.#bridge.SetExp(this.handle, value));
  }

  setNature(value: number): void {
    call(() => this.#bridge.SetNature(this.handle, value));
  }

  setStatNature(value: number): void {
    call(() => this.#bridge.SetStatNature(this.handle, value));
  }

  setAbilityIndex(value: AbilityIndex): void {
    call(() => this.#bridge.SetAbilityIndex(this.handle, value));
  }

  setGender(value: GenderValue): void {
    call(() => this.#bridge.SetGender(this.handle, value));
  }

  setShiny(value: boolean): void {
    call(() => this.#bridge.SetShiny(this.handle, value));
  }

  setHeldItem(value: number): void {
    call(() => this.#bridge.SetHeldItem(this.handle, value));
  }

  setBall(value: number): void {
    call(() => this.#bridge.SetBall(this.handle, value));
  }

  setIvs(value: StatTuple): void {
    call(() => this.#bridge.SetIVs(this.handle, Int32Array.from(value)));
  }

  setEvs(value: StatTuple): void {
    call(() => this.#bridge.SetEVs(this.handle, Int32Array.from(value)));
  }

  setMoves(value: MoveTuple): void {
    call(() => this.#bridge.SetMoves(this.handle, Int32Array.from(value)));
  }

  setFriendship(value: number): void {
    call(() => this.#bridge.SetFriendship(this.handle, value));
  }

  /**
   * 跑一次合法性检查。桥那边是 PKHeX 的 LegalityAnalysis，要查遍相遇表 ——
   * 整层里最重的一条，别在渲染里调，也别对整箱批量调
   */
  legality(): LegalityReport {
    return call(() => parse<LegalityReport>(this.#bridge.GetLegality(this.handle)));
  }
}

class Session implements SaveSession {
  readonly #bridge: BridgeExports;
  readonly info: SaveInfo;
  readonly stringTables: PkhexStringTables;

  constructor(bridge: BridgeExports, handle: number) {
    this.#bridge = bridge;
    // 元信息和字符串表都是整份存档不变的，载入时各读一次就够
    this.info = call(() => parse<SaveInfo>(bridge.GetSaveInfo(handle)));
    this.stringTables = call(() => parse<PkhexStringTables>(bridge.GetStringTables(handle)));
  }

  box(index: number): (SlotSummary | null)[] {
    return call(() => parse<(SlotSummary | null)[]>(this.#bridge.GetBox(this.info.handle, index)));
  }

  party(): (SlotSummary | null)[] {
    return call(() => parse<(SlotSummary | null)[]>(this.#bridge.GetParty(this.info.handle)));
  }

  mon(handle: number): MonEditor {
    return new Editor(this.#bridge, handle);
  }

  export(): Uint8Array {
    return call(() => this.#bridge.ExportSave(this.info.handle));
  }

  close(): void {
    call(() => this.#bridge.CloseSave(this.info.handle));
  }
}

/**
 * 载入运行时。幂等，重复调拿到同一份；失败时内部会把缓存清掉，
 * 所以「重试」按钮直接再调一次就行。
 */
export async function loadPkhex(options?: LoadPkhexOptions): Promise<PkhexApi> {
  const bridge = await loadBridge(options);

  return {
    coreVersion: bridge.coreVersion,
    loadSave(bytes: Uint8Array): SaveSession {
      const handle = call(() => bridge.exports.LoadSave(bytes));
      return new Session(bridge.exports, handle);
    },
    checkEntity(bytes: Uint8Array, extension?: string): LegalityReport {
      // 空串是「不给提示」的约定值，不是缺省参数 —— 边界那头是 C# 的 string，不收 undefined
      return call(() => parse<LegalityReport>(bridge.exports.CheckEntity(bytes, extension ?? "")));
    },
  };
}
