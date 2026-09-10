/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLResolveInfo } from "graphql";

import type { MyContext } from "../context";
import type { AbilityMapper } from "./ability/schema.mappers";
import type {
  FormAbilityMapper,
  FormColorMapper,
  FormDescriptionMapper,
  FormMapper,
  FormStatsMapper,
} from "./form/schema.mappers";
import type { PokemonListMapper, PokemonMapper } from "./pokemon/schema.mappers";
import type { TypeMapper } from "./type/schema.mappers";
import type { VersionMapper } from "./version/schema.mappers";
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
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
 * 特性。这里只有身份和译名 —— 效果说明（AbilityEffectI18n）和特性列表查询
 * 等这个域自己建起来时再 extend
 */
export type Ability = {
  __typename?: "Ability";
  id: Scalars["ID"]["output"];
  /** 特性译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 flash-fire */
  slug: Scalars["String"]["output"];
};

/**
 * 特性。这里只有身份和译名 —— 效果说明（AbilityEffectI18n）和特性列表查询
 * 等这个域自己建起来时再 extend
 */
export type AbilitynameArgs = {
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
   * 全部形态，默认形态排第一。
   * 目前库里只导了默认形态，所以实际只会返回一条
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
  data?: Maybe<Array<Pokemon>>;
  pagination?: Maybe<PaginationMeta>;
};

export type Query = {
  __typename?: "Query";
  checks?: Maybe<Scalars["Boolean"]["output"]>;
  /**
   * 按全国图鉴编号（37）或英文 slug（vulpix）查一只。
   * 库里没有时会尝试补数据（见 POKEMON_FETCH_MODE），两边都没有则报 NOT_FOUND。
   */
  pokemon?: Maybe<Pokemon>;
  /** 按全国图鉴编号翻页。这一页在库里凑不满 limit 条时会尝试补数据 */
  pokemonList?: Maybe<PokemonList>;
};

export type QuerypokemonArgs = {
  id: Scalars["ID"]["input"];
};

export type QuerypokemonListArgs = {
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
};

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
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  Form: ResolverTypeWrapper<FormMapper>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  FormAbility: ResolverTypeWrapper<FormAbilityMapper>;
  FormColor: ResolverTypeWrapper<FormColorMapper>;
  FormDescription: ResolverTypeWrapper<FormDescriptionMapper>;
  FormStats: ResolverTypeWrapper<FormStatsMapper>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PaginationMeta: ResolverTypeWrapper<PaginationMeta>;
  Pokemon: ResolverTypeWrapper<PokemonMapper>;
  PokemonList: ResolverTypeWrapper<PokemonListMapper>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Type: ResolverTypeWrapper<TypeMapper>;
  Version: ResolverTypeWrapper<VersionMapper>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Ability: AbilityMapper;
  ID: Scalars["ID"]["output"];
  String: Scalars["String"]["output"];
  Form: FormMapper;
  Int: Scalars["Int"]["output"];
  Boolean: Scalars["Boolean"]["output"];
  FormAbility: FormAbilityMapper;
  FormColor: FormColorMapper;
  FormDescription: FormDescriptionMapper;
  FormStats: FormStatsMapper;
  Mutation: Record<PropertyKey, never>;
  PaginationMeta: PaginationMeta;
  Pokemon: PokemonMapper;
  PokemonList: PokemonListMapper;
  Query: Record<PropertyKey, never>;
  Type: TypeMapper;
  Version: VersionMapper;
};

export type AbilityResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Ability"] = ResolversParentTypes["Ability"],
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<AbilitynameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
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
};

export type PokemonListResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PokemonList"] = ResolversParentTypes["PokemonList"],
> = {
  data?: Resolver<Maybe<Array<ResolversTypes["Pokemon"]>>, ParentType, ContextType>;
  pagination?: Resolver<Maybe<ResolversTypes["PaginationMeta"]>, ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = {
  checks?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType>;
  pokemon?: Resolver<
    Maybe<ResolversTypes["Pokemon"]>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonArgs, "id">
  >;
  pokemonList?: Resolver<
    Maybe<ResolversTypes["PokemonList"]>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonListArgs, "limit" | "offset">
  >;
};

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
  Form?: FormResolvers<ContextType>;
  FormAbility?: FormAbilityResolvers<ContextType>;
  FormColor?: FormColorResolvers<ContextType>;
  FormDescription?: FormDescriptionResolvers<ContextType>;
  FormStats?: FormStatsResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PaginationMeta?: PaginationMetaResolvers<ContextType>;
  Pokemon?: PokemonResolvers<ContextType>;
  PokemonList?: PokemonListResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Type?: TypeResolvers<ContextType>;
  Version?: VersionResolvers<ContextType>;
};
