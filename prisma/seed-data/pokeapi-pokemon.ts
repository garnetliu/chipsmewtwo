/**
 * PokeAPI 的宝可梦响应，以及它到本项目形状的映射。
 *
 * 两个地方用：scripts/refresh-seed-data.ts 拉全量写快照，prisma/seed.ts 灌库。
 * 形状必须跟快照一致，所以映射写在这里而不是各写一份 —— 属性和颜色的按世代展开、
 * 图鉴说明的换行清理，任何一处不一样都会让快照里的对不上。
 *
 * 只管映射，不管怎么拉也不管怎么落库，那是两个调用方各自的事。
 */
import { FORM_COLOR_HISTORY, FORM_COLORS } from "./form-colors";
import { resolveLanguageCode } from "./pokeapi-language";

/** 属性、种族值、特性按世代展开的上界 */
export const LATEST_GENERATION = 9;

/** 「按颜色查找图鉴」是红宝石蓝宝石引入的功能，Gen1/2 没有颜色分类 */
const COLOR_SINCE_GENERATION = 3;

/** 特性是红宝石蓝宝石引入的，Gen1/2 不插行 */
const ABILITY_SINCE_GENERATION = 3;

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
  varieties: { is_default: boolean; pokemon: NamedRef }[];
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: NamedRef;
  }[];
};

type AbilitySlot = { is_hidden: boolean; slot: number; ability: NamedRef | null };
type StatEntry = { base_stat: number; stat: NamedRef };

export type PokemonResponse = {
  id: number;
  name: string;
  is_default: boolean;
  species: NamedRef;
  forms: NamedRef[];
  types: { slot: number; type: NamedRef }[];
  past_types: { generation: NamedRef; types: { slot: number; type: NamedRef }[] }[];
  stats: StatEntry[];
  /** 改过的项，不是整组六项 —— 皮卡丘的 generation-v 只给 defense 和 special-defense */
  past_stats: { generation: NamedRef; stats: StatEntry[] }[];
  abilities: AbilitySlot[];
  past_abilities: { generation: NamedRef; abilities: AbilitySlot[] }[];
  sprites: {
    /** 点阵图，96×96 */
    front_default: string | null;
    other: {
      /** 官方美术图，475×475 */
      "official-artwork": { front_default: string | null };
    };
  };
};

/** /pokemon-form 的响应 */
export type PokemonFormResponse = {
  id: number;
  name: string;
  /** 「阿罗拉的样子」这种修饰词。默认形态是空数组 */
  form_names: LocalizedName[];
  is_mega: boolean;
  /**
   * 变成这个形态的触发条件。trigger 是 "held-item" 时 name 就是道具 slug ——
   * 超级石、原始回归的宝珠、阿尔宙斯的石板、银伴战兽的存储碟都靠它。
   * 这是「道具 → 形态」这层关系唯一的结构化来源，而且方向是反的
   */
  trigger_conditions: { trigger: string; name: string; url: string }[] | null;
  /** 这个形态的属性。石板和存储碟改的就是它 */
  types: { slot: number; type: NamedRef }[];
  /** 这个机制哪个版本组引入的 */
  version_group: NamedRef | null;
  /** 这个变体挂在哪个 variety 下。"wormadam-plant" 这种细分形态用它认回本体 */
  pokemon: NamedRef;
  is_default: boolean;
  /** 同一形态下排第几个 */
  form_order: number;
  sprites: { front_default: string | null };
};

export type ListResponse = { count: number; results: NamedRef[] };

// ── 中间形状。响应 → 这个 → 落库或写快照 ──────────────────────

export type FormSnapshot = {
  slug: string;
  isDefault: boolean;
  /** 大图文件名，数据源没收录时是 null */
  fullImage: string | null;
  /** 小图文件名，同上 */
  detailImage: string | null;
  /** 形态名（「阿罗拉的样子」）。默认形态没有，是空数组 */
  names: { languageCode: string; name: string }[];
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
  /** 每代每个 slot 一行。slot 1/2 是普通特性，3 是隐藏特性 */
  abilities: { generationId: number; slot: number; abilitySlug: string }[];
  descriptions: { versionSlug: string; languageCode: string; text: string }[];
};

