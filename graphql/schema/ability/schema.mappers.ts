import type { Ability } from "@/generated/prisma/client";

/** 跟着 FormAbility 一起 join 出来。译名由 Ability.name 走 loader 取 */
export type AbilityMapper = Ability;
