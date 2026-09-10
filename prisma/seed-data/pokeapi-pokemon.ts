/**
 * PokeAPI 的宝可梦响应，以及它到本项目形状的映射。
 *
 * 两个地方用：scripts/refresh-seed-data.ts 拉全量写快照，prisma/seed.ts 灌库。
 * 形状必须跟快照一致，所以映射写在这里而不是各写一份 —— 属性和颜色的按世代展开、
 * 图鉴说明的换行清理，任何一处不一样都会让按需拉的那只跟快照里的对不上。
 *
 * 只管映射，不管怎么拉也不管怎么落库，那是两个调用方各自的事。
 */
import { FORM_COLOR_HISTORY, FORM_COLORS } from "./form-colors";
import { resolveLanguageCode } from "./pokeapi-language";

/** 属性按世代展开的上界，也是种族值唯一有数据的那一代 */
export const LATEST_GENERATION = 9;

/** 「按颜色查找图鉴」是红宝石蓝宝石引入的功能，Gen1/2 没有颜色分类 */
const COLOR_SINCE_GENERATION = 3;

/** 从 ".../api/v2/generation/6/" 这种 URL 里抠出末尾的 id */
export function idFromUrl(url: string): number {
  const id = Number(url.replace(/\/$/, "").split("/").pop());
  if (!Number.isFinite(id)) throw new Error(`URL 里解析不出 id: ${url}`);
  return id;
}

// ── PokeAPI 的响应形状 ────────────────────────────────────────

export type NamedRef = { name: string; url: string };
type LocalizedName = { name: string; language: { name: string } };

export type SpeciesResponse = {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: { name: string } }[];
  color: NamedRef | null;
  generation: NamedRef;
  pokedex_numbers: { entry_number: number; pokedex: NamedRef }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: NamedRef;
  }[];
};

export type PokemonResponse = {
  id: number;
  name: string;
  is_default: boolean;
  species: NamedRef;
  types: { slot: number; type: NamedRef }[];
  past_types: { generation: NamedRef; types: { slot: number; type: NamedRef }[] }[];
  stats: { base_stat: number; stat: NamedRef }[];
  sprites: {
    /** 点阵图，96×96 */
    front_default: string | null;
    other: {
      /** 官方美术图，475×475 */
      "official-artwork": { front_default: string | null };
    };
  };
};

export type ListResponse = { count: number; results: NamedRef[] };

// ── 中间形状。响应 → 这个 → 落库或写快照 ──────────────────────

export type Snapshot = {
  id: number;
  slug: string;
  names: { languageCode: string; name: string; genus: string | null }[];
  dexNumbers: { pokedexSlug: string; number: number }[];
  form: {
    slug: string;
    isDefault: boolean;
    /** 大图文件名，数据源没收录时是 null */
    fullImage: string | null;
    /** 小图文件名，同上 */
    detailImage: string | null;
    /** 已经按世代展开好，每代一行 */
    types: { generationId: number; primarySlug: string; secondarySlug: string | null }[];
    /** 同样每代一行 */
    colors: { generationId: number; colorSlug: string }[];
    stats: {
      generationId: number;
      hp: number;
      attack: number;
      defense: number;
      specialAttack: number | null;
      specialDefense: number | null;
      speed: number;
      special: number | null;
    }[];
    descriptions: { versionSlug: string; languageCode: string; text: string }[];
  };
};

/** 从图片地址里取文件名。数据源给的是完整 URL，库里只留 "10103.png" 这一段 ——
 *  地址前缀和版本号在 lib/pokemon/sprites.ts 里，换图源不用动数据 */
export function fileNameOf(url: string | null): string | null {
  return url ? (url.split("/").pop() ?? null) : null;
}

// ── 响应 → 中间形状 ───────────────────────────────────────────