export type Snapshot = {
  id: number;
  slug: string;
  /// 未进化的宝宝宝可梦（皮丘、波克比）
  isBaby: boolean;
  isLegendary: boolean;
  /// 幻之宝可梦，通常只能靠活动配信拿到
  isMythical: boolean;
  names: { languageCode: string; name: string; genus: string | null }[];
  dexNumbers: { pokedexSlug: string; number: number }[];
  /** 物种的全部形态，默认形态排在最前 */
  forms: FormSnapshot[];
};

/** 抓取侧把一个形态需要的两个响应凑成一对再交给 toSnapshot */
export type Variety = { pokemon: PokemonResponse; form: PokemonFormResponse | null };

/** 从图片地址里取文件名。数据源给的是完整 URL，库里只留 "10103.png" 这一段 ——
 *  地址前缀和版本号在 lib/pokemon/sprites.ts 里，换图源不用动数据 */
export function fileNameOf(url: string | null): string | null {
  return url ? (url.split("/").pop() ?? null) : null;
}

// ── 响应 → 中间形状 ───────────────────────────────────────────

export function toSnapshot(species: SpeciesResponse, varieties: Variety[]): Snapshot {
  return {
    id: species.id,
    slug: species.name,
    isBaby: species.is_baby,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    names: toNames(species),
    dexNumbers: species.pokedex_numbers.map((entry) => ({
      pokedexSlug: entry.pokedex.name,
      number: entry.entry_number,
    })),
    // 默认形态排最前，其余按 slug —— 数据源的 varieties 顺序不保证稳定，
    // 跟着它走的话每次刷新都会在 diff 里搅出一堆没改内容的行
    forms: varieties
      .map((v) => toForm(v, species))
      .sort((a, b) =>
        a.isDefault === b.isDefault ? a.slug.localeCompare(b.slug) : a.isDefault ? -1 : 1,
      ),
  };
}

