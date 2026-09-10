import { type LanguageCode, LANGUAGES } from "@/lib/pokeapi/language";

import { DEFAULT_LANGUAGE } from "./defaults";

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
