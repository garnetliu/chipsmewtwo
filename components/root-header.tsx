"use client";

import { Computer, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/lib/use-hydrated";

export function RootHeader() {
  const { setTheme, theme } = useTheme();
  const hydrated = useHydrated();

  return (
    <header>
      <Tabs
        value={hydrated ? (theme ?? null) : null}
        onValueChange={(value) => setTheme(String(value))}
      >
        <TabsList>
          <TabsTrigger value="light">
            <Sun />
            Light
          </TabsTrigger>
          <TabsTrigger value="dark">
            <Moon />
            Dark
          </TabsTrigger>
          <TabsTrigger value="system">
            <Computer />
            Computer
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
}
