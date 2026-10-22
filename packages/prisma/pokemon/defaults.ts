/** 没有更具体的来源时用的默认值 */

/**
 * 项目是中文的，NEXT_LOCALE cookie 没设或认不出时取简体译名。
 * 请求级的默认值，在 app/api/graphql/route.ts 兜；字段上的 language 参数
 * 和 context 都没给出可用语言时才轮到它。
 *
 * pickByLanguage 里还用它做第二层回退：请求的语言没收录时先试简中
 */
export const DEFAULT_LANGUAGE = "zh-Hans";

/** 属性和种族值都是按世代存的，字段参数不指定就给最新一代 */
export const LATEST_GENERATION = 9;
