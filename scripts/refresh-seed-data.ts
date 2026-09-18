/**
 * 从 PokeAPI 重新生成快照。
 *
 * 跑法：pnpm seed:refresh，然后 git diff 看数据源改了什么，确认后提交。
 *
 * 平时不需要跑这个 —— prisma/seed.ts 读的是 prisma/seed-data/*.json，不联网。
 * 只有想跟进数据源的更新（出了新世代、译名被修正）时才跑一次。
 *
 * 一万多个请求，半小时上下。不写数据库，所以不需要 DATABASE_URL。
 * 中文那部分抓不到，在 scripts/refresh-wiki-data.ts。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { type LanguageCode, LANGUAGES } from "@/lib/pokemon/language";
import { resolveLanguageCode } from "@/prisma/seed-data/pokeapi-language";
import {
  LATEST_GENERATION,
  type PokemonFormResponse,
  type PokemonResponse,
  type SpeciesResponse,
  toSnapshot,
  type Variety,
} from "@/prisma/seed-data/pokeapi-pokemon";
import {
  type AbilitySnapshot,
  type BerrySnapshot,
  type ColorSnapshot,
  type DamageTo,
  type EffectsByGeneration,
  type EvolutionSnapshot,
  type EvolutionTriggerSnapshot,
  type FlavorsByGroup,
  type GenerationSnapshot,
  type GroupSnapshot,
  type GzipSeedData,
  type ItemFormChangeSnapshot,
  type ItemNatureSnapshot,
  type ItemSnapshot,
  type ItemTypeBoostSnapshot,
  type ItemTypeChangeSnapshot,
  type Localized,
  type MachineSnapshot,
  type MaxMoveSnapshot,
  type MoveLearnMethodSnapshot,
  type MoveLearnSnapshot,
  type MoveSnapshot,
  type NamedSnapshot,
  type NatureSnapshot,
  type PokedexSnapshot,
  type PokemonDescriptionSnapshot,
  type PokemonSnapshot,
  type RegionSnapshot,
  SEED_DATA_DIR,
  type SeedData,
  type StatName,
  type TypeSnapshot,
  type VersionSnapshot,
  type ZMoveSnapshot,
} from "@/prisma/seed-data/types";

const BASE_URL = "https://pokeapi.co/api/v2";

// ── PokeAPI 访问 ──────────────────────────────────────────────

type NamedRef = { name: string; url: string };
type LocalizedName = { name: string; language: { name: string } };

/** 从 ".../api/v2/generation/6/" 这种 URL 里抠出末尾的 id。
 *  只用在世代上 —— generation.id 存的就是「第几世代」这个官方编号。
 *  其余实体在快照里一律用 slug 互相引用，不拿数据源的行号当键 */
function idFromUrl(url: string): number {
  const id = Number(url.replace(/\/$/, "").split("/").pop());
  if (!Number.isFinite(id)) throw new Error(`URL 里解析不出 id: ${url}`);
  return id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 拉一条，失败退避重试。
 *
 * 一万多个请求跑半小时，中途总会撞上连接被掐或者 5xx —— 整轮重跑的代价
 * 比重试一条大得多。404 那种「这个请求不对」不重试。
 */
async function getJson<T>(path: string, attempt = 0): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (res.ok) return (await res.json()) as T;
    if (res.status < 500 && res.status !== 429) {
      throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
    }
    if (attempt >= 4) throw new Error(`GET ${path} → ${res.status}，重试 ${attempt} 次仍失败`);
  } catch (err) {
    if (attempt >= 4) throw err;
  }

  await sleep(1000 * 2 ** attempt);
  return getJson<T>(path, attempt + 1);
}

/** 按 URL 逐个拉详情。
 *  分批并发而不是一口气打完 —— PokeAPI 没有硬性限流，但没必要给人家添麻烦。
 *
 *  列表里有、详情却 404 的条目直接跳过：数据源自己就对不齐，
 *  /evolution-chain 列了 429 号，点进去是 Not Found */
async function fetchDetails<T>(refs: NamedRef[], batchSize = 8): Promise<T[]> {
  const out: T[] = [];
  const missing: string[] = [];
  for (let i = 0; i < refs.length; i += batchSize) {
    const batch = refs.slice(i, i + batchSize);
    out.push(
      ...(
        await Promise.all(
          batch.map(async (r): Promise<T | undefined> => {
            const path = new URL(r.url).pathname.replace("/api/v2", "");
            try {
              return await getJson<T>(path);
            } catch (err) {
              if (!(err instanceof Error) || !err.message.includes("→ 404")) throw err;
              missing.push(path);
              return undefined;
            }
          }),
        )
      ).filter((x) => x !== undefined),
    );
    if (refs.length > 500 && (i / batchSize) % 25 === 0) {
      console.log(`    ${Math.min(i + batchSize, refs.length)}/${refs.length}`);
    }
  }
  if (missing.length) console.warn(`  ⚠ ${missing.length} 条详情 404：${missing.join(", ")}`);
  return out;
}

/** 列出某个资源的全部条目，再逐个拉详情 */
async function fetchAll<T>(resource: string, batchSize = 8): Promise<T[]> {
  const list = await getJson<{ results: NamedRef[] }>(`/${resource}?limit=5000`);
  const out = await fetchDetails<T>(list.results, batchSize);
  console.log(`  ${resource}: 拉到 ${out.length} 条`);
  return out;
}

// ── 快照的稳定形状 ────────────────────────────────────────────

/**
 * 把 PokeAPI 的按语言数组收成 { code: 值 }，不支持的语言丢掉。
 *
 * key 按 LANGUAGES 的顺序写，不按数据源给的顺序 —— 数据源那边顺序不保证稳定，
 * 跟着它走的话每次刷新都会在 diff 里搅出一堆没改内容的行。
 * 同一语言给了多条时保留第一条（effect_entries 偶尔会重复）。
 */
function byLanguage<T extends { language: { name: string } }, R>(
  entries: T[],
  build: (entry: T) => R,
): Partial<Record<LanguageCode, R>> {
  const byCode = new Map<LanguageCode, R>();
  for (const entry of entries) {
    const code = resolveLanguageCode(entry.language.name);
    if (code && !byCode.has(code)) byCode.set(code, build(entry));
  }

  const out: Partial<Record<LanguageCode, R>> = {};
  for (const lang of LANGUAGES) {
    const value = byCode.get(lang.code);
    if (value !== undefined) out[lang.code] = value;
  }
  return out;
}

function bySlug<T extends { slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.slug.localeCompare(b.slug));
}

async function write<K extends keyof SeedData>(name: K, rows: SeedData[K]) {
  const path = join(SEED_DATA_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(rows, null, 2) + "\n", "utf8");
  console.log(`写入 ${path}：${rows.length} 条`);
}

/** 大到没法进 git 的那些压着存。招式学习表纯文本三百多兆，压完二十几兆 */
async function writeGzip<K extends keyof GzipSeedData>(name: K, rows: GzipSeedData[K]) {
  const path = join(SEED_DATA_DIR, `${name}.json.gz`);
  const json = JSON.stringify(rows);
  await writeFile(path, gzipSync(json, { level: 9 }));
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;
  console.log(
    `写入 ${path}：${rows.length} 条，${mb(json.length)} → ${mb((await import("node:fs")).statSync(path).size)}`,
  );
}

// ── 说明文本 ──────────────────────────────────────────────────

/** 换行是游戏文本框的排版产物，不是内容，存库前去掉。
 *
 *  中文和日文按句边界断行，删掉就行；日文的全角空格是数据源给的分词，保留不动。
 *  韩文和欧洲语言靠空格分词，而且断行经常落在单词中间（"certain species of\nPokémon"），
 *  必须换成空格 —— 韩文直接删会粘成「포켓몬을진화시키는」 */
