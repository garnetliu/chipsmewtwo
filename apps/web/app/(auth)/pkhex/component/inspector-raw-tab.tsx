"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { MonDetail } from "@/lib/pkhex/types";

interface IProps {
  detail: MonDetail;
}

/**
 * wasm 原样吐出来的那一份，只读。
 *
 * 面板上字段是挑着放的，出问题的时候得能看见实情 —— 比如界面显示对了但
 * statNature 没跟着改，只有摊开 JSON 才看得出来
 */
export function InspectorRawTab(props: Readonly<IProps>) {
  return (
    <ScrollArea className="mt-3 h-80 rounded-md bg-muted/40">
      <pre className="p-3 font-mono text-xs leading-relaxed">
        {JSON.stringify(props.detail, null, 2)}
      </pre>
    </ScrollArea>
  );
}
