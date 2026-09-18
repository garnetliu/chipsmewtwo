/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLResolveInfo } from "graphql";

import type { MyContext } from "../context";
import type {
  AbilityListMapper,
  AbilityMapper,
  AbilitySummaryMapper,
} from "./ability/schema.mappers";
import type {
  FormAbilityMapper,
  FormColorMapper,
  FormDescriptionMapper,
  FormMapper,
  FormStatsMapper,
} from "./form/schema.mappers";
import type {
  ItemAvailabilityMapper,
  ItemListMapper,
  ItemMapper,
  ItemSummaryMapper,
} from "./item/schema.mappers";
import type {
  MoveListMapper,
  MoveMapper,
  MoveSummaryMapper,
  MoveVersionStatMapper,
} from "./move/schema.mappers";
import type {
  PokemonListMapper,
  PokemonMapper,
  PokemonSummaryMapper,
} from "./pokemon/schema.mappers";
import type { SearchResultMapper } from "./search/schema.mappers";
import type { TypeMapper } from "./type/schema.mappers";
import type { VersionMapper } from "./version/schema.mappers";
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

/**
 * 特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormAbility），
 * 这里是特性本身
 */
export type Ability = {
  __typename?: "Ability";
  /**
   * 完整效果说明，取最新一版 —— 说明是按世代存的，蓄电 Gen4 起才改成吸引电系招式。
   * 回退规则同 name，所以拿到的可能是别的语种的文本。
   * 数据源没收录这条特性的说明时是 null
   */
  effect?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  /**
   * 第几代引入 —— 最早有效果说明的那一代。
   * 数据源没收录这条特性的说明时是 null
   */
  introducedGeneration?: Maybe<Scalars["Int"]["output"]>;
  /** 特性译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * 拥有该特性的宝可梦，按全国图鉴编号排。普通特性和隐藏特性都算，
   * 任一形态、任一世代有这条特性就在里面，同一只只出现一次。
   * 没有宝可梦拥有它时是空数组。
   *
   * 一条特性要扫它在 form_ability 里的全部行（多的有两百多行），
   * 这个字段留给详情页，列表页别取。
   * 给的是 PokemonSummary —— 这里摆的是卡片，两百多只每只再带上形态和进化链
   * 没有页面用得上
   */
  pokemon: Array<PokemonSummary>;
  /** 例如 flash-fire */
  slug: Scalars["String"]["output"];
  /** 登场版本，按发售顺序排，取法同 AbilitySummary.versions */
  versions: Array<Version>;
};

/**
 * 特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormAbility），
 * 这里是特性本身
 */
export type AbilityeffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormAbility），
 * 这里是特性本身
 */
export type AbilitynameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type AbilityList = {
  __typename?: "AbilityList";
  data?: Maybe<Array<AbilitySummary>>;
  pagination?: Maybe<PaginationMeta>;
};

/**
 * 列表里的一条特性。跟 Ability 分成两个类型，为的是把「拥有该特性的宝可梦」
 * 挡在列表之外 —— 那个字段要扫整张 form_ability，共用一个类型的话，
 * SDL 上拦不住列表页去取它
 */
export type AbilitySummary = {
  __typename?: "AbilitySummary";
  /** ability 表主键 */
  id: Scalars["ID"]["output"];
  /** 特性译名，例如「茂盛」。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * 一句话说明，取最新一版效果说明里的。回退规则同 name。
   *
   * 数据源只给了英法德三种语言的一句话版，中文那一版是空的，所以请求中文时
   * 基本都是 null；少数几条特性最新一代没有中文行，会按回退规则拿到英文。
   * 完整说明（Ability.effect）不受影响
   */
  shortEffect?: Maybe<Scalars["String"]["output"]>;
  /** 例如 overgrow */
  slug: Scalars["String"]["output"];
  /**
   * 登场版本，按发售顺序排。沿效果说明的世代走到版本组、再到版本 ——
   * 某一代有这条特性的说明，就说明它在那一代的游戏里存在。
   * 数据源没收录这条特性的说明时是空数组
   */
  versions: Array<Version>;
};

/**
 * 列表里的一条特性。跟 Ability 分成两个类型，为的是把「拥有该特性的宝可梦」
 * 挡在列表之外 —— 那个字段要扫整张 form_ability，共用一个类型的话，
 * SDL 上拦不住列表页去取它
 */
export type AbilitySummarynameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 列表里的一条特性。跟 Ability 分成两个类型，为的是把「拥有该特性的宝可梦」
 * 挡在列表之外 —— 那个字段要扫整张 form_ability，共用一个类型的话，
 * SDL 上拦不住列表页去取它
 */