function stripLineBreaks(text: string, code: LanguageCode): string {
  const joiner = code === "ja" || code === "ja-Hrkt" || code.startsWith("zh-") ? "" : " ";
  return text.replace(/[\n\f\r]+/g, joiner).trim();
}

/** 机制说明是英法德，一律按空格拼行；顺便把连续空白压成一个 */
function cleanEffect(text: string, effectChance: number | null): string {
  return text
    .replace(/\$effect_chance/g, effectChance === null ? "?" : String(effectChance))
    .replace(/\s+/g, " ")
    .trim();
}

type EffectEntry = { effect: string; short_effect?: string; language: { name: string } };
type EffectChange = {
  version_group: NamedRef;
  effect_entries: { effect: string; language: { name: string } }[];
};

/**
 * 机制说明按世代展开。
 *
 * effect_entries 本身不带世代，是「现在是这样」；effect_changes 每项的
 * version_group 是**变更生效**的版本组，文本描述的是变更**之前**的行为 ——
 * 蓄电的那条挂在钻石珍珠上，写的是「不吸收非伤害类电系招式」，
 * 说的是 Gen3 及之前。所以某一代取第一个「生效世代 > 这一代」的变更文本。
 *
 * 变更条目没有 short_effect（数据源那张表就没这一列），所以旧世代的行
 * shortEffect 是 null —— 不拿 effect 顶替，前端为 null 时展示「说明暂缺」。
 */
function toEffects(
  entries: EffectEntry[],
  changes: EffectChange[],
  introducedIn: number,
  generationOfGroup: (slug: string) => number | undefined,
  effectChance: number | null = null,
): EffectsByGeneration {
  const current = byLanguage(entries, (e) => ({
    short: e.short_effect ? cleanEffect(e.short_effect, effectChance) : null,
    effect: cleanEffect(e.effect, effectChance),
  }));
  if (!Object.keys(current).length) return {};

  const past = changes
    .flatMap((c) => {
      const generationId = generationOfGroup(c.version_group.name);
      if (generationId === undefined) return [];
      const texts = byLanguage(c.effect_entries, (e) => ({
        short: null as string | null,
        effect: cleanEffect(e.effect, effectChance),
      }));
      return Object.keys(texts).length ? [{ generationId, texts }] : [];
    })
    .sort((a, b) => a.generationId - b.generationId);

  const out: EffectsByGeneration = {};
  for (let generationId = introducedIn; generationId <= LATEST_GENERATION; generationId++) {
    const hit = past.find((p) => p.generationId > generationId);
    // 变更条目未必覆盖全部语言，没覆盖到的那几种回落到当前文本
    out[String(generationId)] = hit ? { ...current, ...hit.texts } : current;
  }
  return out;
}

type FlavorEntry = { language: { name: string }; version_group: NamedRef };

/**
 * 游戏文案按版本组收。
 *
 * key 按版本组的发售顺序写而不是数据源给的顺序，同样是为了 diff 稳定。
 * 引用了未知版本组的条目丢掉 —— 版本组是同一次刷新里拉的，对不上说明数据源那边
 * 有版本组没进 /version-group 列表，调用方会把它 warn 出来
 */
function toFlavors<T extends FlavorEntry>(
  entries: T[],
  text: (entry: T) => string,
  groupOrder: Map<string, number>,
  unknown: Set<string>,
): FlavorsByGroup {
  const byGroup = new Map<string, T[]>();
  for (const entry of entries) {
    const slug = entry.version_group.name;
    if (!groupOrder.has(slug)) {
      unknown.add(slug);
      continue;
    }
    const list = byGroup.get(slug);
    if (list) list.push(entry);
    else byGroup.set(slug, [entry]);
  }

  const out: FlavorsByGroup = {};
  for (const slug of [...byGroup.keys()].sort((a, b) => groupOrder.get(a)! - groupOrder.get(b)!)) {
    const texts: Localized = {};
    for (const [code, value] of Object.entries(byLanguage(byGroup.get(slug)!, (e) => text(e)))) {
      texts[code as LanguageCode] = stripLineBreaks(value, code as LanguageCode);
    }
    if (Object.keys(texts).length) out[slug] = texts;
  }
  return out;
}

// ── 各资源 ────────────────────────────────────────────────────

async function regions(): Promise<RegionSnapshot[]> {
  type Region = { name: string; names: LocalizedName[] };
  const rows = await fetchAll<Region>("region");
  return bySlug(rows.map((r) => ({ slug: r.name, names: byLanguage(r.names, (e) => e.name) })));
}

async function generations(): Promise<GenerationSnapshot[]> {
  type Generation = {
    id: number;
    name: string;
    names: LocalizedName[];
    main_region: NamedRef | null;
  };
  const rows = await fetchAll<Generation>("generation");
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      id: g.id,
      slug: g.name,
      mainRegionSlug: g.main_region?.name ?? null,
      names: byLanguage(g.names, (e) => e.name),
    }));
}

type ApiDamageRelations = {
  no_damage_to: NamedRef[];
  half_damage_to: NamedRef[];
  double_damage_to: NamedRef[];
};

function damageTo(relations: ApiDamageRelations): DamageTo {
  const slugs = (refs: NamedRef[]) => refs.map((r) => r.name).sort();
  return {
    zero: slugs(relations.no_damage_to),
    half: slugs(relations.half_damage_to),
    double: slugs(relations.double_damage_to),
  };
}

/**
 * 属性。
 *
 * /type 返回 21 个，只取 id <= 18 的标准 18 个：跳过 stellar（id 19，Gen9 太晶爆发
 * 的特殊属性，不是宝可梦或招式的属性，也不参与常规相克）、unknown（10001）和
 * shadow（10002，外传游戏占位）。
 *
 * 相克表本身不进快照 —— 那两千多行是这里的 damageTo 展开出来的派生数据，
 * seed 时算一遍就有，存进快照只是把同一份信息写胖几十倍。
 *
 * 只存「打出去」那三组：_from 三组是它的镜像（A double_damage_to B ⟺
 * B double_damage_from A），存了就是同一批数据写两遍。
 */
async function types(): Promise<TypeSnapshot[]> {
  type PokeType = {
    id: number;
    name: string;
    names: LocalizedName[];
    generation: NamedRef;
    damage_relations: ApiDamageRelations;
    past_damage_relations: { generation: NamedRef; damage_relations: ApiDamageRelations }[];
  };
  const all = await fetchAll<PokeType>("type");
  const rows = all.filter((t) => t.id <= 18);
  console.log(`  跳过 ${all.length - rows.length} 个非标准属性`);

  return bySlug(
    rows.map((t) => ({
      slug: t.name,
      introducedInGenerationId: idFromUrl(t.generation.url),
      names: byLanguage(t.names, (e) => e.name),
      damageTo: damageTo(t.damage_relations),
      pastDamageTo: [...t.past_damage_relations]
        .map((p) => ({
          throughGenerationId: idFromUrl(p.generation.url),
          ...damageTo(p.damage_relations),
        }))
        .sort((a, b) => a.throughGenerationId - b.throughGenerationId),
    })),
  );
}

/**
 * 只有 slug 和译名的字典表。道具分类、招式目标、异常状态、招式元分类都是这个形状。
 *
 * 这四张数据源一条中文都不给（有的连 names 数组都是空的），
 * 中文在 overrides.json 里人工写
 */
