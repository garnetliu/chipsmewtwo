/**
 * wasm 边界的数据契约。
 *
 * 这份文件和 C# 侧的 pkhex-wasm/src/PkhexBridge/Dto.cs 是手写的一对镜像 ——
 * 不生成、不自动同步。两边加字段要一起改，C# 的 ContractTests 会对
 * JSON 的 key 集合做快照，防止单边漂移。
 *
 * 下面所有编号都是**游戏内部编号**，不是 PokeAPI 的自增 id。只有 species
 * 例外 —— 它就是全国图鉴编号，和 Prisma 的 Pokemon.id 同义，所以只有种族
 * 这一项能拿去查库，招式/道具/特性一律用 stringTables 里的名字。
 */

/** 能力值的槽位顺序。全线统一这一个顺序，不跟 PKHeX 内部的 SPE 在前 */
export const STAT_ORDER = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

export type StatKey = (typeof STAT_ORDER)[number];

/** 六项定长元组。IV / EV 都是这个形状，顺序见 STAT_ORDER */
export type StatTuple = [number, number, number, number, number, number];

/** 四个招式槽。0 表示空槽 */
export type MoveTuple = [number, number, number, number];

/** 0 = ♂，1 = ♀，2 = 无性别。和 PKHeX 的 EntityGender 一致 */
export type GenderValue = 0 | 1 | 2;

/** 特性槽位。1/2 是普通特性，3 是隐藏特性，这里用 0-based 的下标 */
export type AbilityIndex = 0 | 1 | 2;

/** 存档元信息。载入后只读一次 */
export interface SaveInfo {
  handle: number;
  generation: number;
  /** PKHeX 的 EntityContext 名，例如 "Gen9" */
  context: string;
  version: number;
  /** 例如 "SL"、"SW"、"US" */
  versionName: string;
  ot: string;
  otGender: GenderValue;
  language: number;
  tid16: number;
  sid16: number;
  id32: number;
  displayTid: number;
  displaySid: number;
  boxCount: number;
  boxSlotCount: number;
  slotCount: number;
  partyCount: number;
  /** 长度等于 boxCount。存档不支持自定义箱名时是 "Box 1" 这种默认值 */
  boxNames: string[];
  /**
   * 本作的上限，给前端做范围夹取用。不同世代差别很大
   * （第九世代 maxSpeciesId 是 1025，第六世代只有 721）
   */
  maxSpeciesId: number;
  maxMoveId: number;
  maxItemId: number;
  maxAbilityId: number;
  maxBallId: number;
  maxIv: number;
  maxEv: number;
}

/** 箱子/队伍里一格的摘要。只够画格子，不够填编辑面板 */
export interface SlotSummary {
  /** 个体 handle。同一个槽位重复取返回同一个值，可以直接当 React key */
  handle: number;
  /** 队伍槽位这里是 -1 */
  box: number;
  slot: number;
  species: number;
  form: number;
  /** 已经按存档语言译好的显示名（有昵称就是昵称） */
  nickname: string;
  level: number;
  isShiny: boolean;
  isEgg: boolean;
  gender: GenderValue;
  heldItem: number;
  ball: number;
}

/** 单只的完整属性。点开右侧面板时读一次 */
export interface MonDetail {
  handle: number;
  box: number;
  slot: number;
  kind: "box" | "party";

  species: number;
  form: number;
  /** 本物种有几个形态。1 表示没有可选形态，UI 该把形态下拉禁掉 */
  formCount: number;

  nickname: string;
  isNicknamed: boolean;
  level: number;
  exp: number;

  /** 真性格，存储在个体数据里的那个 */
  nature: number;
  /**
   * 薄荷性格。第八世代起和真性格是两个独立字节，能力值按这个算。
   * 第六/七世代这两个值永远相同
   */
  statNature: number;

  ability: number;
  abilityIndex: AbilityIndex;
  /** 本物种三个槽位的特性编号，缺的槽位重复前一个。UI 从这里三选一 */
  abilities: [number, number, number];

  gender: GenderValue;
  /** PersonalInfo 里的性别比魔数。255 无性别 / 254 全雌 / 0 全雄 */
  genderRatio: number;

  isShiny: boolean;
  isEgg: boolean;
  heldItem: number;
  ball: number;

  ivs: StatTuple;
  evs: StatTuple;
  moves: MoveTuple;
  friendship: number;

  otName: string;
  tid16: number;
  sid16: number;
}

/**
 * 编辑面板的草稿。字段名和 MonEditor 上的 setter 一一对应 ——
 * 应用修改时按脏字段逐个派发，见 lib/pkhex/slot.ts 的 applyDraft
 */
export interface SlotDraft {
  species: number;
  form: number;
  nickname: string;
  level: number;
  exp: number;
  nature: number;
  statNature: number;
  abilityIndex: AbilityIndex;
  gender: GenderValue;
  isShiny: boolean;
  heldItem: number;
  ball: number;
  ivs: StatTuple;
  evs: StatTuple;
  moves: MoveTuple;
  friendship: number;
}