export type AbilitySummaryshortEffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type Form = {
  __typename?: "Form";
  /**
   * 特性，按世代取，按槽位排序。Gen1/Gen2 没有特性，那两代是空数组。
   * 注意 form_ability 还没有导入路径，这个字段目前恒为空数组
   */
  abilities: Array<FormAbility>;
  /**
   * 图鉴颜色，按世代取。「按颜色查找图鉴」是 Gen3 才有的功能，
   * Gen1/Gen2 没有这一项，是 null
   */
  color?: Maybe<FormColor>;
  /**
   * 图鉴说明，每个版本一条，按版本排。回退规则同 name，
   * 拿到的可能是别的语种的文案，看 languageCode。
   *
   * 一只形态在库里有几十个版本 × 十种语言的行，查一只没问题，
   * 但列表页整页一起查会拉出上千行 —— 这个字段留给详情页
   */
  descriptions: Array<FormDescription>;
  /** 小图，96×96 的点阵图，列表缩略图用 */
  detailImageUrl?: Maybe<Scalars["String"]["output"]>;
  /**
   * 大图，475×475 的官方美术图，详情页用。
   * 数据源没收录这个形态的图时是 null
   */
  fullImageUrl?: Maybe<Scalars["String"]["output"]>;
  /** form 表主键。地区形态和原形态是两条不同的 Form，用它当缓存键 */
  id: Scalars["ID"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  /**
   * 形态名，例如「阿罗拉的样子」。原形态没有这一项。
   * 回退规则同 Pokemon.name。注意 form_i18n 还没有导入路径，这个字段目前恒为 null
   */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 vulpix-alola */
  slug: Scalars["String"]["output"];
  /** 按世代取。目前只导入了最新世代（数据源没有历史种族值），查老世代是 null */
  stats?: Maybe<FormStats>;
  /**
   * 按世代取。数组顺序就是属性槽位：第一个是第一属性、第二个是第二属性，
   * 单属性的宝可梦只有一个元素。那一代的数据没导入就是 null
   */
  types?: Maybe<Array<Type>>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormabilitiesArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormcolorArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormdescriptionsArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormnameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormstatsArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 * 默认形态也是一条 Form（isDefault = true），没有形态的宝可梦不存在
 */
export type FormtypesArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

/** 形态在某个世代的一个特性槽位 */
export type FormAbility = {
  __typename?: "FormAbility";
  ability: Ability;
  /** formId:generationId:slot 拼成的缓存键，例如 1:9:3 */
  id: Scalars["ID"]["output"];
  /**
   * 1、2 是普通特性，3 是隐藏特性。编号固定，缺哪个就没那一项 ——
   * 皮卡丘只有 slot 1 和 slot 3，隐藏特性不会顶上来变成 2
   */
  slot: Scalars["Int"]["output"];
};

/**
 * 图鉴的颜色分类，10 种，游戏里「按颜色查找图鉴」筛的就是它。
 * 跟 Type.color（属性徽章的主题色）不是一回事：
 * 关都六尾的颜色分类是褐色，而它的火系徽章是橙红
 */
export type FormColor = {
  __typename?: "FormColor";
  /** 颜色筛选器上画色块用的色值，例如 #B1736C */
  color: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** 颜色译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 white */
  slug: Scalars["String"]["output"];
};

/**
 * 图鉴的颜色分类，10 种，游戏里「按颜色查找图鉴」筛的就是它。
 * 跟 Type.color（属性徽章的主题色）不是一回事：
 * 关都六尾的颜色分类是褐色，而它的火系徽章是橙红
 */
export type FormColornameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 一条图鉴说明。游戏图鉴上给玩家看的那段介绍文案 */
export type FormDescription = {
  __typename?: "FormDescription";
  id: Scalars["ID"]["output"];
  /** 这条文案实际是哪个语种。回退时跟请求的语言不一样 */
  languageCode: Scalars["String"]["output"];
  text: Scalars["String"]["output"];
  /** 出自哪个游戏版本 */
  version: Version;
};

/** 一只形态在某个世代的种族值 */
export type FormStats = {
  __typename?: "FormStats";
  attack: Scalars["Int"]["output"];
  defense: Scalars["Int"]["output"];
  hp: Scalars["Int"]["output"];
  /** formId:generationId 拼成的缓存键，例如 1:9 */
  id: Scalars["ID"]["output"];
  /** 只有 Gen1 有 */
  special?: Maybe<Scalars["Int"]["output"]>;
  /** Gen1 没有特攻特防之分，那一代是 null，看 special */
  specialAttack?: Maybe<Scalars["Int"]["output"]>;
  specialDefense?: Maybe<Scalars["Int"]["output"]>;
  speed: Scalars["Int"]["output"];
};

/** 道具。哪只宝可梦用它进化、进化时要携带它存在 evolution 里，这里是道具本身 */
export type Item = {
  __typename?: "Item";
  /**
   * 按版本组分行的可用性表，按游戏发售顺序排。一个版本组一行 ——
   * thunder-stone 从第一世代活到现在，32 个版本组就是 32 行；
   * leftovers 第二世代引入，前四个版本组没有它，是 28 行。
   * 数据源没收录这条道具的说明时是空数组。
   *
   * 行数不少，留给详情页，列表页别取
   */
  availability: Array<ItemAvailability>;
  id: Scalars["ID"]["output"];
  /** 第几代引入，取法同 ItemSummary.introducedGeneration */
  introducedGeneration?: Maybe<Scalars["Int"]["output"]>;
  /** 道具译名。回退和缺数据的情况同 ItemSummary.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 一句话说明。回退和缺数据的情况同 ItemSummary.shortEffect */
  shortEffect?: Maybe<Scalars["String"]["output"]>;
  /** 例如 thunder-stone */
  slug: Scalars["String"]["output"];
  /** 登场版本，按发售顺序排，取法同 ItemSummary.versions */
  versions: Array<Version>;
};

/** 道具。哪只宝可梦用它进化、进化时要携带它存在 evolution 里，这里是道具本身 */
export type ItemnameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 道具。哪只宝可梦用它进化、进化时要携带它存在 evolution 里，这里是道具本身 */
export type ItemshortEffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 可用性表的一行：一个版本组里这条道具能不能拿、怎么拿 */
export type ItemAvailability = {
  __typename?: "ItemAvailability";
  /** 可用性。同 obtainMethod，库里没有这个数据，恒为 null，前端渲染成「—」 */
  availability?: Maybe<Scalars["String"]["output"]>;
  /**
   * 获取方式。原型图上有这一列，但库里没有这个数据 —— 跟道具沾边的四张表
   * （item / item_i18n / item_effect_i18n / item_flavor_i18n）里没有获取地点这一类列，
   * seed 的 items.json 也没抓。所以恒为 null，前端渲染成「—」。不拿别的字段来凑
   */
  obtainMethod?: Maybe<Scalars["String"]["output"]>;
  /**
   * 这个版本组包含的版本，按库里的顺序排。32 个版本组里 21 个含两条、11 个含一条，
   * 没有更多的 —— 红/蓝是两条，黄单独一组一条
   */
  versions: Array<Version>;
};

export type ItemList = {
  __typename?: "ItemList";
  data?: Maybe<Array<ItemSummary>>;
  pagination?: Maybe<PaginationMeta>;
};

/**
 * 列表里的一条道具。跟 Item 分成两个类型，为的是把版本可用性表挡在列表之外 ——
 * 一条第一世代的道具要摊成 32 行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type ItemSummary = {
  __typename?: "ItemSummary";
  /** item 表主键 */
  id: Scalars["ID"]["output"];
  /**
   * 第几代引入 —— 最早有说明的那一代。说明是按世代存的，某一代有它的说明，
   * 它在那一代的游戏里就存在；有说明的道具里没有一条世代是断开的，
   * 都是从引入那代一路排到第九代。
   * 数据源没收录说明的那一批是 null
   */
  introducedGeneration?: Maybe<Scalars["Int"]["output"]>;
  /**
   * 道具译名，例如「吃剩的东西」。回退规则同 Pokemon.name。
   * 绝大多数道具有简体中文名，少数没有的按回退规则给别的语种；
   * 一条译名都没有的才是 null
   */
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * 一句话说明，取最新一版说明里的一句话版。
   *
   * 这一列只有英法两种语言有文案，简中那一行在库里但一列都没填，所以请求简中时
   * 一律给英文。挑语言之前先把没文案的行滤掉，不是「简中行在就用简中行」——
   * 否则这个字段几乎永远是 null。
   *
   * 给不出这一句的有三种：数据源没收录任何说明的、最新一代只有中文行没有英法行的，
   * 以及英法行在、这一列却是 NULL 的（honey）。三种都给 null。
   * 空文案一律给 null，不给空字符串 —— 前端靠是不是 null 决定要不要显示「说明暂缺」
   */
  shortEffect?: Maybe<Scalars["String"]["output"]>;
  /** 例如 leftovers */
  slug: Scalars["String"]["output"];
  /**
   * 登场版本，按发售顺序排。沿说明的世代走到版本组、再到版本。
   * 数据源没收录这条道具的说明时是空数组
   */
  versions: Array<Version>;
};

/**
 * 列表里的一条道具。跟 Item 分成两个类型，为的是把版本可用性表挡在列表之外 ——
 * 一条第一世代的道具要摊成 32 行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type ItemSummarynameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 列表里的一条道具。跟 Item 分成两个类型，为的是把版本可用性表挡在列表之外 ——
 * 一条第一世代的道具要摊成 32 行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type ItemSummaryshortEffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 招式。哪只宝可梦怎么学会它存在 move_learn 里，这里是招式本身 */
export type Move = {
  __typename?: "Move";
  /** 说明，取最新一版效果说明里的完整版。回退和缺数据的情况同 MoveSummary.effect */
  effect?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  /** 招式译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 flamethrower */
  slug: Scalars["String"]["output"];
  /**
   * 按版本组分行的数值表，按游戏发售顺序排。库里数值是按世代存的，
   * 这里把一个世代摊到它下面的每个版本组：第一世代有四个版本组（日版红/绿、日版蓝、
   * 红/蓝、黄），就摊成四行，数值都取第一世代的值。
   * 招式还没登场的世代没有行，所以那些版本组不会出现在表里。
   *
   * 一条从第一世代活到现在的招式有 32 行，留给详情页，列表页别取
   */
  versionStats: Array<MoveVersionStat>;
  /** 登场版本，按发售顺序排，取法同 MoveSummary.versions */
  versions: Array<Version>;
};

/** 招式。哪只宝可梦怎么学会它存在 move_learn 里，这里是招式本身 */
export type MoveeffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 招式。哪只宝可梦怎么学会它存在 move_learn 里，这里是招式本身 */
export type MovenameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 招式的伤害分类。决定伤害用哪组种族值算：
 * PHYSICAL 物理（攻击 打 防御）、SPECIAL 特殊（特攻 打 特防）、STATUS 变化（不直接造成伤害）。
 *
 * 原样透出库里的枚举值，不在这里转成中文 —— 库里没有分类的译名表，
 * 中文只能写死，写死的展示文案归前端
 */
export type MoveCategory = "PHYSICAL" | "SPECIAL" | "STATUS";

export type MoveList = {
  __typename?: "MoveList";
  data?: Maybe<Array<MoveSummary>>;
  pagination?: Maybe<PaginationMeta>;
};

/**
 * 列表里的一条招式。跟 Move 分成两个类型，为的是把数值表（versionStats）
 * 挡在列表之外 —— 一条招式要摊成三十几行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type MoveSummary = {
  __typename?: "MoveSummary";
  /**
   * 说明，取最新一版效果说明里的完整版。回退规则同 name，
   * 所以拿到的可能是别的语种的文本：有说明的 844 条里，126 条最新一代没有简中行，
   * 请求简中时会回退成英文。数据源没收录这条招式的说明时（93 条）是 null
   *
   * 取的是完整版 effect 而不是一句话版 shortEffect —— 后者数据源只给了英法两种语言，
   * 中文那一版 4432 行全是空的，列表页那一列会整列空着
   */
  effect?: Maybe<Scalars["String"]["output"]>;
  /** move 表主键 */
  id: Scalars["ID"]["output"];
  /** 招式译名，例如「飞叶快刀」。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 razor-leaf */
  slug: Scalars["String"]["output"];
  /**
   * 登场版本，按发售顺序排。沿招式有数值的世代走到版本组、再到版本。
   * 数据源没给这条招式数值时（18 条暗影招式）是空数组
   */
  versions: Array<Version>;
};