async function named(resource: string): Promise<NamedSnapshot[]> {
  type Named = { name: string; names?: LocalizedName[] };
  const rows = await fetchAll<Named>(resource, 16);
  return bySlug(
    rows.map((r) => ({ slug: r.name, names: byLanguage(r.names ?? [], (e) => e.name) })),
  );
}

/**
 * 性格，25 种。
 *
 * 数据源用 decreased_stat / increased_stat 指向 stat 资源，
 * 这里换成枚举 —— 性格只碰攻击、防御、特攻、特防、速度五项，ＨＰ不受影响。
 * 增减同一项的那 5 种（勤奋那批）数据源给的是 null，照实存空
 */
async function natures(): Promise<NatureSnapshot[]> {
  type Nature = {
    name: string;
    decreased_stat: NamedRef | null;
    increased_stat: NamedRef | null;
    likes_flavor: NamedRef | null;
    hates_flavor: NamedRef | null;
    names: LocalizedName[];
  };
  const rows = await fetchAll<Nature>("nature", 12);

  const STAT: Record<string, NatureSnapshot["increasedStat"]> = {
    attack: "ATTACK",
    defense: "DEFENSE",
    "special-attack": "SPECIAL_ATTACK",
    "special-defense": "SPECIAL_DEFENSE",
    speed: "SPEED",
  };
  const FLAVOR: Record<string, NatureSnapshot["likesFlavor"]> = {
    spicy: "SPICY",
    dry: "DRY",
    sweet: "SWEET",
    bitter: "BITTER",
    sour: "SOUR",
  };

  return bySlug(
    rows.map((n) => ({
      slug: n.name,
      increasedStat: n.increased_stat ? (STAT[n.increased_stat.name] ?? null) : null,
      decreasedStat: n.decreased_stat ? (STAT[n.decreased_stat.name] ?? null) : null,
      likesFlavor: n.likes_flavor ? (FLAVOR[n.likes_flavor.name] ?? null) : null,
      hatesFlavor: n.hates_flavor ? (FLAVOR[n.hates_flavor.name] ?? null) : null,
      names: byLanguage(n.names, (e) => e.name),
    })),
  );
}

async function colors(): Promise<ColorSnapshot[]> {
  type Color = { name: string; names: LocalizedName[] };
  const rows = await fetchAll<Color>("pokemon-color");
  return bySlug(rows.map((c) => ({ slug: c.name, names: byLanguage(c.names, (e) => e.name) })));
}

async function moveLearnMethods(): Promise<MoveLearnMethodSnapshot[]> {
  type Method = { name: string; names: LocalizedName[] };
  const rows = await fetchAll<Method>("move-learn-method");
  return bySlug(rows.map((m) => ({ slug: m.name, names: byLanguage(m.names, (e) => e.name) })));
}

async function evolutionTriggers(): Promise<EvolutionTriggerSnapshot[]> {
  type Trigger = { name: string; names: LocalizedName[] };
  const rows = await fetchAll<Trigger>("evolution-trigger");
  return bySlug(rows.map((t) => ({ slug: t.name, names: byLanguage(t.names, (e) => e.name) })));
}

/**
 * 树果自己那套数值，68 条。
 *
 * 树果本身在 items 里也有一行（带译名、图片、说明），这里只抓
 * 「只有树果才有」的：种下去多久能收、五种口味各多强，以及自然之恩
 * 这个招式的威力和属性 —— 那招式没有固定数值，全看携带的树果
 */
async function berries(): Promise<BerrySnapshot[]> {
  type Berry = {
    name: string;
    growth_time: number | null;
    max_harvest: number | null;
    size: number | null;
    smoothness: number | null;
    soil_dryness: number | null;
    firmness: NamedRef | null;
    natural_gift_power: number | null;
    natural_gift_type: NamedRef | null;
    item: NamedRef;
    flavors: { potency: number; flavor: NamedRef }[];
  };
  const rows = await fetchAll<Berry>("berry", 12);

  const FIRMNESS: Record<string, NonNullable<BerrySnapshot["firmness"]>> = {
    "very-soft": "VERY_SOFT",
    soft: "SOFT",
    hard: "HARD",
    "very-hard": "VERY_HARD",
    "super-hard": "SUPER_HARD",
  };

  return [...rows]
    .map((b) => {
      const potency = new Map(b.flavors.map((f) => [f.flavor.name, f.potency]));
      return {
        itemSlug: b.item.name,
        growthTime: b.growth_time,
        maxHarvest: b.max_harvest,
        size: b.size,
        smoothness: b.smoothness,
        soilDryness: b.soil_dryness,
        firmness: b.firmness ? (FIRMNESS[b.firmness.name] ?? null) : null,
        naturalGiftPower: b.natural_gift_power,
        naturalGiftTypeSlug: b.natural_gift_type?.name ?? null,
        spicy: potency.get("spicy") ?? 0,
        dry: potency.get("dry") ?? 0,
        sweet: potency.get("sweet") ?? 0,
        bitter: potency.get("bitter") ?? 0,
        sour: potency.get("sour") ?? 0,
      };
    })
    .sort((a, b) => a.itemSlug.localeCompare(b.itemSlug));
}

/** 版本组 slug → 世代号 / 发售顺序。说明按世代或版本组存，全靠这两张表换算 */
type GroupIndex = {
  generationOf: (slug: string) => number | undefined;
  order: Map<string, number>;
};

function groupIndex(groups: GroupSnapshot[]): GroupIndex {
  const generation = new Map(groups.map((g) => [g.slug, g.generationId]));
  return {
    generationOf: (slug) => generation.get(slug),
    order: new Map(groups.map((g) => [g.slug, g.order])),
  };
}

/**
 * 全部道具，两千两百多件。
 *
 * 曾经只拉进化相关的四类，因为 item 表当时只为进化条件服务。现在道具有自己的
 * 列表页和详情页，技能机器、树果、邮简那些都得在。
 */
async function items(index: GroupIndex): Promise<ItemSnapshot[]> {
  type Item = {
    id: number;
    name: string;
    names: LocalizedName[];
    sprites: { default: string | null };
    effect_entries: EffectEntry[];
    flavor_text_entries: ({ text: string } & FlavorEntry)[];
    game_indices: { generation: NamedRef }[];
    category: NamedRef | null;
  };
  const rows = await fetchAll<Item>("item", 12);

  const unknown = new Set<string>();
  const out = bySlug(
    rows.map((item) => {
      // 道具没有 generation 字段，用 game_indices 里最早的那代当登场世代；
      // 两者都没有的（新道具数据源还没填）从第一代铺开，宁可多几行也别整条丢掉
      const generationIds = item.game_indices.map((g) => idFromUrl(g.generation.url));
      const introducedIn = generationIds.length ? Math.min(...generationIds) : 1;

      return {
        slug: item.name,
        names: byLanguage(item.names, (e) => e.name),
        categorySlug: item.category?.name ?? null,
        // 存文件名不存整条地址：地址前缀和版本号在 lib/pokemon/sprites.ts 里
        imageName: item.sprites.default?.split("/").pop() ?? null,
        // 道具没有 effect_changes，机制说明每代都一样，展开只是为了跟另外两张表同形
        effects: toEffects(item.effect_entries, [], introducedIn, index.generationOf),
        flavors: toFlavors(item.flavor_text_entries, (e) => e.text, index.order, unknown),
      };
    }),
  );

  if (unknown.size) {
    console.warn(`  ⚠ 有 flavor text 引用了未知版本组: ${[...unknown].sort().join(", ")}`);
  }

  // 数据源偶尔给同一个 slug 两条记录（roseli-berry 就有两个 id），
  // slug 在库里是唯一键，这里先去重，免得快照里留着一条永远写不进去的
  const unique = [...new Map(out.map((item) => [item.slug, item])).values()];
  if (unique.length !== out.length) {
    console.warn(`  ⚠ 数据源有 ${out.length - unique.length} 个重复 slug，各保留一条`);
  }

  const withEffect = unique.filter((i) => Object.keys(i.effects).length).length;
  const withFlavor = unique.filter((i) => Object.keys(i.flavors).length).length;
  console.log(
    `  道具说明: 机制 ${withEffect}/${unique.length}，游戏文案 ${withFlavor}/${unique.length}`,
  );
  return unique;
}

