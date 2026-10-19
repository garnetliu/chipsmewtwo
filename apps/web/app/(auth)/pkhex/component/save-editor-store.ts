/**
 * 编辑器的状态。用 zustand 的 vanilla store，不碰 React ——
 * 持有实例和订阅在 save-editor-context.tsx。
 *
 * 两级脏标记不能合并：dirtyFields 是「草稿改了还没写回存档」，切格子时拦；
 * hasUnexportedChanges 是「写回存档了还没导出」，关页面时拦。合成一个的话，
 * 刚点完「应用修改」就会变成不脏，用户能一声不吭地把改动关掉。
 */

import { createStore, type StoreApi } from "zustand/vanilla";

import { toPkhexError } from "@/lib/pkhex/errors";
import {
  applyDraft as writeDraftToSave,
  diffDraft,
  isEmptySlot,
  PARTY_BOX_INDEX,
  slotKey,
  toDraft,
} from "@/lib/pkhex/slot";
import type {
  LegalityReport,
  MonDetail,
  MonEditor,
  SaveSession,
  SlotDraft,
  SlotDraftField,
  SlotSummary,
} from "@/lib/pkhex/types";

/** 选中的格子。box 为 -1 表示队伍，和 wasm 那边同一套坐标 */
export interface SelectedSlot {
  box: number;
  slot: number;
}

/** 一次导航请求。slot 为 null 表示只换箱子，不动选中格 */
export interface NavTarget {
  box: number;
  slot: number | null;
}

/**
 * 种族的展示资料，来自 GraphQL。
 *
 * 整条记录为 null 表示「查过了，库里没有这一只」——
 * 要靠它和「还没查过」区分开，否则每次切箱都会为同一批缺失编号再发一次请求
 */
export interface SpeciesMeta {
  name: string;
  /** 默认形态的图。形态没有图时是 null，格子回落到编号占位 */
  imageUrl: string | null;
}

/** 这次会话里动过的一格，连同它最新的检查结果 */
export interface TouchedSlot {
  box: number;
  slot: number;
  report: LegalityReport;
}

/** 报告整体的严重程度。issues 里只会有 invalid / fishy，全都没有就是 valid */
export type LegalityLevel = "valid" | "fishy" | "invalid";

export function levelOf(report: LegalityReport): LegalityLevel {
  if (!report.valid) return "invalid";
  return report.issues.length > 0 ? "fishy" : "valid";
}

/** 「3 号箱第 7 格」/「队伍第 2 格」。拦导出时要说清是哪一格，光说「有不合法的」没法排查 */
export function describeSlot(box: number, slot: number): string {
  return box === PARTY_BOX_INDEX ? `队伍第 ${slot + 1} 格` : `${box + 1} 号箱第 ${slot + 1} 格`;
}

/** 表里所有拦着导出的格子，按箱号槽位排好 */
export function blockingSlots(touched: ReadonlyMap<string, TouchedSlot>): TouchedSlot[] {
  return [...touched.values()]
    .filter((entry) => !entry.report.valid)
    .sort((a, b) => a.box - b.box || a.slot - b.slot);
}

export interface EditorState {
  session: SaveSession | null;
  fileName: string;
  /**
   * 存档被改过多少次。箱子摘要是每次渲染从 session 现读的，而 wasm 改值是
   * 原地改、引用不换，只能靠这个计数把 useMemo 顶掉
   */
  revision: number;
  boxIndex: number;
  selected: SelectedSlot | null;
  detail: MonDetail | null;
  /** 打开这一格时的原值，diff 的基准 */
  baseline: SlotDraft | null;
  draft: SlotDraft | null;
  dirtyFields: SlotDraftField[];
  hasUnexportedChanges: boolean;
  /** 带着未应用的改动要切走时，先把目标存这儿，等对话框给结论 */
  pendingNav: NavTarget | null;
  species: ReadonlyMap<number, SpeciesMeta | null>;
  /** 当前打开这一格的检查结果。没选格子或者选的是空格时为 null */
  legality: LegalityReport | null;
  /**
   * 这次会话里动过的格子 → 它最新的检查结果，键是 slotKey(box, slot)。
   *
   * 导出**只看这张表**：真实存档里本来就可能躺着不合法的个体（不少人用 PKHeX
   * 恰恰是因为存档被人改过），为一只用户压根没碰过的精灵拦下导出，工具就没法用了
   */
  touched: ReadonlyMap<string, TouchedSlot>;
  error: string | null;
}