/**
 * 列表里的一条招式。跟 Move 分成两个类型，为的是把数值表（versionStats）
 * 挡在列表之外 —— 一条招式要摊成三十几行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type MoveSummaryeffectArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 列表里的一条招式。跟 Move 分成两个类型，为的是把数值表（versionStats）
 * 挡在列表之外 —— 一条招式要摊成三十几行，共用一个类型的话 SDL 上拦不住列表页去取它
 */
export type MoveSummarynameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/** 数值表的一行：一个版本组里这条招式的属性、分类和数值 */
export type MoveVersionStat = {
  __typename?: "MoveVersionStat";
  /** 命中。必中招式（例如 swift）没有命中，是 null，前端渲染成「—」 */
  accuracy?: Maybe<Scalars["Int"]["output"]>;
  /**
   * 伤害分类。跟着世代走 —— 第四世代之前分类跟属性绑定，
   * 飞叶快刀在前三代是特殊、第四代起才是物理
   */
  category: MoveCategory;
  /**
   * 版本说明。原型图上有这一列，但库里和 PokeAPI 都没有版本级的说明文案
   * （move_effect_i18n 是按世代存的机制说明，不是版本级的），所以恒为 null，
   * 前端渲染成「—」。不拿招式的通用说明来填这一列
   */
  note?: Maybe<Scalars["String"]["output"]>;
  /** 威力。变化招式没有威力，是 null，前端渲染成「—」 */
  power?: Maybe<Scalars["Int"]["output"]>;
  /** PP。库里这一列可空，目前 4925 行都有值 */
  pp?: Maybe<Scalars["Int"]["output"]>;
  /**
   * 招式属性。跟着世代走 —— 咬住在第一世代是一般属性，第二世代起是恶属性。
   * 库里改过属性的只有 7 条（咬住、撒娇、起风、空手劈、月光、泼沙、天使之吻）
   */
  type: Type;
  /**
   * 这个版本组包含的版本，按库里的顺序排。红/蓝是两条，黄单独一条 ——
   * 32 个版本组里 21 个含两条、11 个含一条，没有更多的
   */
  versions: Array<Version>;
};