/**
 * 特性，314 个。全是 Gen3 起的东西 —— Gen1/2 没有特性这个概念。
 *
 * 只收正统系列：数据源还收了 60 个外传专用特性（id 10001 起，信长的野望和
 * 不可思议迷宫那些），一个译名都没有，本篇游戏里也不存在。
 * 传说系列算正统，它那几个新特性（超级日光、辣椒喷发、波导防护）在 id 310~314
 */
async function abilities(index: GroupIndex): Promise<AbilitySnapshot[]> {
  type Ability = {
    name: string;
    is_main_series: boolean;
    generation: NamedRef;
    names: LocalizedName[];
    effect_entries: EffectEntry[];
    effect_changes: EffectChange[];
    flavor_text_entries: ({ flavor_text: string } & FlavorEntry)[];
  };
  const all = await fetchAll<Ability>("ability", 12);
  const rows = all.filter((a) => a.is_main_series);
  console.log(`  跳过 ${all.length - rows.length} 个外传专用特性`);

  const unknown = new Set<string>();
  const out = bySlug(
    rows.map((a) => {
      const introducedIn = idFromUrl(a.generation.url);
      return {
        slug: a.name,
        introducedInGenerationId: introducedIn,
        names: byLanguage(a.names, (e) => e.name),
        effects: toEffects(a.effect_entries, a.effect_changes, introducedIn, index.generationOf),
        flavors: toFlavors(a.flavor_text_entries, (e) => e.flavor_text, index.order, unknown),
      };
    }),
  );

  if (unknown.size) {
    console.warn(`  ⚠ 有 flavor text 引用了未知版本组: ${[...unknown].sort().join(", ")}`);
  }
  const withEffect = out.filter((a) => Object.keys(a.effects).length).length;
  console.log(`  特性说明: 机制 ${withEffect}/${out.length}`);
  return out;
}

/**
 * Gen4 之前伤害分类跟属性走，不是招式自己定的：火水草电超冰龙恶一律特殊，
 * 其余一律物理。变化招式两边都一样。
 *
 * 数据源的 damage_class 是招式当前的分类，照抄到老世代就会把
 * Gen1 的拍落（恶系，那时算特殊）写成物理
 */
/** 数据源的能力项 slug → 枚举。ＨＰ不参与能力变化，所以不在表里 */
const STAT_NAMES: Record<string, StatName> = {
  attack: "ATTACK",
  defense: "DEFENSE",
  "special-attack": "SPECIAL_ATTACK",
  "special-defense": "SPECIAL_DEFENSE",
  speed: "SPEED",
  accuracy: "ACCURACY",
  evasion: "EVASION",
};

const SPECIAL_TYPES = new Set([
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
]);
const CATEGORY_SPLIT_GENERATION = 4;

function damageClassOf(
  typeSlug: string,
  current: string,
  generationId: number,
): "PHYSICAL" | "SPECIAL" | "STATUS" {
  if (current === "status") return "STATUS";
  if (generationId >= CATEGORY_SPLIT_GENERATION) {
    return current === "physical" ? "PHYSICAL" : "SPECIAL";
  }
  return SPECIAL_TYPES.has(typeSlug) ? "SPECIAL" : "PHYSICAL";
}

/**
 * 招式，937 个。
 *
 * 数值按世代展开成每代一行。past_values 每项的 version_group 是**变更生效**的
 * 版本组，那一项的值是变更**之前**用的 —— 喷射火焰挂在 x-y（第六世代）上、
 * power 95，所以 Gen1~5 是 95、Gen6~9 是现在的 90。
 *
 * past_values 是差异不是整组，只给改过的那几项，其余为 null 表示没变，
 * 所以要从当前值出发按世代从大到小依次叠。
 */
/**
 * 专属Ｚ招式的 slug。
 *
 * 数据源没给任何标记，只能列出来 —— 它们跟泛用Ｚ招式不一样，
 * 限定宝可梦和原招式，威力和伤害分类是定值。
 * 谜拟Ｑ的 let-s-snuggle-forever 数据源压根没收，靠百科补
 */
const SIGNATURE_Z_MOVES = new Set([
  "catastropika",
  "10-000-000-volt-thunderbolt",
  "stoked-sparksurfer",
  "extreme-evoboost",
  "pulverizing-pancake",
  "genesis-supernova",
  "sinister-arrow-raid",
  "malicious-moonsault",
  "oceanic-operetta",
  "splintered-stormshards",
  "clangorous-soulblaze",
  "guardian-of-alola",
  "searing-sunraze-smash",
  "menacing-moonraze-maelstrom",
  "light-that-burns-the-sky",
  "soul-stealing-7-star-strike",
  "lets-snuggle-forever",
]);

/** Ｚ招式和极巨招式各自只活在一个世代 */
const Z_MOVE_GENERATION = 7;
const MAX_MOVE_GENERATION = 8;

type SplitMoves = {
  moves: MoveSnapshot[];
  zMoves: ZMoveSnapshot[];
  maxMoves: MaxMoveSnapshot[];
};

/**
 * 招式活到哪一代，用招式学习表反推。
 *
 * 数据源只说招式哪代登场，不说哪代退场 —— 直接铺到第九代的话，
 * Let's Go 专属的那批（电电加速、坏坏领域……）会凭空多出第八、第九世代的行，
 * 可它们只在 Let's Go 里存在过。
 *
 * 取「有学习记录的最后一代」当上界：常规招式的学习记录本来就铺满到第九代，
 * 不受影响；一条学习记录都没有的（皮卡丘的闪闪雷光那种事件招式）没法推断，
 * 保持原样不裁
 */
function lastGeneration(
  learns: MoveLearnSnapshot[],
  generationOfGroup: (slug: string) => number | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const form of learns) {
    for (const [moveSlug, groupSlug] of form.learns) {
      const generationId = generationOfGroup(groupSlug);
      if (generationId === undefined) continue;
      const seen = out.get(moveSlug);
      if (seen === undefined || generationId > seen) out.set(moveSlug, generationId);
    }
  }
  return out;
}

