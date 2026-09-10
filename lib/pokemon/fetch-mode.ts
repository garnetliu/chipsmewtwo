/**
 * 调试开关，不是主线。
 *
 * 主线是查询走 PokemonDbSource；库里数据不足时才让 PokeAPISource 补一次。
 * 默认的 db-first 就是这条正常路径，另外两个值是给调试和离线开发用的。
 *
 * - db-first    先查自己的库，miss 才回源，拉回来的结果写库（默认）
 * - source-only 一直回源，结果照样写库。调数据映射时用
 * - db-only     只查库，绝不走外网，miss 直接报错。跑测试和离线开发时用，
 *               它的价值是硬性保证不会偷偷发外部请求
 */
export const POKEMON_FETCH_MODES = ["db-first", "source-only", "db-only"] as const;

export type PokemonFetchMode = (typeof POKEMON_FETCH_MODES)[number];

const DEFAULT_MODE: PokemonFetchMode = "db-first";

export function getPokemonFetchMode(): PokemonFetchMode {
  const raw = process.env.POKEMON_FETCH_MODE;
  if (!raw) return DEFAULT_MODE;

  if (!POKEMON_FETCH_MODES.includes(raw as PokemonFetchMode)) {
    // 配置写错了就立刻炸，不要静默回退成默认值 —— 那样线上明明设了
    // db-only 却在偷偷打外网，出问题很难查
    throw new Error(
      `POKEMON_FETCH_MODE 的值 "${raw}" 不合法，只能是 ${POKEMON_FETCH_MODES.join(" / ")}`,
    );
  }
  return raw as PokemonFetchMode;
}

/** 这个模式允许回源吗 */
export function canUseSource(mode: PokemonFetchMode): boolean {
  return mode !== "db-only";
}

/** 这个模式该先查库吗 */
export function shouldReadDb(mode: PokemonFetchMode): boolean {
  return mode !== "source-only";
}
