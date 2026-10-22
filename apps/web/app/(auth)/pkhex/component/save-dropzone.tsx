"use client";

import { cn } from "cn";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { toPkhexError } from "@/lib/pkhex/errors";
import { openSaveFile } from "@/lib/pkhex/save-package";
import type { PkhexLoadProgress } from "@/lib/pkhex/types";

import { EditorAlert } from "./editor-alert";
import { useEditorStore } from "./save-editor-context";
import { usePkhexRuntime } from "./use-pkhex-runtime";

type Phase = "idle" | "loading" | "parsing" | "error";

/** 「57 KB」这种给人看的大小。认不出存档时要连字节数一起报，光说「失败」没法排查 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 「已加载 3.2 MB / 6.1 MB（52%）」。总量拿不到时返回 null，调用方退回不确定进度条 */
function describeProgress(progress: PkhexLoadProgress | null): string | null {
  if (!progress || progress.totalBytes <= 0) return null;
  const percent = Math.round(progress.ratio * 100);
  return `已加载 ${formatSize(progress.loadedBytes)} / ${formatSize(progress.totalBytes)}（${percent}%）`;
}

function describeFailure(file: File, cause: unknown): string {
  const failure = toPkhexError(cause);
  const what = `${file.name}（${formatSize(file.size)}）`;

  switch (failure.code) {
    case "PKHEX_UNRECOGNIZED_SAVE":
      return `${what}不是能识别的存档格式，支持第 6～9 世代`;
    case "PKHEX_UNSUPPORTED_GENERATION":
      return `${what}是能认出的存档，但不在支持范围内，只支持第 6～9 世代`;
    case "PKHEX_ZIP_NO_MAIN":
      return `${what}里没有找到 main —— 这个包不像是 JKSV 的存档备份`;
    case "PKHEX_ZIP_MULTIPLE_MAIN":
      return `${what}里有多个 main，不知道该改哪一个。${failure.message}`;
    case "PKHEX_ZIP_CORRUPT":
      return `${what}是个读不下去的压缩包：${failure.message}`;
    case "PKHEX_ZIP_UNSUPPORTED":
      return `${what}用了不支持的压缩包特性：${failure.message}`;
    default:
      return `${what}打开失败：${failure.message}`;
  }
}

/**
 * 空态兼拖拽区。
 *
 * 四种状态原地换文案，不弹层也不挪位置 —— 框一跳用户会以为自己点歪了。
 */
export function SaveDropzone() {
  const error = useEditorStore((state) => state.error);
  const loadSave = useEditorStore((state) => state.loadSave);
  const raiseError = useEditorStore((state) => state.raiseError);
  const dismissError = useEditorStore((state) => state.dismissError);

  const runtime = usePkhexRuntime();

  const [parsingName, setParsingName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const phase: Phase = error
    ? "error"
    : runtime.status === "loading"
      ? "loading"
      : parsingName
        ? "parsing"
        : "idle";

  // 引擎还在下载、或者上一份文件还在解析时，不收新的文件 ——
  // 否则用户能在半路反复选文件，每次都排一个 openFile
  const busy = phase === "loading" || phase === "parsing";
  const progressText = describeProgress(runtime.progress);
  const ratio = runtime.progress?.ratio ?? 0;

  /**
   * 6 MB 的解析引擎不在进页面时下载 —— 大多数人只是路过。
   * 鼠标挪到拖拽区、或者文件刚拖进来时才预热，等真选了文件就已经在缓存里了
   */
  function prewarm() {
    if (runtime.status !== "idle") return;
    void runtime.ensure().catch(() => {
      raiseError("存档解析引擎没能加载，检查网络后点重试");
    });
  }

  async function openFile(file: File) {
    dismissError();
    setParsingName(file.name);
    try {
      const api = await runtime.ensure();
      // 拖进来的可能是 JKSV 的整个备份包。包里除 main 之外的条目要留着，
      // 导出时原样打回去 —— 那几个文件 JKSV 还原时都要用
      const opened = await openSaveFile(file);
      loadSave(api.loadSave(opened.main), file.name, opened.package);
    } catch (cause) {
      raiseError(describeFailure(file, cause));
    } finally {
      setParsingName(null);
    }
  }

  // 点整块开系统选择器、拖进来走 onDrop，两条路径汇进同一个 openFile
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 选同一个文件两次也要能重新解析，所以把 input 的值清掉
    event.target.value = "";
    if (file) void openFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    // preventDefault 照样要调 —— 不然浏览器会直接导航到这个文件
    event.preventDefault();
    setDragging(false);
    if (busy) return;

    const file = event.dataTransfer.files?.[0];
    if (file) void openFile(file);
  }

  return (
    <div
      data-testid="pkhex-dropzone"
      data-phase={phase}
      data-dragging={dragging || undefined}
      onPointerEnter={prewarm}
      onDragEnter={() => {
        setDragging(true);
        prewarm();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-10 transition-colors",
        dragging && "border-primary bg-primary/5",
        phase === "error" && "border-destructive/40",
      )}
    >
      {/* label 要撑满整块，否则只有正中间那几行字可点，四周的留白点了没反应 */}
      <label
        className={cn(
          "flex w-full flex-1 flex-col items-center justify-center gap-2 text-center",
          busy ? "cursor-wait" : "cursor-pointer",
        )}
      >
        {/*
          加载中只是 disabled，元素和 testid 都留着 ——
          换成不渲染的话 Playwright 连它存不存在都断言不了
        */}
        <input
          data-testid="pkhex-file-input"
          type="file"
          className="sr-only"
          disabled={busy}
          onChange={handleChange}
        />

        {phase === "loading" || phase === "parsing" ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : (
          <Upload className="size-8 text-muted-foreground" />
        )}

        <span className="font-heading text-base font-medium">
          {phase === "loading" && "正在加载存档解析引擎…"}
          {phase === "parsing" && `正在解析 ${parsingName}`}
          {phase === "error" && "存档没能打开"}
          {phase === "idle" && "把存档文件拖进来，或点击选择"}
        </span>

        <span
          data-testid="pkhex-runtime-status"
          data-status={phase}
          data-ratio={ratio.toFixed(2)}
          className="text-xs text-muted-foreground"
        >
          {phase === "loading" && "约 6 MB，首次需要几秒，之后会走浏览器缓存"}
          {phase === "parsing" && "文件只在浏览器里处理，不会上传"}
          {phase === "error" && "换一个文件，或者点下面的重试"}
          {phase === "idle" && "JKSV 的 zip 备份包，或单独的 main 文件 · 第 6～9 世代"}
        </span>

        {phase === "loading" && (
          <span className="mt-1 flex w-56 flex-col items-center gap-1.5">
            <span
              className="block h-1 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressText ? Math.round(ratio * 100) : undefined}
            >
              {progressText ? (
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              ) : (
                // 清单里没有总字节数，算不出百分比，退回不确定进度条 ——
                // 显示「NaN%」或者一直卡在 0% 比没有进度条更糟
                <span className="block size-full animate-pulse rounded-full bg-primary" />
              )}
            </span>

            {progressText && <span className="font-mono text-xs tabular-nums">{progressText}</span>}
          </span>
        )}
      </label>

      {phase === "error" && (
        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <EditorAlert />
          <Button
            data-testid="pkhex-runtime-retry"
            variant="outline"
            onClick={() => {
              dismissError();
              void runtime.ensure().catch(() => {
                raiseError("存档解析引擎没能加载，检查网络后点重试");
              });
            }}
          >
            <RotateCcw />
            重试
          </Button>
        </div>
      )}
    </div>
  );
}
