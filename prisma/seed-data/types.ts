/**
 * 同目录下那些 .json 的形状。
 *
 * 它们是 PokeAPI 在某一刻的数据拷贝，由 scripts/refresh-seed-data.ts 生成并
 * 提交进仓库，prisma/seed.ts 只读它们灌库。这个文件是两边共用的契约，
 * 跟数据放在一起 —— 除了这两个脚本没有别的消费者，不该出现在 lib/ 里。
 *
 * 中文那部分另有一份来自神奇宝贝百科的快照（wiki-*.json），由
 * scripts/refresh-wiki-data.ts 生成，形状在本文件末尾。
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

/**
 * 机制说明的一条。数据源的 effect_entries，志愿者手写。
 * short 是列表用的一句话版，数据源没给时是 null —— 不拿 effect 顶替，
 * 那样前端永远走不到「说明暂缺」这条路径
 */
export type EffectText = { short: string | null; effect: string };

/**
 * 机制说明，按世代分。key 是世代号字符串（"3" / "9"）。
 *
 * 数据源的 effect_entries 本身不带世代，是刷新脚本从登场世代展开到最新世代的，
 * effect_changes 记录了变更的地方换成旧文本。展开放在抓取侧而不是留给 seed：
 * 「当前值 + 历史差异」是 PokeAPI 特有的表达，库里存的是每代一份完整值
 */
export type EffectsByGeneration = Record<string, Partial<Record<LanguageCode, EffectText>>>;

/**
 * 游戏里显示的那句文案，按版本组分。key 是版本组 slug（"sword-shield"）。
 *
 * 跟 EffectsByGeneration 是两套东西，都要存：机制说明讲清楚「做什么」但只有
 * 英法德，游戏文案是官方措辞、10 种语言齐全。数据源给特性/招式/道具的
 * flavor text 就是按版本组分的，只有宝可梦的图鉴说明才细到版本
 */
export type FlavorsByGroup = Record<string, Localized>;

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

/** 只有 slug 和译名的字典表。道具分类、招式目标、异常状态那几张都是这个形状 */
export type NamedSnapshot = {
  slug: string;
  names: Localized;
};

/**
 * 性格，25 种。
 *
 * 一项能力 ×1.1、另一项 ×0.9；增减同一项的那 5 种（勤奋、坦率、害羞、认真、浮躁）
 * 等于没有加成，四个字段都是 null
 */
export type NatureSnapshot = {
  slug: string;
  increasedStat: "ATTACK" | "DEFENSE" | "SPECIAL_ATTACK" | "SPECIAL_DEFENSE" | "SPEED" | null;
  decreasedStat: "ATTACK" | "DEFENSE" | "SPECIAL_ATTACK" | "SPECIAL_DEFENSE" | "SPEED" | null;
  likesFlavor: "SPICY" | "DRY" | "SWEET" | "BITTER" | "SOUR" | null;
  hatesFlavor: "SPICY" | "DRY" | "SWEET" | "BITTER" | "SOUR" | null;
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
  /** 在包包哪个口袋、做什么用。列表页靠它筛选 */
  categorySlug: string | null;
  /** 图片文件名，例如 "thunder-stone.png"。数据源没收录图时是 null */
  imageName: string | null;
  /** 机制说明（effect_entries），只有 en / fr */
  effects: EffectsByGeneration;
  /** 游戏文案（flavor_text_entries），10 种语言。中文从第七世代起才有 */
  flavors: FlavorsByGroup;
};

export type AbilitySnapshot = {
  slug: string;
  /** 特性是第三世代引入的，所以这个值最小是 3 */
  introducedInGenerationId: number;
  names: Localized;
  /** 机制说明，只有 en / fr / de。中文见 wiki-abilities.json */
  effects: EffectsByGeneration;
  /** 游戏文案，10 种语言 */
  flavors: FlavorsByGroup;
};

/** 能力项。性格只碰前五项，招式的能力变化会碰到命中和闪避 */
export type StatName =
  "ATTACK" | "DEFENSE" | "SPECIAL_ATTACK" | "SPECIAL_DEFENSE" | "SPEED" | "ACCURACY" | "EVASION";

/**
 * 道具机制。能结构化的按形状分开存，只能是文字的留在 ItemSnapshot.effects。
 * 一件道具可以同时出现在几份里（石板既改属性又强化威力），也可以一份都不在
 */
export type ItemFormChangeSnapshot = {
  itemSlug: string;
  formSlug: string;
  /** 这个机制哪个版本组引入的 */
  groupSlug: string | null;
};

export type ItemTypeChangeSnapshot = {
  itemSlug: string;
  typeSlug: string;
};

