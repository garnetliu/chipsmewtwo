/**
 * 最小可用的 zip 读写。
 *
 * 只为一件事存在：收发 JKSV 的存档备份包。一次改动只碰包里的 main，
 * 其余条目一个字节都不该动 —— 所以这里**不解压也不重压**它们，读进来是什么
 * 压缩字节，写回去就是什么。「原样保留」不靠重新压缩压对，靠根本没碰过。
 *
 * 解压本身交给浏览器原生的 DecompressionStream，我们只负责目录结构的拆装。
 * 撑不住的特性（zip64、加密、deflate 以外的方法）一律在读取时就拒掉，
 * 不做半懂不懂的猜测 —— 猜错了用户拿到的是一份游戏读不出来的存档。
 */

import { PkhexError } from "./errors";

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const EOCD_SIZE = 22;
const CENTRAL_HEADER_SIZE = 46;
const LOCAL_HEADER_SIZE = 30;

/** zip 注释字段是 u16，所以 EOCD 最远也就躲在末尾 64 KB 加自身长度的位置 */
const MAX_COMMENT = 0xffff;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/** 误拖一个大文件进来不该把整个标签页拖垮。存档包撑死十来 MB，256 MB 是极宽松的闸 */
const MAX_ZIP_SIZE = 256 * 1024 * 1024;

export interface ZipEntry {
  /** 解码后的路径。只用来匹配和过滤，不参与写回 */
  name: string;
  /**
   * 原始的文件名字节。写回时原样搬 ——
   * 不做「解码再编码」的往返，非 ASCII 的名字也就不会被写坏
   */
  rawName: Uint8Array;
  /** 0 = 存储，8 = deflate。其余在读取时就拒了，这里不会出现 */
  method: number;
  crc32: number;
  /** 原样的压缩字节，是整包的切片，没有拷贝 */
  compressed: Uint8Array;
  uncompressedSize: number;
  /** DOS 时间戳原样搬 —— 改一份存档不该顺手改了别的文件的时间 */
  dosTime: number;
  dosDate: number;
}

function corrupt(detail: string): PkhexError {
  return new PkhexError("PKHEX_ZIP_CORRUPT", detail);
}

function unsupported(detail: string): PkhexError {
  return new PkhexError("PKHEX_ZIP_UNSUPPORTED", detail);
}

/** 按魔数认，不看扩展名 —— 用户可能把包改名成 main，也可能反过来 */
export function looksLikeZip(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const [a, b, c, d] = bytes;
  // PK\x03\x04 是有内容的包，PK\x05\x06 是空包（整个文件只有一个 EOCD）
  return a === 0x50 && b === 0x4b && ((c === 0x03 && d === 0x04) || (c === 0x05 && d === 0x06));
}

let crcTable: Uint32Array | null = null;

function ensureCrcTable(): Uint32Array {
  if (crcTable) return crcTable;

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }

  crcTable = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = ensureCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * 找 EOCD。
 *
 * 光认签名不够：存档是加密数据，在末尾 64 KB 的随机字节里撞出一个
 * 0x06054b50 的概率不是零。再验一次「注释长度正好顶到文件尾」是免费的
 */
function findEocd(bytes: Uint8Array, view: DataView): number {
  const lowest = Math.max(0, bytes.length - EOCD_SIZE - MAX_COMMENT);

  for (let at = bytes.length - EOCD_SIZE; at >= lowest; at--) {
    if (view.getUint32(at, true) !== SIG_EOCD) continue;
    if (view.getUint16(at + 20, true) === bytes.length - at - EOCD_SIZE) return at;
  }

  throw corrupt("找不到 zip 的结尾记录，文件可能没下载完整");
}

