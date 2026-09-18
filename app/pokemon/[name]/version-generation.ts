/**
 * 版本 slug → 世代号。
 *
 * 库里这层关系是 version → group → generation，但 GraphQL 的 Version 类型只开了
 * id/slug/name 三项，详情页的「具体版本可用性」又要按世代分行，所以在这里落一张常量表。
 * 表的内容不是编的，是照库里那 53 行 version 抄下来的，和 globals.css 里的版本色一一对上。
 *
 * 将来 Version 上补出 generation 字段，这张表连同 versionGeneration 一起删掉即可
 */
const VERSION_GENERATION: Readonly<Record<string, number>> = {
  "red-japan": 1,
  "green-japan": 1,
  "blue-japan": 1,
  red: 1,
  blue: 1,
  yellow: 1,

  gold: 2,
  silver: 2,
  crystal: 2,

  ruby: 3,
  sapphire: 3,
  emerald: 3,
  colosseum: 3,
  xd: 3,
  firered: 3,
  leafgreen: 3,

  diamond: 4,
  pearl: 4,
  platinum: 4,
  heartgold: 4,
  soulsilver: 4,

  black: 5,
  white: 5,
  "black-2": 5,
  "white-2": 5,

  x: 6,
  y: 6,
  "omega-ruby": 6,
  "alpha-sapphire": 6,

  sun: 7,
  moon: 7,
  "ultra-sun": 7,
  "ultra-moon": 7,
  "lets-go-pikachu": 7,
  "lets-go-eevee": 7,

  sword: 8,
  shield: 8,
  "the-isle-of-armor-sword": 8,
  "the-isle-of-armor-shield": 8,
  "the-crown-tundra-sword": 8,
  "the-crown-tundra-shield": 8,
  "brilliant-diamond": 8,
  "shining-pearl": 8,
  "legends-arceus": 8,

  scarlet: 9,
  violet: 9,
  "the-teal-mask-scarlet": 9,
  "the-teal-mask-violet": 9,
  "the-indigo-disk-scarlet": 9,
  "the-indigo-disk-violet": 9,
  "legends-za": 9,
  "mega-dimension": 9,
  champions: 9,
};

/** 世代的中文写法。数组下标 = 世代号 - 1 */
const GENERATION_NAMES = [
  "第一世代",
  "第二世代",
  "第三世代",
  "第四世代",
  "第五世代",
  "第六世代",
  "第七世代",
  "第八世代",
  "第九世代",
] as const;

/** 这个版本属于第几代。表里没有这个 slug（库里新导入了版本）时是 null */
export function versionGeneration(slug: string): number | null {
  return VERSION_GENERATION[slug] ?? null;
}

/** 世代号写成「第三世代」。认不出的世代号返回 null，由调用方决定怎么占位 */
export function generationName(generation: number | null): string | null {
  if (generation == null) return null;

  return GENERATION_NAMES[generation - 1] ?? null;
}