export type ItemTypeBoostSnapshot = {
  itemSlug: string;
  typeSlug: string;
  /** 百分数，20 表示威力 +20% */
  boostPercent: number;
  /** 倍率改过的带世代，一直没变的留空 */
  generationId: number | null;
};

export type ItemNatureSnapshot = {
  itemSlug: string;
  natureSlug: string;
};

/** 技能机器教哪个招式。同一个编号在不同版本组教的不一样 */
export type MachineSnapshot = {
  itemSlug: string;
  groupSlug: string;
  moveSlug: string;
};

/** 树果自己那套数值。树果本身在 items 里也有一行 */
export type BerrySnapshot = {
  itemSlug: string;
  /** 种植那组数值数据源有四颗没给，整组可空 */
  growthTime: number | null;
  maxHarvest: number | null;
  size: number | null;
  smoothness: number | null;
  soilDryness: number | null;
  firmness: "VERY_SOFT" | "SOFT" | "HARD" | "VERY_HARD" | "SUPER_HARD" | null;
  /** 自然之恩的威力和属性 —— 那招式没有固定数值，全看携带的树果 */
  naturalGiftPower: number | null;
  naturalGiftTypeSlug: string | null;
  /** 五种口味的强度 */
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
};

/** 招式在某一世代的数值 */
export type MoveGenerationSnapshot = {
  typeSlug: string;
  damageClass: "PHYSICAL" | "SPECIAL" | "STATUS";
  /** 变化招式是 null 不是 0 —— 前端靠 null 渲染成「—」 */
  power: number | null;
  /** 必中招式是 null 不是 100 */
  accuracy: number | null;
  pp: number | null;
};

/** 招式的 meta，数据源统一塞在一个对象里，不分世代 */
export type MoveMetaSnapshot = {
  targetSlug: string | null;
  ailmentSlug: string | null;
  metaCategorySlug: string | null;
  minHits: number | null;
  maxHits: number | null;
  minTurns: number | null;
  maxTurns: number | null;
  /** 百分数。正数吸血，负数是反作用力 */
  drain: number | null;
  healing: number | null;
  critRate: number | null;
  ailmentChance: number | null;
  flinchChance: number | null;
  statChance: number | null;
};

export type MoveSnapshot = {
  slug: string;
  introducedInGenerationId: number;
  names: Localized;
  /** 出招顺序。电光一闪 +1、报仇 -3 */
  priority: number;
  meta: MoveMetaSnapshot;
  /** 改哪项能力、改几级。剑舞是攻击 +2，破壳有五项 */
  statChanges: { stat: StatName; change: number }[];
  /** 每代一份，key 是世代号字符串。数值跨世代会变，压成一行就把这个信息丢了 */
  generations: Record<string, MoveGenerationSnapshot>;
  /** 机制说明，只有 en / fr。中文见 wiki-moves.json */
  effects: EffectsByGeneration;
  /** 游戏文案，10 种语言 */
  flavors: FlavorsByGroup;
};

/**
 * Ｚ招式，第七世代独有。
 *
 * 泛用的一个属性一个，威力和伤害分类跟原招式走所以是 null；
 * 专属的限定宝可梦和原招式，那三个 *Slug 字段才有值。
 *
 * 不带世代维度 —— 整个机制只活在第七世代。说明也因此不按世代分
 */
export type ZMoveSnapshot = {
  slug: string;
  typeSlug: string;
  /** 泛用Ｚ招式为 null：跟原招式相同。专属的有定值，伊布的极值提升就是变化类 */
  damageClass: "PHYSICAL" | "SPECIAL" | "STATUS" | null;
  /** 泛用Ｚ招式为 null：按原招式威力换算 */
  power: number | null;
  pp: number | null;
  names: Localized;
  effects: Partial<Record<LanguageCode, EffectText>>;
  flavors: FlavorsByGroup;
  /** 专属Ｚ招式限定的形态 */
  formSlug?: string;
  /** 专属Ｚ招式的原始招式 */
  baseMoveSlug?: string;
  /** 要携带的Ｚ纯晶 */
  itemSlug?: string;
};

/**
 * 极巨招式，第八世代独有。
 *
 * 泛用的一个属性一个，外加变化招式统一变成的极巨障壁；
 * 超极巨的专属于某个形态，数据源一条都没收，全部来自神奇宝贝百科
 */
export type MaxMoveSnapshot = {
  slug: string;
  typeSlug: string;
  power: number | null;
  pp: number | null;
  names: Localized;
  effects: Partial<Record<LanguageCode, EffectText>>;
  flavors: FlavorsByGroup;
  /** 超极巨招式专属的形态 */
  formSlug?: string;
};

