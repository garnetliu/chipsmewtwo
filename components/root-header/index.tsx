import Image from "next/image";

import { HeaderTheme } from "./header-theme";

export function RootHeader() {
  return (
    <header className="container m-auto flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Image src="/logo-mark.svg" alt="" width={256} height={256} className="h-10 w-auto" />
        <span className="font-heading text-xl font-bold tracking-tight">chipsmewtwo</span>
      </div>
      <HeaderTheme />
    </header>
  );
}
