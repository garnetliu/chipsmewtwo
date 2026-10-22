"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function Error({ error, retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h2 className="font-(family-name:--font-space-grotesk) text-2xl font-semibold">出错了</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {error.digest && (
          <p className="font-(family-name:--font-jetbrains) text-xs text-muted-foreground">
            {error.digest}
          </p>
        )}
      </div>

      <Button onClick={() => retry()}>重试</Button>
    </div>
  );
}