/**
 * 一个形态学会的全部招式。
 *
 * learns 用定长元组而不是对象：全量一百万条，写成
 * { moveSlug, groupSlug, methodSlug, level, machineNumber } 的话
 * 光 key 名就占掉七成体积。顺序是
 * [招式 slug, 版本组 slug, 学习方式 slug, 等级, 技能机器编号]
 */
export type MoveLearnSnapshot = {
  formSlug: string;
  learns: [string, string, string, number, string | null][];
};

/**
 * 一条进化关系。字段跟 Evolution model 一一对应，跨表引用用 slug。
 *
 * 两端都是形态而不是物种：喵喵的三个形态进化去向完全不同。
 * 数据源给的 base_form / evolved_form 为空时回落到该物种的默认形态
 */
export type EvolutionSnapshot = {
  fromFormSlug: string;
  toFormSlug: string;
  groupSlug: string;
  triggerSlug: string;
  minLevel: number | null;
  minHappiness: number | null;
  minAffection: number | null;
  minBeauty: number | null;
  minSteps: number | null;
  minMoveCount: number | null;
  minDamageTaken: number | null;
  itemSlug: string | null;
  heldItemSlug: string | null;
  knownMoveSlug: string | null;
  knownMoveTypeSlug: string | null;
  usedMoveSlug: string | null;
  partyFormSlug: string | null;
  partyTypeSlug: string | null;
  tradeFormSlug: string | null;
  regionSlug: string | null;
  locationName: string | null;
  timeOfDay: "DAY" | "NIGHT" | "DUSK" | "FULL_MOON" | null;
  gender: "MALE" | "FEMALE" | null;
  needsRain: boolean;
  needsMultiplayer: boolean;
  nearSpecialRock: boolean;
  turnUpsideDown: boolean;
  attackVsDefense: "ATTACK_HIGHER" | "EQUAL" | "DEFENSE_HIGHER" | null;
  /** 两端细到变体那一级时才有。结草儿的草木蓑衣变结草贵妇的草木蓑衣 */
  fromVariantSlug: string | null;
  toVariantSlug: string | null;
  /** 靠宝可梦内部随机值分歧的，后缀表达式，例如 "EC 100 % 0 ==" */
  conditionExpression: string | null;
  /** 上面那条分支大概多少概率走到，百分数 */
  conditionChance: number | null;
  /** 性格决定走哪条分支。只有毒电婴用得上，别的都是空数组 */
  natureSlugs: string[];
};

/**
 * 宝可梦快照里的一条。形状直接用 pokeapi-pokemon.ts 的 Snapshot，
 * 只是把图鉴说明摘出去单独存 —— 说明有十万多条、二十多兆，跟本体放一起的话
 * 每次刷新整个文件都要重写，diff 也没法看。
 *
 * forms 收这个物种的全部形态，不只是默认形态：进化做在形态级
 * （关都喵喵和阿罗拉喵喵的进化去向不同），只导默认形态的话进化表是残缺的
 */
export type PokemonSnapshot = Omit<Snapshot, "forms"> & {
  forms: Omit<Snapshot["forms"][number], "descriptions">[];
};

/**
 * 形态下面的变体。
 *
 * 霜奶仙六十三种奶油、未知图腾二十八个字母、阿尔宙斯十九种属性、
 * 结草儿三种蓑衣 —— 数据源把这些放在 pokemon-form 这一级，比形态更细一层，
 * 种族值和招式表都跟本体共用
 */
export type FormVariantSnapshot = {
  slug: string;
  /** 挂在哪个形态下 */
  formSlug: string;
  isDefault: boolean;
  /** 只在对战里存在 */
  isBattleOnly: boolean;
  order: number;
  fullImage: string | null;
  detailImage: string | null;
  /** 只有阿尔宙斯和银伴战兽的属性真的跟本体不同，其余照抄 */
  primaryTypeSlug: string | null;
  secondaryTypeSlug: string | null;
  names: Localized;
};

