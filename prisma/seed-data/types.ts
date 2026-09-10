/**
 * 同目录下那些 .json 的形状。
 *
 * 它们是 PokeAPI 在某一刻的数据拷贝，由 scripts/refresh-seed-data.ts 生成并
 * 提交进仓库，prisma/seed.ts 只读它们灌库。这个文件是两边共用的契约，
 * 跟数据放在一起 —— 除了这两个脚本没有别的消费者，不该出现在 lib/ 里。
 *
 * 存的是归一化后的形状，不是 PokeAPI 的原始响应 —— 原始响应里每个引用都带
 * 一个完整 url，快照会大出好几倍，而且 diff 里看到的全是噪音。
 *
 * 跨表引用一律用 slug：库里的 id 是自增的，重灌一次就变，写进快照没有意义。
 * 世代是唯一的例外，它的 id 就是「第几世代」这个官方编号。
 */
import type { LanguageCode } from "@/lib/pokemon/language";

import type { Snapshot } from "./pokeapi-pokemon";

/** 译名。缺的语言是数据源没收录，不是漏了 */
export type Localized = Partial<Record<LanguageCode, string>>;

export type RegionSnapshot = {
  slug: string;
  names: Localized;
};

export type GenerationSnapshot = {
  id: number;
  slug: string;
  mainRegionSlug: string | null;
  names: Localized;
};

/** 单向的相克关系，只存「打出去」那三组 —— 「被打」是它的镜像，存了就是同一批数据写两遍 */
export type DamageTo = {
  zero: string[];
  half: string[];
  double: string[];
};

export type TypeSnapshot = {
  slug: string;
  introducedInGenerationId: number;
  names: Localized;
  /** 当前（最新世代）的关系 */
  damageTo: DamageTo;
  /** 历史关系。每项是该世代及之前有效的**完整**六组关系，不是差异 */
  pastDamageTo: ({ throughGenerationId: number } & DamageTo)[];
};

export type ColorSnapshot = {
  slug: string;
  names: Localized;
};

export type MoveLearnMethodSnapshot = {
  slug: string;
  names: Localized;
};

export type EvolutionTriggerSnapshot = {
  slug: string;
  names: Localized;
};

export type ItemSnapshot = {
  slug: string;
  names: Localized;
  /** 图片文件名，例如 "thunder-stone.png"。数据源没收录图时是 null */
  imageName: string | null;
  /**
   * 道具说明，按世代分。key 是世代号（"3" / "7"），值是该世代的各语言文本。
   *
   * 取的是数据源的 flavor_text_entries —— 游戏里给玩家看的那句话，从每个语言
   * 版本的 ROM 里逐版本提取，所以 10 种语言齐全。中文从第七世代起才有，
   * 因为官方中文化始于 2016 年的《太阳/月亮》，前六代没有中文版可提取。
   *
   * 不用同一响应里的 effect_entries：那个不带版本，是 veekun 的志愿者手写的
   * 机制描述（"Evolves an Eelektrik into Eelektross..."），只有 en 和 fr，
   * 而且这种写法游戏里不会出现，前端也不会显示。
   */
  descriptions: Record<string, Localized>;
};

export type PokedexSnapshot = {
  slug: string;
  isMainSeries: boolean;
  regionSlug: string | null;
  names: Localized;
  descriptions: Localized;
};

export type GroupSnapshot = {
  slug: string;
  order: number;
  generationId: number;
  regionSlugs: string[];
  pokedexSlugs: string[];
  moveLearnMethodSlugs: string[];
};

export type VersionSnapshot = {
  slug: string;
  groupSlug: string;
  names: Localized;
};

/**
 * 宝可梦快照里的一条。形状直接用 pokeapi-pokemon.ts 的 Snapshot，
 * 只是把图鉴说明摘出去单独存 —— 说明有十万多条、二十多兆，跟本体放一起的话
 * 每次刷新整个文件都要重写，diff 也没法看。
 *
 * 只收默认形态：地区形态还是按需拉（PokeAPISource），没进快照。
 */
export type PokemonSnapshot = Omit<Snapshot, "form"> & {
  form: Omit<Snapshot["form"], "descriptions">;
};

/** 图鉴说明。按物种 slug 分组，一只一条记录 */
export type PokemonDescriptionSnapshot = {
  slug: string;
  descriptions: Snapshot["form"]["descriptions"];
};

/** 文件名（不含扩展名）→ 内容类型。刷新脚本和 seed 都按这张表对齐 */
export type SeedData = {
  regions: RegionSnapshot[];
  generations: GenerationSnapshot[];
  types: TypeSnapshot[];
  colors: ColorSnapshot[];
  "move-learn-methods": MoveLearnMethodSnapshot[];
  "evolution-triggers": EvolutionTriggerSnapshot[];
  items: ItemSnapshot[];
  pokedexes: PokedexSnapshot[];
  groups: GroupSnapshot[];
  versions: VersionSnapshot[];
  pokemon: PokemonSnapshot[];
  "pokemon-descriptions": PokemonDescriptionSnapshot[];
};

/**
 * 人工译名，补数据源缺的那些。overrides.json 由人维护，
 * scripts/refresh-seed-data.ts 不碰它，seed 时叠在快照上（同语言以这里为准）。
 *
 * 为什么需要：pokedex 的名字和描述不是游戏 ROM 里的文本，是 PokeAPI 给
 * 自己那些记录起的名字（法语描述是 "Pokédex régional de Kanto dans Rouge/Bleu/Jaune"，
 * 游戏里没有这句话），靠志愿者填，而贡献者以英语和欧洲语言使用者为主，
 * 所以 en / fr / es / de 有、中日韩全无。这批又是页面上直接显示的，只能自己写。
 */
export type SeedOverrides = {
  pokedexes?: Record<string, { names?: Localized; descriptions?: Localized }>;
};

/** 这个文件所在的目录，相对项目根 —— seed 和刷新脚本都由 pnpm 从根目录启动 */
export const SEED_DATA_DIR = "prisma/seed-data";

/** 人工译名文件，跟快照放一起但不由刷新脚本生成 */
export const SEED_OVERRIDES_FILE = "overrides.json";