async function moves(index: GroupIndex, learns: MoveLearnSnapshot[]): Promise<SplitMoves> {
  type PastValue = {
    version_group: NamedRef;
    type: NamedRef | null;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    effect_chance: number | null;
  };
  type Move = {
    name: string;
    generation: NamedRef;
    type: NamedRef;
    damage_class: NamedRef;
    power: number | null;
    accuracy: number | null;
    pp: number | null;
    effect_chance: number | null;
    names: LocalizedName[];
    past_values: PastValue[];
    effect_entries: EffectEntry[];
    effect_changes: EffectChange[];
    flavor_text_entries: ({ flavor_text: string } & FlavorEntry)[];
    priority: number;
    target: NamedRef | null;
    stat_changes: { change: number; stat: NamedRef }[];
    meta: {
      ailment: NamedRef | null;
      category: NamedRef | null;
      min_hits: number | null;
      max_hits: number | null;
      min_turns: number | null;
      max_turns: number | null;
      drain: number | null;
      healing: number | null;
      crit_rate: number | null;
      ailment_chance: number | null;
      flinch_chance: number | null;
      stat_chance: number | null;
    } | null;
  };
  const rows = await fetchAll<Move>("move", 12);
  const lastGen = lastGeneration(learns, index.generationOf);

  const unknown = new Set<string>();
  const all = bySlug(
    rows.map((m) => {
      const introducedIn = idFromUrl(m.generation.url);
      const past = m.past_values
        .flatMap((p) => {
          const generationId = index.generationOf(p.version_group.name);
          return generationId === undefined ? [] : [{ generationId, value: p }];
        })
        .sort((a, b) => b.generationId - a.generationId);

      // 有学习记录就按它收口，没有的铺到最新代
      const until = Math.max(lastGen.get(m.name) ?? LATEST_GENERATION, introducedIn);

      const generations: MoveSnapshot["generations"] = {};
      for (let generationId = introducedIn; generationId <= until; generationId++) {
        let typeSlug = m.type.name;
        let power = m.power;
        let accuracy = m.accuracy;
        let pp = m.pp;
        // 生效世代比目标世代晚的那些变更全部倒回去，晚的先叠、早的后叠
        for (const { generationId: changedIn, value } of past) {
          if (changedIn <= generationId) continue;
          if (value.type) typeSlug = value.type.name;
          if (value.power !== null) power = value.power;
          if (value.accuracy !== null) accuracy = value.accuracy;
          if (value.pp !== null) pp = value.pp;
        }
        generations[String(generationId)] = {
          typeSlug,
          damageClass: damageClassOf(typeSlug, m.damage_class.name, generationId),
          power,
          accuracy,
          pp,
        };
      }

      return {
        slug: m.name,
        introducedInGenerationId: introducedIn,
        names: byLanguage(m.names, (e) => e.name),
        priority: m.priority,
        // 改哪项能力、改几级。数据源给的是 stat 资源的 slug
        statChanges: m.stat_changes.flatMap((s) => {
          const stat = STAT_NAMES[s.stat.name];
          return stat ? [{ stat, change: s.change }] : [];
        }),
        meta: {
          targetSlug: m.target?.name ?? null,
          ailmentSlug: m.meta?.ailment?.name ?? null,
          metaCategorySlug: m.meta?.category?.name ?? null,
          minHits: m.meta?.min_hits ?? null,
          maxHits: m.meta?.max_hits ?? null,
          minTurns: m.meta?.min_turns ?? null,
          maxTurns: m.meta?.max_turns ?? null,
          drain: m.meta?.drain ?? null,
          healing: m.meta?.healing ?? null,
          critRate: m.meta?.crit_rate ?? null,
          ailmentChance: m.meta?.ailment_chance ?? null,
          flinchChance: m.meta?.flinch_chance ?? null,
          statChance: m.meta?.stat_chance ?? null,
        },
        generations,
        effects: toEffects(
          m.effect_entries,
          m.effect_changes,
          introducedIn,
          index.generationOf,
          m.effect_chance,
        ),
        flavors: toFlavors(m.flavor_text_entries, (e) => e.flavor_text, index.order, unknown),
      };
    }),
  );

  if (unknown.size) {
    console.warn(`  ⚠ 有 flavor text 引用了未知版本组: ${[...unknown].sort().join(", ")}`);
  }
  const withEffect = all.filter((m) => Object.keys(m.effects).length).length;
  const trimmed = all.filter(
    (m) => Math.max(...Object.keys(m.generations).map(Number)) < LATEST_GENERATION,
  ).length;
  console.log(`  招式说明: 机制 ${withEffect}/${all.length}；${trimmed} 条没活到第九世代`);
  return splitMoves(all);
}

/**
 * 把三类招式拆开。
 *
 * Ｚ招式和极巨招式不是学来的，是携带Ｚ纯晶或极巨化之后由普通招式临场转化的，
 * 跟普通招式不是一种东西 —— 它们各自只活在一个世代，套不上「每代一行」，
 * 威力也是按原招式换算的占位值。
 *
 * 泛用Ｚ招式数据源按伤害分类拆成了 acid-downpour--physical 和 --special 两条，
 * 游戏里其实是同一个招式，这里合并回一条，伤害分类留空表示「跟原招式相同」
 */
function splitMoves(all: MoveSnapshot[]): SplitMoves {
  const moves: MoveSnapshot[] = [];
  const zMoves: ZMoveSnapshot[] = [];
  const maxMoves: MaxMoveSnapshot[] = [];
  const seenZ = new Set<string>();

  /** 取登场世代那一行的数值和说明 —— 后面那些世代的行本来就不该存在 */
  const at = (m: MoveSnapshot, generationId: number) => ({
    values: m.generations[String(generationId)] ?? Object.values(m.generations)[0],
    effect: m.effects[String(generationId)] ?? Object.values(m.effects)[0] ?? {},
  });

  for (const m of all) {
    if (m.slug.startsWith("max-")) {
      const { values, effect } = at(m, MAX_MOVE_GENERATION);
      if (!values) continue;
      maxMoves.push({
        slug: m.slug,
        typeSlug: values.typeSlug,
        power: values.power,
        pp: values.pp,
        names: m.names,
        effects: effect,
        flavors: m.flavors,
      });
      continue;
    }

    const generic = /^(.+)--(physical|special)$/.exec(m.slug);
    if (generic || SIGNATURE_Z_MOVES.has(m.slug)) {
      const slug = generic ? generic[1]! : m.slug;
      if (seenZ.has(slug)) continue;
      seenZ.add(slug);

      const { values, effect } = at(m, Z_MOVE_GENERATION);
      if (!values) continue;
      zMoves.push({
        slug,
        typeSlug: values.typeSlug,
        // 泛用的跟原招式走，专属的原招式固定所以是定值
        damageClass: generic ? null : values.damageClass,
        power: generic ? null : values.power,
        pp: values.pp,
        names: m.names,
        effects: effect,
        flavors: m.flavors,
      });
      continue;
    }

    moves.push(m);
  }

  console.log(`  拆分: 普通 ${moves.length}，Ｚ招式 ${zMoves.length}，极巨招式 ${maxMoves.length}`);
  return { moves, zMoves, maxMoves };
}

/**
 * 携带道具触发的形态变化。
 *
 * 数据源把这层关系挂在形态那头（pokemon-form 的 trigger_conditions），
 * 所以得遍历全部形态反着建。一千五百多个请求。
 *
 * 分两种落法：
 *   形态在 Form 表里（超级石那 100 件、原始回归的宝珠）→ item_form_change
 *   形态不在（阿尔宙斯的石板、银伴战兽的存储碟 —— 它们的属性形态在数据源
 *   那边是 pokemon-form 级，我们的 Form 表是 variety 级）→ 退一步存属性，
 *   反正这两类道具的效果本来就是「变成某属性」
 */
async function formTriggers(known: Set<string>): Promise<{
  formChanges: ItemFormChangeSnapshot[];
  typeChanges: ItemTypeChangeSnapshot[];
}> {
  const rows = await fetchAll<PokemonFormResponse>("pokemon-form", 10);

  const formChanges = new Map<string, ItemFormChangeSnapshot>();
  const typeChanges = new Map<string, ItemTypeChangeSnapshot>();
  for (const form of rows) {
    for (const cond of form.trigger_conditions ?? []) {
      if (cond.trigger !== "held-item") continue;

      if (known.has(form.name)) {
        // 同一对（道具，形态）会出现两次：究极奈克洛兹玛的黄昏鬃和拂晓翼
        // 是两个 pokemon-form，落到 Form 表是同一个 necrozma-ultra
        formChanges.set(`${cond.name} ${form.name}`, {
          itemSlug: cond.name,
          formSlug: form.name,
          groupSlug: form.version_group?.name ?? null,
        });
        continue;
      }
      // 形态不在 Form 表里，退一步记属性
      const typeSlug = form.types.find((x) => x.slot === 1)?.type.name;
      if (typeSlug && !typeChanges.has(cond.name)) {
        typeChanges.set(cond.name, { itemSlug: cond.name, typeSlug });
      }
    }
  }

  const formRows = [...formChanges.values()].sort(
    (a, b) => a.itemSlug.localeCompare(b.itemSlug) || a.formSlug.localeCompare(b.formSlug),
  );
  console.log(`  形态变化: ${formRows.length} 条挂到形态，${typeChanges.size} 条退成属性`);
  return {
    formChanges: formRows,
    typeChanges: [...typeChanges.values()].sort((a, b) => a.itemSlug.localeCompare(b.itemSlug)),
  };
}