/** 图鉴说明。按物种 slug 分组，一只一条记录 */
export type PokemonDescriptionSnapshot = {
  slug: string;
  descriptions: Snapshot["forms"][number]["descriptions"];
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

/** 文件名（不含扩展名）→ 内容类型。刷新脚本和 seed 都按这张表对齐 */
export type SeedData = {
  regions: RegionSnapshot[];
  generations: GenerationSnapshot[];
  types: TypeSnapshot[];
  colors: ColorSnapshot[];
  "move-learn-methods": MoveLearnMethodSnapshot[];
  "evolution-triggers": EvolutionTriggerSnapshot[];
  items: ItemSnapshot[];
  "item-categories": NamedSnapshot[];
  abilities: AbilitySnapshot[];
  natures: NatureSnapshot[];
  "move-targets": NamedSnapshot[];
  "move-ailments": NamedSnapshot[];
  "move-meta-categories": NamedSnapshot[];
  "item-form-changes": ItemFormChangeSnapshot[];
  "item-type-changes": ItemTypeChangeSnapshot[];
  "item-type-boosts": ItemTypeBoostSnapshot[];
  "item-natures": ItemNatureSnapshot[];
  machines: MachineSnapshot[];
  berries: BerrySnapshot[];
  moves: MoveSnapshot[];
  "z-moves": ZMoveSnapshot[];
  "max-moves": MaxMoveSnapshot[];
  evolutions: EvolutionSnapshot[];
  pokedexes: PokedexSnapshot[];
  groups: GroupSnapshot[];
  versions: VersionSnapshot[];
  pokemon: PokemonSnapshot[];
  "pokemon-descriptions": PokemonDescriptionSnapshot[];
  "form-variants": FormVariantSnapshot[];
};

/**
 * gzip 存的那些。招式学习表一百万行，纯文本三百多兆 ——
 * 超过 GitHub 单文件上限，而且没人会去读它的 diff。
 * 文件名带 .json.gz，读写两侧各自过一道 zlib
 */
export type GzipSeedData = {
  "move-learns": MoveLearnSnapshot[];
};

/**
 * 人工译名，补数据源缺的那些。overrides.json 由人维护，
 * scripts/refresh-seed-data.ts 不碰它，seed 时叠在快照上（同语言以这里为准）。
 *
 * 为什么需要：pokedex 的名字和描述不是游戏 ROM 里的文本，是 PokeAPI 给
 * 自己那些记录起的名字（法语描述是 "Pokédex régional de Kanto dans Rouge/Bleu/Jaune"，
 * 游戏里没有这句话），靠志愿者填，而贡献者以英语和欧洲语言使用者为主，
 * 所以 en / fr / es / de 有、中日韩全无。这批又是页面上直接显示的，只能自己写。
 *
 * 版本组、进化触发方式、招式学习方式同理 —— 那三张的名字数据源只有英法，
 * 版本组更是一条译名都不给。
 */
export type SeedOverrides = {
  pokedexes?: Record<string, { names?: Localized; descriptions?: Localized }>;
  groups?: Record<string, { names?: Localized }>;
  evolutionTriggers?: Record<string, { names?: Localized }>;
  moveLearnMethods?: Record<string, { names?: Localized }>;
  forms?: Record<string, { names?: Localized }>;
  /** 日版限定和外传作品的版本，数据源没收中文名 */
  versions?: Record<string, { names?: Localized }>;
  /** 外传的奥雷地区同理 */
  regions?: Record<string, { names?: Localized }>;
  /** 下面四张字典表数据源一条中文都不给，全靠人工写 */
  itemCategories?: Record<string, { names?: Localized }>;
  moveTargets?: Record<string, { names?: Localized }>;
  moveAilments?: Record<string, { names?: Localized }>;
  moveMetaCategories?: Record<string, { names?: Localized }>;
};

// ── 神奇宝贝百科的快照 ────────────────────────────────────────

/**
 * wiki-*.json 的外壳。带来源和许可证 —— 神奇宝贝百科是 CC BY-NC-SA 3.0，
 * 转载需署名，所以署名跟数据放在同一个文件里，不靠别处的文档记着
 */
export type WikiSnapshot<T> = {
  source: string;
  license: string;
  rows: T[];
  /**
   * 没能落进快照的条目，留着人看，不静默丢弃。
   *
   * 大多不是抓取出错，是百科收了而 PokeAPI 还没收的新东西 ——
   * 传说 Z-A 的「超级日光」「波导防护」这些特性百科早有页面，
   * PokeAPI 那边查 id 还是 404。本体表以 PokeAPI 为准，这些中文没有可挂的行
   */
  unmatched: string[];
};

/**
 * 特性和招式的中文。
 *
 * effect 是中文机制说明，PokeAPI 永远拿不到（那边只有英法德）。
 * 它在百科上不分世代，导入时跟英法德一样从登场世代展开到最新代。
 *
 * flavors 是中文游戏文案，补 PokeAPI 缺的第九世代 —— 那边中文只到剑盾
 */
/**
 * 招式标记位，数据源完全没有，只有百科的招式信息框里有。
 * 抓不到的字段留空
 */
export type MoveFlags = {
  makesContact?: boolean;
  blockedByProtect?: boolean;
  reflectedByMagicCoat?: boolean;
  stolenBySnatch?: boolean;
  copiedByMirrorMove?: boolean;
  triggersKingsRock?: boolean;
};

export type WikiEffectSnapshot = {
  slug: string;
  effect: Localized;
  flavors: FlavorsByGroup;
  /** 只有招式有 */
  flags?: MoveFlags;
  /**
   * 只有道具有：这件道具强化哪个属性的招式。
   * 木炭、磁铁那类 slug 推不出来，从百科的 {{type|火}} 模板抓
   */
  boostTypeSlug?: string;
  /**
   * 只有树果有：自然之恩打出来的属性和威力。
   * 数据源有几颗第六世代的新树果空着，百科的树果信息框里有
   */
  naturalGift?: { typeSlug: string; power: number };
  /**
   * 译名，只在数据源没给中文名时才有。
   * 邮件、超级石那批数据源一直空着，百科的列表页有
   */
  names?: Localized;
};

/**
 * 中文图鉴说明。PokeAPI 的中文只覆盖 8 个版本组、722 只，
 * 朱紫那 127 只一条都没有；百科从红绿版到朱紫全有
 */
export type WikiPokemonDescriptionSnapshot = {
  slug: string;
  descriptions: { versionSlug: string; languageCode: LanguageCode; text: string }[];
  /**
   * 分类（「种子宝可梦」那个）。数据源第九世代那批还没填中文，
   * 百科的信息框里有。没抓到时不写这个字段
   */
  genus?: Localized;
};

/**
 * 专属Ｚ招式的转化关系。百科的Ｚ招式条目有张表，列着
 * Ｚ招式名、属性、威力、分类、宝可梦、原始招式、要带的Ｚ纯晶
 */
export type WikiZMoveSnapshot = {
  /** 对上数据源的 slug；数据源没收的那个（谜拟Ｑ的）靠中文名认 */
  slug: string;
  names: Localized;
  /** 中文机制说明。数据源的 effect_entries 只有英法，Ｚ招式一条中文都没有 */
  effect: Localized;
  /** 下面这些只有专属Ｚ招式有，泛用的十八条全是空 */
  formSlug: string | null;
  baseMoveSlug: string | null;
  itemSlug: string | null;
  power: number | null;
  damageClass: "PHYSICAL" | "SPECIAL" | "STATUS" | null;
};

/**
 * 极巨招式。超极巨那批数据源一条都没有，slug 由英文名生成；
 * 泛用那十九条数据源有本体，这里只补中文机制说明
 */
export type WikiMaxMoveSnapshot = {
  slug: string;
  names: Localized;
  typeSlug: string;
  /** 专属于哪个形态。泛用的是 null */
  formSlug: string | null;
  /** 超极巨的来自列表页那一列，泛用的来自招式页的效果段 */
  effect: Localized;
};

/**
 * 形态的中文名。百科有一张按图鉴编号排的全形态对照表，
 * 每行带中日英三种形态名 —— 英文那列用来对上数据源的形态 slug
 */
export type WikiFormSnapshot = {
  slug: string;
  names: Localized;
};

/** wiki 快照的文件名 → 内容类型 */
export type WikiData = {
  "wiki-abilities": WikiSnapshot<WikiEffectSnapshot>;
  "wiki-moves": WikiSnapshot<WikiEffectSnapshot>;
  /** 道具只补机制说明，游戏文案那边 PokeAPI 十种语言齐全 */
  "wiki-items": WikiSnapshot<WikiEffectSnapshot>;
  /** 专属Ｚ招式的转化关系（谁 + 什么原招式 → 什么Ｚ招式），数据源不给 */
  "wiki-z-moves": WikiSnapshot<WikiZMoveSnapshot>;
  /** 超极巨招式全部来自百科，数据源一条都没收 */
  "wiki-max-moves": WikiSnapshot<WikiMaxMoveSnapshot>;
  "wiki-pokemon-descriptions": WikiSnapshot<WikiPokemonDescriptionSnapshot>;
  /** 形态名，数据源那边有三十多个形态一种中文都没给 */
  "wiki-forms": WikiSnapshot<WikiFormSnapshot>;
};

/** 这个文件所在的目录，相对项目根 —— seed 和刷新脚本都由 pnpm 从根目录启动 */
export const SEED_DATA_DIR = "prisma/seed-data";

/** 人工译名文件，跟快照放一起但不由刷新脚本生成 */
export const SEED_OVERRIDES_FILE = "overrides.json";
