/**
 * 真 PKHeX 运行时的加载器。
 *
 * 产物在 public/pkhex/_framework/，由 `pnpm pkhex:build` 在 Docker 里生成
 * （本机装不了 .NET SDK）。这一层只负责「把 wasm 跑起来并拿到 [JSExport] 的原始
 * 形状」，好用的门面在 ./index.ts。
 */

import { PkhexError, toPkhexError } from "./errors";
import type { BridgeExports } from "./exports";
import type { LoadPkhexOptions, PkhexLoadProgress } from "./types";

const BASE = "/pkhex";
const ENTRY = `${BASE}/_framework/dotnet.js`;
const MANIFEST = `${BASE}/manifest.json`;

/** [JSExport] 的方法挂在「命名空间 + 类名」这条路径下，和 Exports.cs 对应 */
const EXPORT_PATH = ["PkhexBridge", "Wasm", "Exports"] as const;

/**
 * dotnet.js 没有随包发 .d.ts —— 生成它的那个 MSBuild target 要等 .NET 11。
 * 所以手写一份最小结构，只声明真正用到的那几个成员，多的一律不猜。
 */
interface DotnetRuntime {
  getConfig(): { mainAssemblyName?: string };
  getAssemblyExports(assemblyName: string): Promise<Record<string, unknown>>;
}

/** 运行时下载每个资源时都会过这个钩子，返回 Response 就用返回的那份 */
type ResourceLoader = (
  type: string,
  name: string,
  defaultUri: string,
  integrity: string,
  behavior: string,
) => string | Promise<Response> | null | undefined;

interface DotnetHostBuilder {
  withResourceLoader?(loader: ResourceLoader): DotnetHostBuilder;
  create(): Promise<DotnetRuntime>;
}

export interface PkhexBridge {
  readonly coreVersion: string;
  readonly exports: BridgeExports;
}

/**
 * 单例。**reject 时必须把它清掉** —— 否则空态上那个「重试」按钮
 * 点一万次都拿到同一个已经失败的 promise
 */
let booting: Promise<PkhexBridge> | null = null;

/** 在下载中时新来的订阅者挂到同一次下载上，不另起一份 */
const listeners = new Set<(progress: PkhexLoadProgress) => void>();

/** 最后一次进度。中途订阅的人先补一帧，不然进度条要等下一个 chunk 才动 */
let latest: PkhexLoadProgress | null = null;

/**
 * 失败过几次。dotnet.js 的 host builder 是**一次性**的：同一个模块实例上第二次
 * create() 直接抛 "Runtime module already loaded"，所以「重试」不能复用它。
 * 这个计数挂在 import 的 URL 上当 cache-buster，换一份全新的模块实例出来。
 *
 * 代价是**失败那次的 mono 实例留在内存里**（它还在等永远到不了的资源，没法叫停）。
 * 这是有意接受的：走到重试这一步时用户手上没有任何状态 —— 运行时都没起来，
 * 存档更没载入，为了回收这点内存去整页 reload 是更大的锤子，而重试本就是罕见路径。
 * 不是忘了清理
 */
let attempts = 0;

export function loadBridge(options?: LoadPkhexOptions): Promise<PkhexBridge> {
  const onProgress = options?.onProgress;
  if (onProgress) {
    listeners.add(onProgress);
    if (latest) onProgress(latest);
  }

  booting ??= boot().catch((error: unknown) => {
    booting = null;
    latest = null;
    listeners.clear();
    attempts += 1;
    throw toPkhexError(error);
  });

  const pending = booting;
  if (onProgress) {
    const drop = () => listeners.delete(onProgress);
    void pending.then(drop, drop);
  }

  return pending;
}

/** 只给测试和调试用：忘掉已经启动好的运行时，下次 loadBridge 重新走一遍 */
export function resetBridge(): void {
  booting = null;
  latest = null;
  listeners.clear();
  attempts += 1;
}