/**
 * 技能机器。
 *
 * /machine 一条记录是「某个版本组里，某号机器教某个招式」—— 编号在 item 那边
 * （item.name 是 "tm35"）。同一批数据两个用处：
 *   rows   → machines.json，机器这件道具的机制就是「教这个招式」
 *   byMove → 招式学习表里 method 是 machine 的那些行回填编号
 *
 * 同一招在同一版本组可能既是 TM 又是 HM（极少），byMove 取先遇到的那条
 */
async function machines(): Promise<{ rows: MachineSnapshot[]; byMove: Map<string, string> }> {
  type Machine = { item: NamedRef; move: NamedRef; version_group: NamedRef };
  const list = await fetchAll<Machine>("machine", 16);

  const byMove = new Map<string, string>();
  const rows = new Map<string, MachineSnapshot>();
  for (const m of list) {
    const key = `${m.move.name} ${m.version_group.name}`;
    if (!byMove.has(key)) byMove.set(key, m.item.name.toUpperCase());

    // 主键是「道具 + 版本组」，同一版本组里一号机器只教一招
    const rowKey = `${m.item.name} ${m.version_group.name}`;
    if (!rows.has(rowKey)) {
      rows.set(rowKey, {
        itemSlug: m.item.name,
        groupSlug: m.version_group.name,
        moveSlug: m.move.name,
      });
    }
  }
  console.log(`  技能机器: ${rows.size} 条（${list.length} 条原始记录）`);
  return {
    rows: [...rows.values()].sort(
      (a, b) => a.itemSlug.localeCompare(b.itemSlug) || a.groupSlug.localeCompare(b.groupSlug),
    ),
    byMove,
  };
}

/** 宝石强化幅度：第五世代 +50%，第六世代起 +30%。表里只留现行值，带上改动的世代 */
const GEM_BOOST = { boostPercent: 30, generationId: 6 };
/** 石板强化它对应属性的招式 +20%，从第四世代起没变过 */
const PLATE_BOOST = 20;

/**
 * 能从 slug 直接推出来的那几类机制。
 *
 * 这几类道具是成套出的，名字里就写着作用对象：
 *   {属性}-gem         宝石，强化该属性招式一次
 *   {属性}-tera-shard  太晶碎块，换宝可梦的太晶属性
 *   {性格}-mint        性格薄荷，改成该性格的能力加成
 *   *-plate            石板，属性从形态那边来（plateTypes），这里只补威力加成
 *
 * 剩下的属性强化道具（木炭、磁铁、各种薰香）名字推不出属性，在百科那边抓
 */
function slugMechanics(
  itemSlugs: string[],
  natures: NatureSnapshot[],
  typeRows: TypeSnapshot[],
  plateTypes: Map<string, string>,
): {
  typeChanges: ItemTypeChangeSnapshot[];
  typeBoosts: ItemTypeBoostSnapshot[];
  natureItems: ItemNatureSnapshot[];
} {
  const typeSet = new Set(typeRows.map((x) => x.slug));
  const natureSet = new Set(natures.map((n) => n.slug));

  const typeChanges: ItemTypeChangeSnapshot[] = [];
  const typeBoosts: ItemTypeBoostSnapshot[] = [];
  const natureItems: ItemNatureSnapshot[] = [];

  for (const slug of itemSlugs) {
    const gem = slug.endsWith("-gem") ? slug.slice(0, -"-gem".length) : null;
    if (gem && typeSet.has(gem)) {
      typeBoosts.push({ itemSlug: slug, typeSlug: gem, ...GEM_BOOST });
      continue;
    }

    const shard = slug.endsWith("-tera-shard") ? slug.slice(0, -"-tera-shard".length) : null;
    if (shard && typeSet.has(shard)) {
      typeChanges.push({ itemSlug: slug, typeSlug: shard });
      continue;
    }

    const mint = slug.endsWith("-mint") ? slug.slice(0, -"-mint".length) : null;
    if (mint && natureSet.has(mint)) {
      natureItems.push({ itemSlug: slug, natureSlug: mint });
      continue;
    }

    const plate = plateTypes.get(slug);
    if (slug.endsWith("-plate") && plate) {
      typeBoosts.push({
        itemSlug: slug,
        typeSlug: plate,
        boostPercent: PLATE_BOOST,
        generationId: null,
      });
    }
  }
  console.log(
    `  slug 推导: 属性变化 ${typeChanges.length}、威力加成 ${typeBoosts.length}、` +
      `性格薄荷 ${natureItems.length}`,
  );
  return { typeChanges, typeBoosts, natureItems };
}

/**
 * 进化关系。
 *
 * 数据源按「链」组织，一条链是一棵树（伊布那条有八个分支）。递归展开成一行行
 * 「fromForm 在某版本组按某条件变成 toForm」，树形结构不进快照 ——
 * 库里的 EvolutionChain 是 seed 时从这些关系反推出来的分组编号。
 *
 * 两端都是形态：数据源指到具体形态时按它来，没指或者指到的是
 * pokemon-form 级、Form 表里没有的（结草儿的三种蓑衣就是这样，
 * 它在物种那头只有一个 variety），回落到该物种的默认形态
 */
