/**
 * 跨 wasm 边界的错误。
 *
 * [JSExport] 只把托管异常的 message 字符串带过来，异常类型和堆栈全丢了，
 * 所以错误码是编在 message 里的（C# 侧 BridgeException 拼成 "CODE: detail"）。
 */

export const PKHEX_ERROR_CODES = [
  /** 没调 Initialize() 就开始解析。加载器的时序问题 */
  "PKHEX_NOT_INITIALIZED",
  /** SaveUtil 认不出这份字节 */
  "PKHEX_UNRECOGNIZED_SAVE",
  /** 认出来了，但不在第 6～9 世代的支持范围内 */
  "PKHEX_UNSUPPORTED_GENERATION",
  /** handle 已经 close 过，或者根本不是这个 runtime 发出去的 */
  "PKHEX_INVALID_HANDLE",
  /** 传进去的值超出本作范围（种族编号、招式编号、等级……） */
  "PKHEX_OUT_OF_RANGE",
  /** 对空格子取 mon handle */
  "PKHEX_EMPTY_SLOT",
  /** 其余一切。message 里有原文 */
  "PKHEX_INTERNAL",
] as const;

export type PkhexErrorCode = (typeof PKHEX_ERROR_CODES)[number];

export class PkhexError extends Error {
  readonly code: PkhexErrorCode;

  constructor(code: PkhexErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "PkhexError";
    this.code = code;
  }
}

/**
 * 把任意抛出物归一成 PkhexError。
 *
 * 用搜索而不是从头匹配 —— 不同的 runtime build 会在 message 前面加上托管异常的
 * 类型名，锚定开头会漏掉全部真实错误。
 */
export function toPkhexError(cause: unknown): PkhexError {
  if (cause instanceof PkhexError) return cause;

  const message = cause instanceof Error ? cause.message : String(cause);
  const found = /PKHEX_[A-Z_]+/.exec(message)?.[0];
  const code = (PKHEX_ERROR_CODES as readonly string[]).includes(found ?? "")
    ? (found as PkhexErrorCode)
    : "PKHEX_INTERNAL";

  return new PkhexError(code, message, cause);
}
