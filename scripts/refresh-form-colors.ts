/**
 * 从神奇宝贝百科重新生成形态级的图鉴颜色。
 *
 * 跑法：pnpm form-colors:refresh，然后 git diff 看变了什么，确认后提交。
 *
 * 为什么需要这份数据：PokeAPI 的 color 挂在物种上，同一物种的所有形态拿到
 * 同一个值 —— 照它写的话阿罗拉六尾会变成关都六尾的褐色。而图鉴颜色其实
 * 跟着形态走（关都喵喵黄色、阿罗拉喵喵蓝色、伽勒尔喵喵褐色），数据源没这层。
 *
 * 数据来源（CC BY-NC-SA 3.0，转载需署名）：
 *   https://wiki.52poke.com/wiki/宝可梦列表（按颜色分类）
 *
 * 页面里每个格子是 {{MSP|编号}} 加 [[中文名]]，带形态的多一个 {{形态变化|形态名}}，
 * 颜色由所在章节决定。判形态用的是中文形态名而不是编号后缀 —— 后缀在不同物种
 * 里含义不同，A 在喵喵是阿罗拉、在代欧奇希斯是攻击形态、在四季鹿是秋天，
 * P 在固拉多是原始回归、在乌波是帕底亚。
 *
 * 拼出的 slug 一律拿 PokeAPI 的 /pokemon 列表核对，不存在的不写进去。
 */
import { writeFile } from "node:fs/promises";

import type { FormColorData } from "@/lib/pokemon/form-colors";

/** 只 import type，不 import 那个常量 —— 值导入会把 lib 模块连带它读的
 *  form-colors.json 一起加载进来，而这个脚本正是用来覆写那个文件的，
 *  JSON 一坏脚本就跑不起来，等于把修复工具锁在了故障后面 */
const OUT_FILE = "lib/pokemon/form-colors.json";

const WIKI_API = "https://wiki.52poke.com/api.php";
const WIKI_PAGE = "宝可梦列表（按颜色分类）";
const POKEAPI = "https://pokeapi.co/api/v2";

/** 章节标题里的中文颜色名 → color.slug */
const COLOR_SLUGS: Record<string, string> = {
  红色: "red",
  蓝色: "blue",
  绿色: "green",
  黄色: "yellow",
  紫色: "purple",
  粉红色: "pink",
  褐色: "brown",
  黑色: "black",
  灰色: "gray",
  白色: "white",
};

/**
 * 中文形态名 → PokeAPI 的形态后缀。
 *
 * 只认这几类：地区形态、超级进化、原始回归。它们在 PokeAPI 里是 varieties，
 * 也就是 Form 表存的东西，有对应的行可写。
 *
 * 认不出的一律跳过 —— 彩粉蝶的花纹、四季鹿的季节、结草儿的蓑衣、洛托姆的
 * 附身对象那些在 PokeAPI 里是 pokemon-form 而不是 varieties，Form 表里
 * 没有它们的行，写了也挂不上去。
 */
function formSuffix(form: string): string | null {
  if (!form) return null;
  if (form.includes("阿罗拉")) return "alola";
  if (form.includes("伽勒尔")) return "galar";
  if (form.includes("洗翠")) return "hisui";
  if (form.includes("帕底亚")) return "paldea";
  if (form.includes("原始回归")) return "primal";
  if (form.startsWith("超级")) {
    // 喷火龙和超梦各有两种超级进化，全角 Ｘ／Ｙ 结尾
    if (form.endsWith("Ｘ")) return "mega-x";
    if (form.endsWith("Ｙ")) return "mega-y";
    return "mega";
  }
  return null;
}