async function evolutions(
  defaultFormOf: Map<string, string>,
  knownForms: Set<string>,
): Promise<EvolutionSnapshot[]> {
  // 触发方式按 id 认，不按名字 —— 数据源给进化链里的名字和字典表对不上：
  // /evolution-trigger 里 18 号已经叫 unclassified，进化链里还写着旧名 other，
  // 照名字存进去会因为外键找不到而整条丢掉
  const triggerList = await getJson<{ results: NamedRef[] }>("/evolution-trigger?limit=200");
  const triggerSlugById = new Map(
    triggerList.results.map((r) => [idFromUrl(r.url), r.name] as const),
  );

  type Detail = {
    version_group: NamedRef;
    trigger: NamedRef;
    item: NamedRef | null;
    held_item: NamedRef | null;
    known_move: NamedRef | null;
    known_move_type: NamedRef | null;
    used_move: NamedRef | null;
    party_species: NamedRef | null;
    party_type: NamedRef | null;
    trade_species: NamedRef | null;
    region: NamedRef | null;
    location: NamedRef | null;
    // 两端的形态。2026-09 数据源把这两个字段从 pokemon 级挪到了
    // pokemon-form 级，名字也从 base_form / evolved_form 改成了现在这对 ——
    // 读旧名字的话全是 undefined，地区形态的进化会整片退回默认形态
    required_pokemon_form: NamedRef | null;
    evolved_pokemon_form: NamedRef | null;
    gender: number | null;
    time_of_day: string;
    min_level: number | null;
    min_happiness: number | null;
    min_affection: number | null;
    min_beauty: number | null;
    min_steps: number | null;
    min_move_count: number | null;
    min_damage_taken: number | null;
    relative_physical_stats: number | null;
    condition_expression: {
      expression: string;
      percentage_chance: number | null;
    } | null;
    allowed_natures: NamedRef[] | null;
    needs_overworld_rain: boolean;
    needs_multiplayer: boolean;
    near_special_rock: boolean;
    turn_upside_down: boolean;
  };
  type Link = {
    species: NamedRef;
    evolution_details: Detail[];
    evolves_to: Link[];
  };
  const chains = await fetchAll<{ id: number; chain: Link }>("evolution-chain", 12);

  /** 物种 slug → 默认形态 slug。多数情况两者同名，代欧奇希斯那种不同 */
  const formOf = (speciesSlug: string) => defaultFormOf.get(speciesSlug) ?? speciesSlug;

  /**
   * 数据源指的形态在 Form 表里有就用；没指的话，条件里写了地区就试
   * 「物种-地区」这个形态（阿罗拉雷丘那条只给了 region，没给形态）；
   * 都不行就退回物种的默认形态
   */
  const pick = (ref: NamedRef | null, speciesSlug: string, region: string | null) => {
    if (ref && knownForms.has(ref.name)) return ref.name;
    const regional = region ? `${speciesSlug}-${region}` : null;
    if (regional && knownForms.has(regional)) return regional;
    return formOf(speciesSlug);
  };

  const rows: EvolutionSnapshot[] = [];
  const missing = new Set<string>();
  const dropped = new Set<string>();

  const walk = (node: Link) => {
    for (const next of node.evolves_to) {
      for (const d of next.evolution_details) {
        const region = d.region?.name ?? null;
        const fromFormSlug = pick(d.required_pokemon_form, node.species.name, region);
        const toFormSlug = pick(d.evolved_pokemon_form, next.species.name, region);
        for (const ref of [d.required_pokemon_form, d.evolved_pokemon_form]) {
          if (ref && !knownForms.has(ref.name)) dropped.add(ref.name);
        }
        if (!defaultFormOf.has(node.species.name)) missing.add(node.species.name);

        rows.push({
          fromFormSlug,
          toFormSlug,
          groupSlug: d.version_group.name,
          triggerSlug: triggerSlugById.get(idFromUrl(d.trigger.url)) ?? d.trigger.name,
          minLevel: d.min_level,
          minHappiness: d.min_happiness,
          minAffection: d.min_affection,
          minBeauty: d.min_beauty,
          minSteps: d.min_steps,
          minMoveCount: d.min_move_count,
          minDamageTaken: d.min_damage_taken,
          itemSlug: d.item?.name ?? null,
          heldItemSlug: d.held_item?.name ?? null,
          knownMoveSlug: d.known_move?.name ?? null,
          knownMoveTypeSlug: d.known_move_type?.name ?? null,
          usedMoveSlug: d.used_move?.name ?? null,
          partyFormSlug: d.party_species ? formOf(d.party_species.name) : null,
          partyTypeSlug: d.party_type?.name ?? null,
          tradeFormSlug: d.trade_species ? formOf(d.trade_species.name) : null,
          regionSlug: d.region?.name ?? null,
          // location 是「磁场区域」这类具体地点，数据源给的是 slug 不是译名
          locationName: d.location?.name ?? null,
          // 空字符串是数据源表示「不限时间」的写法，不是 DAY。
          // full-moon 那种连字符值换成下划线，对上枚举
          timeOfDay: d.time_of_day
            ? (d.time_of_day.toUpperCase().replace(/-/g, "_") as EvolutionSnapshot["timeOfDay"])
            : null,
          // 数据源用 1 = 雌性、2 = 雄性。结草儿那条能对出来：
          // 1 变结草贵妇（雌性专属）、2 变绅士蛾（雄性专属）
          gender: d.gender === 1 ? "FEMALE" : d.gender === 2 ? "MALE" : null,
          conditionExpression: d.condition_expression?.expression ?? null,
          conditionChance: d.condition_expression?.percentage_chance ?? null,
          natureSlugs: (d.allowed_natures ?? []).map((n) => n.name).sort(),
          needsRain: d.needs_overworld_rain,
          needsMultiplayer: d.needs_multiplayer,
          nearSpecialRock: d.near_special_rock,
          turnUpsideDown: d.turn_upside_down,
          // 数据源用 1 / 0 / -1，不照抄：0 是「攻防相等」这个有意义的值，
          // 而判断「有没有这个条件」时 0 和「没有」长得一样
          attackVsDefense:
            d.relative_physical_stats === 1
              ? "ATTACK_HIGHER"
              : d.relative_physical_stats === 0
                ? "EQUAL"
                : d.relative_physical_stats === -1
                  ? "DEFENSE_HIGHER"
                  : null,
        });
      }
      walk(next);
    }
  };
  for (const c of chains) walk(c.chain);

  if (missing.size) {
    console.warn(`  ⚠ 进化链引用了不在物种快照里的 ${missing.size} 个物种，按同名形态处理`);
  }
  if (dropped.size) {
    console.warn(
      `  ⚠ ${dropped.size} 个形态只在 pokemon-form 级、Form 表里没有，` +
        `按默认形态处理：${[...dropped].sort().slice(0, 5).join(", ")}`,
    );
  }
  // 两端都退回默认形态之后会撞出一模一样的行 —— 四季鹿四种季节、
  // 花蓓蓓五种花色在数据源那边是按形态分开写的，而这些形态是
  // pokemon-form 级、Form 表里没有，落下来就成了四条五条同样的关系
  const unique = new Map(rows.map((r) => [JSON.stringify(r), r]));
  const deduped = [...unique.values()];

  // 排序只为 diff 稳定，跟落库顺序无关
  deduped.sort(
    (a, b) =>
      a.fromFormSlug.localeCompare(b.fromFormSlug) ||
      a.toFormSlug.localeCompare(b.toFormSlug) ||
      a.groupSlug.localeCompare(b.groupSlug),
  );
  console.log(`  进化关系: ${deduped.length} 行（去掉 ${rows.length - deduped.length} 条重复）`);
  return deduped;
}

async function pokedexes(): Promise<PokedexSnapshot[]> {
  type Pokedex = {
    name: string;
    is_main_series: boolean;
    names: LocalizedName[];
    // descriptions 里的字段叫 description 不是 name
    descriptions: { description: string; language: { name: string } }[];
    region: NamedRef | null;
  };
  const rows = await fetchAll<Pokedex>("pokedex");
  return bySlug(
    rows.map((p) => ({
      slug: p.name,
      isMainSeries: p.is_main_series,
      regionSlug: p.region?.name ?? null,
      names: byLanguage(p.names, (e) => e.name),
      descriptions: byLanguage(p.descriptions ?? [], (e) => e.description),
    })),
  );
}

async function groups(): Promise<GroupSnapshot[]> {
  type Group = {
    name: string;
    order: number;
    generation: NamedRef;
    regions: NamedRef[];
    pokedexes: NamedRef[];
    move_learn_methods: NamedRef[];
  };
  const rows = await fetchAll<Group>("version-group");
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .map((vg) => ({
      slug: vg.name,
      order: vg.order,
      generationId: idFromUrl(vg.generation.url),
      regionSlugs: vg.regions.map((r) => r.name).sort(),
      pokedexSlugs: vg.pokedexes.map((p) => p.name).sort(),
      moveLearnMethodSlugs: vg.move_learn_methods.map((m) => m.name).sort(),
    }));
}

async function versions(): Promise<VersionSnapshot[]> {
  type Version = { name: string; names: LocalizedName[]; version_group: NamedRef };
  const rows = await fetchAll<Version>("version");
  return bySlug(
    rows.map((v) => ({
      slug: v.name,
      groupSlug: v.version_group.name,
      names: byLanguage(v.names, (e) => e.name),
    })),
  );
}

