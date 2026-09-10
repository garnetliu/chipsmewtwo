import DataLoader from "dataloader";

import { DEFAULT_LANGUAGE } from "./defaults";

/**
 * 收宝可梦官方游戏的 9 种语言，加上日文假名表记，共 10 种。
 *
 * code 用规范 BCP 47 写法而不是数据源的全小写：Hrkt 是假名（平假名+片假名）的
 * ISO 15924 script code，所以它是合法 BCP 47，不用自造标识。
 * 数据源那边的标识怎么映射过来见 prisma/seed-data/pokeapi-language.ts。
 *
 * ja-Hrkt 必须留：数据源把日语拆成汉字（ja）、假名（ja-hrkt）、罗马字（ja-roma）
 * 三个字段，数据分布很不均 —— 地区名 ja 零条、ja-Hrkt 10 条，版本名 ja 1 条、
 * ja-Hrkt 51 条。因为「カントー」「ブラック」这类本来就是片假名词，没有汉字写法。
 */
export type LanguageCode =
  "zh-Hans" | "zh-Hant" | "en" | "ja" | "ja-Hrkt" | "ko" | "fr" | "de" | "es" | "it";

/**
 * language 表的种子数据。nameNative 只能手写 —— PokeAPI 的 language.names
 * 覆盖不全，而且基本没有自身语言的条目，zh-hans 里查不到「简体中文」。
 *
 * 顺序即 pickByLanguage 的回退优先级（lib/pokemon/language.ts），所以中文在最前、
 * 英文第三，新加的语言一律排在 en 之后 —— 把 fr 挪到 en 前面，缺中文的数据就会
 * 回退成法语而不是英语。
 */
export const LANGUAGES: { code: LanguageCode; nameNative: string; sortOrder: number }[] = [
  { code: "zh-Hans", nameNative: "简体中文", sortOrder: 0 },
  { code: "zh-Hant", nameNative: "繁體中文", sortOrder: 1 },
  { code: "en", nameNative: "English", sortOrder: 2 },
  { code: "ja", nameNative: "日本語", sortOrder: 3 },
  { code: "ja-Hrkt", nameNative: "日本語（かな）", sortOrder: 4 },
  { code: "ko", nameNative: "한국어", sortOrder: 5 },
  { code: "fr", nameNative: "Français", sortOrder: 6 },
  { code: "de", nameNative: "Deutsch", sortOrder: 7 },
  { code: "es", nameNative: "Español", sortOrder: 8 },
  { code: "it", nameNative: "Italiano", sortOrder: 9 },
];

/** LANGUAGES 已经按 sortOrder 排好，转成 code → 序号，越小越优先 */
const PRIORITY = new Map(LANGUAGES.map((lang, index) => [lang.code as string, index]));

/**
 * 从一批多语言的行里挑一条。
 *
 * 顺序是：请求的语言 → 默认语言 → 剩下的按 language 表的 sortOrder 取最靠前的那条。
 * 所以查一只没收录罗马字译名的宝可梦，拿到的是简体中文而不是 null。
 *
 * 优先级直接用 LANGUAGES 常量的顺序，不去 join language 表 —— 那张表就六行，
 * 而且它的种子数据本来就是从这个常量灌进去的，两边不会不一致。
 *
 * 注意这只是显示层的兜底，不是翻译：拿到的可能是另一种语言的文本，
 * 调用方要展示语种标记的话得自己看返回行的 languageCode。
 */
export function pickByLanguage<T extends { languageCode: string }>(
  rows: T[],
  language: string,
): T | null {
  if (rows.length === 0) return null;

  const requested = rows.find((r) => r.languageCode === language);
  if (requested) return requested;

  const fallback = rows.find((r) => r.languageCode === DEFAULT_LANGUAGE);
  if (fallback) return fallback;

  // 不在 LANGUAGES 里的语言排到最后，它不该出现（写库前都过了 resolveLanguageCode），
  // 真出现了也不能让它抢在正常语言前面
  return rows.reduce((best, row) =>
    (PRIORITY.get(row.languageCode) ?? Number.MAX_SAFE_INTEGER) <
    (PRIORITY.get(best.languageCode) ?? Number.MAX_SAFE_INTEGER)
      ? row
      : best,
  );
}

/** 支持的语言，resolveLanguageTag 拿它比对 */
const SUPPORTED = new Set<string>(LANGUAGES.map((lang) => lang.code));

/**
 * 存语言偏好的 cookie 名。用 NEXT_LOCALE 这个社区约定名而不是自造一个 ——
 * 前端将来接任何 i18n 方案，写的默认就是它
 */
export const LANGUAGE_COOKIE = "NEXT_LOCALE";

/**
 * 一个 BCP 47 标签换成库里的 Language.code，对不上返回 null。
 * cookie 的值是客户端给的，什么都可能，所以进来先过这一道。
 *
 * 先 maximize 补全字形再比：写进 cookie 的可能是 zh-CN，而库里存的是
 * zh-Hans / zh-Hant，只看 "zh" 分不出简繁。补全后 zh-CN 是 zh-Hans-CN，
 * 取「语言-字形」就对上了。
 *
 * 英日韩这些库里没有字形后缀（en 而不是 en-Latn），所以带字形对不上时
 * 再拿裸语言码试一次
 */
export function resolveLanguageTag(tag: string | null | undefined): LanguageCode | null {
  if (!tag) return null;

  let locale: Intl.Locale;
  try {
    locale = new Intl.Locale(tag).maximize();
  } catch {
    // 畸形值直接当没设过，兜底轮到 DEFAULT_LANGUAGE
    return null;
  }

  const withScript = locale.script ? `${locale.language}-${locale.script}` : null;
  if (withScript && SUPPORTED.has(withScript)) return withScript as LanguageCode;
  if (SUPPORTED.has(locale.language)) return locale.language as LanguageCode;
  return null;
}

/** 各张译名表统一成这个形状再交给 createNameLoader */
export type I18nRow = { id: number; languageCode: string; name: string };

/** 复合 key 拼成字符串当 cacheKey */
export type NameKey = { id: number; language: string };

/**
 * 译名 loader 的共用实现。
 *
 * form / type / color / ability / version 各有一张译名表，结构一样
 * （外键 + languageCode + name），查法也一样，所以只写一遍，各自把查询传进来。
 *
 * 查的是每个 id 的全部语言而不是只查请求的那一种 —— 请求的语言没收录时要按
 * pickByLanguage 回退，只查一种的话拿不到可回退的行。项目只导 10 种语言，量很小
 */
export function createNameLoader(fetch: (ids: number[]) => Promise<I18nRow[]>) {
  return new DataLoader<NameKey, string | null, string>(
    async (keys) => {
      const rows = await fetch([...new Set(keys.map((k) => k.id))]);

      const byId = new Map<number, I18nRow[]>();
      for (const row of rows) {
        const list = byId.get(row.id);
        if (list) list.push(row);
        else byId.set(row.id, [row]);
      }
      return keys.map((k) => pickByLanguage(byId.get(k.id) ?? [], k.language)?.name ?? null);
    },
    { cacheKeyFn: (k) => `${k.id}:${k.language}` },
  );
}
