/**
 * 从神奇宝贝百科抓中文，补 PokeAPI 拿不到的那部分。
 *
 * 跑法：pnpm wiki:refresh，然后 git diff 看抓到了什么，确认后提交。
 *
 * 为什么需要这份数据：
 *   - 机制说明（effect_entries）PokeAPI 只有英法德，是志愿者手写的，永远不会有中文
 *   - 游戏文案的中文 PokeAPI 只到剑盾，朱紫那 127 只一条都没有
 *
 * 数据来源（CC BY-NC-SA 3.0，转载需署名）：https://wiki.52poke.com
 * 署名写进输出文件的 source / license 字段，跟数据放在一起。
 *
 * 三千多个页面，批量接口一次 50 个，六十多个请求。
 * 条目跟 PokeAPI 的对应靠编号 —— 百科信息框里的 n= 就是 PokeAPI 的 id。
 */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { LanguageCode } from "@/lib/pokemon/language";
import {
  type FlavorsByGroup,
  type Localized,
  type MoveFlags,
  SEED_DATA_DIR,
  type WikiData,
  type WikiEffectSnapshot,
  type WikiFormSnapshot,
  type WikiMaxMoveSnapshot,
  type WikiPokemonDescriptionSnapshot,
  type WikiSnapshot,
  type WikiZMoveSnapshot,
} from "@/prisma/seed-data/types";

const WIKI_API = "https://wiki.52poke.com/api.php";
const POKEAPI = "https://pokeapi.co/api/v2";
const SOURCE = "https://wiki.52poke.com";
const LICENSE = "CC BY-NC-SA 3.0";

/** 一次查多少个页面。接口上限是 50，但招式页动辄三十多 K，
 *  一次 50 个的响应能到两兆，百科那边会直接 502，所以取 20 */
const PAGE_BATCH = 20;

/** 请求之间歇一下。百科是志愿者在运维，没必要打满 */
const THROTTLE_MS = 500;

/** 机制说明要逐页渲染，简繁各一次。渲染比读源码重得多，
 *  开到 4 就会大面积 429，2 个并发配上节流刚好 */
const EFFECT_CONCURRENCY = 2;

/** 单个请求最多重试几次。跑到后半程百科会连着掐好几次连接，4 次不够 */
const MAX_RETRY = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 百科访问 ──────────────────────────────────────────────────

/**
 * 查一次百科接口，失败退避重试。
 *
 * 502 / 503 / 429 都是「这会儿别来」而不是「这个请求不对」，
 * 一次抓三千多个页面总会撞上几回，退避重试比整轮重跑划算。
 */
