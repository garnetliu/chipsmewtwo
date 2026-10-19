/**
 * GPL 的源码入口。
 *
 * 这一条是义务不是装饰：本页把 PKHeX.Core（GPL-3.0-or-later）编进了
 * public/pkhex/ 下的 wasm 产物，浏览器打开这页就下载了它 —— 在 GPL 的语义下
 * 那是一次分发，分发就得让对方拿得到对应源码。Web 场景下的标准做法就是
 * 在页面上给一个指向源码仓库的链接，所以**不要因为"页脚太素"把它删掉**。
 */
export function LicenseNotice() {
  return (
    <footer
      data-testid="pkhex-license"
      className="border-t border-border pt-3 text-xs text-muted-foreground"
    >
      <p>
        本页内嵌{" "}
        <a
          href="https://github.com/kwsch/PKHeX"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          PKHeX.Core
        </a>
        （GPL-3.0-or-later）编译成的 WebAssembly。本项目同样以 GPL-3.0-or-later 分发， 源码见{" "}
        <a
          href="https://github.com/garnetliu/chipsmewtwo"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          garnetliu/chipsmewtwo
        </a>
        ，重建 wasm 产物只需 <code className="font-mono">pnpm pkhex:build</code>。
      </p>
      <p className="mt-1">存档文件只在你自己的浏览器里处理，不会上传到任何服务器。</p>
    </footer>
  );
}
