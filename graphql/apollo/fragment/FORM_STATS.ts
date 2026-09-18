import { graphql } from "@/graphql/generated";

/**
 * 种族值六项。specialAttack / specialDefense 在第一世代是 null（那一代只有 special），
 * 详情页和努力值模拟器都按最新世代取，所以实际拿到的六项都有值
 */
export const FORM_STATS = graphql(`
  fragment FORM_STATS on FormStats {
    id
    hp
    attack
    defense
    specialAttack
    specialDefense
    speed
  }
`);
