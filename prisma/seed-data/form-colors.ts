/**
 * 形态级的图鉴颜色。
 *
 * 图鉴颜色分类跟着形态走：关都六尾是褐色，阿罗拉六尾是白色；关都喵喵黄色，
 * 阿罗拉喵喵蓝色，伽勒尔喵喵褐色。PokeAPI 的 color 挂在物种上，同一物种的
 * 所有形态拿到同一个值，所以这张表用来覆盖它（见 pokeapi-pokemon.ts 的 toColors）。
 *
 * 数据在 form-colors.json，由 scripts/refresh-form-colors.ts 从神奇宝贝百科
 * 生成并提交进仓库。要跟进 wiki 的更新跑 pnpm form-colors:refresh，然后看 diff。
 *
 * 不手写：新世代加了地区形态，手抄的表不会自己长出来，也没有办法核对 ——
 * 上一版就漏了帕底亚乌波，而且没人发现。
 *
 * 收不进来的是彩粉蝶的花纹、四季鹿的季节、结草儿的蓑衣这类 —— 它们在 PokeAPI
 * 里是 pokemon-form 而不是 varieties，而 Form 表存的是 varieties，
 * 没有对应的行可写。刷新脚本会把跳过的条数打出来。
 */
import data from "./form-colors.json";

export type FormColorData = {
  /** 数据来源，CC BY-NC-SA 要求署名 */
  source: string;
  license: string;
  /** 形态 slug → color.slug */
  colors: Record<string, string>;
  /**
   * 颜色随世代变过的形态。第七世代起游戏才开始按形态区分颜色，所以
   * 超级喷火龙 X 在第六世代还归在喷火龙的红色下，第七世代起才是黑色。
   *
   * 只列跟 colors 里当前值不同的世代，其余世代取当前值。
   */
  history: Record<string, Record<number, string>>;
};

export const FORM_COLORS: Record<string, string> = data.colors;

export const FORM_COLOR_HISTORY: Record<string, Record<number, string>> = data.history;