export function toSnapshot(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot {
  return {
    id: species.id,
    slug: species.name,
    names: toNames(species),
    dexNumbers: species.pokedex_numbers.map((entry) => ({
      pokedexSlug: entry.pokedex.name,
      number: entry.entry_number,
    })),
    form: {
      slug: pokemon.name,
      isDefault: pokemon.is_default,
      fullImage: fileNameOf(pokemon.sprites.other["official-artwork"].front_default),
      detailImage: fileNameOf(pokemon.sprites.front_default),
      types: toTypes(pokemon, species),
      colors: toColors(pokemon, species),
      stats: toStats(pokemon),
      descriptions: toDescriptions(species),
    },
  };
}

/** names 给名字、genera 给分类，两者按语言合并成一行 */
function toNames(species: SpeciesResponse): Snapshot["names"] {
  const genusByCode = new Map<string, string>();
  for (const g of species.genera) {
    const code = resolveLanguageCode(g.language.name);
    if (code) genusByCode.set(code, g.genus);
  }

  const out: Snapshot["names"] = [];
  for (const n of species.names) {
    const code = resolveLanguageCode(n.language.name);
    if (!code) continue;
    out.push({ languageCode: code, name: n.name, genus: genusByCode.get(code) ?? null });
  }
  return out;
}

/**
 * 属性按世代展开成每代一行。types 是当前（Gen9）的，past_types 每项的
 * generation 表示「该世代及之前是这样」—— 魔墙人偶当前是超能力+妖精，
 * past 是 Gen5 只有超能力，所以 Gen1~5 的 secondary 为 null、Gen6~9 是妖精。
 *
 * 展开放在这里而不是留给落库：past_types 那种「当前值 + 历史差异」的表达
 * 是 PokeAPI 特有的，库里存的是每代一行完整值。
 */
function toTypes(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot["form"]["types"] {
  const introducedIn = idFromUrl(species.generation.url);
  const past = pokemon.past_types
    .map((p) => ({ generationId: idFromUrl(p.generation.url), types: p.types }))
    .sort((a, b) => a.generationId - b.generationId);

  const out: Snapshot["form"]["types"] = [];
  for (let generationId = introducedIn; generationId <= LATEST_GENERATION; generationId++) {
    // 取第一个覆盖这一代的历史快照，没有就说明这代用的是当前值
    const snapshot = past.find((p) => p.generationId >= generationId)?.types ?? pokemon.types;
    const bySlot = new Map(snapshot.map((t) => [t.slot, t.type.name]));
    const primarySlug = bySlot.get(1);
    if (!primarySlug) continue;

    out.push({ generationId, primarySlug, secondarySlug: bySlot.get(2) ?? null });
  }
  return out;
}

/**
 * 种族值只有最新世代那一份 —— PokeAPI 没有 past_stats，只给当前值。
 * 历史种族值（比如 Gen1 的合并特殊值）得另找数据源，所以 special 这里永远是 null。
 */
function toStats(pokemon: PokemonResponse): Snapshot["form"]["stats"] {
  const byName = new Map(pokemon.stats.map((s) => [s.stat.name, s.base_stat]));
  const hp = byName.get("hp");
  const attack = byName.get("attack");
  const defense = byName.get("defense");
  const speed = byName.get("speed");
  // 四项必填的缺任何一项就说明响应不对，整条跳过而不是写半行进去
  if (hp === undefined || attack === undefined || defense === undefined || speed === undefined) {
    return [];
  }

  return [
    {
      generationId: LATEST_GENERATION,
      hp,
      attack,
      defense,
      specialAttack: byName.get("special-attack") ?? null,
      specialDefense: byName.get("special-defense") ?? null,
      speed,
      special: null,
    },
  ];
}

/**
 * 图鉴颜色按世代展开。
 *
 * PokeAPI 的 color 挂在物种上，同一物种的所有形态拿到同一个值 —— 照它写的话
 * 阿罗拉六尾会变成关都六尾的褐色。所以物种值只作兜底，形态和世代的真实分类
 * 走 FORM_COLORS / FORM_COLOR_HISTORY（数据来自神奇宝贝百科）。
 */
function toColors(pokemon: PokemonResponse, species: SpeciesResponse): Snapshot["form"]["colors"] {
  const fallback = FORM_COLORS[pokemon.name] ?? species.color?.name;
  if (!fallback) return [];

  const history = FORM_COLOR_HISTORY[pokemon.name];
  const from = Math.max(idFromUrl(species.generation.url), COLOR_SINCE_GENERATION);
  const out: Snapshot["form"]["colors"] = [];
  for (let generationId = from; generationId <= LATEST_GENERATION; generationId++) {
    out.push({ generationId, colorSlug: history?.[generationId] ?? fallback });
  }
  return out;
}

/**
 * 图鉴说明。PokeAPI 把它挂在 species 上而不是形态上，所以同一物种的各个形态
 * 拿到的是同一批文案 —— 游戏里阿罗拉六尾的说明跟原版不同，这层差异补不了。
 */
function toDescriptions(species: SpeciesResponse): Snapshot["form"]["descriptions"] {
  // 原文带换行和软连字符，那是为了适配游戏内文本框宽度，存库前抹平
  const clean = (text: string) =>
    text
      .replace(/[\n\f\r]+/g, " ")
      .replace(/­/g, "")
      .trim();

  const out: Snapshot["form"]["descriptions"] = [];
  for (const entry of species.flavor_text_entries) {
    const code = resolveLanguageCode(entry.language.name);
    if (!code) continue;
    out.push({
      versionSlug: entry.version.name,
      languageCode: code,
      text: clean(entry.flavor_text),
    });
  }
  return out;
}