async function fetchWikitext(): Promise<string> {
  const url = new URL(WIKI_API);
  url.search = new URLSearchParams({
    action: "parse",
    page: WIKI_PAGE,
    prop: "wikitext",
    format: "json",
  }).toString();

  // 带上 UA：MediaWiki 对没有 UA 的请求会拒
  const res = await fetch(url, {
    headers: { "User-Agent": "chipsmewtwo/0.1 (dictionary snapshot refresher)" },
  });
  if (!res.ok) throw new Error(`GET ${WIKI_PAGE} → ${res.status} ${res.statusText}`);

  const body = (await res.json()) as
    { parse: { wikitext: { "*": string } } } | { error: { code: string; info: string } };
  if ("error" in body) throw new Error(`wiki 返回错误: ${body.error.code} ${body.error.info}`);
  return body.parse.wikitext["*"];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${POKEAPI}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

type NamedRef = { name: string; url: string };

/**
 * 按 == 标题切章节。不硬编码行号 —— 页面加一段说明，下面全部错位。
 *
 * 标题的写法不统一，红色是 ==<font color="red">红色</font>==、
 * 蓝色是 ==<font color=blue>蓝色</font>==，所以只从里面抠中文
 */
function splitSections(wikitext: string): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of wikitext.split("\n")) {
    const heading = /^==+\s*(.+?)\s*==+$/.exec(line);
    if (heading) {
      if (current) out.push({ title: current.title, body: current.body.join("\n") });
      const title = heading[1].replace(/<[^>]+>/g, "").trim();
      current = { title, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) out.push({ title: current.title, body: current.body.join("\n") });
  return out;
}

/**
 * 一个格子：MSP 模板给全国编号，下一行是 [[中文名]]，带形态的多一段 {{形态变化|...}}。
 *
 * [[]] 和中文名的贪婪匹配都是必须的：写成可选加懒惰的话，后面全是可选组，
 * 正则匹配一个字符就收工，形态名那个捕获组永远是 undefined
 */
const CELL =
  /\{\{MSP\|(\d{3,4})[A-Za-z]*(?:\|[^}]*)?\}\}\s*\n\|\[\[([^\]|]+)(?:\|[^\]]*)?\]\](?:<br>\{\{形态变化\|([^}]+)\}\})?/g;

/** 颜色变更表的一行：编号、形态，然后第六/七/八世代三列 */
const HISTORY_ROW = new RegExp(
  String.raw`\{\{MSP\|(\d{3,4})[A-Za-z]*(?:\|[^}]*)?\}\}\s*\n` +
    String.raw`\|\[\[([^\]|]+)(?:\|[^\]]*)?\]\](?:<br>\{\{形态变化\|([^}]+)\}\})?\s*\n` +
    String.raw`\|\{\{颜色显示\|[0-9A-Fa-f]{6}\|([^}]+)\}\}\s*\n` +
    String.raw`\|\{\{颜色显示\|[0-9A-Fa-f]{6}\|([^}]+)\}\}\s*\n` +
    String.raw`\|\{\{颜色显示\|[0-9A-Fa-f]{6}\|([^}]+)\}\}`,
  "g",
);

/** 表格里的 width / colspan 属性会挡在 | 和内容之间，先抹掉 */
function stripCellAttrs(body: string): string {
  return body.replace(/\|\s*(?:width|colspan|rowspan)="?[^|"]*"?\s*\|/g, "|");
}

// ── 入口 ──────────────────────────────────────────────────────

const [wikitext, speciesList, pokemonList] = await Promise.all([
  fetchWikitext(),
  getJson<{ results: NamedRef[] }>("/pokemon-species?limit=2000"),
  getJson<{ results: NamedRef[] }>("/pokemon?limit=3000"),
]);

/** 全国编号 → 物种 slug。species 的 id 就是全国编号 */
const speciesBySlug = new Map(
  speciesList.results.map((r) => [r.url.replace(/\/$/, "").split("/").pop()!, r.name]),
);
const knownForms = new Set(pokemonList.results.map((r) => r.name));