async function boot(): Promise<PkhexBridge> {
  const totalBytes = await readTotalBytes();
  let loadedBytes = 0;

  const report = (delta: number) => {
    loadedBytes += delta;
    latest = {
      loadedBytes,
      totalBytes,
      // 清单取不到时退化成 0，UI 那边该切回不确定进度条
      ratio: totalBytes > 0 ? Math.min(1, loadedBytes / totalBytes) : 0,
    };
    for (const listener of listeners) listener(latest);
  };

  // 路径必须来自变量 + 这两个 magic comment：bundler 看到字面量会试图把
  // dotnet.js 打进 chunk 里，而它要在运行期自己去 fetch 同目录的 wasm。
  // 重试时带上次数：URL 不一样才会拿到新的模块实例（见 attempts）
  const entry = attempts === 0 ? ENTRY : `${ENTRY}?retry=${attempts}`;
  const loaded: unknown = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ entry);

  const dotnet = (loaded as { dotnet?: DotnetHostBuilder }).dotnet;
  if (!dotnet) {
    throw new PkhexError("PKHEX_INTERNAL", `PKHEX_INTERNAL: ${ENTRY} 里没有 dotnet 导出`);
  }

  /**
   * 资源下载挂掉时 dotnet.create() **不会 reject**，mono 只在控制台打一行
   * "Error in mono_download_assets" 就把自己挂在那儿了 —— 界面会永远停在
   * 「正在加载存档解析引擎…」，既没有错误也没有重试按钮。
   * 所以自己留一个闩：加载钩子一见失败就把整次 boot 拒掉
   */
  let fail: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    fail = reject;
  });

  const builder =
    typeof dotnet.withResourceLoader === "function"
      ? dotnet.withResourceLoader(createLoader(report, fail))
      : dotnet;

  const runtime = await Promise.race([builder.create(), aborted]);
  const assembly = runtime.getConfig().mainAssemblyName ?? "PkhexBridge.Wasm";
  const exports = resolveExports(await runtime.getAssemblyExports(assembly));

  // 拿到 exports 立刻初始化：不注册纯托管的 AES/MD5 就去解存档，
  // 报出来的会是 PlatformNotSupportedException，看不出是时序问题
  const coreVersion = exports.Initialize();

  // 有的资源走了 HTTP 缓存不产生流量，收尾补一帧 100%
  if (latest && latest.ratio < 1) {
    report(Math.max(0, totalBytes - loadedBytes));
  }

  return { coreVersion, exports };
}

/**
 * boot config 是内联在 dotnet.js 里的（net10 起没有独立的 dotnet.boot.js），
 * 下载开始前读不到，所以总字节数走构建时生成的 manifest.json。
 */
async function readTotalBytes(): Promise<number> {
  try {
    const response = await fetch(MANIFEST);
    if (!response.ok) return 0;
    const manifest: unknown = await response.json();
    const total = (manifest as { totalBytes?: unknown }).totalBytes;
    return typeof total === "number" ? total : 0;
  } catch {
    // 清单拿不到不该让整个加载失败，退化成不确定进度就行
    return 0;
  }
}

function createLoader(
  report: (delta: number) => void,
  fail: (reason: unknown) => void,
): ResourceLoader {
  return (type, name, defaultUri) => {
    // dotnet*.js 那几个只接受 URL 字符串，给它 Response 会直接断言失败
    // （"loadBootResource response for 'dotnetjs' type should be a URL string"）。
    // 让它们走默认路径，进度差的那几百 KB 由收尾那一帧补上
    if (!defaultUri || type.startsWith("dotnetjs")) return undefined;

    const abort = (cause: unknown): never => {
      // 少一个程序集运行时就起不来，没有「部分成功」这回事，直接把 boot 拒掉
      fail(toPkhexError(cause));
      throw cause;
    };

    return fetch(defaultUri).then((response) => {
      if (!response.ok) {
        return abort(
          new PkhexError(
            "PKHEX_INTERNAL",
            `PKHEX_INTERNAL: ${name} 下载失败（HTTP ${response.status}）`,
          ),
        );
      }

      if (!response.body) return response;

      const reader = response.body.getReader();
      const counted = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          report(value.byteLength);
          controller.enqueue(value);
        },
        cancel: (reason) => reader.cancel(reason),
      });

      // 头要原样带上：dotnet.native.wasm 靠 Content-Type: application/wasm
      // 才能走流式编译，丢了会退回慢路径
      return new Response(counted, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }, abort);
  };
}

function resolveExports(root: Record<string, unknown>): BridgeExports {
  let node: unknown = root;
  for (const segment of EXPORT_PATH) {
    node = (node as Record<string, unknown> | undefined)?.[segment];
    if (!node) {
      throw new PkhexError(
        "PKHEX_INTERNAL",
        `PKHEX_INTERNAL: 程序集里找不到 ${EXPORT_PATH.join(".")}`,
      );
    }
  }
  return node as BridgeExports;
}
