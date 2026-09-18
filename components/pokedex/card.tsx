import { cn } from "cn";
import type { ComponentProps } from "react";

/** 资料站的基础卡片：12px 圆角、1px 边、极淡投影 */
export function Card(props: Readonly<ComponentProps<"div">>) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="pokedex-card"
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-(--shadow-pokedex)",
        className,
      )}
      {...rest}
    />
  );
}

/** 列表里可点的卡片。比 Card 多一层 hover 抬升 */
export function PokeCard(props: Readonly<ComponentProps<"div">>) {
  const { className, ...rest } = props;

  return (
    <Card
      data-slot="poke-card"
      className={cn(
        "cursor-pointer transition-[box-shadow,transform] duration-150 ease-out",
        "hover:-translate-y-0.5 hover:shadow-(--shadow-pokedex-lifted)",
        className,
      )}
      {...rest}
    />
  );
}