/** 只扫中央目录，条目数据原样切片。8.8 MB 的包在毫秒级 */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length > MAX_ZIP_SIZE) {
    throw unsupported(`压缩包有 ${Math.round(bytes.length / 1024 / 1024)} MB，太大了`);
  }
  if (bytes.length < EOCD_SIZE) throw corrupt("文件太短，不是一个完整的 zip");

  const view = viewOf(bytes);
  const eocd = findEocd(bytes, view);

  const diskNum = view.getUint16(eocd + 4, true);
  const cdDisk = view.getUint16(eocd + 6, true);
  const count = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  if (diskNum !== 0 || cdDisk !== 0) throw unsupported("分卷压缩包不支持");
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw unsupported("这个包用了 zip64，不支持");
  }

  /**
   * 整个 zip 前面挂了东西时（自解压 stub，或者被人前置拼接过），
   * 目录里记的偏移是按原始包算的，全体加上这个差值才对得上
   */
  const delta = eocd - cdSize - cdOffset;
  let at = cdOffset + delta;
  if (at < 0 || at + cdSize > bytes.length) throw corrupt("中央目录的位置超出了文件范围");

  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (at + CENTRAL_HEADER_SIZE > bytes.length) throw corrupt("中央目录被截断了");
    if (view.getUint32(at, true) !== SIG_CENTRAL) throw corrupt(`第 ${i + 1} 条目录项的签名不对`);

    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const dosTime = view.getUint16(at + 12, true);
    const dosDate = view.getUint16(at + 14, true);
    const entryCrc = view.getUint32(at + 16, true);
    const compSize = view.getUint32(at + 20, true);
    const uncompSize = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);

    if (flags & 0x0001) throw unsupported("包里有加密的条目，不支持");
    if (method !== METHOD_STORE && method !== METHOD_DEFLATE) {
      throw unsupported(`压缩方法 ${method} 不认识，只支持存储和 deflate`);
    }
    if (compSize === 0xffffffff || uncompSize === 0xffffffff) {
      throw unsupported("这个包用了 zip64，不支持");
    }

    const rawName = bytes.slice(at + CENTRAL_HEADER_SIZE, at + CENTRAL_HEADER_SIZE + nameLen);

    /**
     * 数据从哪开始，中央目录里没写，只能去读一次本地头 ——
     * 而且要用**本地头自己的** nameLen / extraLen：这两个值跟目录里的可以不一样，
     * 实测 Finder 打的包本地头多挂了 0x20 字节的时间戳 extra field
     */
    const local = localOffset + delta;
    if (local < 0 || local + LOCAL_HEADER_SIZE > bytes.length) {
      throw corrupt(`「${decodeName(rawName)}」的本地头位置不对`);
    }
    if (view.getUint32(local, true) !== SIG_LOCAL) {
      throw corrupt(`「${decodeName(rawName)}」的本地头签名不对`);
    }

    const dataAt =
      local +
      LOCAL_HEADER_SIZE +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    if (dataAt + compSize > bytes.length) throw corrupt(`「${decodeName(rawName)}」的数据被截断了`);

    entries.push({
      name: decodeName(rawName),
      rawName,
      method,
      crc32: entryCrc,
      // 切片不拷贝：包里最大的那条 backup 有 4.4 MB，没必要再复制一份
      compressed: bytes.subarray(dataAt, dataAt + compSize),
      uncompressedSize: uncompSize,
      dosTime,
      dosDate,
    });

    at += CENTRAL_HEADER_SIZE + nameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * 文件名只解一份出来做匹配。
 *
 * zip 的历史包袱是 CP437 和 UTF-8 两套并存，但我们只拿它比对 "main"、
 * 认 "__MACOSX/" 前缀这种纯 ASCII 的东西，按 UTF-8 解足够；
 * 真正写回去的是 rawName 的原始字节，解错了也伤不到输出
 */
function decodeName(rawName: Uint8Array): string {
  return new TextDecoder("utf-8").decode(rawName);
}

async function pipe(bytes: Uint8Array, transform: GenericTransformStream): Promise<Uint8Array> {
  // 用 Response 收尾，省掉手写 reader 循环和分块拼接那二十行
  const source = new Blob([new Uint8Array(bytes)]).stream();
  const buffer = await new Response(source.pipeThrough(transform)).arrayBuffer();
  return new Uint8Array(buffer);
}

/** 解开一条，顺手验 CRC 和长度 —— 能抓出下载了一半的包 */
export async function readEntryBytes(entry: ZipEntry): Promise<Uint8Array> {
  let plain: Uint8Array;

  if (entry.method === METHOD_STORE) {
    plain = entry.compressed;
  } else {
    if (typeof DecompressionStream !== "function") {
      throw unsupported("这个浏览器解不了 zip，换 Chrome，或者直接拖 main 文件进来");
    }
    try {
      plain = await pipe(entry.compressed, new DecompressionStream("deflate-raw"));
    } catch (cause) {
      throw new PkhexError("PKHEX_ZIP_CORRUPT", `「${entry.name}」解压失败`, cause);
    }
  }

  if (plain.length !== entry.uncompressedSize) {
    throw corrupt(`「${entry.name}」解出来是 ${plain.length} 字节，和目录记的对不上`);
  }
  if (crc32(plain) !== entry.crc32) {
    throw corrupt(`「${entry.name}」的校验和对不上，文件在传输中损坏了`);
  }

  return plain;
}

function toDosDateTime(at: Date): { dosTime: number; dosDate: number } {
  return {
    dosTime: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
    // DOS 的纪元是 1980 年
    dosDate: ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  };
}

/**
 * 压一份新内容成条目。
 *
 * 用 deflate 而不是存储：JKSV 自己打的包每一条都是 deflate，
 * 而这份包要拿去喂回 Switch，没法预先验证，不值得在这儿引入一个新变量
 */
