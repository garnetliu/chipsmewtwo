/**
 * PokeAPI 的语言标识和本项目 Language.code 的映射。
 *
 * 收宝可梦官方游戏的 9 种语言，加上日文假名表记，共 10 种。**每个写译名的地方
 * 都必须先过 resolveLanguageCode**，拿到 null 就跳过那条 —— 漏一处就是外键报错。
 *
 * PokeAPI 另外 4 种不导入：
 *   cs / pt-br      游戏没有捷克语和葡语版本，字典类资源里也确实零覆盖
 *   es-419          拉美西语，跟 es 在 138 条道具名里 135 条完全相同
 *   ja-roma         罗马字，整个字典集里只有 1 条有值，而且那条属于被过滤的非标准属性
 *
 * ja-Hrkt 必须留：PokeAPI 把日语拆成汉字（ja）、假名（ja-hrkt）、罗马字（ja-roma）
 * 三个字段，数据分布很不均 —— 地区名 ja 零条、ja-Hrkt 10 条，版本名 ja 1 条、
 * ja-Hrkt 51 条。因为「カントー」「ブラック」这类本来就是片假名词，没有汉字写法。
 *
 * code 用规范 BCP 47 写法而不是 PokeAPI 的全小写：Hrkt 是假名（平假名+片假名）的
 * ISO 15924 script code，所以它是合法 BCP 47，不用自造标识。
 */

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

export type LanguageCode = (typeof POKEAPI_TO_CODE)[keyof typeof POKEAPI_TO_CODE];

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
