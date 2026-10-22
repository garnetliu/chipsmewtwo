"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useEditorStore } from "./save-editor-context";

/**
 * 带着没应用的改动要切走时弹这个。
 *
 * 三个出口都给全：直接丢掉会让人白敲一遍，只给「保存」又变成强制 ——
 * 用户点错格子的次数比想象中多，得留一条原地不动的路
 */
export function DiscardChangesDialog() {
  const pendingNav = useEditorStore((state) => state.pendingNav);
  const dirtyCount = useEditorStore((state) => state.dirtyFields.length);

  const applyDraft = useEditorStore((state) => state.applyDraft);
  const confirmNav = useEditorStore((state) => state.confirmNav);
  const cancelNav = useEditorStore((state) => state.cancelNav);

  function saveAndGo() {
    // 写回失败时 applyDraft 已经把 error 摆出来了，这里就别再切走 ——
    // 让用户留在出问题的那一格上把值改对
    if (applyDraft()) confirmNav();
    else cancelNav();
  }

  return (
    <Dialog
      open={pendingNav !== null}
      onOpenChange={(open) => {
        // 点遮罩或者按 Esc 等同于「留在当前格」，不能顺手丢改动
        if (!open) cancelNav();
      }}
    >
      <DialogContent data-testid="pkhex-discard-dialog" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>这一格还有没应用的改动</DialogTitle>
          <DialogDescription>
            {dirtyCount} 处改动还没写回存档，切走就没了。要先保存吗？
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button data-testid="pkhex-discard-cancel" variant="ghost" onClick={cancelNav}>
            留在当前格
          </Button>
          <Button data-testid="pkhex-discard-drop" variant="destructive" onClick={confirmNav}>
            丢弃并切换
          </Button>
          <Button data-testid="pkhex-discard-save" onClick={saveAndGo}>
            保存并切换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
