/**
 * [JSExport] 暴露出来的原始形状，和 pkhex-wasm/src/PkhexBridge.Wasm/Exports.cs
 * 一一对应。手写镜像，两边一起改。
 *
 * 这一层刻意保持「难用」：方法名是 PascalCase、参数是裸编号、读取返回 JSON
 * 字符串。好用的门面在 lib/pkhex/index.ts，UI 只该碰那一层。
 *
 * 封送规则（.NET 的 JS interop 类型表）：
 *   byte[]  ↔ Uint8Array（拷贝，不共享内存）
 *   int[]   ↔ Int32Array（同上）
 *   string  ↔ string
 * 托管对象传不过来，所以存档和个体都用 int handle 指代。
 */
export interface BridgeExports {
  /** 注册纯托管的 AES/MD5，返回 PKHeX.Core 版本串。幂等，必须先于任何解析 */
  Initialize(): string;

  LoadSave(data: Uint8Array): number;
  CloseSave(sav: number): void;
  ExportSave(sav: number): Uint8Array;

  /** JSON: SaveInfo */
  GetSaveInfo(sav: number): string;
  /** JSON: (SlotSummary | null)[] */
  GetBox(sav: number, box: number): string;
  /** JSON: (SlotSummary | null)[] */
  GetParty(sav: number): string;
  /** JSON: PkhexStringTables */
  GetStringTables(sav: number): string;

  /** JSON: MonDetail */
  GetMon(mon: number): string;
  /** JSON: LegalityReport。最重的一条，别频繁调 */
  GetLegality(mon: number): string;
  /**
   * JSON: LegalityReport。吃独立的个体文件字节，不经过存档。
   * extension 是格式提示（"pk6" / ".pk6"），**空串表示不给提示** ——
   * 那样 PK6/PK7、PK8/PB8、PK9/PA9 这三对会被认成后者，判出假非法
   */
  CheckEntity(data: Uint8Array, extension: string): string;
  GetIVs(mon: number): Int32Array;
  GetEVs(mon: number): Int32Array;
  GetMoves(mon: number): Int32Array;

  SetSpecies(mon: number, value: number): void;
  SetForm(mon: number, value: number): void;
  SetNickname(mon: number, value: string): void;
  SetLevel(mon: number, value: number): void;
  SetExp(mon: number, value: number): void;
  SetNature(mon: number, value: number): void;
  SetStatNature(mon: number, value: number): void;
  SetAbilityIndex(mon: number, value: number): void;
  SetGender(mon: number, value: number): void;
  SetShiny(mon: number, value: boolean): void;
  SetHeldItem(mon: number, value: number): void;
  SetBall(mon: number, value: number): void;
  SetIVs(mon: number, value: Int32Array): void;
  SetEVs(mon: number, value: Int32Array): void;
  SetMoves(mon: number, value: Int32Array): void;
  SetFriendship(mon: number, value: number): void;
}