/**
 * 全部 1025 个物种和它们的 1351 个形态。
 *
 * 形态全收而不是只收默认形态：进化做在形态级 —— 关都喵喵和阿罗拉喵喵各自变成
 * 对应形态的猫老大，只有伽勒尔喵喵变喵头目，只导默认形态的话这三条线会混成一条。
 *
 * 每个物种一个 /pokemon-species 请求，每个形态两个（/pokemon 和 /pokemon-form），
 * 加起来将近四千个请求。招式学习表顺带在这里出 —— 它要的 moves 字段就在
 * /pokemon 的响应里，另开一轮等于把这批请求再打一遍。
 */
async function pokemon(machines: Map<string, string>): Promise<{
  pokemon: PokemonSnapshot[];
  descriptions: PokemonDescriptionSnapshot[];
  moveLearns: MoveLearnSnapshot[];
  defaultFormOf: Map<string, string>;
}> {
  type MoveEntry = {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
    }[];
  };
  const list = await getJson<{ results: NamedRef[] }>("/pokemon-species?limit=2000");
  console.log(`  pokemon-species: ${list.results.length} 个物种`);

  const rows: PokemonSnapshot[] = [];
  const descriptions: PokemonDescriptionSnapshot[] = [];
  const moveLearns: MoveLearnSnapshot[] = [];
  const defaultFormOf = new Map<string, string>();

  const batchSize = 6;
  for (let i = 0; i < list.results.length; i += batchSize) {
    const batch = list.results.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (ref) => {
        const species = await getJson<SpeciesResponse>(`/pokemon-species/${ref.name}`);
        const varieties = await Promise.all(
          species.varieties.map(async (v) => {
            const poke = await getJson<PokemonResponse & { moves: MoveEntry[] }>(
              `/pokemon/${v.pokemon.name}`,
            );
            // /pokemon 的 forms 一般只有一条；多条时第一条是默认外观那条
            const formRef = poke.forms[0];
            const form = formRef
              ? await getJson<PokemonFormResponse>(
                  new URL(formRef.url).pathname.replace("/api/v2", ""),
                )
              : null;
            return { pokemon: poke, form } satisfies Variety;
          }),
        );
        return { species, varieties };
      }),
    );

    for (const { species, varieties } of results) {
      const snap = toSnapshot(species, varieties);
      // 图鉴说明摘出去单独存，形态本体里不留 —— 说明有十万多条，
      // 跟本体放一起的话每次刷新整个文件都要重写
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const forms = snap.forms.map(({ descriptions: _drop, ...form }) => form);
      rows.push({ ...snap, forms });

      const texts = snap.forms[0]?.descriptions ?? [];
      if (texts.length) descriptions.push({ slug: snap.slug, descriptions: texts });

      const defaultForm = snap.forms.find((f) => f.isDefault) ?? snap.forms[0];
      if (defaultForm) defaultFormOf.set(snap.slug, defaultForm.slug);

      for (const v of varieties) {
        const learns: MoveLearnSnapshot["learns"] = [];
        for (const entry of v.pokemon.moves) {
          for (const d of entry.version_group_details) {
            const methodSlug = d.move_learn_method.name;
            const groupSlug = d.version_group.name;
            learns.push([
              entry.move.name,
              groupSlug,
              methodSlug,
              // level 只有 level-up 有意义，其余一律 0 —— 那一列进了唯一键，
              // 而 Postgres 里 NULL 互不相等，可空的话唯一键对这几类行等于失效
              methodSlug === "level-up" ? d.level_learned_at : 0,
              methodSlug === "machine"
                ? (machines.get(`${entry.move.name} ${groupSlug}`) ?? null)
                : null,
            ]);
          }
        }
        if (learns.length) {
          learns.sort(
            (a, b) =>
              a[0].localeCompare(b[0]) ||
              a[1].localeCompare(b[1]) ||
              a[2].localeCompare(b[2]) ||
              a[3] - b[3],
          );
          moveLearns.push({ formSlug: v.pokemon.name, learns });
        }
      }
    }
    if ((i / batchSize) % 20 === 0) {
      console.log(`  ${Math.min(i + batchSize, list.results.length)}/${list.results.length}`);
    }
  }

  rows.sort((a, b) => a.id - b.id);
  descriptions.sort((a, b) => a.slug.localeCompare(b.slug));
  moveLearns.sort((a, b) => a.formSlug.localeCompare(b.formSlug));
  console.log(
    `  形态 ${rows.reduce((n, p) => n + p.forms.length, 0)} 个，` +
      `图鉴说明 ${descriptions.reduce((n, d) => n + d.descriptions.length, 0)} 条，` +
      `招式学习 ${moveLearns.reduce((n, m) => n + m.learns.length, 0)} 行`,
  );
  return { pokemon: rows, descriptions, moveLearns, defaultFormOf };
}

// ── 入口 ──────────────────────────────────────────────────────

await mkdir(SEED_DATA_DIR, { recursive: true });

// 版本组先算：说明按世代或版本组存，要靠它把 flavor text 的 version_group 换算过去
const groupRows = await groups();
const index = groupIndex(groupRows);

await write("regions", await regions());
await write("generations", await generations());
const typeRows = await types();
await write("types", typeRows);
await write("colors", await colors());
await write("move-learn-methods", await moveLearnMethods());
await write("evolution-triggers", await evolutionTriggers());
await write("item-categories", await named("item-category"));
const itemRows = await items(index);
await write("items", itemRows);
const natureRows = await natures();
await write("natures", natureRows);
await write("move-targets", await named("move-target"));
await write("move-ailments", await named("move-ailment"));
await write("move-meta-categories", await named("move-category"));
await write("abilities", await abilities(index));
await write("pokedexes", await pokedexes());
await write("groups", groupRows);
await write("versions", await versions());
// 技能机器先备好，招式学习表里 machine 那些行要回填编号
const machineRows = await machines();
await write("machines", machineRows.rows);

// 宝可梦排在招式之前：招式的世代范围要靠学习表反推上界
const species = await pokemon(machineRows.byMove);
await write("pokemon", species.pokemon);
await write("pokemon-descriptions", species.descriptions);
await writeGzip("move-learns", species.moveLearns);

const moveRows = await moves(index, species.moveLearns);
await write("moves", moveRows.moves);
await write("z-moves", moveRows.zMoves);
await write("max-moves", moveRows.maxMoves);

// 进化两端是形态，要先知道 Form 表里有哪些形态、每个物种的默认形态叫什么
const knownForms = new Set(species.pokemon.flatMap((p) => p.forms.map((f) => f.slug)));
await write("evolutions", await evolutions(species.defaultFormOf, knownForms));

await write("berries", await berries());

// 道具机制。形态变化那头也要 knownForms，不在的退成属性变化
const triggers = await formTriggers(knownForms);
const derived = slugMechanics(
  itemRows.map((i) => i.slug),
  natureRows,
  typeRows,
  new Map(triggers.typeChanges.map((c) => [c.itemSlug, c.typeSlug])),
);
await write("item-form-changes", triggers.formChanges);
await write(
  "item-type-changes",
  [...triggers.typeChanges, ...derived.typeChanges].sort((a, b) =>
    a.itemSlug.localeCompare(b.itemSlug),
  ),
);
await write(
  "item-type-boosts",
  derived.typeBoosts.sort((a, b) => a.itemSlug.localeCompare(b.itemSlug)),
);
await write(
  "item-natures",
  derived.natureItems.sort((a, b) => a.itemSlug.localeCompare(b.itemSlug)),
);