function toForm({ pokemon, form }: Variety, species: SpeciesResponse): FormSnapshot {
  return {
    slug: pokemon.name,
    isDefault: pokemon.is_default,
    fullImage: fileNameOf(pokemon.sprites.other["official-artwork"].front_default),
    detailImage: fileNameOf(pokemon.sprites.front_default),
    names: toFormNames(form),
    types: toTypes(pokemon, species),
    colors: toColors(pokemon, species),
    stats: toStats(pokemon, species),
    abilities: toAbilities(pokemon, species),
    descriptions: toDescriptions(species),
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

/** 形态名。默认形态的 form_names 是空数组，直接返回空 */
function toFormNames(form: PokemonFormResponse | null): FormSnapshot["names"] {
  if (!form) return [];
  const out: FormSnapshot["names"] = [];
  for (const n of form.form_names) {
    const code = resolveLanguageCode(n.language.name);
    if (code) out.push({ languageCode: code, name: n.name });
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
function toTypes(pokemon: PokemonResponse, species: SpeciesResponse): FormSnapshot["types"] {
  const introducedIn = idFromUrl(species.generation.url);
  const past = pokemon.past_types
    .map((p) => ({ generationId: idFromUrl(p.generation.url), types: p.types }))
    .sort((a, b) => a.generationId - b.generationId);

  const out: FormSnapshot["types"] = [];
  for (let generationId = introducedIn; generationId <= LATEST_GENERATION; generationId++) {
    // 取第一个覆盖这一代的历史快照，没有就说明这代用的是当前值。
    // past_types 给的是整组属性不是差异，所以整套替换即可
    const snapshot = past.find((p) => p.generationId >= generationId)?.types ?? pokemon.types;
    const bySlot = new Map(snapshot.map((t) => [t.slot, t.type.name]));
    const primarySlug = bySlot.get(1);
    if (!primarySlug) continue;

    out.push({ generationId, primarySlug, secondarySlug: bySlot.get(2) ?? null });
  }
  return out;
}

/**
 * 种族值按世代展开成每代一行。
 *
 * past_stats 跟 past_types 不一样，给的是**改过的那几项**而不是整组六项 ——
 * 皮卡丘有两条：generation-v 给 {防御 30, 特防 40}，generation-i 再给 {特殊 50}。
 * 所以要从当前值出发，把所有覆盖目标世代的差异按世代从大到小依次叠上去，
 * 世代小的后叠、优先级更高。皮卡丘 Gen1 = 当前值 + gen5 差异 + gen1 差异。
 *
 * 第一世代没有分开的特攻特防，只有一个合并的「特殊」。所以那一代拿到 special
 * 时把 specialAttack / specialDefense 置 null —— 库里两套列并存，
 * 靠哪一套有值区分是不是 Gen1 的行。
 */
function toStats(pokemon: PokemonResponse, species: SpeciesResponse): FormSnapshot["stats"] {
  const introducedIn = idFromUrl(species.generation.url);
  const past = pokemon.past_stats
    .map((p) => ({ generationId: idFromUrl(p.generation.url), stats: p.stats }))
    .sort((a, b) => b.generationId - a.generationId);

  const out: FormSnapshot["stats"] = [];
  for (let generationId = introducedIn; generationId <= LATEST_GENERATION; generationId++) {
    const values = new Map(pokemon.stats.map((s) => [s.stat.name, s.base_stat]));
    for (const p of past) {
      if (p.generationId < generationId) continue;
      for (const s of p.stats) values.set(s.stat.name, s.base_stat);
    }

    const hp = values.get("hp");
    const attack = values.get("attack");
    const defense = values.get("defense");
    const speed = values.get("speed");
    // 四项必填的缺任何一项就说明响应不对，这一代跳过而不是写半行进去
    if (hp === undefined || attack === undefined || defense === undefined || speed === undefined) {
      continue;
    }

    const special = values.get("special") ?? null;
    out.push({
      generationId,
      hp,
      attack,
      defense,
      specialAttack: special === null ? (values.get("special-attack") ?? null) : null,
      specialDefense: special === null ? (values.get("special-defense") ?? null) : null,
      speed,
      special,
    });
  }
  return out;
}

/**
 * 特性按世代展开成每代每 slot 一行。
 *
 * 跟种族值一样是「当前值 + 历史差异」：妙蛙种子的 past_abilities 在
 * generation-iv 给了 {slot 3, ability: null} —— 隐藏特性是 Gen5 才引入的，
 * 那之前这个位置是空的。ability 为 null 的 slot 不插行。
 */
function toAbilities(
  pokemon: PokemonResponse,
  species: SpeciesResponse,
): FormSnapshot["abilities"] {
  const from = Math.max(idFromUrl(species.generation.url), ABILITY_SINCE_GENERATION);
  const past = pokemon.past_abilities
    .map((p) => ({ generationId: idFromUrl(p.generation.url), abilities: p.abilities }))
    .sort((a, b) => b.generationId - a.generationId);

  const out: FormSnapshot["abilities"] = [];
  for (let generationId = from; generationId <= LATEST_GENERATION; generationId++) {
    const bySlot = new Map(pokemon.abilities.map((a) => [a.slot, a.ability]));
    for (const p of past) {
      if (p.generationId < generationId) continue;
      for (const a of p.abilities) bySlot.set(a.slot, a.ability);
    }

    for (const [slot, ability] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
      if (ability) out.push({ generationId, slot, abilitySlug: ability.name });
    }
  }
  return out;
}

/**
 * 图鉴颜色按世代展开。
 *
 * PokeAPI 的 color 挂在物种上，同一物种的所有形态拿到同一个值 —— 照它写的话
 * 阿罗拉六尾会变成关都六尾的褐色。所以物种值只作兜底，形态和世代的真实分类
 * 走 FORM_COLORS / FORM_COLOR_HISTORY（数据来自神奇宝贝百科）。
 */
function toColors(pokemon: PokemonResponse, species: SpeciesResponse): FormSnapshot["colors"] {
  const fallback = FORM_COLORS[pokemon.name] ?? species.color?.name;
  if (!fallback) return [];

  const history = FORM_COLOR_HISTORY[pokemon.name];
  const from = Math.max(idFromUrl(species.generation.url), COLOR_SINCE_GENERATION);
  const out: FormSnapshot["colors"] = [];
  for (let generationId = from; generationId <= LATEST_GENERATION; generationId++) {
    out.push({ generationId, colorSlug: history?.[generationId] ?? fallback });
  }
  return out;
}

/**
 * 图鉴说明。PokeAPI 把它挂在 species 上而不是形态上，所以同一物种的各个形态
 * 拿到的是同一批文案 —— 游戏里阿罗拉六尾的说明跟原版不同，这层差异补不了。
 */
function toDescriptions(species: SpeciesResponse): FormSnapshot["descriptions"] {
  // 原文带换行和软连字符，那是为了适配游戏内文本框宽度，存库前抹平
  const clean = (text: string) =>
    text
      .replace(/[\n\f\r]+/g, " ")
      .replace(/­/g, "")
      .trim();

  const out: FormSnapshot["descriptions"] = [];
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