export interface EditorActions {
  loadSave: (session: SaveSession, fileName: string) => void;
  closeSave: () => void;
  markExported: () => void;

  /** 想切到别的格子/箱子。草稿还脏就先弹确认框，不脏就直接过去 */
  requestNav: (target: NavTarget) => void;
  confirmNav: () => void;
  cancelNav: () => void;

  changeDraft: (patch: Partial<SlotDraft>) => void;
  /** 把脏字段写回 wasm。成功返回 true，失败会自己把 error 摆出来 */
  applyDraft: () => boolean;
  discardDraft: () => void;

  loadSpecies: (entries: [number, SpeciesMeta | null][]) => void;
  raiseError: (message: string) => void;
  dismissError: () => void;
}

export type EditorStore = EditorState & EditorActions;
export type EditorStoreApi = StoreApi<EditorStore>;

const INITIAL_EDITOR_STATE: EditorState = {
  session: null,
  fileName: "",
  revision: 0,
  boxIndex: 0,
  selected: null,
  detail: null,
  baseline: null,
  draft: null,
  dirtyFields: [],
  hasUnexportedChanges: false,
  pendingNav: null,
  species: new Map(),
  legality: null,
  touched: new Map(),
  error: null,
};

/** 一箱或者队伍的定长摘要数组。队伍走 party()，别的走 box() */
export function readSlots(session: SaveSession, box: number): (SlotSummary | null)[] {
  return box === PARTY_BOX_INDEX ? session.party() : session.box(box);
}

/** 拿到这一格的写接口。空格子没有个体，返回 null */
function editorAt(session: SaveSession, box: number, slot: number): MonEditor | null {
  const summary = readSlots(session, box)[slot];
  if (!summary || isEmptySlot(summary)) return null;
  return session.mon(summary.handle);
}

/** 真正落到选中格上。空格子没有草稿，面板走空态 */
function openSlotPatch(state: EditorState, box: number, slot: number): Partial<EditorState> {
  if (!state.session) return {};

  const editor = editorAt(state.session, box, slot);
  const detail = editor?.read() ?? null;
  // 开面板时跑一次，让用户先看见这一格现在合不合法。
  // 只跑当前这一格 —— 整箱批量跑会把 PKHeX 最重的那条路径乘以 30
  const legality = editor?.legality() ?? null;

  return {
    // 队伍格在任何箱子下都看得见，所以选队伍不改当前箱
    boxIndex: box === PARTY_BOX_INDEX ? state.boxIndex : box,
    selected: { box, slot },
    detail,
    // 基线和草稿各取一份，toDraft 每次都新建数组，改草稿不会顺手改了基线
    baseline: detail ? toDraft(detail) : null,
    draft: detail ? toDraft(detail) : null,
    legality,
    dirtyFields: [],
    pendingNav: null,
  };
}

function navigatePatch(state: EditorState, target: NavTarget): Partial<EditorState> {
  if (target.slot !== null) return openSlotPatch(state, target.box, target.slot);

  // 只换箱：队伍的选中格跨箱还在画面上，留着；箱子里的选中格已经看不见了，清掉
  const keepSelection = state.selected?.box === PARTY_BOX_INDEX;

  return {
    boxIndex: target.box,
    pendingNav: null,
    ...(keepSelection
      ? {}
      : {
          selected: null,
          detail: null,
          baseline: null,
          draft: null,
          legality: null,
          dirtyFields: [],
        }),
  };
}

/**
 * 每次打开页面建一份，**不要做成模块级单例** ——
 * 状态是跟着一次「打开存档」的会话走的，模块级实例在客户端路由下会残留，
 * 离开再回来还端着上一份 session
 */
