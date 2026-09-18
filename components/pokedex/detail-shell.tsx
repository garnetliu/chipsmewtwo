"use client";

import { cn } from "cn";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";

import { Card } from "@/components/pokedex/card";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * 四类详情页。文案（未找到、加载失败、面包屑中段、回哪个列表）全按这个枚举取，
 * 四个页面只传 kind，不各自抄一份句子 —— 句子只有这一处实现。
 */
export type DetailKind = "pokemon" | "move" | "item" | "ability";

interface IKindMeta {
  /** 未找到那张卡上的话，照 prototype 逐字 */
  notFound: string;
  /** 加载失败那张卡上的话 */
  failed: string;
  /** 面包屑中段 */
  crumb: string;
  /** 本类列表的地址，没有来源时回这里 */
  listHref: string;
  /** 本类列表在面包屑上的叫法 */
  listLabel: string;
}

/** 整句写死，不用「未找到该 + 名词」拼：中英之间要不要空格随名词变，拼出来的对不上 */
const KINDS: Record<DetailKind, IKindMeta> = {
  pokemon: {
    notFound: "未找到该 Pokémon",
    failed: "Pokémon 资料加载失败，请稍后再试",
    crumb: "精灵详情",
    listHref: "/pokemon",
    listLabel: "精灵列表",
  },
  move: {
    notFound: "未找到该招式",
    failed: "招式资料加载失败，请稍后再试",
    crumb: "招式详情",
    listHref: "/move",
    listLabel: "招式列表",
  },
  item: {
    notFound: "未找到该道具",
    failed: "道具资料加载失败，请稍后再试",
    crumb: "道具详情",
    listHref: "/item",
    listLabel: "道具列表",
  },
  ability: {
    notFound: "未找到该特性",
    failed: "特性资料加载失败，请稍后再试",
    crumb: "特性详情",
    listHref: "/ability",
    listLabel: "特性列表",
  },
};

/** 进详情页之前站在哪 */
export interface IDetailSource {
  /** 「← 返回」点下去回哪。记的是当时的完整地址，gen / page 这些参数一起带回去 */
  href: string;
  /** 「← 返回」后面那几个字：精灵列表 / 特性详情 / 搜索结果 */
  label: string;
}

/**
 * 来源栈。prototype 里是页面脚本上的 `let navStack = []`，这里是同一个东西：
 * 一个只活在浏览器内存里的变量，只由点击写入。
 *
 * 不放地址栏：详情页的地址要干净、可分享、可收录，来源是「这一次是怎么进来的」，
 * 不是这一页的身份。不放 sessionStorage：刷新之后它还在，而刷新该退化成「回本类列表」。
 * 内存变量刷新即空，正好就是要的退化行为。
 *
 * 服务端渲染这个壳的时候没人调用过 remember，值恒为 null，所以首屏 HTML 和 hydration
 * 首帧都落在兜底的「回本类列表」上，两边对得上，也不会把某个用户的来源串给另一个请求。
 */
let pendingSource: IDetailSource | null = null;

/**
 * 记下「下一次进详情页是从哪来的」。在跳转前调用。
 *
 * 卡片不是链接（PokeCard 挂的是 onClick）时直接调它；是链接就用 DetailLink。
 */
export function rememberDetailSource(source: IDetailSource | null): void {
  pendingSource = source;
}

/**
 * 面包屑第一段。没人记过来源（直接输地址、刷新、浏览器前进后退）就回本类列表。
 *
 * 读在 state 初值里、清在 effect 里：读这一步是纯的，StrictMode 下重复执行也是同一个值；
 * 清这一步保证一次导航只认一次来源，之后再站到详情页上不会挂着上一次的来源不放。
 */
function useDetailSource(fallback: IDetailSource): IDetailSource {
  const [source] = useState(() => pendingSource);

  useEffect(() => {
    pendingSource = null;
  }, []);

  return source ?? fallback;
}

interface IDetailLinkProps extends ComponentProps<typeof Link> {
  /** 进去之后面包屑上「← 返回」后面那几个字，例如「精灵列表」「特性详情」 */
  backLabel: string;
}