export type SlotDraftField = keyof SlotDraft;

/**
 * PKHeX 自带的字符串表，按存档语言取好。
 *
 * 招式/道具/特性/性格/球的下拉全吃这个，不走 GraphQL —— 库里那几张表的 id
 * 是 PokeAPI 的自增 id，和游戏内部编号对不上，硬接会静默显示错的名字
 */
export interface PkhexStringTables {
  /** 下标即性格编号，25 条 */
  natures: string[];
  /** 下标即招式编号，0 是空槽 */
  moves: string[];
  /** 下标即道具编号，0 是「无」 */
  items: string[];
  abilities: string[];
  /** 下标即精灵球编号 */
  balls: string[];
  /** 下标即种族编号。GraphQL 查不到时的兜底名 */
  species: string[];
  types: string[];
}

/**
 * 合法性问题的严重程度。对应 PKHeX 的 Severity：
 * Invalid = -1 拦下不让导出，Fishy = 0 只提示。Valid 不会出现在 issues 里
 */
export type LegalitySeverity = "invalid" | "fishy";

export interface LegalityIssue {
  severity: LegalitySeverity;
  /** PKHeX 的 CheckIdentifier，指出是哪一组检查（Move / IVs / Encounter …） */
  identifier: string;
  /** 已经按界面语言译好的一句话 */
  message: string;
}

export interface LegalityReport {
  /** 只看 Invalid。有 fishy 但没有 invalid 时这里仍然是 true */
  valid: boolean;
  issues: LegalityIssue[];
  /**
   * PKHeX 自己排版的完整报告文本。
   * 逐条消息在某些分支上拿不全，留着它兜底，面板上折叠展示
   */
  report: string;
}

/** 单只的写接口。每个 setter 写完立刻回存档，没有单独的 commit */
export interface MonEditor {
  readonly handle: number;
  read(): MonDetail;

  setSpecies(value: number): void;
  setForm(value: number): void;
  setNickname(value: string): void;
  setLevel(value: number): void;
  setExp(value: number): void;
  /** 第八世代起会同时写真性格和薄荷性格两个字节 */
  setNature(value: number): void;
  /** 只写薄荷性格。第六/七世代等同于 setNature */
  setStatNature(value: number): void;
  setAbilityIndex(value: AbilityIndex): void;
  setGender(value: GenderValue): void;
  setShiny(value: boolean): void;
  setHeldItem(value: number): void;
  setBall(value: number): void;
  setIvs(value: StatTuple): void;
  setEvs(value: StatTuple): void;
  setMoves(value: MoveTuple): void;
  setFriendship(value: number): void;

  /**
   * 跑一次合法性检查。
   *
   * 这是 PKHeX 里最重的一条路径（要查遍相遇表），别在渲染里调，
   * 也别对整箱批量调 —— 只在应用修改之后、以及打开面板时各跑一次
   */
  legality(): LegalityReport;
}

/** 一份已载入的存档。所有读写都在浏览器内存里，不落盘也不上传 */
export interface SaveSession {
  readonly info: SaveInfo;
  readonly stringTables: PkhexStringTables;
  /** 定长数组，长度等于 info.boxSlotCount，空格子是 null */
  box(index: number): (SlotSummary | null)[];
  /** 定长 6 格 */
  party(): (SlotSummary | null)[];
  mon(handle: number): MonEditor;
  export(): Uint8Array;
  close(): void;
}

export interface PkhexApi {
  /** PKHeX.Core 的程序集版本，出问题时贴进报告用 */
  readonly coreVersion: string;
  loadSave(bytes: Uint8Array): SaveSession;
}

/** 运行时下载进度。字节数是解压后的，和产物清单里记的口径一致 */
export interface PkhexLoadProgress {
  loadedBytes: number;
  totalBytes: number;
  /** 0 到 1。totalBytes 拿不到时退化成 0，UI 该切回不确定进度条 */
  ratio: number;
}

export interface LoadPkhexOptions {
  /**
   * 下载过程中反复调用，最后一次的 ratio 是 1。
   *
   * 调用很密（每个 chunk 一次），UI 那边不要直接 setState ——
   * 要么节流，要么写进 ref 再按帧刷
   */
  onProgress?: (progress: PkhexLoadProgress) => void;
}

/**
 * 运行时加载器。必须幂等，而且 **reject 时要把缓存的 promise 清掉** ——
 * 否则空态上那个「重试」按钮点一万次都拿到同一个已经失败的 promise。
 *
 * 已经在下载中时再调一次，onProgress 要挂到同一次下载上，不能另起一份
 */
export type LoadPkhex = (options?: LoadPkhexOptions) => Promise<PkhexApi>;