export function createEditorStore(): EditorStoreApi {
  return createStore<EditorStore>()((set, get) => ({
    ...INITIAL_EDITOR_STATE,

    loadSave: (session, fileName) =>
      set((state) => ({
        ...INITIAL_EDITOR_STATE,
        // 查过的种族资料跟存档无关，换文件不用重查
        species: state.species,
        session,
        fileName,
      })),

    closeSave: () => set((state) => ({ ...INITIAL_EDITOR_STATE, species: state.species })),

    markExported: () => set({ hasUnexportedChanges: false }),

    requestNav: (target) => {
      const state = get();
      // 草稿还脏就先问，别让用户点一下就丢了刚敲的东西
      set(state.dirtyFields.length > 0 ? { pendingNav: target } : navigatePatch(state, target));
    },

    confirmNav: () => {
      const state = get();
      if (state.pendingNav) set(navigatePatch(state, state.pendingNav));
    },

    cancelNav: () => set({ pendingNav: null }),

    changeDraft: (patch) => {
      const { draft, baseline } = get();
      if (!draft || !baseline) return;

      const next = { ...draft, ...patch };
      set({ draft: next, dirtyFields: diffDraft(baseline, next) });
    },

    /**
     * 写回 wasm 是副作用，但 zustand 的 action 不要求纯，所以「写回 + 读回来 +
     * 重跑检查 + 重设基线 + 置未导出」合在这一个动作里，调用方不用再自己串时序。
     *
     * 顺序是：先按 slot.ts 的固定顺序把脏字段逐个写进存档（species 必须先写，
     * 换种族会重算形态/特性/性别），再整只读回来当新基线，跑一次合法性检查
     * 记进 touched，最后一次性 set。
     *
     * **不合法也照样写回**：用户得先把值落进去、看见为什么不合法，才知道该怎么改。
     * 拦在导出那一步就够了
     */
    applyDraft: () => {
      const { session, selected, draft, dirtyFields, revision, touched } = get();
      if (!session || !selected || !draft || dirtyFields.length === 0) return false;

      const summary = readSlots(session, selected.box)[selected.slot];
      if (!summary) return false;

      const editor = session.mon(summary.handle);

      /** 动过的格子都要进表，哪怕这次写回是半路失败的 —— 存档已经被改了 */
      const withTouched = (report: LegalityReport) => {
        const next = new Map(touched);
        next.set(slotKey(selected.box, selected.slot), {
          box: selected.box,
          slot: selected.slot,
          report,
        });
        return next;
      };

      try {
        writeDraftToSave(editor, draft, dirtyFields);
      } catch (cause) {
        // setter 是逐个写回的，中途抛错意味着前面几个已经落进存档了。
        // 重新读一次把基线对回存档的真实状态，草稿留着让用户改那个出错的字段；
        // hasUnexportedChanges 宁可多置一次 —— 代价只是多一次关页面确认
        const detail = editor.read();
        const baseline = toDraft(detail);
        const report = editor.legality();
        set({
          revision: revision + 1,
          detail,
          baseline,
          dirtyFields: diffDraft(baseline, draft),
          hasUnexportedChanges: true,
          legality: report,
          touched: withTouched(report),
          error: toPkhexError(cause).message,
        });
        return false;
      }

      const detail = editor.read();
      const report = editor.legality();
      set({
        revision: revision + 1,
        detail,
        baseline: toDraft(detail),
        draft: toDraft(detail),
        dirtyFields: [],
        hasUnexportedChanges: true,
        legality: report,
        touched: withTouched(report),
      });
      return true;
    },

    discardDraft: () => {
      const { baseline } = get();
      if (baseline) set({ draft: { ...baseline }, dirtyFields: [] });
    },

    loadSpecies: (entries) =>
      set((state) => {
        const species = new Map(state.species);
        for (const [id, meta] of entries) species.set(id, meta);
        return { species };
      }),

    raiseError: (message) => set({ error: message }),

    dismissError: () => set({ error: null }),
  }));
}
