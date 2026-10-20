"use client";

import { Download, FileUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadBytes } from "@/lib/pkhex/download";
import { toPkhexError } from "@/lib/pkhex/errors";
import { buildSaveFile } from "@/lib/pkhex/save-package";

import { useEditorStore } from "./save-editor-context";
import { blockingSlots, describeSlot } from "./save-editor-store";

/** 拦导出的格子最多点名几个，再多就折成「等 N 处」，免得工具栏被撑爆 */
const NAMED_BLOCKERS = 3;

/** 存档里存的是数字世代，中文得按「第九世代」念 */
const GENERATION_NAMES = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function SaveToolbar() {
  /**
   * 工具栏只关心这几项，格子选中、草稿变动都不该让它重画。
   *
   * session 整个拿着而不是只取 info：export() / close() 是实例方法，
   * 摘出来单独存就丢了 this，Session 那几个 # 私有字段会直接读不到
   */
  const { session, fileName, savePackage, hasUnexportedChanges, touched } = useEditorStore(
    useShallow((state) => ({
      session: state.session,
      fileName: state.fileName,
      savePackage: state.savePackage,
      hasUnexportedChanges: state.hasUnexportedChanges,
      touched: state.touched,
    })),
  );

  const markExported = useEditorStore((state) => state.markExported);
  const closeSave = useEditorStore((state) => state.closeSave);
  const raiseError = useEditorStore((state) => state.raiseError);

  // 打包 8.8 MB 要几百毫秒，没有反馈用户会连点
  const [packing, setPacking] = useState(false);

  if (!session) return null;

  const { info } = session;

  /**
   * 只有这次会话动过、而且动完不合法的格子会拦导出。
   * 存档里原本就不合法的个体不算 —— 那是用户拿这个工具来修的东西，不是他造成的
   */
  const blockers = blockingSlots(touched);
  const blockedReason =
    blockers.length === 0
      ? null
      : `${blockers
          .slice(0, NAMED_BLOCKERS)
          .map((entry) => describeSlot(entry.box, entry.slot))
          .join(
            "、",
          )}${blockers.length > NAMED_BLOCKERS ? ` 等 ${blockers.length} 处` : ""}不合法，改好才能导出`;

  async function handleExport() {
    if (!session || blockers.length > 0 || packing) return;
    setPacking(true);
    try {
      // 进什么出什么：从备份包打开的就打回备份包，裸文件就还是裸文件 ——
      // 裸文件那条路没有 backup 和 .nx_save_meta.bin，本来就凑不齐一个包
      const bytes = await buildSaveFile(session.export(), savePackage);
      // 文件名沿用原名不加时间戳 —— 用户拿它去覆盖原存档
      downloadBytes(bytes, fileName, savePackage ? "application/zip" : "application/octet-stream");
      markExported();
    } catch (cause) {
      raiseError(toPkhexError(cause).message);
    } finally {
      setPacking(false);
    }
  }

  function handleChangeFile() {
    session?.close();
    closeSave();
  }

  return (
    <div
      data-testid="pkhex-toolbar"
      className="flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm shadow-xs ring-1 ring-foreground/10"
    >
      <span data-testid="pkhex-save-filename" className="font-heading font-medium">
        {fileName}
      </span>

      <Badge data-testid="pkhex-save-generation" variant="secondary">
        第{GENERATION_NAMES[info.generation] ?? info.generation}世代
      </Badge>

      <Badge data-testid="pkhex-save-boxcount" variant="outline">
        {/* Badge 是 inline-flex，子元素之间的空格会被吃掉，所以整句包成一个 flex item */}
        <span>
          <span className="font-mono">{info.boxCount}</span> 箱
        </span>
      </Badge>

      {hasUnexportedChanges && (
        <Badge data-testid="pkhex-dirty-badge" variant="destructive">
          有改动未导出
        </Badge>
      )}

      {blockedReason && (
        <span data-testid="pkhex-export-blocked" role="status" className="text-xs text-destructive">
          {blockedReason}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button
          data-testid="pkhex-change-file-button"
          variant="outline"
          size="sm"
          onClick={handleChangeFile}
        >
          <FileUp />
          更换文件
        </Button>

        <Button
          data-testid="pkhex-export-button"
          size="sm"
          disabled={blockers.length > 0 || packing}
          onClick={() => void handleExport()}
        >
          {packing ? <Loader2 className="animate-spin" /> : <Download />}
          {/* 拿到手的东西确实不一样：一个能直接喂回 JKSV，一个是裸 main */}
          {packing ? "正在打包…" : savePackage ? "导出备份包" : "导出存档"}
        </Button>
      </div>
    </div>
  );
}