export type Mutation = {
  __typename?: "Mutation";
  check?: Maybe<Scalars["Boolean"]["output"]>;
};

export type PaginationMeta = {
  __typename?: "PaginationMeta";
  hasNext: Scalars["Boolean"]["output"];
  hasPrev: Scalars["Boolean"]["output"];
  page: Scalars["Int"]["output"];
  pageSize: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
  totalPages: Scalars["Int"]["output"];
};

/**
 * 物种。只有身份和译名 —— 属性、种族值、图片这些都是形态的属性，
 * 关都六尾和阿罗拉六尾是同一个物种的两个形态，值完全不同，所以全在 Form 上
 */
export type Pokemon = {
  __typename?: "Pokemon";
  /** 默认形态。列表页缩略图和详情页主视图取这个。这只还没导入形态时是 null */
  defaultForm?: Maybe<Form>;
  /**
   * 进化链上的全部成员，按进化顺序排，这只自己也在里面；分叉（伊布那一支）
   * 按全国图鉴编号排。链挂在形态上 —— 关都六尾和阿罗拉六尾各走一条 ——
   * 这里取默认形态那条。库里没有这只的进化关系时是空数组。
   *
   * 一次要把链上每只的身份查出来，留给详情页，列表页别取。
   * 链上的成员给的是 PokemonSummary —— 页面只用得到编号、译名和 slug，
   * 给完整 Pokemon 的话这个字段可以一层层套下去
   */
  evolutionChain: Array<PokemonSummary>;
  /**
   * 全部形态，默认形态排第一。喷火龙有四条（喷火龙、超极巨化的样子、
   * 超级喷火龙 X、超级喷火龙 Y），只有默认形态的宝可梦返回一条。
   * 种族值、属性、图鉴说明都在形态上，按需要挑一条取
   */
  forms: Array<Form>;
  /** 分类，例如「狐狸宝可梦」。回退规则同 name */
  genus?: Maybe<Scalars["String"]["output"]>;
  /** 全国图鉴编号 */
  id: Scalars["ID"]["output"];
  /**
   * 译名。这个语言没收录就回退：默认语言 → 剩下的按语言表的 sortOrder 取最靠前的。
   * 所以拿到的可能是别的语种的文本，一条译名都没有才是 null
   */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 英文标识，例如 vulpix */
  slug: Scalars["String"]["output"];
  /**
   * 登场版本，按发售顺序排。沿形态的招式表走到版本组、再到版本 ——
   * 有招式表就说明这只在那个版本组的游戏里能用。任一形态算数，不限默认形态。
   *
   * 一只要扫上千行招式记录，留给详情页，列表页别取
   */
  versions: Array<Version>;
};

/**
 * 物种。只有身份和译名 —— 属性、种族值、图片这些都是形态的属性，
 * 关都六尾和阿罗拉六尾是同一个物种的两个形态，值完全不同，所以全在 Form 上
 */
export type PokemongenusArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 物种。只有身份和译名 —— 属性、种族值、图片这些都是形态的属性，
 * 关都六尾和阿罗拉六尾是同一个物种的两个形态，值完全不同，所以全在 Form 上
 */
export type PokemonnameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type PokemonList = {
  __typename?: "PokemonList";
  data?: Maybe<Array<PokemonSummary>>;
  pagination?: Maybe<PaginationMeta>;
};

/**
 * 列表里的一只。跟 Pokemon 分成两个类型，为的是把 forms 和 evolutionChain
 * 挡在列表之外 —— 那两个字段一条要摊成好几行、还要把链上每只都查一遍，
 * 共用一个类型的话 SDL 上拦不住列表页去取它们。
 *
 * ability / move / item 三个域都是这个形状（XxxSummary 进列表、Xxx 进详情）
 */
