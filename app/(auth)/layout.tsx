export default function AuthLayout({ children }: LayoutProps<"/">) {
  /**
   * 这一层只做路由分组（将来在这儿挂 better-auth 的会话校验），不加视觉容器 ——
   * 页面宽度由各页自己的 container 决定，跟 app/pokemon 一致。
   *
   * flex-1 是为了让 pkhex 这种要吃满视口高度的页面有个可撑开的父级：
   * 根 layout 的 body 是 flex min-h-full flex-col
   */
  return <main className="flex flex-1 flex-col">{children}</main>;
}
