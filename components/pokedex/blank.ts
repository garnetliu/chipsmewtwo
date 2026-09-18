/**
 * 库里这一格没有数据时落的破折号，照 prototype。
 *
 * 全站只有这一个写法 —— 版本可用性表的「获取方式 / 可用性」、招式的版本说明和
 * 可空数值、Gen1 没有的特攻特防、列表页头还没取到的条目数，都走这里
 */
export const BLANK = "—";

/** 有值就拼上单位（`95` + `%`），没有就落破折号 */
export function blankText(value: number | string | null | undefined, suffix = ""): string {
  return value == null || value === "" ? BLANK : `${value}${suffix}`;
}