export type PokemonSummary = {
  __typename?: "PokemonSummary";
  /** 默认形态。列表卡的缩略图和属性取这个。这只还没导入形态时是 null */
  defaultForm?: Maybe<Form>;
  /** 分类，例如「狐狸宝可梦」。回退规则同 name */
  genus?: Maybe<Scalars["String"]["output"]>;
  /** 全国图鉴编号 */
  id: Scalars["ID"]["output"];
  /** 译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 英文标识，例如 vulpix */
  slug: Scalars["String"]["output"];
  /**
   * 登场版本，按发售顺序排，取法同 Pokemon.versions。
   * 四个列表页的卡片上都有「登场版本」这一行，所以它进 Summary ——
   * 和 AbilitySummary / MoveSummary / ItemSummary 的 versions 一个待遇
   */
  versions: Array<Version>;
};

/**
 * 列表里的一只。跟 Pokemon 分成两个类型，为的是把 forms 和 evolutionChain
 * 挡在列表之外 —— 那两个字段一条要摊成好几行、还要把链上每只都查一遍，
 * 共用一个类型的话 SDL 上拦不住列表页去取它们。
 *
 * ability / move / item 三个域都是这个形状（XxxSummary 进列表、Xxx 进详情）
 */
export type PokemonSummarygenusArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 列表里的一只。跟 Pokemon 分成两个类型，为的是把 forms 和 evolutionChain
 * 挡在列表之外 —— 那两个字段一条要摊成好几行、还要把链上每只都查一遍，
 * 共用一个类型的话 SDL 上拦不住列表页去取它们。
 *
 * ability / move / item 三个域都是这个形状（XxxSummary 进列表、Xxx 进详情）
 */
export type PokemonSummarynameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type Query = {
  __typename?: "Query";
  /**
   * 按英文 slug 查一条，/ability/[name] 路由传下来的就是它。
   * 只查本地库，库里没有这一条时返回 null，不进 errors
   */
  abilityBySlug?: Maybe<Ability>;
  /**
   * 特性列表，按英文标识的字母序翻页，只查本地库。
   * offset 超出库里的总数（374 条）时这一页没有数据。
   *
   * 列表页没有筛选行，所以不收筛选参数
   */
  abilityList?: Maybe<AbilityList>;
  checks?: Maybe<Scalars["Boolean"]["output"]>;
  /**
   * 按英文 slug 查一条，/item/[name] 路由传下来的就是它。
   * 只查本地库，库里没有这一条时返回 null，不进 errors
   */
  itemBySlug?: Maybe<Item>;
  /**
   * 道具列表，按英文标识的字母序翻页，只查本地库。
   * offset 超出这个筛选条件下的总数（不筛就是 item 表的全部条数）时这一页没有数据。
   *
   * generation 给了就只留那一代引入的道具（第一代最多），不给是全量。
   * pagination.total 跟着筛选走。
   *
   * 注意引入世代是从说明的世代推出来的（见 ItemSummary.introducedGeneration），
   * 数据源没收录说明的那一批推不出世代，任何 generation 都筛不到它们；
   * 第八代只筛得出 linking-cord 一条、第九代一条都没有，不是漏了筛
   */
  itemList?: Maybe<ItemList>;
  /**
   * 按英文 slug 查一条，/move/[name] 路由传下来的就是它。
   * 只查本地库，库里没有这一条时返回 null，不进 errors
   */
  moveBySlug?: Maybe<Move>;
  /**
   * 招式列表，按英文标识的字母序翻页，只查本地库。
   * offset 超出这个筛选条件下的总数（全量 937 条）时这一页没有数据。
   *
   * generation 给了就只留那一代新增的招式（第一代 165 条，第九代 69 条），
   * 不给是全量。pagination.total 跟着筛选走
   */
  moveList?: Maybe<MoveList>;
  /**
   * 按全国图鉴编号（37）或英文 slug（vulpix）查一只。
   * 只查本地库，库里没有这一只时返回 null，不进 errors
   */
  pokemon?: Maybe<Pokemon>;
  /**
   * 按英文 slug 查一只，/pokemon/[name] 路由传下来的就是它。
   * 只查本地库，库里没有这一只时返回 null，不进 errors
   */
  pokemonBySlug?: Maybe<Pokemon>;
  /**
   * 按全国图鉴编号翻页，只查本地库。offset 超出库里的总数时这一页没有数据。
   *
   * generation 给了就只留那一代新增的宝可梦（第一代 151 只，第九代 120 只），
   * 不给是全量 1025 只。pagination.total 跟着筛选走
   */
  pokemonList?: Maybe<PokemonList>;
  /**
   * 顶部搜索框的入口：一次跨宝可梦、招式、道具、特性四类，按名称找。
   *
   * keyword 拿去跟四张译名表里当前语言（NEXT_LOCALE cookie 决定，默认简体中文）
   * 那一行的名字做包含匹配，不分大小写。只匹配这一种语言的行、不做语言回退 ——
   * 所以搜不到英文标识（slug）；库里没有简中译名的条目也搜不出来 ——
   * 宝可梦和特性的简中译名是齐的，招式和道具各有少量条目没有。
   * 首尾空白会去掉，去掉后是空串就直接返回空数组，不打库。
   *
   * 最多 10 条，四类轮转分名额：每一轮各类各拿一条最靠前的，取满 10 条为止，
   * 某一类候选取完就把名额让给别的类。所以搜「火」这种四类都命中一堆的词，
   * 拿到的是 3 + 3 + 2 + 2 条，不会被命中最多的宝可梦占满；
   * 搜「妙蛙」这种只有宝可梦和道具命中、加起来不到 10 条的词，两类全给。
   * 返回顺序按类型分组：宝可梦、招式、道具、特性；组内按关键词出现的位置排，
   * 位置相同时名字跟关键词完全相同的在前，再相同按各自表的主键
   * （宝可梦是全国图鉴编号，招式和特性是英文标识的字母序，道具是数据源自己的编号）。
   * 参与排序的是全部命中，不是其中一批 —— 命中再多也是先排完再取前几条。
   *
   * 一条都没命中就是空数组，不进 errors
   */
  search: Array<SearchResult>;
};

export type QueryabilityBySlugArgs = {
  slug: Scalars["String"]["input"];
};

export type QueryabilityListArgs = {
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
};