/**
 * 进详情页的链接。点下去先把当前地址记成来源，详情页的面包屑就写成
 * 「← 返回特性详情」并原路返回，而不是一律回列表。
 */
export function DetailLink(props: Readonly<IDetailLinkProps>) {
  const { backLabel, onClick, ...rest } = props;

  return (
    <Link
      data-slot="detail-link"
      onClick={(event) => {
        rememberDetailSource({
          href: `${window.location.pathname}${window.location.search}`,
          label: backLabel,
        });
        onClick?.(event);
      }}
      {...rest}
    />
  );
}

/**
 * 详情查询回来的结果。
 *
 * 和列表壳一个口径，只是少一层：字段是 null/undefined 就是故障（页面取数抛了，
 * 或者请求根本没发出去），字段在但 data 是 null 就是查不到 —— 按全局口径查不到
 * 返回 null 不算错误，不用去解析 errors 数组。
 */
export interface IDetailResult {
  /** 查到的那一条。查不到是 null */
  data?: unknown;
}

interface IProps extends Omit<ComponentProps<"div">, "title"> {
  kind: DetailKind;
  /** 面包屑最后一段：条目名。取不到名字时不传，这一段连同前面的分隔符一起不出 */
  title?: ReactNode;
  /**
   * 页面取数的结果。详情页在服务端取数（见 loadDetail），
   * 抛出来的是 null（故障），查不到的是 `{ data: null }`（未找到）。
   *
   * 壳只看 data 是不是 null，所以四个页面传的都是 `result && { data: 条目 id }` ——
   * 这个壳是客户端组件，把整条资料原样传进来会在 RSC 负载里再序列化一遍，
   * 而正文已经是服务端渲染好的 HTML 了
   */
  result?: IDetailResult | null;
  /** 失败态「重试」点下去做什么。不传就重跑一遍这一页的服务端渲染 */
  retry?: () => void;
}

/**
 * 四个详情页共用的外壳：面包屑 + 三种异常态。
 *
 * 状态由壳自己按 result 判断，调用方不传状态枚举。没有加载态 —— 详情页是 RSC，
 * 取不完数这一页根本不会开始渲染。
 *
 * 也不要给详情段加 loading.tsx 来补转圈：路由段上一有 loading.tsx，Next 就把正文推进
 * <div hidden> 里靠脚本挪位，关掉 JavaScript 的爬虫只看得见那句 fallback，
 * 和详情页要被收录这件事直接冲突（e2e/seo.spec.ts 挡着这个回退）。
 * 要链接级的 pending 状态用 useLinkStatus()，它不引入 Suspense 边界。
 *
 * 壳是客户端组件：面包屑要读浏览器里的来源栈，服务端读不到。这不影响正文的服务端渲染 ——
 * 客户端组件自己也会在服务端预渲染成 HTML，正文是 page.tsx（RSC）当 children 传进来的，
 * 不进这个壳的模块图，照样在服务端取数、服务端渲染，禁用 JavaScript 也能看到。
 */
export function DetailShell(props: Readonly<IProps>) {
  const { kind, title, result, retry, children, className, ...rest } = props;

  const meta = KINDS[kind];
  const router = useRouter();
  const source = useDetailSource({ href: meta.listHref, label: meta.listLabel });

  const failed = result == null;
  const notFound = !failed && result.data == null;

  return (
    <div data-slot="detail-shell" className={cn("flex flex-col", className)} {...rest}>
      {/* 未找到时不出面包屑：最后一段本来就是条目名，条目都没有，照 prototype 只留一张卡 */}
      {!notFound && (
        <div
          data-slot="detail-breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-2 text-[13px]"
        >
          <Link
            href={source.href}
            className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {`← 返回${source.label}`}
          </Link>

          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground">{meta.crumb}</span>

          {title != null && title !== "" && (
            <>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-semibold">{title}</span>
            </>
          )}
        </div>
      )}

      {notFound && (
        <Card data-slot="detail-not-found" className="p-12 text-center">
          <div className="text-[14px] font-semibold">{meta.notFound}</div>
          {/*
            这一下是纯导航，语义上就是链接，所以直接给 Link 套按钮的样式类，
            不走 Button：Base UI 的 Button 用 render 换成 <a> 之后要么报 error 级告警，
            要么（nativeButton={false}）把无障碍角色降级成 button
          */}
          <Link
            href={meta.listHref}
            className={buttonVariants({ variant: "secondary", className: "mt-4" })}
          >
            返回列表
          </Link>
        </Card>
      )}

      {failed && (
        <Card data-slot="detail-failed" className="p-12 text-center">
          <div className="text-[14px] font-semibold">{meta.failed}</div>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => (retry ? retry() : router.refresh())}
          >
            重试
          </Button>
        </Card>
      )}

      {!failed && !notFound && children}
    </div>
  );
}

