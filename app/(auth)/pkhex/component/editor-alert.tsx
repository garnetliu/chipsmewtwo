"use client";

import { TriangleAlert, X } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useEditorStore } from "./save-editor-context";

/**
 * 编辑器的错误提示。
 *
 * 不引 toast：这页的错误全是阻塞性的（存档没打开、值超范围、写回失败），
 * 三秒飘走的浮层只会让人不知道刚才哪里出了问题。固定占一行，用户自己关。
 */
export function EditorAlert() {
  const error = useEditorStore((state) => state.error);
  const dismissError = useEditorStore((state) => state.dismissError);

  if (!error) return null;

  return (
    <Alert data-testid="pkhex-error" variant="destructive" className="border-destructive/40">
      <TriangleAlert />
      <AlertTitle>这一步没能完成</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon-xs" aria-label="关闭提示" onClick={dismissError}>
          <X />
        </Button>
      </AlertAction>
    </Alert>
  );
}
