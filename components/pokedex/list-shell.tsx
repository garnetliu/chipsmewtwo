import { cn } from "cn";
import { type ComponentProps, Fragment, type ReactNode } from "react";

import { PaginationList } from "@/components/pagination-list";
import { Card } from "@/components/pokedex/card";
import { GenFilter } from "@/components/pokedex/gen-filter";
import { Button } from "@/components/ui/button";
import { PAGINATION } from "@/graphql/apollo/fragment";
import type { DocumentType } from "@/graphql/generated";

/** 和 PaginationList 收的是同一个东西：查询里带 @unmask，父级拿到的就是完整字段 */
type PaginationMeta = DocumentType<typeof PAGINATION>;

/** 页头右端统计块的一项。数值可以是数字也可以是「Gen 1」「编号序」这种短词 */
export interface IListStat {
  value: ReactNode;
  label: string;
}

/**
 * 列表查询返回的那个字段（pokemonList / moveList / itemList / abilityList）原样传进来。
 *
 * 壳只数 data 的条数、读 pagination，四个列表的元素类型不同也不用给壳加泛型 ——
 * dataMasking 开着，元素上的字段本来也只有声明它的卡片读得到。
 */
export interface IListResult {
  data?: readonly unknown[] | null;
  pagination?: PaginationMeta | null;
}

interface IProps extends Omit<ComponentProps<"div">, "title"> {
  /** 页头标题，例如「精灵列表」 */
  title: string;
  /** 标题下那句灰色说明 */
  description: string;
  /** 页头右端的统计块。精灵列表 3 项、招式/道具/特性各 1 项，不传就不出这一块 */
  stats?: readonly IListStat[];
  /** 出不出世代筛选行。特性列表没有筛选，那页不传 */
  genFilter?: boolean;
  /** 查询还在路上。第一次取数传 true，后台刷新时调用方自己决定要不要盖掉旧内容 */
  loading?: boolean;
  /**
   * 查询回来的列表字段。
   *
   * 字段是 null/undefined 就是故障（GraphQL 把整个字段置空，或者请求根本没发出去），
   * data 是空数组是空态 —— 分辨这两种情况不需要解析 errors 数组。
   */
  result?: IListResult | null;
  /** 加载中铺的骨架。四个列表的卡片形态不一样，高度得和真实卡片对上，所以由调用方给 */
  skeleton: ReactNode;
  /** 失败态那个重试按钮点下去做什么。查询在调用方手里，一般就是 Apollo 的 refetch */
  retry: () => void;
  /** 空态第二行的提示。默认劝用户换世代，没有筛选的页面自己换一句 */
  emptyHint?: string;
  /** 透传给 PaginationList：页码栏最多摆几个数字 */
  maxSlots?: number;
}

/**
 * 四个列表页共用的外壳：页头 + 筛选行 + 内容区（含分页）。
 *
 * 内容区四态由壳自己按 result 判断，调用方不用写状态枚举，也不用写四条分支。
 * 页头和筛选行在四态下都在 —— 空态和失败态里用户要能接着改筛选条件。
 *
 * 壳里不套 Suspense：读 URL 的是持有查询的那个列表组件（它自己要读 page 和 gen），
 * 位置在壳的外面，边界得由 app/<路由>/page.tsx 套，套在这里盖不住它。
 */
export function ListShell(props: Readonly<IProps>) {
  const {
    title,
    description,
    stats,
    genFilter = false,
    loading = false,
    result,
    skeleton,
    retry,
    emptyHint = "换一个世代筛选条件再试试",
    maxSlots,
    children,
    className,
    ...rest
  } = props;

  const pagination = result?.pagination ?? null;

  // 取数没结束前先按加载态走，别拿半截数据判断空还是坏
  const failed = !loading && (result === null || result === undefined || result.data == null);
  const empty = !loading && !failed && result?.data?.length === 0;

  return (
    <div data-slot="list-shell" className={cn("flex flex-col", className)} {...rest}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>

            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              P0 · 核心资料
            </span>
          </div>

          <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>
        </div>

        {stats && stats.length > 0 && (
          <div data-slot="list-shell-stats" className="flex items-center gap-6 text-center">
            {stats.map((stat, index) => (
              <Fragment key={stat.label}>
                {index > 0 && (
                  <div data-slot="list-shell-stat-divider" className="h-8 w-px bg-border" />
                )}

                <div data-slot="list-shell-stat">
                  <div className="text-xl font-bold tabular-nums">{stat.value}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </header>

      {/* 没取到数（加载中、失败）时 total 就是 undefined，筛选行右端自己降级成只有「单选筛选」 */}
      {genFilter && <GenFilter className="mb-6" total={pagination?.total} />}

      {/*
        内容区的上下留白固定在这一层，PaginationList 自带的那份让它归零 ——
        四种状态下内容都从同一个 y 开始，骨架换成卡片时页面不跳
      */}
      <div data-slot="list-shell-content" className="py-4">
        {loading && skeleton}

        {failed && (
          <Card data-slot="list-shell-failed" className="p-12 text-center">
            <div className="text-[14px] font-semibold">列表加载失败，请稍后再试</div>
            <Button variant="secondary" className="mt-4" onClick={() => retry()}>
              重试
            </Button>
          </Card>
        )}

        {empty && (
          <Card data-slot="list-shell-empty" className="p-12 text-center">
            <div className="text-[14px] font-semibold">当前筛选条件下暂无结果</div>
            <div className="mt-1.5 text-[12px] text-muted-foreground">{emptyHint}</div>
          </Card>
        )}

        {!loading &&
          !failed &&
          !empty &&
          (pagination ? (
            <PaginationList className="py-0" pagination={pagination} maxSlots={maxSlots}>
              {children}
            </PaginationList>
          ) : (
            children
          ))}
      </div>
    </div>
  );
}

interface ISkeletonProps extends Omit<ComponentProps<"div">, "children"> {
  /** 铺几块。一般就是一页的条数 */
  count: number;
  /** 每一块的类名，高度写在这里 —— 要和这一页真实卡片的高度对上 */
  itemClassName?: string;
}

/**
 * 骨架的积木。容器的排布（三列网格、两列网格、表格行）和每块的高度都由调用方给，
 * 壳只负责「一块灰的、会呼吸、不带文案」这件事。
 */
export function ListSkeleton(props: Readonly<ISkeletonProps>) {
  const { count, className, itemClassName, ...rest } = props;

  return (
    <div data-slot="list-skeleton" aria-hidden="true" className={cn(className)} {...rest}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-slot="list-skeleton-item"
          className={cn("animate-pulse rounded-lg bg-muted", itemClassName)}
        />
      ))}
    </div>
  );
}