export type QueryitemBySlugArgs = {
  slug: Scalars["String"]["input"];
};

export type QueryitemListArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
};

export type QuerymoveBySlugArgs = {
  slug: Scalars["String"]["input"];
};

export type QuerymoveListArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
};

export type QuerypokemonArgs = {
  id: Scalars["ID"]["input"];
};

export type QuerypokemonBySlugArgs = {
  slug: Scalars["String"]["input"];
};

export type QuerypokemonListArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
};

export type QuerysearchArgs = {
  keyword: Scalars["String"]["input"];
};

/**
 * 搜索结果的一条，只够渲染模态框里的一行：类型徽章、名字、一句副文本、跳转用的 slug。
 *
 * 没有 id —— 四类的主键各自从 1 开始，混在一个类型里当不了唯一键。
 * 要更多字段拿 slug 回 pokemonBySlug / moveBySlug / itemBySlug / abilityBySlug 取。
 *
 * 也没有登场版本：模态框那一行没有版本徽章，版本要扫各自的说明表或数值表，
 * 为一个下拉列表不值当
 */
export type SearchResult = {
  __typename?: "SearchResult";
  kind: SearchResultKind;
  /**
   * 命中的那个名字，也就是当前语言译名表里的那一行，所以它一定包含 keyword，
   * 不会是别的语种回退来的
   */
  name: Scalars["String"]["output"];
  /** 英文标识，前端拼跳转路径用，例如 bulbasaur / flamethrower */
  slug: Scalars["String"]["output"];
  /**
   * 副文本。宝可梦是「No.0001 · 草/毒」—— 全国图鉴编号补到四位，加默认形态
   * 最新世代（第九世代）的属性译名，多属性用 / 连。每只的默认形态第九世代都有
   * 属性行，18 个属性的简中译名也齐，所以这一行不会缺。
   * 属性译名跟着当前语言走，跟名字一样
   *
   * 其余三类是说明的首句，切到第一个句末标点为止（英文的句点要后面跟空白才算，
   * 免得把「1/16 (6.25%)」切开）：
   *
   * - 招式取完整说明（Move.effect）。绝大多数招式都有说明，多数最新一代有简中，
   *   其余按译名的回退规则拿到英文
   * - 特性取完整说明（Ability.effect）。每条特性都有说明，只有个别几条最新一代
   *   没有简中、要回退成英文。不取 Ability.shortEffect，那一列简中一行都没有
   * - 道具取完整说明（道具说明表的 effect 列，也就是游戏里显示的那句文案）。
   *   有说明的道具大多最新一代有简中。同样不取一句话版，那一列只有英法两种语言
   *
   * 取不到说明就是 null
   */
  subtitle?: Maybe<Scalars["String"]["output"]>;
};

/** 结果属于哪一类。前端据此挑徽章文案和跳转路径，值原样透出，中文文案归前端 */
export type SearchResultKind =
  /** 特性，跳 /ability/[name] */
  | "ABILITY"
  /** 道具，跳 /item/[name] */
  | "ITEM"
  /** 招式，跳 /move/[name] */
  | "MOVE"
  /** 宝可梦，跳 /pokemon/[name] */
  | "POKEMON";

/** 属性本体。18 个，全局复用，所以 id 用 type 表的主键 */
export type Type = {
  __typename?: "Type";
  /** 属性徽章的主题色，例如 #EE8130 */
  color: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** 属性译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 fire */
  slug: Scalars["String"]["output"];
};

/** 属性本体。18 个，全局复用，所以 id 用 type 表的主键 */
export type TypenameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * 游戏版本，例如红/绿/皮卡丘。图鉴说明按版本存，将来招式表也按版本组走，
 * 所以单独成域，不挂在某一个域下面
 */
export type Version = {
  __typename?: "Version";
  id: Scalars["ID"]["output"];
  /** 版本译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 red */
  slug: Scalars["String"]["output"];
};

/**
 * 游戏版本，例如红/绿/皮卡丘。图鉴说明按版本存，将来招式表也按版本组走，
 * 所以单独成域，不挂在某一个域下面
 */
export type VersionnameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Ability: ResolverTypeWrapper<AbilityMapper>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  AbilityList: ResolverTypeWrapper<AbilityListMapper>;
  AbilitySummary: ResolverTypeWrapper<AbilitySummaryMapper>;
  Form: ResolverTypeWrapper<FormMapper>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  FormAbility: ResolverTypeWrapper<FormAbilityMapper>;
  FormColor: ResolverTypeWrapper<FormColorMapper>;
  FormDescription: ResolverTypeWrapper<FormDescriptionMapper>;
  FormStats: ResolverTypeWrapper<FormStatsMapper>;
  Item: ResolverTypeWrapper<ItemMapper>;
  ItemAvailability: ResolverTypeWrapper<ItemAvailabilityMapper>;
  ItemList: ResolverTypeWrapper<ItemListMapper>;
  ItemSummary: ResolverTypeWrapper<ItemSummaryMapper>;
  Move: ResolverTypeWrapper<MoveMapper>;
  MoveCategory: ResolverTypeWrapper<"PHYSICAL" | "SPECIAL" | "STATUS">;
  MoveList: ResolverTypeWrapper<MoveListMapper>;
  MoveSummary: ResolverTypeWrapper<MoveSummaryMapper>;
  MoveVersionStat: ResolverTypeWrapper<MoveVersionStatMapper>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PaginationMeta: ResolverTypeWrapper<PaginationMeta>;
  Pokemon: ResolverTypeWrapper<PokemonMapper>;
  PokemonList: ResolverTypeWrapper<PokemonListMapper>;
  PokemonSummary: ResolverTypeWrapper<PokemonSummaryMapper>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  SearchResult: ResolverTypeWrapper<SearchResultMapper>;
  SearchResultKind: ResolverTypeWrapper<"POKEMON" | "MOVE" | "ITEM" | "ABILITY">;
  Type: ResolverTypeWrapper<TypeMapper>;
  Version: ResolverTypeWrapper<VersionMapper>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Ability: AbilityMapper;
  String: Scalars["String"]["output"];
  ID: Scalars["ID"]["output"];
  Int: Scalars["Int"]["output"];
  AbilityList: AbilityListMapper;
  AbilitySummary: AbilitySummaryMapper;
  Form: FormMapper;
  Boolean: Scalars["Boolean"]["output"];
  FormAbility: FormAbilityMapper;
  FormColor: FormColorMapper;
  FormDescription: FormDescriptionMapper;
  FormStats: FormStatsMapper;
  Item: ItemMapper;
  ItemAvailability: ItemAvailabilityMapper;
  ItemList: ItemListMapper;
  ItemSummary: ItemSummaryMapper;
  Move: MoveMapper;
  MoveList: MoveListMapper;
  MoveSummary: MoveSummaryMapper;
  MoveVersionStat: MoveVersionStatMapper;
  Mutation: Record<PropertyKey, never>;
  PaginationMeta: PaginationMeta;
  Pokemon: PokemonMapper;
  PokemonList: PokemonListMapper;
  PokemonSummary: PokemonSummaryMapper;
  Query: Record<PropertyKey, never>;
  SearchResult: SearchResultMapper;
  Type: TypeMapper;
  Version: VersionMapper;
};