export async function makeEntry(
  rawName: Uint8Array,
  bytes: Uint8Array,
  at: Date,
): Promise<ZipEntry> {
  const { dosTime, dosDate } = toDosDateTime(at);
  const base = {
    name: decodeName(rawName),
    rawName,
    crc32: crc32(bytes),
    uncompressedSize: bytes.length,
    dosTime,
    dosDate,
  };

  // deflate 不可用时退回存储 —— zip 最基本的方法，任何解包器都认
  if (typeof CompressionStream !== "function") {
    return { ...base, method: METHOD_STORE, compressed: bytes };
  }

  /**
   * 存档是加密数据，deflate 压完反而涨一千多字节。照压不误 ——
   * 省这点体积换来的是「这条是 deflate，那条是存储」的不一致，
   * 而这份包要喂回 Switch，任何没法预先验证的差异都不划算
   */
  return {
    ...base,
    method: METHOD_DEFLATE,
    compressed: await pipe(bytes, new CompressionStream("deflate-raw")),
  };
}

/**
 * 写成一个扁平的包：条目直接躺在根上，没有目录项、没有 extra field、没有注释。
 *
 * 这正是本模块存在的理由 —— Finder 的「压缩」会多套一层目录再塞进 __MACOSX/，
 * JKSV 把那些东西一并还原进存档分区，游戏就判存档损坏了
 */
export function writeZip(entries: readonly ZipEntry[]): Uint8Array {
  let total = EOCD_SIZE;
  for (const entry of entries) {
    total += LOCAL_HEADER_SIZE + entry.rawName.length + entry.compressed.length;
    total += CENTRAL_HEADER_SIZE + entry.rawName.length;
  }

  const out = new Uint8Array(total);
  const view = viewOf(out);
  const offsets: number[] = [];

  let at = 0;
  for (const entry of entries) {
    offsets.push(at);

    view.setUint32(at, SIG_LOCAL, true);
    view.setUint16(at + 4, 20, true);
    // 标志位一律写 0：原值里可能带着「尺寸在数据描述符里」那一位，
    // 而我们不写描述符，抄过去就是自相矛盾
    view.setUint16(at + 6, 0, true);
    view.setUint16(at + 8, entry.method, true);
    view.setUint16(at + 10, entry.dosTime, true);
    view.setUint16(at + 12, entry.dosDate, true);
    view.setUint32(at + 14, entry.crc32, true);
    view.setUint32(at + 18, entry.compressed.length, true);
    view.setUint32(at + 22, entry.uncompressedSize, true);
    view.setUint16(at + 26, entry.rawName.length, true);
    view.setUint16(at + 28, 0, true);
    at += LOCAL_HEADER_SIZE;

    out.set(entry.rawName, at);
    at += entry.rawName.length;
    out.set(entry.compressed, at);
    at += entry.compressed.length;
  }

  const cdOffset = at;

  for (const [index, entry] of entries.entries()) {
    view.setUint32(at, SIG_CENTRAL, true);
    view.setUint16(at + 4, 20, true);
    view.setUint16(at + 6, 20, true);
    view.setUint16(at + 8, 0, true);
    view.setUint16(at + 10, entry.method, true);
    view.setUint16(at + 12, entry.dosTime, true);
    view.setUint16(at + 14, entry.dosDate, true);
    view.setUint32(at + 16, entry.crc32, true);
    view.setUint32(at + 20, entry.compressed.length, true);
    view.setUint32(at + 24, entry.uncompressedSize, true);
    view.setUint16(at + 28, entry.rawName.length, true);
    view.setUint16(at + 30, 0, true);
    view.setUint16(at + 32, 0, true);
    view.setUint16(at + 34, 0, true);
    view.setUint16(at + 36, 0, true);
    // 外部属性是 zip 里唯一能装 Unix 权限位的地方。写 0 和 JKSV 的原包一致，
    // 也就不会把 macOS 那边的权限带进 Switch
    view.setUint32(at + 38, 0, true);
    view.setUint32(at + 42, offsets[index], true);
    at += CENTRAL_HEADER_SIZE;

    out.set(entry.rawName, at);
    at += entry.rawName.length;
  }

  view.setUint32(at, SIG_EOCD, true);
  view.setUint16(at + 4, 0, true);
  view.setUint16(at + 6, 0, true);
  view.setUint16(at + 8, entries.length, true);
  view.setUint16(at + 10, entries.length, true);
  view.setUint32(at + 12, at - cdOffset, true);
  view.setUint32(at + 16, cdOffset, true);
  view.setUint16(at + 20, 0, true);

  return out;
}
