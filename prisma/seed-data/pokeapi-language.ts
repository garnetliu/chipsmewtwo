/**
 * PokeAPI 的语言标识 → 本项目的 Language.code。
 *
 * 只有抓取那条路用：refresh-seed-data 拉快照、seed 灌库时把数据源的
 * 全小写标识换成规范 BCP 47。**每个写译名的地方都必须先过
 * resolveLanguageCode**，拿到 null 就跳过那条 —— 漏一处就是外键报错。
 *
 * 语言清单本身（LANGUAGES / LanguageCode）在 lib/pokemon/language.ts，
 * 那份运行时取译名也要用。
 *
 * PokeAPI 另外 4 种不导入：
 *   cs / pt-br      游戏没有捷克语和葡语版本，字典类资源里也确实零覆盖
 *   es-419          拉美西语，跟 es 在 138 条道具名里 135 条完全相同
 *   ja-roma         罗马字，整个字典集里只有 1 条有值，而且那条属于被过滤的非标准属性
 */
import type { LanguageCode } from "@/lib/pokemon/language";

/** PokeAPI 的 language.name → 本项目的 Language.code */
const POKEAPI_TO_CODE = {
  "zh-hans": "zh-Hans",
  "zh-hant": "zh-Hant",
  en: "en",
  ja: "ja",
  "ja-hrkt": "ja-Hrkt",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
} as const;

/** 不支持的语言返回 null，调用方跳过那条译名 */
export function resolveLanguageCode(pokeApiName: string): LanguageCode | null {
  return POKEAPI_TO_CODE[pokeApiName as keyof typeof POKEAPI_TO_CODE] ?? null;
}

/** PokeAPI 的 names / descriptions / flavor_text_entries 这类数组统一长这样 */
type LocalizedEntry = { language: { name: string } };

/** 过滤出支持的语言，并把 language.name 换成本项目的 code */
export function mapLocalized<T extends LocalizedEntry, R>(
  entries: T[],
  build: (entry: T, code: LanguageCode) => R,
): R[] {
  const out: R[] = [];
  for (const entry of entries) {
    const code = resolveLanguageCode(entry.language.name);
    if (code) out.push(build(entry, code));
  }
  return out;
}