/**
 * 拼出的 slug 在 PokeAPI 里对不上时，找它的下级变体。
 *
 * 只有伽勒尔达摩狒狒需要：wiki 那格写「伽勒尔」，而 PokeAPI 把它拆成
 * darmanitan-galar-standard 和 darmanitan-galar-zen（达摩模式），
 * 常规样子是前者
 */
function resolveSlug(candidate: string): string | null {
  if (knownForms.has(candidate)) return candidate;
  const standard = `${candidate}-standard`;
  return knownForms.has(standard) ? standard : null;
}

const sections = splitSections(wikitext);
const colors: Record<string, string> = {};
const skipped = new Map<string, number>();
const unresolved = new Set<string>();

for (const section of sections) {
  const colorSlug = COLOR_SLUGS[section.title];
  if (!colorSlug) continue;

  for (const match of stripCellAttrs(section.body).matchAll(CELL)) {
    const [, number, , rawForm] = match;
    const form = (rawForm ?? "").split("|")[0];
    const suffix = formSuffix(form);
    if (!suffix) {
      if (form) skipped.set(form, (skipped.get(form) ?? 0) + 1);
      continue;
    }
    const base = speciesBySlug.get(String(Number(number)));
    if (!base) continue;

    const slug = resolveSlug(`${base}-${suffix}`);
    if (!slug) {
      unresolved.add(`${base}-${suffix}（${form}）`);
      continue;
    }
    colors[slug] = colorSlug;
  }
}

// 颜色变更表：只记跟当前值不同的世代，相同的省掉
const historySection = sections.find((s) => s.title === "颜色变更");
if (!historySection) throw new Error("页面里找不到「颜色变更」章节，结构变了");

const GENERATIONS = [6, 7, 8];
const history: Record<string, Record<number, string>> = {};

for (const match of stripCellAttrs(historySection.body).matchAll(HISTORY_ROW)) {
  const [, number, , rawForm, ...cells] = match;
  const form = (rawForm ?? "").split("|")[0];
  const suffix = formSuffix(form);
  if (!suffix) continue;

  const base = speciesBySlug.get(String(Number(number)));
  if (!base) continue;
  const slug = resolveSlug(`${base}-${suffix}`);
  if (!slug || !colors[slug]) continue;

  const perGeneration: Record<number, string> = {};
  cells.forEach((cell, index) => {
    const value = COLOR_SLUGS[cell.trim()];
    if (value && value !== colors[slug]) perGeneration[GENERATIONS[index]] = value;
  });
  if (Object.keys(perGeneration).length) history[slug] = perGeneration;
}

const sortedKeys = <T>(obj: Record<string, T>) => Object.keys(obj).sort();
const data: FormColorData = {
  source: `https://wiki.52poke.com/wiki/${WIKI_PAGE}`,
  license: "CC BY-NC-SA 3.0",
  colors: Object.fromEntries(sortedKeys(colors).map((k) => [k, colors[k]])),
  history: Object.fromEntries(sortedKeys(history).map((k) => [k, history[k]])),
};

await writeFile(OUT_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`写入 ${OUT_FILE}`);
console.log(`  形态颜色 ${Object.keys(data.colors).length} 条`);
console.log(`  颜色随世代变的 ${Object.keys(data.history).length} 条`);
console.log(
  `  形态名认不出、跳过 ${skipped.size} 种共 ${[...skipped.values()].reduce((a, b) => a + b, 0)} 条` +
    `（彩粉蝶花纹、四季鹿季节这类，PokeAPI 里是 pokemon-form 不是 varieties）`,
);
if (unresolved.size) {
  // 认出了形态但 PokeAPI 里找不到对应的 variety。可能是 wiki 收录了还没进
  // 数据源的新形态，也可能是 resolveSlug 该补一条规则，得看一眼
  console.warn(
    `  ⚠ 有 ${unresolved.size} 个形态在 PokeAPI 里对不上: ${[...unresolved].join(", ")}`,
  );
}
