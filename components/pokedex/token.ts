/**
 * 图鉴色 token 的取值口径。
 *
 * 属性和版本的颜色在 app/globals.css 里按 slug 命名（--color-type-fire、
 * --color-version-sword），调用方把库里的 slug 原样传进来就行，不用自己映射。
 * 库里查不到的 slug 落到 unknown 灰。
 */

/** 库里的 slug 只有小写字母、数字和连字符。拼进 var() 之前再挡一道 */
function safe(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** 属性底色，例如 grass → var(--color-type-grass, …) */
export function typeColorVar(slug: string): string {
  return `var(--color-type-${safe(slug)}, var(--color-type-unknown))`;
}

/**
 * 属性色的斜向渐变底。色块图（列表卡的缩略图、详情 hero 的大图）都铺这一层。
 *
 * 135°、两档透明度，照 prototype 的 `${color}22` → `${color}0d`：
 * 起始那一档列表卡是 13%、详情 hero 是 15%，收尾固定 5%
 */
export function typeGradient(slug: string, strength = 13): string {
  const color = typeColorVar(slug);

  return `linear-gradient(135deg, color-mix(in srgb, ${color} ${strength}%, transparent), color-mix(in srgb, ${color} 5%, transparent))`;
}

/** 版本底色，例如 sword → var(--color-version-sword, …) */
export function versionColorVar(slug: string): string {
  return `var(--color-version-${safe(slug)}, var(--color-version-unknown))`;
}

/**
 * 版本色块上的字色。
 *
 * 黄、白、珍珠这些浅底版本在 globals.css 里额外声明了 --color-version-<slug>-ink，
 * 其余版本没有这个变量，var() 的兜底值把它们落回白字 —— 调用方不用判断深浅
 */
export function versionInkVar(slug: string): string {
  return `var(--color-version-${safe(slug)}-ink, #fff)`;
}
