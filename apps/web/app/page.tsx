import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto flex flex-col gap-6 py-4">
      <Link href="/pokemon" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        Pokemon
      </Link>
      <Link href="/item" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        道具
      </Link>
      <Link href="/ability" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        特性
      </Link>
      <Link href="/move" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        招式
      </Link>
      <Link href="/effort-values" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        努力值模拟器
      </Link>
    </div>
  );
}
