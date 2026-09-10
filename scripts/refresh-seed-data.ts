/**
 * 从 PokeAPI 重新生成字典表快照。
 *
 * 跑法：pnpm seed:refresh，然后 git diff 看数据源改了什么，确认后提交。
 *
 * 平时不需要跑这个 —— prisma/seed.ts 读的是 prisma/seed-data/*.json，不联网。
 * 只有想跟进数据源的更新（出了新世代、译名被修正）时才跑一次。
 *
 * 三百多个请求，一分钟上下。不写数据库，所以不需要 DATABASE_URL。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { type LanguageCode, LANGUAGES, resolveLanguageCode } from "@/lib/pokeapi/language";
import { type PokemonResponse, type SpeciesResponse, toSnapshot } from "@/lib/pokeapi/pokemon";
import {
  type ColorSnapshot,
  type DamageTo,
  type EvolutionTriggerSnapshot,
  type GenerationSnapshot,
  type GroupSnapshot,
  type ItemSnapshot,
  type Localized,
  type MoveLearnMethodSnapshot,
  type PokedexSnapshot,
  type PokemonDescriptionSnapshot,
  type PokemonSnapshot,
  type RegionSnapshot,
  SEED_DATA_DIR,
  type SeedData,
  type TypeSnapshot,
  type VersionSnapshot,
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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** 按 URL 逐个拉详情。
 *  分批并发而不是一口气打完 —— PokeAPI 没有硬性限流，但没必要给人家添麻烦 */
async function fetchDetails<T>(refs: NamedRef[], batchSize = 8): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < refs.length; i += batchSize) {
    const batch = refs.slice(i, i + batchSize);
    out.push(
      ...(await Promise.all(
        batch.map((r) => getJson<T>(new URL(r.url).pathname.replace("/api/v2", ""))),
      )),
    );
  }
  return out;
}

