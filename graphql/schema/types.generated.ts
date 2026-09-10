/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GraphQLResolveInfo } from "graphql";

import type { MyContext } from "../context";
import type { PokemonMapper } from "./pokemon/schema.mappers";
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

export type Mutation = {
  __typename?: "Mutation";
  check?: Maybe<Scalars["Boolean"]["output"]>;
};

export type Pokemon = {
  __typename?: "Pokemon";
  /** 小图，96×96 的点阵图，列表缩略图用。取默认形态那张 */
  detailImageUrl?: Maybe<Scalars["String"]["output"]>;
  /**
   * 大图，475×475 的官方美术图，详情页用。取默认形态那张。
   * 数据源没收录这只的图、或者这只还没导入时是 null
   */
  fullImageUrl?: Maybe<Scalars["String"]["output"]>;
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
  /** 按世代取。目前只导入了最新世代（数据源没有历史种族值），查老世代是 null */
  stats?: Maybe<PokemonStats>;
  /**
   * 按世代取。数组顺序就是属性槽位：第一个是第一属性、第二个是第二属性，
   * 单属性的宝可梦只有一个元素。那一代的数据没导入就是 null
   */
  types?: Maybe<Array<PokemonType>>;
};

export type PokemongenusArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type PokemonnameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
};

export type PokemonstatsArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

export type PokemontypesArgs = {
  generation?: InputMaybe<Scalars["Int"]["input"]>;
};

/** 一只宝可梦在某个世代的种族值 */
export type PokemonStats = {
  __typename?: "PokemonStats";
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

/** 属性本体。18 个，全局复用，所以 id 用 type 表的主键 */
export type PokemonType = {
  __typename?: "PokemonType";
  /** 属性徽章的主题色，例如 #EE8130 */
  color: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** 属性译名。回退规则同 Pokemon.name */
  name?: Maybe<Scalars["String"]["output"]>;
  /** 例如 fire */
  slug: Scalars["String"]["output"];
};

/** 属性本体。18 个，全局复用，所以 id 用 type 表的主键 */
export type PokemonTypenameArgs = {
  language?: InputMaybe<Scalars["String"]["input"]>;
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
  pokemonList?: Maybe<Array<Pokemon>>;
};

export type QuerypokemonArgs = {
  id: Scalars["ID"]["input"];
};

export type QuerypokemonListArgs = {
  limit: Scalars["Int"]["input"];
  offset: Scalars["Int"]["input"];
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
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  Pokemon: ResolverTypeWrapper<PokemonMapper>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  PokemonStats: ResolverTypeWrapper<PokemonStats>;
  PokemonType: ResolverTypeWrapper<PokemonType>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Mutation: Record<PropertyKey, never>;
  Boolean: Scalars["Boolean"]["output"];
  Pokemon: PokemonMapper;
  String: Scalars["String"]["output"];
  ID: Scalars["ID"]["output"];
  Int: Scalars["Int"]["output"];
  PokemonStats: PokemonStats;
  PokemonType: PokemonType;
  Query: Record<PropertyKey, never>;
};

export type MutationResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = {
  check?: Resolver<Maybe<ResolversTypes["Boolean"]>, ParentType, ContextType>;
};

export type PokemonResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Pokemon"] = ResolversParentTypes["Pokemon"],
> = {
  detailImageUrl?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  fullImageUrl?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
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
  stats?: Resolver<
    Maybe<ResolversTypes["PokemonStats"]>,
    ParentType,
    ContextType,
    Partial<PokemonstatsArgs>
  >;
  types?: Resolver<
    Maybe<Array<ResolversTypes["PokemonType"]>>,
    ParentType,
    ContextType,
    Partial<PokemontypesArgs>
  >;
};

export type PokemonStatsResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PokemonStats"] = ResolversParentTypes["PokemonStats"],
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

export type PokemonTypeResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["PokemonType"] = ResolversParentTypes["PokemonType"],
> = {
  color?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<
    Maybe<ResolversTypes["String"]>,
    ParentType,
    ContextType,
    Partial<PokemonTypenameArgs>
  >;
  slug?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
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
    Maybe<Array<ResolversTypes["Pokemon"]>>,
    ParentType,
    ContextType,
    RequireFields<QuerypokemonListArgs, "limit" | "offset">
  >;
};

export type Resolvers<ContextType = MyContext> = {
  Mutation?: MutationResolvers<ContextType>;
  Pokemon?: PokemonResolvers<ContextType>;
  PokemonStats?: PokemonStatsResolvers<ContextType>;
  PokemonType?: PokemonTypeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};
