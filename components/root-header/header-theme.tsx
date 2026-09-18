"use client";

import { Computer, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/lib/use-hydrated";

export function HeaderTheme() {
  const { setTheme, theme } = useTheme();
  const hydrated = useHydrated();

  return (
    <Tabs
      value={hydrated ? (theme ?? null) : null}
      onValueChange={(value) => setTheme(String(value))}
    >
      <TabsList>
        {/*
          文字标签在 1024px 以下收成 sr-only：三个词占 140px，是头部最容易让位的一段。
          收的是视觉不是可访问名 —— 读屏和 getByRole("tab", { name })  照样拿得到
        */}
        <TabsTrigger value="light">
          <Sun />
          <span className="sr-only lg:not-sr-only">Light</span>
        </TabsTrigger>
        <TabsTrigger value="dark">
          <Moon />
          <span className="sr-only lg:not-sr-only">Dark</span>
        </TabsTrigger>
        <TabsTrigger value="system">
          <Computer />
          <span className="sr-only lg:not-sr-only">Computer</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