/** 列出某个资源的全部条目，再逐个拉详情 */
async function fetchAll<T>(resource: string, batchSize = 8): Promise<T[]> {
  const list = await getJson<{ results: NamedRef[] }>(`/${resource}?limit=2000`);
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

/** 进化条件会引用的道具。
 *
 *  只拉这四类而不是全量两千多个 —— item 表在这个项目里只为进化条件服务，
 *  能出现在进化条件里的道具都在这四类中：evolution 是进化石那批（含连接绳），
 *  held-items 有王者之证和锐利之爪，species-specific 有深海之牙，
 *  type-enhancement 有金属膜。抓进化数据时遇到不在库里的道具会外键报错，
 *  到时候往这个清单里补一类就行 */
const ITEM_CATEGORIES = ["evolution", "held-items", "species-specific", "type-enhancement"];

/** 换行是游戏文本框的排版产物，不是内容，存库前去掉。
 *
 *  中文和日文按句边界断行，删掉就行；日文的全角空格是数据源给的分词，保留不动。
 *  韩文和欧洲语言靠空格分词，而且断行经常落在单词中间（"certain species of\nPokémon"），
 *  必须换成空格 —— 韩文直接删会粘成「포켓몬을진화시키는」 */
function stripLineBreaks(text: string, code: LanguageCode): string {
  const joiner = code === "ja" || code === "ja-Hrkt" || code.startsWith("zh-") ? "" : " ";
  return text.replace(/[\n\f\r]+/g, joiner).trim();
}

async function items(groups: GroupSnapshot[]): Promise<ItemSnapshot[]> {
  type ItemCategory = { items: NamedRef[] };
  type Item = {
    name: string;
    names: LocalizedName[];
    sprites: { default: string | null };
    flavor_text_entries: { text: string; language: { name: string }; version_group: NamedRef }[];
  };

  const refs = new Map<string, NamedRef>();
  for (const category of ITEM_CATEGORIES) {
    const { items } = await getJson<ItemCategory>(`/item-category/${category}`);
    // 同一个道具可能被多类收录，按 URL 去重
    for (const item of items) refs.set(item.url, item);
  }
  const rows = await fetchDetails<Item>([...refs.values()]);
  console.log(`  item: 拉到 ${rows.length} 条`);

  const byGroupSlug = new Map(groups.map((g) => [g.slug, g]));
  const unknownGroups = new Set<string>();

  const out = bySlug(
    rows.map((item) => {
      // 同一世代里可能有好几个版本组（Gen3 有红蓝宝石 / 绿宝石 / 火红叶绿），
      // 文案各版本会改，取 order 最大的那个 —— 即该世代最后出的版本
      const latest = new Map<string, { order: number; text: string }>();
      for (const entry of item.flavor_text_entries) {
        const code = resolveLanguageCode(entry.language.name);
        if (!code) continue;
        const group = byGroupSlug.get(entry.version_group.name);
        if (!group) {
          unknownGroups.add(entry.version_group.name);
          continue;
        }
        const key = `${group.generationId} ${code}`;
        const prev = latest.get(key);
        if (!prev || group.order > prev.order) {
          latest.set(key, { order: group.order, text: stripLineBreaks(entry.text, code) });
        }
      }

      // 摊成 { 世代: { 语言: 文本 } }，世代按数字升序、语言按 LANGUAGES 顺序
      const descriptions: Record<string, Localized> = {};
      const generationIds = [
        ...new Set([...latest.keys()].map((k) => Number(k.split(" ")[0]))),
      ].sort((a, b) => a - b);
      for (const generationId of generationIds) {
        const texts: Localized = {};
        for (const lang of LANGUAGES) {
          const hit = latest.get(`${generationId} ${lang.code}`);
          if (hit) texts[lang.code] = hit.text;
        }
        descriptions[String(generationId)] = texts;
      }

      return {
        slug: item.name,
        names: byLanguage(item.names, (e) => e.name),
        // 存文件名不存整条地址：地址前缀和版本号在 lib/pokemon/sprites.ts 里
        imageName: item.sprites.default?.split("/").pop() ?? null,
        descriptions,
      };
    }),
  );

  if (unknownGroups.size) {
    // 不该发生：groups 是同一次刷新里拉的，两边应该对得上。
    // 真出现了说明数据源那边有版本组没进 /version-group 列表，得看一眼
    console.warn(`  ⚠ 有 flavor text 引用了未知版本组: ${[...unknownGroups].sort().join(", ")}`);
  }
  const withText = out.filter((i) => Object.keys(i.descriptions).length).length;
  console.log(`  item 说明: ${withText}/${out.length} 条有 flavor text`);
  return out;
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
 * 全部 1025 个物种，只取默认形态。
 *
 * 地区形态不进快照：它们靠 PokeAPISource 按需拉，而且一进来数据量就翻几倍。
 * /pokemon 列表里默认形态的 id 是 1..1025，一万开头的那批是形态，按 id 过滤。
 *
 * 每只两个请求（pokemon 和 pokemon-species），两千多个请求，几分钟。
 * 映射用 lib/pokeapi/pokemon.ts 的 toSnapshot，跟按需拉那条路完全同一份代码。
 */
async function pokemon(): Promise<{
  pokemon: PokemonSnapshot[];
  descriptions: PokemonDescriptionSnapshot[];
}> {
  const list = await getJson<{ results: NamedRef[] }>("/pokemon-species?limit=2000");
  console.log(`  pokemon-species: ${list.results.length} 个物种`);

  const rows: PokemonSnapshot[] = [];
  const descriptions: PokemonDescriptionSnapshot[] = [];

  const batchSize = 8;
  for (let i = 0; i < list.results.length; i += batchSize) {
    const batch = list.results.slice(i, i + batchSize);
    const snapshots = await Promise.all(
      batch.map(async (ref) => {
        const species = await getJson<SpeciesResponse>(`/pokemon-species/${ref.name}`);
        // 默认形态就是物种同名那条，直接按 slug 取，不用翻 varieties
        const poke = await getJson<PokemonResponse>(`/pokemon/${species.id}`);
        return toSnapshot(poke, species);
      }),
    );

    for (const snap of snapshots) {
      const { descriptions: texts, ...form } = snap.form;
      rows.push({ ...snap, form });
      if (texts.length) descriptions.push({ slug: snap.slug, descriptions: texts });
    }
    if ((i / batchSize) % 20 === 0) {
      console.log(`  ${Math.min(i + batchSize, list.results.length)}/${list.results.length}`);
    }
  }

  rows.sort((a, b) => a.id - b.id);
  descriptions.sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(`  图鉴说明 ${descriptions.reduce((n, d) => n + d.descriptions.length, 0)} 条`);
  return { pokemon: rows, descriptions };
}

// ── 入口 ──────────────────────────────────────────────────────

await mkdir(SEED_DATA_DIR, { recursive: true });

// 版本组先算：道具说明按世代存，要靠它把 flavor text 的 version_group 映射到世代
const groupRows = await groups();

await write("regions", await regions());
await write("generations", await generations());
await write("types", await types());
await write("colors", await colors());
await write("move-learn-methods", await moveLearnMethods());
await write("evolution-triggers", await evolutionTriggers());
await write("items", await items(groupRows));
await write("pokedexes", await pokedexes());
await write("groups", groupRows);
await write("versions", await versions());

const species = await pokemon();
await write("pokemon", species.pokemon);
await write("pokemon-descriptions", species.descriptions);
