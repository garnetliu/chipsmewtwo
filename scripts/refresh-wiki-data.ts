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
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { LanguageCode } from "@/lib/pokemon/language";
import {
  type FlavorsByGroup,
  type Localized,
  SEED_DATA_DIR,
  type WikiData,
  type WikiEffectSnapshot,
  type WikiPokemonDescriptionSnapshot,
  type WikiSnapshot,
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
      if (content) out.set(title, content);
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
 * 节号写死 1 —— 特性页的第 1 节固定是「特性效果」，招式页是「招式附加效果」。
 * 返回的 HTML 带着那一节的标题，调用方顺手核对，对不上就当这页没有说明
 */
async function fetchSectionHtml(title: string, variant: string): Promise<string | null> {
  type Response = { parse?: { text: string }; error?: { code: string } };
  const data = await wiki<Response>({
    action: "parse",
    page: title,
    prop: "text",
    section: "1",
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
  const joined = paragraphs.join("");
  return joined.length >= MIN_EFFECT_LENGTH ? joined : null;
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
  Y: "yellow",
  GS: "gold-silver",
  C: "crystal",
  GSC: "gold-silver",
  RS: "ruby-sapphire",
  E: "emerald",
  RSE: "ruby-sapphire",
  FRLG: "firered-leafgreen",
  Col: "colosseum",
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

// ── 特性 ──────────────────────────────────────────────────────

/**
 * 特性列表页一条是
 * {{特性列表|065|茂盛|しんりょく|Overgrow|简体说明|繁体说明|拥有数|隐藏数}}，
 * 编号就是 PokeAPI 的 ability id。一个请求拿到全部 374 个的页名
 */
function abilityIndex(source: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const m of source.matchAll(/\{\{\s*特性列表\s*\|([^|]*)\|([^|]*)\|/g)) {
    const id = Number(m[1]!.trim());
    const name = m[2]!.trim();
    if (Number.isFinite(id) && name) out.set(id, name);
  }
  return out;
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
    const groupSlug = GROUP_OF_ABBR[abbr];
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
 * 模板名有 /gen/ex 和几个变体，统一按 Movelist/ 开头匹配
 */
function moveIndex(source: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const m of source.matchAll(/\{\{\s*Movelist\/[a-z/]*\s*\|([^|]*)\|([^|]*)\|/gi)) {
    const id = Number(m[1]!.trim());
    const name = m[2]!.trim();
    if (Number.isFinite(id) && name && !out.has(id)) out.set(id, name);
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
      const groupSlug = GROUP_OF_ABBR[key];
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
            fetchSectionHtml(entry.title, "zh-hans"),
            fetchSectionHtml(entry.title, "zh-hant"),
          ]);
          return {
            slug: entry.slug,
            hans: hans ? renderedParagraphs(hans) : null,
            hant: hant ? renderedParagraphs(hant) : null,
          };
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
  console.log(`  特性索引: ${index.size} 条`);

  // 「茂盛」是指向「茂盛（特性）」的重定向，带后缀查更稳 ——
  // 裸名字有跟宝可梦或道具重名的（「毅力」「同步」）
  const titleOf = new Map<string, string>();
  const unmatched = new Set<string>();
  for (const [id, name] of index) {
    const slug = slugs.get(id);
    if (slug) titleOf.set(slug, `${name}（特性）`);
    else unmatched.add(`${id} ${name}`);
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
    rows.push({ slug, ...parseAbilityPage(source, unknownAbbr) });
  }

  const effects = await fillEffects(
    rows.map((r) => ({ slug: r.slug, title: titleOf.get(r.slug)! })),
  );
  for (const row of rows) row.effect = effects.get(row.slug) ?? {};

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
  console.log(`  招式索引: ${index.size} 条`);

  const titleOf = new Map<string, string>();
  const templateOf = new Map<string, string>();
  const unmatched = new Set<string>();
  for (const [id, name] of index) {
    const slug = slugs.get(id);
    if (!slug) {
      unmatched.add(`${id} ${name}`);
      continue;
    }
    titleOf.set(slug, `${name}（招式）`);
    // 游戏文案不在招式页上，在同名模板页的 #switch 里
    templateOf.set(slug, `Template:${name}`);
  }

  const templates = await fetchPages([...templateOf.values()]);

  const unknownAbbr = new Set<string>();
  const rows: WikiEffectSnapshot[] = [];
  for (const slug of titleOf.keys()) {
    const template = templates.get(templateOf.get(slug)!);
    rows.push({
      slug,
      effect: {},
      flavors: template ? parseMoveTemplate(template, unknownAbbr) : {},
    });
  }

  const effects = await fillEffects(
    rows.map((r) => ({ slug: r.slug, title: titleOf.get(r.slug)! })),
  );
  for (const row of rows) row.effect = effects.get(row.slug) ?? {};

  // 两样都没抓到的条目不写进快照，留在 unmatched 里让人看见
  const kept = rows.filter((r) => Object.keys(r.effect).length || Object.keys(r.flavors).length);
  for (const row of rows) {
    if (!kept.includes(row)) unmatched.add(`${row.slug} ${titleOf.get(row.slug)}`);
  }

  if (unknownAbbr.size) {
    console.warn(`  ⚠ 认不出的游戏缩写: ${[...unknownAbbr].sort().join(", ")}`);
  }
  const withEffect = kept.filter((r) => Object.keys(r.effect).length).length;
  const withFlavor = kept.filter((r) => Object.keys(r.flavors).length).length;
  console.log(
    `  招式: ${kept.length} 条，中文机制说明 ${withEffect} 条，游戏文案 ${withFlavor} 条`,
  );
  kept.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(kept, unmatched);
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
    if (!descriptions.length) {
      unmatched.add(`${slug} ${name}`);
      continue;
    }
    rows.push({ slug, descriptions });
  }

  if (unknownKeys.size) {
    console.warn(`  ⚠ 认不出的图鉴参数: ${[...unknownKeys].sort().join(", ")}`);
  }
  console.log(
    `  图鉴说明: ${rows.length} 只，共 ${rows.reduce((n, r) => n + r.descriptions.length, 0)} 行`,
  );
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  return wrap(rows, unmatched);
}

// ── 入口 ──────────────────────────────────────────────────────

const only = process.argv[2];
if (!only || only === "abilities") await write("wiki-abilities", await abilities());
if (!only || only === "moves") await write("wiki-moves", await moves());
if (!only || only === "pokemon") {
  await write("wiki-pokemon-descriptions", await pokemonDescriptions());
}