async function wiki<T>(params: Record<string, string>, attempt = 0): Promise<T> {
  const url = new URL(WIKI_API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();

  const label = (params.titles ?? params.page ?? "").slice(0, 60);
  let status = 0;
  try {
    const res = await fetch(url, {
      // 百科要求带能联系到人的 UA，匿名 UA 会被挡
      headers: { "User-Agent": "chipsmewtwo-seed/1.0 (+https://github.com/garnetliu/chipsmewtwo)" },
    });
    if (res.ok) return (await res.json()) as T;
    status = res.status;
    if (![429, 500, 502, 503, 504].includes(status)) {
      throw new Error(`GET ${label} → ${status}`);
    }
  } catch (err) {
    // 网络层的错（连接被掐、TLS 握手失败）跟 5xx 一样重试
    if (attempt >= MAX_RETRY) throw err;
  }
  if (attempt >= MAX_RETRY) throw new Error(`GET ${label} → ${status}，重试 ${attempt} 次仍失败`);

  const wait = 1000 * 2 ** attempt;
  console.log(`    ${status || "网络错误"}，${wait}ms 后重试（第 ${attempt + 1} 次）`);
  await sleep(wait);
  return wiki<T>(params, attempt + 1);
}

/** 参数多到塞不进 URL 时改用 POST，其余跟 wiki() 一样退避重试 */
async function wikiPost<T>(params: Record<string, string>, attempt = 0): Promise<T> {
  const body = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  try {
    const res = await fetch(WIKI_API, {
      method: "POST",
      headers: {
        "User-Agent": "chipsmewtwo-seed/1.0 (+https://github.com/garnetliu/chipsmewtwo)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (res.ok) return (await res.json()) as T;
    if (![429, 500, 502, 503, 504].includes(res.status)) {
      throw new Error(`POST ${params.action} → ${res.status}`);
    }
    if (attempt >= MAX_RETRY) throw new Error(`POST ${params.action} → ${res.status}`);
  } catch (err) {
    if (attempt >= MAX_RETRY) throw err;
  }
  await sleep(1000 * 2 ** attempt);
  return wikiPost<T>(params, attempt + 1);
}

/**
 * 简体转繁体，一次转一批。
 *
 * 百科的繁体是 MediaWiki 在渲染时用字词转换表转出来的，页面源码里只有简体。
 * 特性和招式那两批走的是渲染，带 variant 再请求一遍就有繁体；道具走的是源码
 * （两千多件走渲染要几个小时），所以把抓到的简体交给同一套转换表转一遍。
 *
 * 拿 ---- 当分隔符：它渲染成 <hr>，转纯文本后正好按空行把各条切开。
 * 切出来的条数对不上就整批放弃 —— 宁可没有繁体，也不能让文本错位串行
 */
async function convertVariant(
  texts: string[],
  variant: "zh-hans" | "zh-hant",
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const BATCH = 30;

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const data = await wikiPost<{ parse?: { text: string } }>({
      action: "parse",
      title: "临时",
      contentmodel: "wikitext",
      prop: "text",
      disablelimitreport: "1",
      variant,
      text: batch.join("\n\n----\n\n"),
    });

    const html = data.parse?.text;
    if (html) {
      // 先按块级标签断成行再切段。不能直接过 htmlToText ——
      // 它会把连续空白压成一个空格，正好把用来分段的空行也抹掉
      const parts = html
        .replace(/<(p|div|hr|li|br)[^>]*>/g, "\n\n")
        .replace(/<[^>]+>/g, "")
        .split(/\n\s*\n/)
        .map((s) => htmlToText(s))
        .filter(Boolean);
      if (parts.length === batch.length) {
        batch.forEach((source, n) => out.set(source, parts[n]!));
      } else {
        console.warn(
          `  ⚠ ${variant} 转换切出 ${parts.length} 段，应是 ${batch.length} 段，这批放弃`,
        );
      }
    }

    if (i % (BATCH * 10) === 0) {
      console.log(`    ${variant} ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
    }
    await sleep(THROTTLE_MS);
  }
  return out;
}

/**
 * 请求时给的标题 → 百科上的真实页名。
 *
 * query 接口能靠 converttitles 和 redirects 找到简繁不同写法的页面，
 * parse 接口没有 converttitles 这个参数 —— 招式页在百科存的是繁体名
 * （「衝岩（招式）」），拿简体名去 parse 直接报页面不存在
 */
const RESOLVED_TITLES = new Map<string, string>();

/**
 * 批量取页面源码。
 *
 * redirects=1 让重定向自动跟过去 —— 百科上「茂盛」是指向「茂盛（特性）」的
 * 重定向页，直接查裸名字拿到的是重定向本身。
 *
 * 返回按请求的标题索引，包括重定向前的名字，调用方不用关心跳到哪去了。
 */
async function fetchPages(titles: string[]): Promise<Map<string, string>> {
  type Response = {
    query?: {
      redirects?: { from: string; to: string }[];
      normalized?: { from: string; to: string }[];
      converted?: { from: string; to: string }[];
      pages?: {
        title: string;
        missing?: boolean;
        revisions?: { slots: { main: { content?: string } } }[];
      }[];
    };
  };

  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += PAGE_BATCH) {
    const batch = titles.slice(i, i + PAGE_BATCH);
    const data = await wiki<Response>({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      // 索引页里简繁混着写（「薄霧球」），页面本身都是简体名，交给接口转
      converttitles: "zh-hans",
      titles: batch.join("|"),
    });

    const byTitle = new Map<string, string>();
    for (const page of data.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots.main.content;
      if (!page.missing && content) byTitle.set(page.title, content);
    }
    // 重定向和标题规范化各走一跳，顺着链把原标题映射回最终内容
    const hop = new Map<string, string>();
    for (const r of [
      ...(data.query?.normalized ?? []),
      ...(data.query?.converted ?? []),
      ...(data.query?.redirects ?? []),
    ]) {
      hop.set(r.from, r.to);
    }
    for (const title of batch) {
      let current = title;
      for (let n = 0; n < 4 && !byTitle.has(current); n++) {
        const next = hop.get(current);
        if (!next) break;
        current = next;
      }
      const content = byTitle.get(current);
      if (content) {
        out.set(title, content);
        // parse 接口不认 converttitles，简繁标题得靠这里解析出的真名去查
        RESOLVED_TITLES.set(title, current);
      }
    }

    if (i % (PAGE_BATCH * 10) === 0) {
      console.log(`    ${Math.min(i + PAGE_BATCH, titles.length)}/${titles.length}`);
    }
    await sleep(THROTTLE_MS);
  }
  return out;
}

/** PokeAPI 的 id → slug。条目对应靠编号，百科信息框里的 n= 就是这个 id */
async function slugsById(resource: string): Promise<Map<number, string>> {
  const res = await fetch(`${POKEAPI}/${resource}?limit=5000`);
  if (!res.ok) throw new Error(`GET /${resource} → ${res.status}`);
  const list = (await res.json()) as { results: { name: string; url: string }[] };

  const out = new Map<number, string>();
  for (const r of list.results) {
    const id = Number(r.url.replace(/\/$/, "").split("/").pop());
    if (Number.isFinite(id)) out.set(id, r.name);
  }
  return out;
}

/**
 * 取一页某一节渲染之后的 HTML。
 *
 * 机制说明只能走渲染这条路：百科把效果写成模板的页面不少
 * （蓄电的效果段整段是 {{特性效果/属性无效|电|回复}}），源码里展不开，
 * 渲染完才是「具有该特性的宝可梦不受电属性招式的影响……」。
 *
 * 节号默认 1 —— 特性页的第 1 节固定是「特性效果」，招式页是「招式附加效果」。
 * 返回的 HTML 带着那一节的标题，调用方顺手核对，对不上就当这页没有说明
 */
async function fetchSectionHtml(
  title: string,
  variant: string,
  section = "1",
): Promise<string | null> {
  type Response = { parse?: { text: string }; error?: { code: string } };
  const data = await wiki<Response>({
    action: "parse",
    page: RESOLVED_TITLES.get(title) ?? title,
    prop: "text",
    section,
    disabletoc: "1",
    redirects: "1",
    converttitles: "zh-hans",
    // 简繁是渲染时转出来的，源码里只有一份
    variant,
  });
  return data.parse?.text ?? null;
}

/**
 * 渲染结果里取正文段落。
 *
 * 只要第一个列表（或表格）之前的那几个 <p> —— 百科的效果段固定是
 * 「一两段成句的描述 + 一串 * 开头的补充条款」，后者是细则不是说明，
 * 跟 PokeAPI 的 effect 不是一个粒度。喷射火焰那页两段都要：
 * 「攻击目标造成伤害。」加上「有10%的几率使目标陷入灼伤状态。」
 */
function renderedParagraphs(html: string): string | null {
  let text = html;
  // 编辑链接、目录、提示框、信息框都不是正文
  text = text.replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, "");
  text = text.replace(
    /<div[^>]*class="[^"]*(hatnote|navbox|toc|thumb)[^"]*"[^>]*>[\s\S]*?<\/div>/g,
    "",
  );
  text = text.replace(/<table[\s\S]*?<\/table>/g, "");

  // 这段 HTML 开头就是本节自己的 <h2>，去掉标题本身（内容要留）
  text = text.replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, "");

  // 小节之间挑一段：页面分节的话（茂盛那种）第一节是「对战中」，
  // 后面的「不可思议迷宫」「信长的野望」是外传规则，不能拼进来；
  // 不分节的话（引火那种）正文直接跟在 h2 后，外传小节才在下面
  const headings = [...text.matchAll(/<h[3-6][^>]*>[\s\S]*?<\/h[3-6]>/g)];
  if (headings.length) {
    const first = headings[0]!;
    const beforeFirst = text.slice(0, first.index);
    text = /<p[\s>]/.test(beforeFirst)
      ? beforeFirst
      : text.slice(first.index + first[0].length, headings[1]?.index ?? text.length);
  }

  // 选定小节之后的全文留一份 —— 一个 <p> 都没有的条目要从这里面捞列表项
  const section = text;

  // 正文之后的第一个列表起是补充条款，整段切掉。
  // 从第一个 <p> 往后找，不从头找 ——「主页面：某某」那种提示框是 <dl>，
  // 排在正文前面，从头找的话一上来就截没了（飘浮、寄生种子都栽在这儿）
  const body = /<p[\s>]/.exec(text);
  if (body) {
    const rest = text.slice(body.index);
    const stop = /<(ul|ol|dl)[\s>]/.exec(rest);
    text = stop ? rest.slice(0, stop.index) : rest;
  }

  const paragraphs: string[] = [];
  for (const m of text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const line = htmlToText(m[1]!);
    if (line) paragraphs.push(line);
  }

  // 有些条目的效果段整段是列表，一个 <p> 都没有（腐蚀、一猩一意就是这样）。
  // 那就取最外层的 <li>，嵌套那层是补充条款，性质跟段落后面跟的列表一样
  const joined = paragraphs.length ? paragraphs.join("") : topLevelListItems(section).join("");
  return joined.length >= MIN_EFFECT_LENGTH ? joined : null;
}

/**
 * 提示框里「主页面：某某」指到哪一页。
 *
 * 有些招式的正文就一句「主页面：森林咒术（状态）」，内容全在那个条目上。
 * renderedParagraphs 会把提示框当噪音删掉，所以正文为空时回来这儿看一眼。
 *
 * 提示框有时是 <div class="hatnote">，有时就是个裸 <dl><dd>（森林诅咒那页），
 * 所以两种都扫，靠里面有没有「主页面」认
 */
function hatnoteTarget(html: string): string | null {
  for (const block of html.matchAll(/<(div|dl)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const body = block[2]!;
    if (!/主页面|主頁面/.test(htmlToText(body))) continue;
    const link = /<a[^>]*href="\/wiki\/([^"#?]+)"/.exec(body);
    if (link) return decodeURIComponent(link[1]!.replace(/_/g, " "));
  }
  return null;
}

/**
 * 最外层的 <li> 文本。
 *
 * 嵌套进去的那层是补充条款，跳过 —— 跟段落后面跟的列表一个性质，
 * 比 PokeAPI 的 effect 细一个量级
 */
function topLevelListItems(html: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buffer: string | null = null;

  for (const m of html.matchAll(/<(\/?)(ul|ol|li)\b[^>]*>|([^<]+)|<[^>]+>/g)) {
    const [, closing, tag, text] = m;
    if (tag === "ul" || tag === "ol") {
      depth += closing ? -1 : 1;
      continue;
    }
    if (tag === "li") {
      if (!closing && depth === 1) buffer = "";
      else if (closing && buffer !== null) {
        const line = htmlToText(buffer);
        if (line) out.push(line);
        buffer = null;
      }
      continue;
    }
    if (buffer !== null && depth === 1 && text) buffer += text;
  }
  return out;
}

/** 行内标签直接拆掉，不补空格 —— 中文里 <a> 包的是词，补了就断句 */
function htmlToText(html: string): string {
  return html
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/g, "$1")
    .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ── wikitext 清洗 ────────────────────────────────────────────

/**
 * 百科用 MediaWiki 的字词转换语法同时写简繁：-{zh-hans:简;zh-hant:繁}-。
 *
 * 游戏文案都带这层包装，两版各存各的。正文（机制说明那些）没有 ——
 * 百科正文用简体写，繁体是读者端自动转换出来的，源码里拿不到。
 * 那种情况只写 zh-Hans，不拿简体冒充繁体：库里有 zh-Hant 行的话，
 * 繁体用户看到的是一段没转换过的简体，而回退机制本来就会把它带到简体那行去。
 */
function splitVariants(text: string): Localized {
  if (!/-\{[^{}]*zh-(hans|hant|cn|tw|hk|sg|mo)\s*:/.test(text)) {
    const plain = text.replace(/-\{([^{}]*)\}-/g, "$1").trim();
    return plain ? { "zh-Hans": plain } : {};
  }

  const pick = (lang: "zh-hans" | "zh-hant") =>
    text.replace(/-\{([^{}]*)\}-/g, (_, body: string) => {
      const parts = body.split(";").map((p) => p.trim());
      for (const part of parts) {
        const m = /^(zh-hans|zh-hant|zh-cn|zh-tw|zh-hk|zh-sg|zh-mo|zh)\s*:\s*([\s\S]*)$/.exec(part);
        if (m && (m[1] === lang || m[1] === "zh")) return m[2];
      }
      // 不是语言转换的 -{}-（百科也用它来禁止自动转换），原样留下里面的内容
      return parts.length === 1 ? body : (parts[0] ?? body);
    });

  const hans = pick("zh-hans").trim();
  const hant = pick("zh-hant").trim();
  if (!hans && !hant) return {};
  return { "zh-Hans": hans || hant, "zh-Hant": hant || hans };
}

/**
 * 把 wikitext 压成纯文本。
 *
 * 只认几个真的会改变文意的模板，其余一律取最后一个匿名参数 ——
 * 百科的行内模板绝大多数是 {{类型|显示文本}} 这个形状（{{S|灼伤}}、{{type|草}}），
 * 取最后一个参数就是要显示的词。认不出的宁可留下一个词，也别把整句挖空。
 */
function plainText(source: string): string {
  let text = source;

  // 注释、参考、HTML 标签先去掉
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "").replace(/<ref[^>]*\/>/g, "");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]+>/g, "");

  // 纯图标和角标模板整个丢掉。{{MSP|061|蚊香君}} 是宝可梦小图，
  // 后面紧跟着 [[蚊香君]]，按「取最后一个参数」处理会把名字写两遍
  text = text.replace(
    /\{\{\s*(MSP|MS|Bag|Bag\/[^|{}]*|sup|sup\/[^|{}]*|\$)\s*(\|[^{}]*)?\}\}/gi,
    "",
  );

  // 分数模板写成 1/3，不然 {{frac|1|3}} 会被当普通模板削成 "3"
  text = text.replace(/\{\{\s*frac\s*\|([^{}|]*)\|([^{}|]*)\}\}/gi, "$1/$2");
  // {{tt|显示|悬停注释}} 只留显示的那半；日文原文那类注释整个丢掉
  text = text.replace(/\{\{\s*tt\s*\|\s*\*\s*\|[^{}]*\}\}/gi, "");
  text = text.replace(/\{\{\s*tt\s*\|([^{}|]*)\|[^{}]*\}\}/gi, "$1");

  // 剩下的模板从里往外拆，取最后一个匿名参数。嵌套的靠反复替换收敛
  for (let i = 0; i < 8 && /\{\{/.test(text); i++) {
    const before = text;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const args = body.split("|").slice(1);
      const anonymous = args.filter((a) => !/^[^=]{1,20}=/.test(a));
      return (anonymous[anonymous.length - 1] ?? "").trim();
    });
    if (text === before) break;
  }

  // 内链取显示文本，外链取链接文字
  text = text.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1");
  text = text.replace(/\[\[([^\]]*)\]\]/g, "$1");
  text = text.replace(/\[(?:https?|\/\/)\S+\s+([^\]]*)\]/g, "$1");
  text = text.replace(/\[(?:https?|\/\/)\S+\]/g, "");

  // 粗斜体标记、列表符号、残留的表格语法
  text = text.replace(/'{2,5}/g, "");
  text = text.replace(/^[*#:;]+\s*/gm, "");
  text = text.replace(/\|\}|\{\|/g, "");

  return text.replace(/\s+/g, " ").trim();
}

/**
 * 机制说明短于这个长度就当没抓到。
 *
 * 个别页面的效果段整段是个模板调用，渲染失败时只剩一两个词，
 * 进库只会在页面上显示一个「回复」 —— 不如让它缺着，前端回退到英文
 */
const MIN_EFFECT_LENGTH = 8;
/** 道具的效果段是逐条列出来的，短句本来就成立 ——
 *  高级球整段只有「捕获率×2。」六个字，按上面那个门槛会被当噪音丢掉 */
const MIN_ITEM_EFFECT_LENGTH = 4;

/**
 * 道具的机制说明。
 *
 * 跟特性招式不一样，走页面源码而不是渲染 —— 道具页的效果段是一串 * 列表，
 * 结构规整，源码里解析得出来。两千多件道具走渲染是四千多个请求、几个小时，
 * 读源码只要一百来个请求。
 *
 * 只取顶层的 * 行：嵌套的 ** 是补充条款（讲究头带那条讲了极巨化下怎么算），
 * 跟 PokeAPI 的 effect 不是一个粒度。===对战中=== 这类子节标题跳过，
 * 标题下面的内容照收 —— 王者之证的效果分「对战中」和「对战外」两段，都算效果
 */
/**
 * 道具在游戏里显示的那句说明，一条 {{包包信息框}} 是一个版本组的。
 *
 * 参数是定位的：世代 | 版本组缩写 | 图片名 | 口袋 | 说明 | 售价 | 卖价。
 * PokeAPI 的中文只到剑盾，第九世代那六百多件新道具只有这里有
 */
function parseItemFlavors(source: string, unknownAbbr: Set<string>): FlavorsByGroup {
  const out: FlavorsByGroup = {};
  for (const m of source.matchAll(/\{\{\s*包包信息框\s*\|/g)) {
    const body = templateBody(source.slice(m.index), "包包信息框");
    if (!body) continue;

    const args = splitTopLevel(body);
    const abbr = args[2]?.trim();
    const text = args[5]?.trim();
    if (!abbr || !text) continue;

    const groupSlug = groupOfAbbr(abbr);
    if (!groupSlug) {
      unknownAbbr.add(abbr);
      continue;
    }
    // 没有说明的版本写成一个破折号
    if (/^(&mdash;|—|-)$/.test(text)) continue;

    const texts = splitVariants(plainText(text));
    if (Object.keys(texts).length) out[groupSlug] ??= texts;
  }
  return out;
}

const ITEM_EFFECT_HEADINGS = ["使用效果", "效果", "道具效果", "游戏中"];

/** 中文属性名 → slug。简繁两份都收，源码里两种写法都有 */
function typeSlugByName(): Map<string, string> {
  type Type = { slug: string; names: Partial<Record<LanguageCode, string>> };
  const rows = JSON.parse(readFileSync(join(SEED_DATA_DIR, "types.json"), "utf8")) as Type[];
  const out = new Map<string, string>();
  for (const row of rows) {
    for (const name of [row.names["zh-Hans"], row.names["zh-Hant"]]) {
      if (name) out.set(name, row.slug);
    }
  }
  return out;
}

/**
 * 这件道具强化哪个属性的招式。
 *
 * 木炭、磁铁、各种薰香这二十来件，slug 里没有属性（charcoal 不含 fire），
 * 只能从正文认。百科的写法很齐整：
 *   * 携带该道具的宝可梦的{{type|火}}招式威力提升20%。
 *
 * 只认这一句。属性招式在别的语境里也会出现（「对{{type|水}}招式免疫」），
 * 所以「威力提升」这几个字是必须的
 */
/**
 * 树果打出的自然之恩是什么属性、多少威力。
 *
 * 数据源有几颗第六世代的新树果这两项空着，百科的树果信息框里写着：
 *   {{树果/信息框 |type=妖精 |power=80 ...}}
 *
 * 威力第六世代调过，老树果那栏写成
 * 「60{{tt|*|第六世代之前}}<br>80{{tt|*|第六世代起}}」—— 取现行值，
 * 也就是最后一个数字
 */
function parseBerryNaturalGift(
  source: string,
  types: Map<string, string>,
): { typeSlug: string; power: number } | null {
  if (!source.includes("{{树果/信息框")) return null;

  const typeName = /^\|type=\s*(\S+?)\s*$/m.exec(source)?.[1];
  const powerField = /^\|power=\s*(.+?)\s*$/m.exec(source)?.[1];
  const typeSlug = typeName ? types.get(typeName) : undefined;
  const power = powerField ? [...powerField.matchAll(/\d+/g)].pop()?.[0] : undefined;
  return typeSlug && power ? { typeSlug, power: Number(power) } : null;
}

function parseItemBoost(source: string, types: Map<string, string>): string | null {
  const plain = source.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[|\]\]/g, "");
  const found = /\{\{type\|([^}|]+)\}\}招式威力提升/.exec(plain);
  return found ? (types.get(found[1]!.trim()) ?? null) : null;
}

function parseItemEffect(source: string): string | null {
  for (const heading of ITEM_EFFECT_HEADINGS) {
    // 章节层级不固定：多数道具页写成 ==效果==，而伤药、精灵球这些
    // 一页装几个道具的写成 ===效果===，精灵球那页还一连三个
    const found = new RegExp(`^[ \\t]*(={2,4})[ \\t]*${heading}[ \\t]*\\1[ \\t]*$`, "m").exec(
      source,
    );
    if (!found) continue;

    const rest = source.slice(found.index + found[0].length);
    // 到同级或更上级的标题为止 —— 下一级的子节（「仅在ＬＡ中」）还算这一节的
    const end = new RegExp(`^[ \\t]*={2,${found[1]!.length}}[^=]`, "m").exec(rest);
    const body = end ? rest.slice(0, end.index) : rest;

    const lines: string[] = [];
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("=")) continue;
      // 嵌套列表是细则，百科写成 ** 或 :* 都有；表格和模板调用行不是正文
      if (/^(\*\*|:|#\*|[|!{}])/.test(line)) continue;
      const text = plainText(line.replace(/^[*#]+\s*/, ""));
      if (text) lines.push(text);
    }

    const joined = lines.join("");
    if (joined.length >= MIN_ITEM_EFFECT_LENGTH) return joined;
  }
  return null;
}

// ── 版本组与版本的对照 ────────────────────────────────────────

/**
 * 百科的游戏缩写 → PokeAPI 的版本组 slug。
 *
 * 百科在 {{状态说明框|世代|缩写|文本}} 和招式说明模板的 #switch 里都用这套缩写。
 * 外传游戏（信长的野望、不可思议迷宫）不在库里，不列进来，会被记进 unmatched
 */
const GROUP_OF_ABBR: Record<string, string> = {
  RG: "red-blue",
  RB: "red-blue",
  RGB: "red-blue",
  RBY: "red-blue",
  RGBY: "red-blue",
  Y: "yellow",
  GS: "gold-silver",
  C: "crystal",
  GSC: "gold-silver",
  RS: "ruby-sapphire",
  E: "emerald",
  RSE: "ruby-sapphire",
  FRLG: "firered-leafgreen",
  // 横跨两个版本组的缩写取靠前那个 —— 说明文案在两边是一样的，
  // 不然百科不会把它们合并写成一条
  EFRLG: "emerald",
  XYORAS: "x-y",
  Col: "colosseum",
  COLO: "colosseum",
  COLOXD: "colosseum",
  XD: "xd",
  DP: "diamond-pearl",
  Pt: "platinum",
  DPPt: "diamond-pearl",
  HGSS: "heartgold-soulsilver",
  BW: "black-white",
  B2W2: "black-2-white-2",
  BWB2W2: "black-white",
  XY: "x-y",
  ORAS: "omega-ruby-alpha-sapphire",
  SM: "sun-moon",
  USUM: "ultra-sun-ultra-moon",
  SMUSUM: "sun-moon",
  LPLE: "lets-go-pikachu-lets-go-eevee",
  LGPE: "lets-go-pikachu-lets-go-eevee",
  SWSH: "sword-shield",
  SWSH2: "sword-shield",
  SW: "sword-shield",
  SH: "sword-shield",
  BDSP: "brilliant-diamond-shining-pearl",
  LA: "legends-arceus",
  SV: "scarlet-violet",
  // 朱紫的两个 DLC 在库里各自是一个版本组
  TM: "the-teal-mask",
  ID: "the-indigo-disk",
  // 剑盾的两个 DLC 同理
  IoA: "the-isle-of-armor",
  CT: "the-crown-tundra",
  ZA: "legends-za",
  MD: "mega-dimension",
  Champ: "champions",
  Champions: "champions",
};

/** 百科各处写缩写的大小写不一致（Colo / COLO / colo 都有），查表时统一压成小写 */
const GROUP_BY_LOWER = new Map(
  Object.entries(GROUP_OF_ABBR).map(([abbr, slug]) => [abbr.toLowerCase(), slug]),
);

function groupOfAbbr(abbr: string): string | undefined {
  return GROUP_BY_LOWER.get(abbr.toLowerCase());
}

/**
 * 百科图鉴模板的参数名 → PokeAPI 的版本 slug。
 *
 * 一对多的那些是百科把文案相同的几个版本合并写了一条
 * （dpptdex 是钻石/珍珠/白金共用，bwb2w2dex 是黑白和黑2白2 四个版本共用）。
 * 库里的图鉴说明主键细到版本，所以要摊开。
 */
const VERSIONS_OF_DEX_KEY: Record<string, string[]> = {
  // 日版红绿和国际版红蓝的图鉴文案是同一批，库里两套版本都有行
  redgreendex: ["red", "red-japan", "green-japan"],
  reddex: ["red", "red-japan"],
  greendex: ["green-japan"],
  bluedex: ["blue", "blue-japan"],
  bluejpdex: ["blue-japan"],
  yellowdex: ["yellow"],
  golddex: ["gold"],
  silverdex: ["silver"],
  crystaldex: ["crystal"],
  rubydex: ["ruby"],
  sapphiredex: ["sapphire"],
  rsdex: ["ruby", "sapphire"],
  emeralddex: ["emerald"],
  rsedex: ["ruby", "sapphire", "emerald"],
  firereddex: ["firered"],
  leafgreendex: ["leafgreen"],
  frlgdex: ["firered", "leafgreen"],
  diamonddex: ["diamond"],
  pearldex: ["pearl"],
  dpdex: ["diamond", "pearl"],
  platinumdex: ["platinum"],
  ptdex: ["platinum"],
  dpptdex: ["diamond", "pearl", "platinum"],
  heartgolddex: ["heartgold"],
  hgdex: ["heartgold"],
  soulsilverdex: ["soulsilver"],
  ssdex: ["soulsilver"],
  hgssdex: ["heartgold", "soulsilver"],
  blackdex: ["black"],
  whitedex: ["white"],
  bwdex: ["black", "white"],
  black2dex: ["black-2"],
  white2dex: ["white-2"],
  b2w2dex: ["black-2", "white-2"],
  bwb2w2dex: ["black", "white", "black-2", "white-2"],
  xdex: ["x"],
  ydex: ["y"],
  xydex: ["x", "y"],
  omegarubydex: ["omega-ruby"],
  alphasapphiredex: ["alpha-sapphire"],
  orasdex: ["omega-ruby", "alpha-sapphire"],
  sundex: ["sun"],
  moondex: ["moon"],
  smdex: ["sun", "moon"],
  ultrasundex: ["ultra-sun"],
  usdex: ["ultra-sun"],
  ultramoondex: ["ultra-moon"],
  umdex: ["ultra-moon"],
  usumdex: ["ultra-sun", "ultra-moon"],
  letsgopikachudex: ["lets-go-pikachu"],
  letsgoeeveedex: ["lets-go-eevee"],
  letsgodex: ["lets-go-pikachu", "lets-go-eevee"],
  swdex: ["sword"],
  shdex: ["shield"],
  swshdex: ["sword", "shield"],
  bddex: ["brilliant-diamond"],
  spdex: ["shining-pearl"],
  bdspdex: ["brilliant-diamond", "shining-pearl"],
  ladex: ["legends-arceus"],
  scdex: ["scarlet"],
  videx: ["violet"],
  svdex: ["scarlet", "violet"],
  // DLC 的版本 slug 是「DLC 名 + 本体版本」的复合形式
  tmdex: ["the-teal-mask-scarlet", "the-teal-mask-violet"],
  iddex: ["the-indigo-disk-scarlet", "the-indigo-disk-violet"],
  ioadex: ["the-isle-of-armor-sword", "the-isle-of-armor-shield"],
  ctdex: ["the-crown-tundra-sword", "the-crown-tundra-shield"],
  zadex: ["legends-za"],
};

// ── 模板参数的解析 ────────────────────────────────────────────

/** 抠出 {{模板名|...}} 的整段，包括嵌套的花括号 */
function templateBody(source: string, name: string): string | null {
  const start = new RegExp(`\\{\\{\\s*${name}\\s*[|}]`).exec(source);
  if (!start) return null;

  let depth = 0;
  for (let i = start.index; i < source.length - 1; i++) {
    if (source[i] === "{" && source[i + 1] === "{") {
      depth++;
      i++;
    } else if (source[i] === "}" && source[i + 1] === "}") {
      depth--;
      if (depth === 0) return source.slice(start.index + 2, i);
      i++;
    }
  }
  return null;
}

/**
 * 按顶层竖线切开模板体。嵌套的模板、链接、字词转换里的竖线不算 ——
 * {{图鉴|scdex=-{zh-hans:甲;zh-hant:乙}-}} 里那段不能被切开
 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{" || two === "[[" || two === "-{") depth++;
    else if (two === "}}" || two === "]]" || two === "}-") depth--;
    if (body[i] === "|" && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += body[i];
    }
  }
  parts.push(current);
  return parts;
}

/** 顶层的第一个等号在哪。嵌套结构里的不算 */
function topLevelEquals(part: string): number {
  let depth = 0;
  for (let i = 0; i < part.length; i++) {
    const two = part.slice(i, i + 2);
    if (two === "{{" || two === "[[" || two === "-{") depth++;
    else if (two === "}}" || two === "]]" || two === "}-") depth--;
    if (part[i] === "=" && depth === 0) return i;
  }
  return -1;
}

/** 模板体拆成 |name=value 的具名参数 */
function namedArgs(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of splitTopLevel(body).slice(1)) {
    const eq = topLevelEquals(part);
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    if (/[|{}]/.test(key)) continue;
    out.set(key, part.slice(eq + 1).trim());
  }
  return out;
}

/** 英文名归一成 PokeAPI 的 slug 写法：小写、撇号点号去掉、其余非字母数字换成连字符 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 道具列表页的「英文名 → 中文名」。
 *
 * 缺中文名的道具没法拿中文名当页名去查，只能反过来从列表页认。
 * 表格一行五格：图标、中文名、日文名、英文名、说明，中文名裹在 {{I|…}} 里，
 * 英文名是那一行里唯一的纯拉丁字母格
 */
function parseItemNameIndex(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of source.split(/\n\|-/)) {
    const zh = /\{\{\s*I\s*\|\s*([^|}\n]+)/.exec(block);
    if (!zh) continue;

    let en: string | null = null;
    for (const cell of block.split("\n|")) {
      const s = cell.trim();
      if (s.length > 1 && !s.startsWith("class") && /^[A-Za-z0-9 '’\-.é]+$/.test(s)) en = s;
    }
    if (en) out.set(toSlug(en), zh[1]!.trim());
  }
  return out;
}

/**
 * 抠出某个 == 标题 == 下的第一张维基表格，拆成一行行单元格。
 *
 * 表格行以行首的 |- 分隔，单元格以行首的 | 开头 —— 模板参数里的竖线
 * 不在行首，所以不会被误切。! 开头的是表头行，跳过
 */
function parseWikiTable(source: string, heading: string): string[][] {
  const found = new RegExp(`^[ \\t]*==[ \\t]*${heading}[ \\t]*==[ \\t]*$`, "m").exec(source);
  if (!found) return [];

  const rest = source.slice(found.index + found[0].length);
  const end = /^[ \t]*==[^=]/m.exec(rest);
  const section = end ? rest.slice(0, end.index) : rest;

  const start = section.indexOf("{|");
  if (start < 0) return [];
  const close = section.indexOf("\n|}", start);
  const table = section.slice(start, close < 0 ? undefined : close);

  const rows: string[][] = [];
  let cells: string[] | null = null;
  let current: string[] = [];
  for (const raw of table.split("\n")) {
    const line = raw.trimEnd();
    if (/^\|-/.test(line)) {
      if (cells && cells.length) rows.push(cells.map((c) => c.trim()));
      cells = [];
      current = [];
      continue;
    }
    if (cells === null) continue;
    if (/^[|!]/.test(line) && !/^\|\}/.test(line)) {
      // 表头行整行跳过
      if (line.startsWith("!")) continue;
      current = [line.replace(/^\|/, "")];
      cells.push("");
      cells[cells.length - 1] = current[0]!;
    } else if (cells.length) {
      cells[cells.length - 1] += `\n${line}`;
    }
  }
  if (cells && cells.length) rows.push(cells.map((c) => c.trim()));
  return rows;
}

/** {{MSP|143|卡比兽}} 里的编号，带形态后缀的写成 026A（阿罗拉雷丘） */
function dexNumberOf(cell: string): { number: number; suffix: string } | null {
  const m = /\{\{\s*MSPN?\s*\|\s*0*(\d+)([A-Za-z]*)/.exec(cell);
  if (!m) return null;
  return { number: Number(m[1]), suffix: m[2]!.toUpperCase() };
}

// ── 特性 ──────────────────────────────────────────────────────

/**
 * 特性列表页一条是
 * {{特性列表|065|茂盛|しんりょく|Overgrow|简体说明|繁体说明|拥有数|隐藏数}}，
 * 编号就是 PokeAPI 的 ability id。一个请求拿到全部 374 个的页名
 */
function abilityIndex(source: string): {
  byId: Map<number, string>;
  bySlug: Map<string, string>;
} {
  const byId = new Map<number, string>();
  const bySlug = new Map<string, string>();
  // 编号 | 中文名 | 日文名 | 英文名 | 简体说明 | 繁体说明 | …
  for (const m of source.matchAll(/\{\{\s*特性列表\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/g)) {
    const id = Number(m[1]!.trim());
    const name = m[2]!.trim();
    const en = m[4]!.trim();
    if (!name) continue;
    if (Number.isFinite(id)) byId.set(id, name);
    // 百科给新特性的编号跟数据源对不上（超级日光百科是 315、数据源是 310），
    // 英文名当第二把钥匙
    if (en) bySlug.set(toSlug(en), name);
  }
  return { byId, bySlug };
}

/**
 * 特性页里两样东西：
 *   ==特性效果== 下的 ===对战中=== 是中文机制说明（外传那几节跳过）
 *   {{状态说明框|世代|缩写|文本}} 是各版本组的游戏文案，含 PokeAPI 没有的第九世代
 */
function parseAbilityPage(
  source: string,
  unknownAbbr: Set<string>,
): Omit<WikiEffectSnapshot, "slug"> {
  // 机制说明不从源码取，走 fillEffects 那条渲染的路 —— 效果段常常整个是模板
  return { effect: {}, flavors: parseStateBoxes(source, unknownAbbr) };
}

/** {{状态说明框|世代|缩写|文本}}，特性和道具的游戏文案都用它 */
function parseStateBoxes(source: string, unknownAbbr: Set<string>): FlavorsByGroup {
  const out: FlavorsByGroup = {};
  for (const m of source.matchAll(/\{\{\s*状态说明框\s*\|/g)) {
    const body = templateBody(source.slice(m.index), "状态说明框");
    if (!body) continue;
    // |世代|缩写|文本 三个匿名参数，文本里可能有嵌套模板，所以只切前两刀
    const parts = body.split("|");
    if (parts.length < 4) continue;
    const abbr = parts[2]!.trim();
    const groupSlug = groupOfAbbr(abbr);
    if (!groupSlug) {
      unknownAbbr.add(abbr);
      continue;
    }
    const texts = splitVariants(plainText(parts.slice(3).join("|")));
    if (Object.keys(texts).length) out[groupSlug] ??= texts;
  }
  return out;
}

// ── 招式 ──────────────────────────────────────────────────────

/**
 * 招式列表页一条是
 * {{Movelist/gen/ex|53|喷射火焰|かえんほうしゃ|Flamethrower|火|特殊|90|100|15}}。
 *
 * 模板名写死 gen/ex 不用 [a-z/]* —— 每个世代前面有一行
 * {{Movelist/gen/exheader|关都}}，宽松匹配会把 exheader 和紧跟其后的
 * 第一条招式连着吃掉，每代的头一个招式（拍击、羽栖）就这么丢了。
 *
 * 认条目靠英文名不靠编号：专属Ｚ招式那一段两边的编号是错开的
 * （百科 725 是亲密无间大乱揍，数据源 725 是月华飞溅落灵霄），
 * 按编号认会把中文说明挂到隔壁招式上
 */
function moveIndex(source: string): { byId: Map<number, string>; bySlug: Map<string, string> } {
  const byId = new Map<number, string>();
  const bySlug = new Map<string, string>();
  // 编号 | 中文名 | 日文名 | 英文名 —— 英文名可能裹在 {{tt|…|注释}} 里
  const line =
    /\{\{\s*Movelist\/gen\/ex\s*\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|((?:[^|{}]|\{\{[^{}]*\}\})*)\|/gi;
  for (const m of source.matchAll(line)) {
    const id = Number(m[1]);
    const name = m[2]!.trim();
    const en = m[4]!.replace(/\{\{\s*tt\s*\|([^|{}]*)\|[^{}]*\}\}/gi, "$1").trim();
    if (!name) continue;
    if (Number.isFinite(id) && !byId.has(id)) byId.set(id, name);
    if (en && !bySlug.has(toSlug(en))) bySlug.set(toSlug(en), name);
  }
  return { byId, bySlug };
}

/**
 * 招式标记位，招式信息框里的六个 yes/no。
 *
 * 数据源完全没有这组数据，可它们是对战判定的开关：接触与否决定静电、
 * 粗糙皮肤那些特性触不触发，能不能被守住挡、被魔法反射弹回、被抢夺偷走，
 * 以及携带王者之证时能不能额外触发畏缩
 */
function parseMoveFlags(source: string): MoveFlags {
  const body = templateBody(source, "招式信息框");
  if (!body) return {};

  const args = namedArgs(body);
  const flag = (key: string): boolean | undefined => {
    const value = args.get(key)?.trim().toLowerCase();
    if (value === "yes" || value === "y") return true;
    if (value === "no" || value === "n") return false;
    return undefined;
  };

  const out: MoveFlags = {};
  const pairs: [keyof MoveFlags, string][] = [
    ["makesContact", "touches"],
    ["blockedByProtect", "protect"],
    ["reflectedByMagicCoat", "magiccoat"],
    ["stolenBySnatch", "snatch"],
    ["copiedByMirrorMove", "mirrormove"],
    ["triggersKingsRock", "kingsrock"],
  ];
  for (const [key, param] of pairs) {
    const value = flag(param);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * 招式的游戏文案不在招式页上，在同名模板页里 ——
 * Template:喷射火焰 是一串 {{#switch:|SM|USUM|LPLE|SWSH|BDSP=文本|SV=文本|...}}，
 * 招式页用 {{招式说明|火|1}} 把它渲染成表格。直接读模板源码比解析渲染后的表稳。
 */
function parseMoveTemplate(source: string, unknownAbbr: Set<string>): FlavorsByGroup {
  const out: FlavorsByGroup = {};
  for (const branch of switchBranches(source)) {
    const texts = splitVariants(plainText(branch.value));
    if (!Object.keys(texts).length) continue;
    for (const key of branch.keys) {
      const groupSlug = groupOfAbbr(key);
      if (!groupSlug) {
        // 外传游戏和 #switch 自己的语法词不算缺失
        if (!/^(信长的野望|大集合|#default|\d+|)$/.test(key)) unknownAbbr.add(key);
        continue;
      }
      out[groupSlug] ??= texts;
    }
  }
  return out;
}

/**
 * 拆 {{#switch:{{{1|}}}|KEY1|KEY2=文本|KEY3=文本|默认文本}}。
 *
 * 分支可以共用文本：招式模板里 SM|USUM|LPLE|SWSH|BDSP=同一句 很常见，
 * 所以没带等号的段是后一个分支的别名，攒着一起算。
 */
function switchBranches(source: string): { keys: string[]; value: string }[] {
  const start = source.indexOf("{{#switch:");
  if (start < 0) return [];

  let depth = 0;
  let end = -1;
  for (let i = start; i < source.length - 1; i++) {
    const two = source.slice(i, i + 2);
    if (two === "{{") {
      depth++;
      i++;
    } else if (two === "}}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
      i++;
    }
  }
  if (end < 0) return [];

  // 第一段是 "#switch:{{{1|}}}"，也就是被判断的那个值，不是分支
  const parts = splitTopLevel(source.slice(start + 2, end)).slice(1);
  const out: { keys: string[]; value: string }[] = [];
  let pending: string[] = [];
  for (const part of parts) {
    const eq = topLevelEquals(part);
    if (eq < 0) {
      pending.push(part.trim());
      continue;
    }
    pending.push(part.slice(0, eq).trim());
    out.push({ keys: pending.filter(Boolean), value: part.slice(eq + 1) });
    pending = [];
  }
  return out;
}

// ── 宝可梦图鉴说明 ────────────────────────────────────────────

/**
 * 分类，信息框里的 species 参数（「糖苹果宝可梦」的「糖苹果」那截）。
 *
 * 数据源第九世代那批物种的中文分类是空的，百科有。
 * 模板名在页面里写的是繁体，简体重定向也认，两种都匹配
 */
function parseGenus(source: string): Localized {
  const body = templateBody(source, "[寶宝]可[夢梦]信息框");
  if (!body) return {};
  const species = namedArgs(body).get("species");
  return species ? splitVariants(plainText(species)) : {};
}

/**
 * {{图鉴|type=草|gen=9|scdex=…|videx=…}}，参数名就是版本。
 *
 * 百科把文案相同的版本合并成一个参数（dpptdex），所以一个参数摊成几行。
 * 这批是 PokeAPI 最缺的：那边中文只有 8 个版本组、722 只，
 * 朱紫那 127 只一条都没有，这里从红绿版到朱紫全都有。
 */
function parseDexEntries(
  source: string,
  unknownKeys: Set<string>,
): WikiPokemonDescriptionSnapshot["descriptions"] {
  const body = templateBody(source, "图鉴");
  if (!body) return [];

  const out: WikiPokemonDescriptionSnapshot["descriptions"] = [];
  for (const [key, value] of namedArgs(body)) {
    const lower = key.toLowerCase();
    if (!lower.endsWith("dex")) continue;
    const versions = VERSIONS_OF_DEX_KEY[lower];
    if (!versions) {
      unknownKeys.add(key);
      continue;
    }
    const texts = splitVariants(plainText(value));
    for (const versionSlug of versions) {
      for (const [code, text] of Object.entries(texts)) {
        if (text) out.push({ versionSlug, languageCode: code as LanguageCode, text });
      }
    }
  }
  return out;
}

// ── 写出 ──────────────────────────────────────────────────────

async function write<K extends keyof WikiData>(name: K, snapshot: WikiData[K]) {
  const path = join(SEED_DATA_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  console.log(`写入 ${path}：${snapshot.rows.length} 条，未匹配 ${snapshot.unmatched.length}`);
}

function wrap<T>(rows: T[], unmatched: Set<string>): WikiSnapshot<T> {
  return { source: SOURCE, license: LICENSE, rows, unmatched: [...unmatched].sort() };
}

// ── 各批 ──────────────────────────────────────────────────────

/**
 * 机制说明。逐页取渲染之后的第一节，简繁各请求一次。
 *
 * 为什么不从源码取：百科把效果写成模板的页面不少，源码里只有
 * {{特性效果/属性无效|电|回复}} 这么一行，展开才是完整的一段话。
 *
 * 简繁是 MediaWiki 在渲染时转换出来的，源码里只有一份（正文按简体写），
 * 所以要拿繁体就得带 variant 再请求一遍
 */
/**
 * 一页一个变体的正文。
 *
 * 正文空了但提示框写着「主页面：某某」的话跟过去再抓一次 —— 森林诅咒的
 * 招式页整节就只有那一句，说明在「森林咒术（状态）」上。那种条目的正文在
 * 第 0 节（开头没有标题的那段），所以两节都试
 */
async function sectionText(title: string, variant: string): Promise<string | null> {
  const html = await fetchSectionHtml(title, variant);
  if (!html) return null;

  const text = renderedParagraphs(html);
  if (text) return text;

  const target = hatnoteTarget(html);
  if (!target) return null;

  for (const section of ["1", "0"]) {
    const linked = await fetchSectionHtml(target, variant, section);
    const linkedText = linked ? renderedParagraphs(linked) : null;
    if (linkedText) return linkedText;
  }
  return null;
}

async function fillEffects(
  entries: { slug: string; title: string }[],
): Promise<Map<string, Localized>> {
  const out = new Map<string, Localized>();
  const failed: string[] = [];

  for (let i = 0; i < entries.length; i += EFFECT_CONCURRENCY) {
    const batch = entries.slice(i, i + EFFECT_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (entry) => {
        // 一条抓不动不该让整轮白跑：三千多页里总有几页撞上连接被掐，
        // 而这一轮已经跑掉的几百页全在内存里，抛出去就都没了
        try {
          const [hans, hant] = await Promise.all([
            sectionText(entry.title, "zh-hans"),
            sectionText(entry.title, "zh-hant"),
          ]);
          return { slug: entry.slug, hans, hant };
        } catch (err) {
          failed.push(`${entry.title}: ${err instanceof Error ? err.message : String(err)}`);
          return { slug: entry.slug, hans: null, hant: null };
        }
      }),
    );

    for (const r of results) {
      const texts: Localized = {};
      if (r.hans) texts["zh-Hans"] = r.hans;
      if (r.hant) texts["zh-Hant"] = r.hant;
      // 只拿到一个变体时另一个也填上：转换失败不代表这条说明不存在
      texts["zh-Hans"] ??= texts["zh-Hant"];
      texts["zh-Hant"] ??= texts["zh-Hans"];
      if (texts["zh-Hans"]) out.set(r.slug, texts);
    }

    if (i % (EFFECT_CONCURRENCY * 25) === 0) {
      console.log(
        `    机制说明 ${Math.min(i + EFFECT_CONCURRENCY, entries.length)}/${entries.length}`,
      );
    }
    await sleep(THROTTLE_MS);
  }

  if (failed.length) {
    console.warn(`  ⚠ ${failed.length} 页没抓下来，前几个：${failed.slice(0, 3).join("；")}`);
  }
  return out;
}

async function abilities(): Promise<WikiSnapshot<WikiEffectSnapshot>> {
  const slugs = await slugsById("ability");
  const [indexPage] = [...(await fetchPages(["特性列表"])).values()];
  if (!indexPage) throw new Error("读不到「特性列表」，百科那边可能改了页名");

  const index = abilityIndex(indexPage);
  console.log(`  特性索引: ${index.byId.size} 条`);

  // 「茂盛」是指向「茂盛（特性）」的重定向，带后缀查更稳 ——
  // 裸名字有跟宝可梦或道具重名的（「毅力」「同步」）
  const titleOf = new Map<string, string>();
  const nameOf = new Map<string, string>();
  const unmatched = new Set<string>();
  for (const [id, name] of index.byId) {
    const slug = slugs.get(id);
    if (slug) {
      titleOf.set(slug, `${name}（特性）`);
      nameOf.set(slug, name);
    } else unmatched.add(`${id} ${name}`);
  }
  // 编号对不上的用英文名再认一遍：传说 Z-A 那几个新特性百科和数据源编号不一致
  for (const [slug, name] of index.bySlug) {
    if (!titleOf.has(slug) && [...slugs.values()].includes(slug)) {
      titleOf.set(slug, `${name}（特性）`);
      nameOf.set(slug, name);
    }
  }

  // 索引页本身有漏（气闸就不在列表里），拿数据源的中文名兜底 ——
  // 百科的条目是有的，只是没被列进去
  for (const item of readSnapshot<{ slug: string; names: Localized }>("abilities")) {
    const name = item.names["zh-Hans"];
    if (name && !titleOf.has(item.slug)) {
      titleOf.set(item.slug, `${name}（特性）`);
      nameOf.set(item.slug, name);
    }
  }

  const pages = await fetchPages([...titleOf.values()]);

  const unknownAbbr = new Set<string>();
  const rows: WikiEffectSnapshot[] = [];
  for (const [slug, title] of titleOf) {
    const source = pages.get(title);
    if (!source) {
      unmatched.add(title);
      continue;
    }
    rows.push({ slug, ...parseAbilityPage(source, unknownAbbr), names: {} });
  }

  const effects = await fillEffects(
    rows.map((r) => ({ slug: r.slug, title: titleOf.get(r.slug)! })),
  );
  for (const row of rows) row.effect = effects.get(row.slug) ?? {};

  // 译名：数据源没给中文名的那几个（传说 Z-A 的新特性）从索引页补
  const traditional = await convertVariant([...new Set(nameOf.values())], "zh-hant");
  for (const row of rows) {
    const hans = nameOf.get(row.slug);
    if (!hans) continue;
    row.names = {
      "zh-Hans": hans,
      ...(traditional.get(hans) ? { "zh-Hant": traditional.get(hans)! } : {}),
    };
  }

  if (unknownAbbr.size) {
    console.warn(`  ⚠ 认不出的游戏缩写: ${[...unknownAbbr].sort().join(", ")}`);
  }
  const withEffect = rows.filter((r) => Object.keys(r.effect).length).length;
  const withFlavor = rows.filter((r) => Object.keys(r.flavors).length).length;
  console.log(
    `  特性: ${rows.length} 条，中文机制说明 ${withEffect} 条，游戏文案 ${withFlavor} 条`,
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

async function moves(): Promise<WikiSnapshot<WikiEffectSnapshot>> {
  const slugs = await slugsById("move");
  const [indexPage] = [...(await fetchPages(["招式列表"])).values()];
  if (!indexPage) throw new Error("读不到「招式列表」，百科那边可能改了页名");

  const index = moveIndex(indexPage);
  console.log(`  招式索引: ${index.byId.size} 条（英文名索引 ${index.bySlug.size} 条）`);

  const titleOf = new Map<string, string>();
  const templateOf = new Map<string, string>();
  const unmatched = new Set<string>();
  // 先按英文名认，认不到的再退回编号
  for (const slug of slugs.values()) {
    const name = index.bySlug.get(slug);
    if (!name) continue;
    titleOf.set(slug, `${name}（招式）`);
    templateOf.set(slug, `Template:${name}`);
  }
  for (const [id, name] of index.byId) {
    const slug = slugs.get(id);
    if (!slug) {
      unmatched.add(`${id} ${name}`);
      continue;
    }
    if (titleOf.has(slug)) continue;
    titleOf.set(slug, `${name}（招式）`);
    templateOf.set(slug, `Template:${name}`);
  }

  const templates = await fetchPages([...templateOf.values()]);
  // 招式页的源码用来读标记位，顺带把繁体页名解析进 RESOLVED_TITLES ——
  // 后面 fillEffects 走的 parse 接口不认 converttitles，得靠这份映射
  const pages = await fetchPages([...titleOf.values()]);

  const unknownAbbr = new Set<string>();
  const rows: WikiEffectSnapshot[] = [];
  for (const slug of titleOf.keys()) {
    const template = templates.get(templateOf.get(slug)!);
    const page = pages.get(titleOf.get(slug)!);
    const flags = page ? parseMoveFlags(page) : {};
    rows.push({
      slug,
      effect: {},
      flavors: template ? parseMoveTemplate(template, unknownAbbr) : {},
      ...(Object.keys(flags).length ? { flags } : {}),
    });
  }

  const effects = await fillEffects(
    rows.map((r) => ({ slug: r.slug, title: titleOf.get(r.slug)! })),
  );
  for (const row of rows) row.effect = effects.get(row.slug) ?? {};

  // 两样都没抓到的条目不写进快照，留在 unmatched 里让人看见
  const kept = rows.filter(
    (r) => Object.keys(r.effect).length || Object.keys(r.flavors).length || r.flags,
  );
  for (const row of rows) {
    if (!kept.includes(row)) unmatched.add(`${row.slug} ${titleOf.get(row.slug)}`);
  }

  if (unknownAbbr.size) {
    console.warn(`  ⚠ 认不出的游戏缩写: ${[...unknownAbbr].sort().join(", ")}`);
  }
  const withEffect = kept.filter((r) => Object.keys(r.effect).length).length;
  const withFlavor = kept.filter((r) => Object.keys(r.flavors).length).length;
  const withFlags = kept.filter((r) => r.flags).length;
  console.log(
    `  招式: ${kept.length} 条，中文机制说明 ${withEffect} 条，` +
      `游戏文案 ${withFlavor} 条，标记位 ${withFlags} 条`,
  );
  kept.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(kept, unmatched);
}

/**
 * 道具的中文机制说明。
 *
 * PokeAPI 的 effect_entries 只有英法，两千多件道具一条中文都没有。
 * 页名用 PokeAPI 的简体中文名，百科那边裸名字会重定向到「某某（道具）」。
 *
 * 技能机器和秘传学习器在百科上没有独立条目，会落进 unmatched —— 正常，
 * 它们的说明本来就是「教会宝可梦某个招式」这一句，没有单独写的必要
 */
async function items(): Promise<WikiSnapshot<WikiEffectSnapshot>> {
  type Item = { slug: string; names: Partial<Record<LanguageCode, string>> };
  const snapshot = JSON.parse(readFileSync(join(SEED_DATA_DIR, "items.json"), "utf8")) as Item[];

  // 数据源有九十多件道具没中文名（邮件、超级石那批），拿不到页名。
  // 列表页一行带着中英文名，用英文名归一出的 slug 认回来
  const [listPage] = [...(await fetchPages(["道具列表"])).values()];
  const nameIndex = listPage ? parseItemNameIndex(listPage) : new Map<string, string>();
  console.log(`  道具列表索引: ${nameIndex.size} 条`);

  // 页名带「（道具）」后缀：裸中文名有跟招式、宝可梦重名的（「日光」是招式），
  // 重定向会把我们带到那些条目上去。带后缀查不到的再退回裸名字
  const titleOf = new Map<string, string>();
  /** 百科上的叫法跟数据源不一样时的第二候选 ——
   *  magost-berry 数据源叫「岳竹果」，百科的条目是「芒芒果」 */
  const aliasOf = new Map<string, string>();
  const nameFromWiki = new Map<string, string>();
  const unmatched = new Set<string>();
  for (const item of snapshot) {
    const own = item.names["zh-Hans"];
    const fromIndex = nameIndex.get(item.slug);
    const name = own ?? fromIndex;
    if (!name) {
      unmatched.add(item.slug);
      continue;
    }
    titleOf.set(item.slug, name);
    if (fromIndex && fromIndex !== name) aliasOf.set(item.slug, fromIndex);
    if (!own) nameFromWiki.set(item.slug, name);
  }
  console.log(
    `  道具: ${titleOf.size} 件能定位，其中 ${nameFromWiki.size} 件的中文名是从列表页补的`,
  );

  const wanted = [...new Set([...titleOf.values(), ...aliasOf.values()])];
  const suffixed = await fetchPages(wanted.map((n) => `${n}（道具）`));
  const bare = await fetchPages(wanted.filter((n) => !suffixed.has(`${n}（道具）`)));
  const pages = new Map<string, string>();
  for (const [title, content] of bare) pages.set(title, content);
  for (const [title, content] of suffixed) pages.set(title.replace(/（道具）$/, ""), content);

  const types = typeSlugByName();
  const unknownAbbr = new Set<string>();
  const rows: WikiEffectSnapshot[] = [];
  for (const [slug, title] of titleOf) {
    // 中文名撞上宝可梦或招式条目时会拿到别的页，用信息框确认这是道具页
    const isItemPage = (text: string | undefined) => !!text?.includes("{{道具信息框");
    const alias = aliasOf.get(slug);
    const source = isItemPage(pages.get(title))
      ? pages.get(title)
      : alias && isItemPage(pages.get(alias))
        ? pages.get(alias)
        : undefined;
    if (!source) {
      unmatched.add(`${slug} ${title}`);
      continue;
    }
    const effect = parseItemEffect(source);
    const flavors = parseItemFlavors(source, unknownAbbr);
    const boostTypeSlug = parseItemBoost(source, types);
    const naturalGift = parseBerryNaturalGift(source, types);
    if (!effect && !boostTypeSlug && !naturalGift && !Object.keys(flavors).length) {
      unmatched.add(`${slug} ${title}`);
      continue;
    }
    rows.push({
      slug,
      effect: effect ? { "zh-Hans": effect } : {},
      flavors,
      ...(boostTypeSlug ? { boostTypeSlug } : {}),
      ...(naturalGift ? { naturalGift } : {}),
      ...(nameFromWiki.has(slug) ? { names: { "zh-Hans": nameFromWiki.get(slug)! } } : {}),
    });
  }
  if (unknownAbbr.size) {
    console.warn(`  ⚠ 认不出的游戏缩写: ${[...unknownAbbr].sort().join(", ")}`);
  }
  console.log(
    `  属性强化: ${rows.filter((r) => r.boostTypeSlug).length} 件，` +
      `自然之恩: ${rows.filter((r) => r.naturalGift).length} 颗树果`,
  );

  // 源码里只有简体，繁体交给百科的字词转换表转一遍
  // 游戏文案不用转，它在源码里就是 -{zh-hans:…;zh-hant:…}- 写死的
  const traditional = await convertVariant(
    [
      ...new Set(
        rows
          .flatMap((r) => [r.effect["zh-Hans"], r.names?.["zh-Hans"]])
          .filter((s): s is string => !!s),
      ),
    ],
    "zh-hant",
  );
  for (const row of rows) {
    const hans = row.effect["zh-Hans"];
    const hant = hans ? traditional.get(hans) : undefined;
    if (hant) row.effect["zh-Hant"] = hant;

    const nameHans = row.names?.["zh-Hans"];
    const nameHant = nameHans ? traditional.get(nameHans) : undefined;
    if (row.names && nameHant) row.names["zh-Hant"] = nameHant;
  }

  console.log(
    `  道具: 机制说明 ${rows.filter((r) => r.effect["zh-Hans"]).length} 件` +
      `（繁体 ${rows.filter((r) => r.effect["zh-Hant"]).length} 件），` +
      `游戏文案 ${rows.filter((r) => Object.keys(r.flavors).length).length} 件，` +
      `补译名 ${rows.filter((r) => r.names).length} 件`,
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

// ── Ｚ招式与极巨招式 ──────────────────────────────────────────

/**
 * 百科各处的名字简繁混着写（超极巨招式列表页链接用的是繁体），
 * 交给百科自己的字词转换表来回转一趟，简繁各存一份
 */
async function bothVariants(names: string[]): Promise<Map<string, Localized>> {
  const unique = [...new Set(names)];
  const [hans, hant] = await Promise.all([
    convertVariant(unique, "zh-hans"),
    convertVariant(unique, "zh-hant"),
  ]);
  return new Map(
    unique.map((name) => [
      name,
      { "zh-Hans": hans.get(name) ?? name, "zh-Hant": hant.get(name) ?? name },
    ]),
  );
}

/** 快照读出来的中文名 → slug。两个方向都收（简繁），认得宽一点 */
function nameIndex(rows: { slug: string; names: Localized }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    for (const name of Object.values(row.names)) {
      if (name && !out.has(name)) out.set(name, row.slug);
    }
  }
  return out;
}

function readSnapshot<T>(name: string): T[] {
  try {
    return JSON.parse(readFileSync(join(SEED_DATA_DIR, `${name}.json`), "utf8")) as T[];
  } catch {
    return [];
  }
}

/** [[招式名]] 或 …<br>[[招式名]] 里的那个名字 */
function linkedName(cell: string): string | null {
  const links = [...cell.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g)]
    .map((m) => m[1]!.trim())
    .filter((s) => !/^(File|文件|Image):/i.test(s));
  return links[links.length - 1] ?? null;
}

/**
 * 专属Ｚ招式的转化关系。
 *
 * 百科的Ｚ招式条目里有张表，一行是「Ｚ招式 | 属性 | 威力 | 分类 | 附加效果 |
 * 宝可梦 | 原始招式 | Ｚ纯晶」。这层关系数据源一点都不给 ——
 * 它那边 Ｚ招式就是普通招式，看不出谁由谁变来
 */
async function zMoves(): Promise<WikiSnapshot<WikiZMoveSnapshot>> {
  const [source] = [...(await fetchPages(["Z招式"])).values()];
  if (!source) throw new Error("读不到「Z招式」，百科那边可能改了页名");

  const zSlugOf = nameIndex(readSnapshot<{ slug: string; names: Localized }>("z-moves"));
  const moveSlugOf = nameIndex(readSnapshot<{ slug: string; names: Localized }>("moves"));
  const itemSlugOf = nameIndex(readSnapshot<{ slug: string; names: Localized }>("items"));
  const formSlugOf = formIndex();

  const unmatched = new Set<string>();
  const rows: WikiZMoveSnapshot[] = [];
  const table = parseWikiTable(source, "专属Ｚ招式");
  const names = await bothVariants(
    table.map((cells) => linkedName(cells[0] ?? "")).filter((s): s is string => !!s),
  );
  // 全角的Ｚ，跟页面里写的一致
  for (const cells of table) {
    const name = linkedName(cells[0] ?? "");
    if (!name) continue;

    const slug = zSlugOf.get(name);
    if (!slug) {
      // 数据源没收的那条（谜拟Ｑ的）只能记下来，没有可挂的行
      unmatched.add(name);
      continue;
    }

    const power = Number(plainText(cells[2] ?? ""));
    const category = plainText(cells[3] ?? "");
    const dex = dexNumberOf(cells[5] ?? "");
    const baseMove = cells[6] ? /\{\{\s*m\s*\|\s*([^|}]+)/.exec(cells[6])?.[1]?.trim() : null;
    const crystal = cells[7]
      ? /\{\{\s*Bag(?:\/Latest)?\s*\|\s*([^|}]+)/.exec(cells[7])?.[1]?.trim()
      : null;

    rows.push({
      slug,
      names: names.get(name) ?? splitVariants(name),
      effect: {},
      formSlug: dex ? (formSlugOf(dex.number, dex.suffix) ?? null) : null,
      baseMoveSlug: baseMove ? (moveSlugOf.get(baseMove) ?? null) : null,
      itemSlug: crystal ? (itemSlugOf.get(crystal) ?? null) : null,
      power: Number.isFinite(power) && power > 0 ? power : null,
      damageClass: category.includes("物理")
        ? "PHYSICAL"
        : category.includes("特殊")
          ? "SPECIAL"
          : category.includes("变化") || category.includes("變化")
            ? "STATUS"
            : null,
    });
  }

  const linked = rows.filter((r) => r.formSlug && r.baseMoveSlug).length;
  console.log(`  专属Ｚ招式: ${rows.length} 条，形态和原招式都认出来的 ${linked} 条`);

  // 机制说明按每条Ｚ招式的页面抓，泛用那十八条上面的表格里没有，
  // 在这儿补出行来 —— 数据源的 effect_entries 只有英法，中文一条都没有
  const all = readSnapshot<{ slug: string; names: Localized }>("z-moves");
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const titleOf = new Map<string, string>();
  for (const z of all) {
    // 页名就是招式中文名，Ｚ招式的名字不跟别的条目重名，不用加后缀
    const name = z.names["zh-Hans"] ?? bySlug.get(z.slug)?.names["zh-Hans"];
    if (name) titleOf.set(z.slug, name);
  }
  // 先走一趟 query 把繁体真实页名解析进 RESOLVED_TITLES，
  // 后面 fillEffects 走的 parse 接口不认 converttitles
  await fetchPages([...titleOf.values()]);
  const effects = await fillEffects([...titleOf].map(([slug, title]) => ({ slug, title })));
  for (const [slug, effect] of effects) {
    const row = bySlug.get(slug);
    if (row) {
      row.effect = effect;
      continue;
    }
    const names = all.find((z) => z.slug === slug)?.names ?? {};
    rows.push({
      slug,
      names: { "zh-Hans": names["zh-Hans"] ?? "", "zh-Hant": names["zh-Hant"] ?? "" },
      effect,
      formSlug: null,
      baseMoveSlug: null,
      itemSlug: null,
      power: null,
      damageClass: null,
    });
  }
  console.log(`  Ｚ招式机制说明: ${effects.size}/${titleOf.size} 条`);

  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

/**
 * 超极巨招式。数据源一条都没有，全部来自百科。
 *
 * 列表页给招式名、属性、附加效果和所属宝可梦；英文名得逐个翻招式页，
 * slug 由英文名生成 —— 数据源没有这些招式，没有现成的 slug 可对
 */
async function maxMoves(): Promise<WikiSnapshot<WikiMaxMoveSnapshot>> {
  const [source] = [...(await fetchPages(["极巨招式"])).values()];
  if (!source) throw new Error("读不到「极巨招式」，百科那边可能改了页名");

  const typeSlugOf = nameIndex(readSnapshot<{ slug: string; names: Localized }>("types"));
  const formSlugOf = formIndex();

  type Row = { name: string; typeSlug: string; formSlug: string | null; effect: Localized };
  const parsed: Row[] = [];
  const unmatched = new Set<string>();
  for (const cells of parseWikiTable(source, "超极巨招式列表")) {
    const name = linkedName(cells[0] ?? "");
    const typeName = cells[1]
      ? /\{\{\s*Typelink\s*\|\s*([^|}]+)/i.exec(cells[1])?.[1]?.trim()
      : null;
    if (!name || !typeName) continue;

    const typeSlug = typeSlugOf.get(typeName);
    if (!typeSlug) {
      unmatched.add(`${name}（属性 ${typeName} 认不出）`);
      continue;
    }
    const dex = dexNumberOf(cells[3] ?? "");
    parsed.push({
      name,
      typeSlug,
      formSlug: dex ? (formSlugOf(dex.number, "GMAX") ?? null) : null,
      effect: splitVariants(plainText(cells[2] ?? "")),
    });
  }
  console.log(`  超极巨招式: 列表页 ${parsed.length} 条`);

  // slug 要英文名，列表页没有，逐个翻招式页的信息框
  const pages = await fetchPages(parsed.map((r) => r.name));
  // 名字和效果都得过一趟转换：列表页那几列简繁混着写
  const names = await bothVariants(parsed.map((r) => r.name));
  const effects = await bothVariants(
    parsed.map((r) => r.effect["zh-Hans"]).filter((s): s is string => !!s),
  );
  const rows: WikiMaxMoveSnapshot[] = [];
  for (const row of parsed) {
    const page = pages.get(row.name);
    const enName = page ? /\|\s*enname\s*=\s*([^\n|}]+)/.exec(page)?.[1]?.trim() : null;
    if (!enName) {
      unmatched.add(`${row.name}（没拿到英文名）`);
      continue;
    }
    rows.push({
      slug: toSlug(enName),
      names: names.get(row.name) ?? splitVariants(row.name),
      typeSlug: row.typeSlug,
      formSlug: row.formSlug,
      effect: (row.effect["zh-Hans"] && effects.get(row.effect["zh-Hans"])) || row.effect,
    });
  }

  console.log(
    `  超极巨招式: ${rows.length} 条，认出形态的 ${rows.filter((r) => r.formSlug).length} 条`,
  );

  // 泛用的十九条数据源有本体但只给了英法说明，中文从各自的招式页抓。
  // 它们的效果段整段是模板（{{招式效果/天气影响|大晴天|炽热岩石}}），
  // 源码里展不开，只能走渲染那条路
  const plain = readSnapshot<{ slug: string; typeSlug: string; names: Localized }>("max-moves");
  const titleOf = new Map<string, string>();
  for (const m of plain) {
    const name = m.names["zh-Hans"];
    if (name) titleOf.set(m.slug, name);
  }
  await fetchPages([...titleOf.values()]);
  const plainEffects = await fillEffects([...titleOf].map(([slug, title]) => ({ slug, title })));
  for (const m of plain) {
    const effect = plainEffects.get(m.slug);
    if (!effect) continue;
    rows.push({
      slug: m.slug,
      names: { "zh-Hans": m.names["zh-Hans"] ?? "", "zh-Hant": m.names["zh-Hant"] ?? "" },
      typeSlug: m.typeSlug,
      formSlug: null,
      effect,
    });
  }
  console.log(`  泛用极巨招式机制说明: ${plainEffects.size}/${titleOf.size} 条`);

  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

/**
 * 全国编号 + 形态后缀 → 形态 slug。
 *
 * 百科用 026A 表示阿罗拉雷丘、003 配「超极巨化」表示超极巨妙蛙花，
 * 数据源那边这些是 raichu-alola、venusaur-gmax
 */
function formIndex(): (dex: number, suffix: string) => string | undefined {
  type Pokemon = { id: number; forms: { slug: string; isDefault: boolean }[] };
  const snapshot = readSnapshot<Pokemon>("pokemon");
  const byId = new Map(snapshot.map((p) => [p.id, p.forms]));

  const SUFFIX: Record<string, string> = {
    A: "-alola",
    G: "-galar",
    H: "-hisui",
    P: "-paldea",
    GMAX: "-gmax",
  };

  return (dex, suffix) => {
    const forms = byId.get(dex);
    if (!forms) return undefined;
    const want = SUFFIX[suffix];
    if (want) return forms.find((f) => f.slug.endsWith(want))?.slug;
    return (forms.find((f) => f.isDefault) ?? forms[0])?.slug;
  };
}

/**
 * 形态的中文名。
 *
 * 数据源有三十多个形态一种中文都没给（故勒顿的四种骑乘形态、换装皮卡丘
 * 那五套装扮、太乐巴戈斯的太晶和星晶形态）。百科有一张按图鉴编号排的
 * 全形态对照表，每行是
 *   {{Rdexn/form|1007|2|故勒顿|疾驰形态|しっそうけいたい|Sprinting Build|L|form=}}
 * 中日英三种形态名都在，靠英文那列对上数据源的形态 slug
 */
async function forms(): Promise<WikiSnapshot<WikiFormSnapshot>> {
  const title = "宝可梦列表（按全国图鉴编号）/形态变化";
  const [source] = [...(await fetchPages([title])).values()];
  if (!source) throw new Error(`读不到「${title}」，百科那边可能改了页名`);

  type Pokemon = { id: number; slug: string; forms: { slug: string }[] };
  const pokemon = readSnapshot<Pokemon>("pokemon");
  const byDex = new Map(pokemon.map((p) => [p.id, p]));
  // 变体那一级（霜奶仙的奶油、未知图腾的字母）也在这张表里，一起认
  const variants = new Set(readSnapshot<{ slug: string }>("form-variants").map((v) => v.slug));

  const unmatched = new Set<string>();
  const parsed: { slug: string; zh: string }[] = [];
  for (const [, args] of source.matchAll(/\{\{Rdexn\/form\|([^}]*)\}\}/g)) {
    const [dex, , , zhName, , enName] = args!.split("|").map((s) => s.trim());
    const zh = plainText(zhName ?? "");
    if (!zh || !enName) continue;

    const species = byDex.get(Number(dex));
    if (!species) continue;

    const suffix = formSuffix(enName);
    const slug = `${species.slug}-${suffix}`;
    if (!species.forms.some((f) => f.slug === slug) && !variants.has(slug)) {
      unmatched.add(`${species.slug} ${enName}`);
      continue;
    }
    parsed.push({ slug, zh });
  }

  const traditional = await convertVariant([...new Set(parsed.map((r) => r.zh))], "zh-hant");
  const rows = parsed.map(({ slug, zh }) => ({
    slug,
    names: { "zh-Hans": zh, "zh-Hant": traditional.get(zh) ?? zh } as Localized,
  }));

  console.log(`  形态名: ${rows.length} 条，对不上数据源形态的 ${unmatched.size} 条`);
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

/**
 * 英文形态名 → 形态 slug 的后半截。
 *
 * 百科写的是「Alolan Form」「Mega Charizard X」「Sprinting Build」这种人话，
 * 数据源那边是 -alola、-mega-x、-sprinting-build
 */
function formSuffix(en: string): string {
  // 银伴战兽的十八个属性形态写成「Type: Fire」
  const name = en.trim().replace(/^Type:\s*/i, "");
  const mega = /^Mega\b(.*?)(?:\s+([XY]))?$/.exec(name);
  if (mega) return mega[2] ? `mega-${mega[2].toLowerCase()}` : "mega";
  if (/^Alolan/i.test(name)) return "alola";
  if (/^Galarian/i.test(name)) return "galar";
  if (/^Hisuian/i.test(name)) return "hisui";
  if (/^Paldean/i.test(name)) return "paldea";
  if (/^Gigantamax/i.test(name)) return "gmax";
  if (/^Primal/i.test(name)) return "primal";
  // 其余照字面来，把结尾那个分类词去掉：「Terastal Form」「Blade Forme」
  // 「Icy Snow Pattern」（彩粉蝶花纹）、「Red Flower」（花叶蒂花色）、
  // 「Heart Trim」（多丽米亚修剪）、「Small Size」（南瓜怪人大小）、
  // 「Baile Style」（花舞鸟舞姿）。Mode 和 Build 不能去 —— 数据源的
  // slug 里带着它们（miraidon-drive-mode）
  return toSlug(name.replace(/\s+(Formes?|Pattern|Flower|Cloak|Trim|Size|Style)$/i, ""));
}

/**
 * 图鉴说明。页名直接用 PokeAPI 的简体中文名 ——
 * 宝可梦的中文名两边是同一套官方译名，不像特性招式那样需要索引页对编号
 */
async function pokemonDescriptions(): Promise<WikiSnapshot<WikiPokemonDescriptionSnapshot>> {
  type Species = {
    id: number;
    name: string;
    names: { name: string; language: { name: string } }[];
  };
  const list = await fetch(`${POKEAPI}/pokemon-species?limit=2000`).then(
    (r) => r.json() as Promise<{ results: { name: string; url: string }[] }>,
  );

  // 中文名要逐个物种拿，一千多个请求；跟抓快照那轮是两回事，这里只要名字
  const nameOf = new Map<string, string>();
  const batchSize = 12;
  for (let i = 0; i < list.results.length; i += batchSize) {
    const batch = list.results.slice(i, i + batchSize);
    const rows = await Promise.all(
      batch.map((r) => fetch(r.url).then((res) => res.json() as Promise<Species>)),
    );
    for (const species of rows) {
      const zh = species.names.find((n) => n.language.name === "zh-hans");
      if (zh) nameOf.set(species.name, zh.name);
    }
    if ((i / batchSize) % 20 === 0) {
      console.log(
        `    中文名 ${Math.min(i + batchSize, list.results.length)}/${list.results.length}`,
      );
    }
  }
  console.log(`  物种中文名: ${nameOf.size} 条`);

  const pages = await fetchPages([...nameOf.values()]);

  const unmatched = new Set<string>();
  const unknownKeys = new Set<string>();
  const rows: WikiPokemonDescriptionSnapshot[] = [];
  for (const [slug, name] of nameOf) {
    const source = pages.get(name);
    if (!source) {
      unmatched.add(`${slug} ${name}`);
      continue;
    }
    const descriptions = parseDexEntries(source, unknownKeys);
    const genus = parseGenus(source);
    if (!descriptions.length && !Object.keys(genus).length) {
      unmatched.add(`${slug} ${name}`);
      continue;
    }
    rows.push({ slug, descriptions, ...(Object.keys(genus).length ? { genus } : {}) });
  }

  if (unknownKeys.size) {
    console.warn(`  ⚠ 认不出的图鉴参数: ${[...unknownKeys].sort().join(", ")}`);
  }
  console.log(
    `  图鉴说明: ${rows.length} 只，共 ${rows.reduce((n, r) => n + r.descriptions.length, 0)} 行；` +
      `分类 ${rows.filter((r) => r.genus).length} 只`,
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

// ── 入口 ──────────────────────────────────────────────────────

const only = process.argv[2];
if (!only || only === "abilities") await write("wiki-abilities", await abilities());
if (!only || only === "moves") await write("wiki-moves", await moves());
if (!only || only === "items") await write("wiki-items", await items());
if (!only || only === "z-moves") await write("wiki-z-moves", await zMoves());
if (!only || only === "max-moves") await write("wiki-max-moves", await maxMoves());
if (!only || only === "forms") await write("wiki-forms", await forms());
if (!only || only === "pokemon") {
  await write("wiki-pokemon-descriptions", await pokemonDescriptions());
}