export type AbilityResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Ability"] = ResolversParentTypes["Ability"],
> = {
  effect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<AbilityeffectArgs>
  >;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  introducedGeneration?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<AbilitynameArgs>
  >;
  pokemon?: Resolver<Array<ResolversTypes["PokemonSummary"]>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type AbilityListResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["AbilityList"] = ResolversParentTypes["AbilityList"],
> = {
  data?: Resolver<Maybe<Array<ResolversTypes["AbilitySummary"]>>, ParentType, ContextType>;
  pagination?: Resolver<Maybe<ResolversTypes["PaginationMeta"]>, ParentType, ContextType>;
};

export type AbilitySummaryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["AbilitySummary"] =
    ResolversParentTypes["AbilitySummary"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<AbilitySummarynameArgs>
  >;
  shortEffect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<AbilitySummaryshortEffectArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type FormResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Form"] = ResolversParentTypes["Form"],
> = {
  abilities?: Resolver<
    Array<ResolversTypes["FormAbility"]>,
    ParentType,
    ContextType,
    Partial<FormabilitiesArgs>
  >;
  color?: Resolver<
    Maybe<ResolversTypes["FormColor"]>,
    ParentType,
    ContextType,
    Partial<FormcolorArgs>
  >;
  descriptions?: Resolver<
    Array<ResolversTypes["FormDescription"]>,
    ParentType,
    ContextType,
    Partial<FormdescriptionsArgs>
  >;
  detailImageUrl?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  fullImageUrl?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes["Boolean"], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType, Partial<FormnameArgs>>;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  stats?: Resolver<
    Maybe<ResolversTypes["FormStats"]>,
    ParentType,
    ContextType,
    Partial<FormstatsArgs>
  >;
  types?: Resolver<
    Maybe<Array<ResolversTypes["Type"]>>,
    ParentType,
    ContextType,
    Partial<FormtypesArgs>
  >;
};

export type FormAbilityResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["FormAbility"] = ResolversParentTypes["FormAbility"],
> = {
  ability?: Resolver<ResolversTypes["Ability"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  slot?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
};

export type FormColorResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["FormColor"] = ResolversParentTypes["FormColor"],
> = {
  color?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<FormColornameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
};

export type FormDescriptionResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["FormDescription"] =
    ResolversParentTypes["FormDescription"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  languageCode?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  text?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  version?: Resolver<ResolversTypes["Version"], ParentType, ContextType>;
};

export type FormStatsResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["FormStats"] = ResolversParentTypes["FormStats"],
> = {
  attack?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  defense?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  hp?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  special?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  specialAttack?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  specialDefense?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  speed?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
};

export type ItemResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Item"] = ResolversParentTypes["Item"],
> = {
  availability?: Resolver<Array<ResolversTypes["ItemAvailability"]>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  introducedGeneration?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType, Partial<ItemnameArgs>>;
  shortEffect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<ItemshortEffectArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type ItemAvailabilityResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["ItemAvailability"] =
    ResolversParentTypes["ItemAvailability"],
> = {
  availability?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  obtainMethod?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type ItemListResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["ItemList"] = ResolversParentTypes["ItemList"],
> = {
  data?: Resolver<Maybe<Array<ResolversTypes["ItemSummary"]>>, ParentType, ContextType>;
  pagination?: Resolver<Maybe<ResolversTypes["PaginationMeta"]>, ParentType, ContextType>;
};

export type ItemSummaryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["ItemSummary"] = ResolversParentTypes["ItemSummary"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  introducedGeneration?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<ItemSummarynameArgs>
  >;
  shortEffect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<ItemSummaryshortEffectArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type MoveResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Move"] = ResolversParentTypes["Move"],
> = {
  effect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<MoveeffectArgs>
  >;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType, Partial<MovenameArgs>>;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versionStats?: Resolver<Array<ResolversTypes["MoveVersionStat"]>, ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type MoveCategoryResolvers = EnumResolverSignature<
  { PHYSICAL?: any; SPECIAL?: any; STATUS?: any },
  ResolversTypes["MoveCategory"]
>;

export type MoveListResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["MoveList"] = ResolversParentTypes["MoveList"],
> = {
  data?: Resolver<Maybe<Array<ResolversTypes["MoveSummary"]>>, ParentType, ContextType>;
  pagination?: Resolver<Maybe<ResolversTypes["PaginationMeta"]>, ParentType, ContextType>;
};

export type MoveSummaryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["MoveSummary"] = ResolversParentTypes["MoveSummary"],
> = {
  effect?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<MoveSummaryeffectArgs>
  >;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<MoveSummarynameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type MoveVersionStatResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["MoveVersionStat"] =
    ResolversParentTypes["MoveVersionStat"],
> = {
  accuracy?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes["MoveCategory"], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  power?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  pp?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes["Type"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = {
  check?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType>;
};

export type PaginationMetaResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PaginationMeta"] =
    ResolversParentTypes["PaginationMeta"],
> = {
  hasNext?: Resolver<ResolversTypes["Boolean"], ParentType, ContextType>;
  hasPrev?: Resolver<ResolversTypes["Boolean"], ParentType, ContextType>;
  page?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  total?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  totalPages?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
};

export type PokemonResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Pokemon"] = ResolversParentTypes["Pokemon"],
> = {
  defaultForm?: Resolver<Maybe<ResolversTypes["Form"]>, ParentType, ContextType>;
  evolutionChain?: Resolver<Array<ResolversTypes["PokemonSummary"]>, ParentType, ContextType>;
  forms?: Resolver<Array<ResolversTypes["Form"]>, ParentType, ContextType>;
  genus?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<PokemongenusArgs>
  >;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<PokemonnameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type PokemonListResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PokemonList"] = ResolversParentTypes["PokemonList"],
> = {
  data?: Resolver<Maybe<Array<ResolversTypes["PokemonSummary"]>>, ParentType, ContextType>;
  pagination?: Resolver<Maybe<ResolversTypes["PaginationMeta"]>, ParentType, ContextType>;
};

export type PokemonSummaryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PokemonSummary"] =
    ResolversParentTypes["PokemonSummary"],
> = {
  defaultForm?: Resolver<Maybe<ResolversTypes["Form"]>, ParentType, ContextType>;
  genus?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<PokemonSummarygenusArgs>
  >;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<PokemonSummarynameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes["Version"]>, ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = {
  abilityBySlug?: Resolver<
    Maybe<ResolversTypes["Ability"]>,
    ParentType,
    ContextType,
    RequireFields<QueryabilityBySlugArgs, "slug">
  >;
  abilityList?: Resolver<
    Maybe<ResolversTypes["AbilityList"]>,
    ParentType,
    ContextType,
    RequireFields<QueryabilityListArgs, "limit" | "offset">
  >;
  checks?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType>;
  itemBySlug?: Resolver<
    Maybe<ResolversTypes["Item"]>,
    ParentType,
    ContextType,
    RequireFields<QueryitemBySlugArgs, "slug">
  >;
  itemList?: Resolver<
    Maybe<ResolversTypes["ItemList"]>,
    ParentType,
    ContextType,
    RequireFields<QueryitemListArgs, "limit" | "offset">
  >;
  moveBySlug?: Resolver<
    Maybe<ResolversTypes["Move"]>,
    ParentType,
    ContextType,
    RequireFields<QuerymoveBySlugArgs, "slug">
  >;
  moveList?: Resolver<
    Maybe<ResolversTypes["MoveList"]>,
    ParentType,
    ContextType,
    RequireFields<QuerymoveListArgs, "limit" | "offset">
  >;
  pokemon?: Resolver<
    Maybe<ResolversTypes["Pokemon"]>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonArgs, "id">
  >;
  pokemonBySlug?: Resolver<
    Maybe<ResolversTypes["Pokemon"]>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonBySlugArgs, "slug">
  >;
  pokemonList?: Resolver<
    Maybe<ResolversTypes["PokemonList"]>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonListArgs, "limit" | "offset">
  >;
  search?: Resolver<
    Array<ResolversTypes["SearchResult"]>,
    ParentType,
    ContextType,
    RequireFields<QuerysearchArgs, "keyword">
  >;
};

export type SearchResultResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["SearchResult"] = ResolversParentTypes["SearchResult"],
> = {
  kind?: Resolver<ResolversTypes["SearchResultKind"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  subtitle?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
};

export type SearchResultKindResolvers = EnumResolverSignature<
  { ABILITY?: any; ITEM?: any; MOVE?: any; POKEMON?: any },
  ResolversTypes["SearchResultKind"]
>;

export type TypeResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Type"] = ResolversParentTypes["Type"],
> = {
  color?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType, Partial<TypenameArgs>>;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
};

export type VersionResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Version"] = ResolversParentTypes["Version"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<VersionnameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
};

export type Resolvers<ContextType = MyContext> = {
  Ability?: AbilityResolvers<ContextType>;
  AbilityList?: AbilityListResolvers<ContextType>;
  AbilitySummary?: AbilitySummaryResolvers<ContextType>;
  Form?: FormResolvers<ContextType>;
  FormAbility?: FormAbilityResolvers<ContextType>;
  FormColor?: FormColorResolvers<ContextType>;
  FormDescription?: FormDescriptionResolvers<ContextType>;
  FormStats?: FormStatsResolvers<ContextType>;
  Item?: ItemResolvers<ContextType>;
  ItemAvailability?: ItemAvailabilityResolvers<ContextType>;
  ItemList?: ItemListResolvers<ContextType>;
  ItemSummary?: ItemSummaryResolvers<ContextType>;
  Move?: MoveResolvers<ContextType>;
  MoveCategory?: MoveCategoryResolvers;
  MoveList?: MoveListResolvers<ContextType>;
  MoveSummary?: MoveSummaryResolvers<ContextType>;
  MoveVersionStat?: MoveVersionStatResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PaginationMeta?: PaginationMetaResolvers<ContextType>;
  Pokemon?: PokemonResolvers<ContextType>;
  PokemonList?: PokemonListResolvers<ContextType>;
  PokemonSummary?: PokemonSummaryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SearchResult?: SearchResultResolvers<ContextType>;
  SearchResultKind?: SearchResultKindResolvers;
  Type?: TypeResolvers<ContextType>;
  Version?: VersionResolvers<ContextType>;
};