interface IDescriptionProps extends Omit<ComponentProps<"p">, "children"> {
  /** 库里的说明文本。null、空串、只有空白都算没有 */
  text?: string | null;
}

/**
 * 详情页的说明段落。
 *
 * 精灵的图鉴说明、招式和特性的 effect、道具的 descriptions 在库里本来就可空，
 * 空了统一落到「说明暂缺」。这句话只在这里出现一次，四个详情页都走它。
 */
export function DetailDescription(props: Readonly<IDescriptionProps>) {
  const { text, className, ...rest } = props;

  const empty = text == null || text.trim() === "";

  return (
    <p
      data-slot="detail-description"
      data-empty={empty || undefined}
      className={cn("text-[13px] leading-6 text-muted-foreground", className)}
      {...rest}
    >
      {empty ? "说明暂缺" : text}
    </p>
  );
}

interface IDetailImageProps extends Omit<ComponentProps<"div">, "children"> {
  /** 图片地址。数据源没收录这一条的图时库里就是 null */
  src?: string | null;
  /** 图片说的是哪一条，例如「妙蛙种子」。占位图也用它给读屏 */
  alt: string;
  /** 透传给 next/image 的 sizes，默认和默认尺寸 size-28 对上 */
  sizes?: string;
  /**
   * 透传给 next/image 的 loading。详情页 hero 那张图在首屏上、是 LCP 元素，传 "eager"；
   * 列表卡和拥有者网格里的小图留默认的 lazy（多数在折叠线以下）
   */
  loading?: "eager" | "lazy";
  /**
   * 没有图（字段为空或者 404）时摆什么。不传就是一个灰色的裂图图标；
   * 列表卡传的是名字末两字，照 prototype
   */
  fallback?: ReactNode;
}

/**
 * 详情页的图。
 *
 * 尺寸写在外层盒子上（默认 size-28，照 prototype 的 hero 图块），图用 fill 铺进去、
 * 绝对定位，自己不占位置 —— 所以地址是 null、加载 404、还是正常出图，盒子高度都一样，
 * 旁边的正文不会跟着上下跳。
 *
 * 图走 unoptimized：图片来自 jsDelivr 上钉死版本的 sprites，已经是成品尺寸，
 * 再过一道优化器只是多一跳。
 */
export function DetailImage(props: Readonly<IDetailImageProps>) {
  const { src, alt, sizes = "112px", loading, fallback, className, ...rest } = props;

  const [broken, setBroken] = useState(false);
  const showImage = src != null && src !== "" && !broken;

  return (
    <div
      data-slot="detail-image"
      data-placeholder={!showImage || undefined}
      className={cn(
        "relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted",
        className,
      )}
      {...rest}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={loading}
          unoptimized
          className="object-contain p-1"
          onError={() => setBroken(true)}
          ref={(img) => {
            // 服务端渲染出来的 img 往往在 hydration 之前就已经 404 完了，那一次 error
            // 事件 React 根本没听见。挂上来的时候补判一次：加载结束却没有宽度就是没出来
            if (img?.complete && img.naturalWidth === 0) setBroken(true);
          }}
        />
      ) : (
        <>
          {fallback ?? <ImageOff aria-hidden="true" className="size-8 text-muted-foreground/50" />}
          {/* 占位图本身不带信息，给读屏补一份文字 */}
          <span className="sr-only">{alt}</span>
        </>
      )}
    </div>
  );
}
