/**
 * 打开和打包存档文件。
 *
 * 为什么要收发 zip：Switch 那边（JKSV）本来就是一个包一份备份，包里除了
 * main 还有 backup / poke_trade / .nx_save_meta.bin。以前用户从这里下载散
 * 文件再自己拷进 SD 卡，macOS 会给下载来的文件挂上 com.apple.quarantine，
 * 拷到 exFAT 时那些扩展属性被拆成一个 ._main 伴随文件；再用 Finder「压缩」
 * 又会多套一层目录并塞进 __MACOSX/。JKSV 把这些垃圾一并还原进存档分区，
 * 游戏读到不认识的文件就判存档损坏、直接走新游戏流程 —— 存档内容本身是好的。
 *
 * 整条链路走 zip 就绕开了：包里的条目不带扩展属性，包的结构由我们自己拼。
 */

import { PkhexError } from "./errors";
import { looksLikeZip, makeEntry, readEntryBytes, readZip, writeZip, type ZipEntry } from "./zip";

/** PKHeX 认的那个存档文件在 Switch 上就叫这个名，没有扩展名 */
const MAIN_NAME = "main";

const SLASH = 0x2f;

/**
 * 一份备份包的骨架。main 已经取出来喂给 PKHeX 了，
 * 这里留着的是导出时要原样打回去的东西 —— 条目都已经扁平化过
 */
export interface SavePackage {
  entries: ZipEntry[];
  /** main 在 entries 里的位置，导出时替换掉这一条 */
  mainIndex: number;
}

export interface OpenedSave {
  /** 喂给 loadSave 的字节 */
  main: Uint8Array;
  /** null 表示用户拖的是裸 main，导出也只能吐裸文件 */
  package: SavePackage | null;
}

/**
 * macOS 往不支持扩展属性的文件系统上写东西时拉下的一地鸡毛。
 * 这些进了存档分区就是游戏眼里的垃圾，读包的时候直接丢掉
 */
function isJunk(name: string): boolean {
  if (name.startsWith("__MACOSX/")) return true;
  const base = name.slice(name.lastIndexOf("/") + 1);
  return base.startsWith("._") || base === ".DS_Store";
}

/** 目录项在扁平的输出里没有意义，读的时候就跳过 */
function isDirectory(entry: ZipEntry): boolean {
  return entry.name.endsWith("/");
}

function baseName(name: string): string {
  return name.slice(name.lastIndexOf("/") + 1);
}

/**
 * 扁平化只在原始字节上做：砍掉最后一个斜杠之前的所有东西。
 * 不经过解码再编码的往返，非 ASCII 的名字一个字节都不会变
 */
function flattenRawName(rawName: Uint8Array): Uint8Array {
  const at = rawName.lastIndexOf(SLASH);
  return at === -1 ? rawName : rawName.slice(at + 1);
}

export async function openSaveFile(file: File): Promise<OpenedSave> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!looksLikeZip(bytes)) return { main: bytes, package: null };

  const all = readZip(bytes);
  const usable = all.filter((entry) => !isDirectory(entry) && !isJunk(entry.name));
  const mains = usable.filter((entry) => baseName(entry.name) === MAIN_NAME);

  if (mains.length === 0) {
    throw new PkhexError(
      "PKHEX_ZIP_NO_MAIN",
      "包里没有找到 main，这个压缩包不像是 JKSV 的存档备份",
    );
  }
  if (mains.length > 1) {
    throw new PkhexError(
      "PKHEX_ZIP_MULTIPLE_MAIN",
      `包里有 ${mains.length} 个 main：${mains.map((entry) => entry.name).join("、")}`,
    );
  }

  const mainEntry = mains[0];
  if (mainEntry.uncompressedSize === 0) {
    throw new PkhexError("PKHEX_ZIP_CORRUPT", "包里的 main 是个空文件");
  }

  /**
   * 只收和 main 同一层目录的兄弟条目。
   *
   * 一是别的目录里的东西本来就不属于这份存档，二是扁平化之后
   * 两个目录里的同名文件会撞在一起 —— 这么一限就不用再判重
   */
  const prefix = mainEntry.name.slice(0, mainEntry.name.lastIndexOf("/") + 1);
  const siblings = usable.filter(
    (entry) => entry.name.startsWith(prefix) && !entry.name.slice(prefix.length).includes("/"),
  );

  const entries = siblings.map((entry) => ({ ...entry, rawName: flattenRawName(entry.rawName) }));

  return {
    main: await readEntryBytes(mainEntry),
    package: { entries, mainIndex: siblings.indexOf(mainEntry) },
  };
}

/** 把改过的 main 放回包里重新打平。pack 为 null 时原样吐裸字节 */
export async function buildSaveFile(
  main: Uint8Array,
  pack: SavePackage | null,
): Promise<Uint8Array> {
  if (!pack) return main;

  const previous = pack.entries[pack.mainIndex];
  // main 确实变了，时间戳跟着走；兄弟条目原样保留，包括它们各自的时间
  const replaced = await makeEntry(previous.rawName, main, new Date());

  const entries = pack.entries.map((entry, index) => (index === pack.mainIndex ? replaced : entry));
  const out = writeZip(entries);

  /**
   * 自己解一遍再确认。
   *
   * 用户上一版包的下场是游戏说存档损坏，这时候多花一毫秒把目录重扫一遍、
   * 确认条目数和 main 的校验和都对得上，比事后在 Switch 上排查便宜得多
   */
  const check = readZip(out);
  if (check.length !== entries.length || check[pack.mainIndex].crc32 !== replaced.crc32) {
    throw new PkhexError("PKHEX_ZIP_CORRUPT", "打包出来的压缩包自检没过，没有下载");
  }

  return out;
}
