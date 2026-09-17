/**
 * 把快照灌进库。
 *
 * 这些是游戏史实，永远不变，所以一次性灌好 —— 运行时只查本地 Postgres，
 * 不回源 PokeAPI，字典表空着的话整个站都没数据。
 *
 * 数据读的是 prisma/seed-data/ 下的快照，跟代码一起进 git：
 *   *.json          PokeAPI 的拷贝，scripts/refresh-seed-data.ts 生成
 *   *.json.gz       同上，大到没法明文存的（招式学习表一百万行）
 *   wiki-*.json     神奇宝贝百科的拷贝，scripts/refresh-wiki-data.ts 生成，补中文
 *   overrides.json  人工译名，两个刷新脚本都不碰
 *
 * 这里不联网：建库不该依赖 pokeapi.co 可用，数据源改了什么也该在 diff 里看得见。
 *
 * 跑法：pnpm seed（或 pnpm exec prisma db seed，migrate dev 也会自动执行）
 *
 * 可以重复跑：实体和译名走 upsert；说明、相克表、招式学习、进化这些纯导入数据
 * 整表重建 —— 它们没有下游引用，而 upsert 会把上一版的行留在库里删不掉。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { LATEST_GENERATION } from "@/lib/pokemon/defaults";
import { type LanguageCode, LANGUAGES } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import {
  type DamageTo,
  type EffectsByGeneration,
  type FlavorsByGroup,
  type GzipSeedData,
  type Localized,
  SEED_DATA_DIR,
  SEED_OVERRIDES_FILE,
  type SeedData,
  type SeedOverrides,
  type TypeSnapshot,
  type WikiData,
  type WikiEffectSnapshot,
  type WikiPokemonDescriptionSnapshot,
} from "@/prisma/seed-data/types";

/** 属性徽章的主题色。PokeAPI 不提供，只能手写 */
const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A77A",
  fighting: "#C22E28",
  flying: "#A98FF3",
  poison: "#A33EA1",
  ground: "#E2BF65",
  rock: "#B6A136",
  bug: "#A6B91A",
  ghost: "#735797",
  steel: "#B7B7CE",
  fire: "#EE8130",
  water: "#6390F0",
  grass: "#7AC74C",
  electric: "#F7D02C",
  psychic: "#F95587",
  ice: "#96D9D6",
  dragon: "#6F35FC",
  dark: "#705746",
  fairy: "#D685AD",
};

/** 图鉴颜色分类的色块用色。同样是手写 —— PokeAPI 只给分类名（"brown"）不给色值。
 *  跟 TYPE_COLORS 是两回事：这个是宝可梦身体的主色调，那个是属性徽章的主题色 */
const POKEMON_COLORS: Record<string, string> = {
  black: "#4A4A4A",
  blue: "#5B8FE0",
  brown: "#B1736C",
  gray: "#9EA0A3",
  green: "#63BC5A",
  pink: "#EE99AC",
  purple: "#A45DC4",
  red: "#E4434A",
  white: "#E8E8E8", // 纯白在浅色底上看不见，压一点灰
  yellow: "#F7D02C",
};

/** createMany 一次塞多少行。再大就顶到 Postgres 的参数上限了 */
const BATCH = 5000;

// ── 快照读取 ──────────────────────────────────────────────────

/** 路径相对项目根 —— seed 和刷新脚本都由 pnpm 从根目录启动 */
function read<K extends keyof SeedData>(name: K): SeedData[K] {
  const path = join(SEED_DATA_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as SeedData[K];
}

/** 压着存的那些。招式学习表纯文本三百多兆，超过 GitHub 单文件上限 */
function readGzip<K extends keyof GzipSeedData>(name: K): GzipSeedData[K] {
  const path = join(SEED_DATA_DIR, `${name}.json.gz`);
  return JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as GzipSeedData[K];
}

/** 神奇宝贝百科的快照。补中文 —— PokeAPI 的机制说明只有英法德 */
function readWiki<K extends keyof WikiData>(name: K): WikiData[K] {
  const path = join(SEED_DATA_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as WikiData[K];
}

/** 人工译名。跟快照放一起，但由人维护，两个刷新脚本都不碰它 */
function overrides(): SeedOverrides {
  const path = join(SEED_DATA_DIR, SEED_OVERRIDES_FILE);
  return JSON.parse(readFileSync(path, "utf8")) as SeedOverrides;
}

/** { code: 文本 } → 一行行的 upsert 数据。缺的语言是数据源没收录，不插行 */
function localized(texts: Localized): { languageCode: LanguageCode; value: string }[] {
  return Object.entries(texts).map(([languageCode, value]) => ({
    languageCode: languageCode as LanguageCode,
    value,
  }));
}

/** 分批塞。十万行一次性过去会超出 Postgres 的参数上限 */
async function insertInBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH));
}

// ── 说明文本的两个数据源合并 ──────────────────────────────────

type EffectRow = {
  generationId: number;
  languageCode: LanguageCode;
  shortEffect: string | null;
  effect: string;
};

/**
 * 机制说明摊成一行行。
 *
 * 快照那份只有英法德 —— 数据源的 effect_entries 是志愿者手写的，
 * 贡献者以英语和欧洲语言使用者为主。中文来自神奇宝贝百科，它不分世代，
 * 所以每一代都插同一段文本，shortEffect 留空（百科上没有短版）。
 */
function effectRows(
  effects: EffectsByGeneration,
  chinese: Localized | undefined,
  /** 登场世代。数据源一条机制说明都没给时，中文自己从这一代铺到最新代 */
  introducedIn: number,
): EffectRow[] {
  // 数据源收录得不全，九十多个招式一条 effect_entries 都没有。
  // 跟着 effects 的世代走的话，那些招式连带把百科抓到的中文也丢了
  const generationIds = Object.keys(effects).length
    ? Object.keys(effects).map(Number)
    : Array.from({ length: LATEST_GENERATION - introducedIn + 1 }, (_, i) => introducedIn + i);

  const out: EffectRow[] = [];
  for (const generationId of generationIds) {
    for (const [code, text] of Object.entries(effects[String(generationId)] ?? {})) {
      out.push({
        generationId,
        languageCode: code as LanguageCode,
        shortEffect: text.short,
        effect: text.effect,
      });
    }
    for (const { languageCode, value } of localized(chinese ?? {})) {
      out.push({ generationId, languageCode, shortEffect: null, effect: value });
    }
  }
  return out;
}

/**
 * 游戏文案摊成一行行。
 *
 * 两份数据源同一个版本组同一种语言都有时以百科为准 —— PokeAPI 的中文只到剑盾，
 * 朱紫那一批只有百科有。版本组不在库里的行丢掉（外传游戏的版本组没进快照）。
 */
function flavorRows(
  flavors: FlavorsByGroup,
  chinese: FlavorsByGroup | undefined,
  groupIds: Map<string, number>,
): { groupId: number; languageCode: LanguageCode; text: string }[] {
  const out: { groupId: number; languageCode: LanguageCode; text: string }[] = [];
  const slugs = new Set([...Object.keys(flavors), ...Object.keys(chinese ?? {})]);
  for (const slug of slugs) {
    const groupId = groupIds.get(slug);
    if (groupId === undefined) continue;
    const merged = { ...flavors[slug], ...chinese?.[slug] };
    for (const { languageCode, value: text } of localized(merged)) {
      out.push({ groupId, languageCode, text });
    }
  }
  return out;
}

/** wiki 快照按 slug 建索引。文件不存在就当没有中文，不让 seed 挂掉 ——
 *  百科那边页面结构变了抓不到东西时，英文数据照样该能进库 */
function wikiEffects(
  name: "wiki-abilities" | "wiki-moves" | "wiki-items",
): Map<string, WikiEffectSnapshot> {
  try {
    const snapshot = readWiki(name);
    if (snapshot.unmatched.length) {
      // 多半是百科收了而 PokeAPI 还没收的新条目（传说 Z-A 那批特性就是），
      // 本体表以 PokeAPI 为准，这些中文没有可挂的行
      console.warn(`⚠ ${name}: ${snapshot.unmatched.length} 个条目在 PokeAPI 里没有对应记录`);
    }
    return new Map(snapshot.rows.map((r) => [r.slug, r]));
  } catch {
    console.warn(`⚠ 读不到 ${name}.json，这一批的中文说明会缺`);
    return new Map();
  }
}

// ── 各步 ──────────────────────────────────────────────────────

async function seedLanguages() {
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      create: lang,
      update: lang,
    });
  }
  console.log(`语言: ${LANGUAGES.length} 行`);
}

async function seedRegions(manual: SeedOverrides["regions"]) {
  const regions = read("regions");

  const ids = new Map<string, number>();
  for (const r of regions) {
    const region = await prisma.region.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    ids.set(r.slug, region.id);

    for (const { languageCode, value: name } of localized({
      ...r.names,
      ...manual?.[r.slug]?.names,
    })) {
      await prisma.regionI18n.upsert({
        where: { regionId_languageCode: { regionId: region.id, languageCode } },
        create: { regionId: region.id, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`地区: ${regions.length} 行`);
  return ids;
}

/** 世代的主键就是「第几世代」，不是数据源的行号，所以这里保留 g.id */
async function seedGenerations(regionIds: Map<string, number>) {
  const generations = read("generations");

  for (const g of generations) {
    const data = {
      slug: g.slug,
      mainRegionId: g.mainRegionSlug ? (regionIds.get(g.mainRegionSlug) ?? null) : null,
    };
    await prisma.generation.upsert({
      where: { id: g.id },
      create: { id: g.id, ...data },
      update: data,
    });
    for (const { languageCode, value: name } of localized(g.names)) {
      await prisma.generationI18n.upsert({
        where: { generationId_languageCode: { generationId: g.id, languageCode } },
        create: { generationId: g.id, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`世代: ${generations.length} 行`);
  return Math.max(...generations.map((g) => g.id));
}

async function seedTypes(generationCount: number) {
  const types = read("types");

  const introducedIn = new Map<string, number>();
  const ids = new Map<string, number>();
  for (const t of types) {
    introducedIn.set(t.slug, t.introducedInGenerationId);

    const data = {
      slug: t.slug,
      color: TYPE_COLORS[t.slug] ?? "#888888",
      introducedInGenerationId: t.introducedInGenerationId,
    };
    const type = await prisma.type.upsert({ where: { slug: t.slug }, create: data, update: data });
    ids.set(t.slug, type.id);

    for (const { languageCode, value: name } of localized(t.names)) {
      await prisma.typeI18n.upsert({
        where: { typeId_languageCode: { typeId: type.id, languageCode } },
        create: { typeId: type.id, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`属性: ${types.length} 行`);

  await seedTypeEffectiveness(types, introducedIn, ids, generationCount);
  return ids;
}

/**
 * 把快照里的「当前关系 + 历史关系」展开成每个世代一份完整相克表。
 *
 * damageTo 是当前（最新世代）的关系；pastDamageTo 每项的 throughGenerationId
 * 表示「这套关系在该世代及之前有效」，而且它是**完整的三组关系**不是差异，
 * 所以整套替换即可，不用做合并。
 */
async function seedTypeEffectiveness(
  types: TypeSnapshot[],
  introducedIn: Map<string, number>,
  ids: Map<string, number>,
  generationCount: number,
) {
  const rows: {
    generationId: number;
    attackerTypeId: number;
    defenderTypeId: number;
    multiplier: number;
  }[] = [];

  for (const attacker of types) {
    const attackerFrom = introducedIn.get(attacker.slug)!;

    for (let generationId = attackerFrom; generationId <= generationCount; generationId++) {
      // 历史关系按世代升序，取第一个覆盖目标世代的
      const snapshot: DamageTo =
        attacker.pastDamageTo.find((p) => p.throughGenerationId >= generationId) ??
        attacker.damageTo;

      const zero = new Set(snapshot.zero);
      const half = new Set(snapshot.half);
      const double = new Set(snapshot.double);

      for (const defender of types) {
        // 那一代还不存在的属性不入表：妖精在 Gen5 及之前没有任何行
        if (introducedIn.get(defender.slug)! > generationId) continue;

        const multiplier = zero.has(defender.slug)
          ? 0
          : half.has(defender.slug)
            ? 0.5
            : double.has(defender.slug)
              ? 2
              : 1;

        rows.push({
          generationId,
          attackerTypeId: ids.get(attacker.slug)!,
          defenderTypeId: ids.get(defender.slug)!,
          multiplier,
        });
      }
    }
  }

  // 两三千行，整表重建比逐行 upsert 快得多，而且它是纯派生数据，删了没损失
  await prisma.typeEffectiveness.deleteMany({});
  await prisma.typeEffectiveness.createMany({ data: rows });
  console.log(`相克表: ${rows.length} 行`);
}

/** 图鉴颜色，10 种。FormColor.colorId 指向它，所以得在拉宝可梦之前就位 */
async function seedColors() {
  const colors = read("colors");

  const ids = new Map<string, number>();
  for (const c of colors) {
    const data = { slug: c.slug, color: POKEMON_COLORS[c.slug] ?? "#888888" };
    const color = await prisma.color.upsert({
      where: { slug: c.slug },
      create: data,
      update: data,
    });
    ids.set(c.slug, color.id);
    for (const { languageCode, value: name } of localized(c.names)) {
      await prisma.colorI18n.upsert({
        where: { colorId_languageCode: { colorId: color.id, languageCode } },
        create: { colorId: color.id, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`颜色: ${colors.length} 行`);
  return ids;
}

/** 学习方式的译名数据源只有英法，中日韩靠 overrides.json 补 */
async function seedMoveLearnMethods(manual: SeedOverrides["moveLearnMethods"]) {
  const methods = read("move-learn-methods");

  for (const m of methods) {
    await prisma.moveLearnMethod.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug },
      update: {},
    });
    const names = { ...m.names, ...manual?.[m.slug]?.names };
    for (const { languageCode, value: name } of localized(names)) {
      await prisma.moveLearnMethodI18n.upsert({
        where: { methodSlug_languageCode: { methodSlug: m.slug, languageCode } },
        create: { methodSlug: m.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`学习方式: ${methods.length} 行`);
}

/** 进化的触发方式，16 种。evolution.triggerSlug 指向它 */
async function seedEvolutionTriggers(manual: SeedOverrides["evolutionTriggers"]) {
  const triggers = read("evolution-triggers");

  for (const t of triggers) {
    await prisma.evolutionTrigger.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug },
      update: {},
    });
    const names = { ...t.names, ...manual?.[t.slug]?.names };
    for (const { languageCode, value: name } of localized(names)) {
      await prisma.evolutionTriggerI18n.upsert({
        where: { triggerSlug_languageCode: { triggerSlug: t.slug, languageCode } },
        create: { triggerSlug: t.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`进化触发方式: ${triggers.length} 行`);
}

/**
 * 性格，25 种。译名数据源自己有中文，不用 overrides
 */
async function seedNatures() {
  const natures = read("natures");
  for (const n of natures) {
    const data = {
      increasedStat: n.increasedStat,
      decreasedStat: n.decreasedStat,
      likesFlavor: n.likesFlavor,
      hatesFlavor: n.hatesFlavor,
    };
    await prisma.nature.upsert({
      where: { slug: n.slug },
      create: { slug: n.slug, ...data },
      update: data,
    });
    for (const { languageCode, value: name } of localized(n.names)) {
      await prisma.natureI18n.upsert({
        where: { natureSlug_languageCode: { natureSlug: n.slug, languageCode } },
        create: { natureSlug: n.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`性格: ${natures.length} 行`);
}

/**
 * 四张只有 slug 和译名的字典表。
 *
 * 数据源一条中文都不给（招式元分类连 names 数组都是空的），译名全在 overrides.json。
 * 四张表结构一样但 Prisma 的模型各是各的类型，没法用一个泛型函数带过，
 * 所以把「读快照 + 叠人工译名」这段抽出来，写库那两行各写各的
 */
function dictionaryRows(
  name: "item-categories" | "move-targets" | "move-ailments" | "move-meta-categories",
  manual: Record<string, { names?: Localized }> | undefined,
) {
  return read(name).map((row) => ({
    slug: row.slug,
    names: { ...row.names, ...manual?.[row.slug]?.names },
  }));
}

async function seedItemCategories(manual: SeedOverrides["itemCategories"]) {
  const rows = dictionaryRows("item-categories", manual);
  for (const r of rows) {
    await prisma.itemCategory.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(r.names)) {
      await prisma.itemCategoryI18n.upsert({
        where: { categorySlug_languageCode: { categorySlug: r.slug, languageCode } },
        create: { categorySlug: r.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`道具分类: ${rows.length} 行`);
}

async function seedMoveDictionaries(manual: SeedOverrides) {
  const targets = dictionaryRows("move-targets", manual.moveTargets);
  for (const r of targets) {
    await prisma.moveTarget.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(r.names)) {
      await prisma.moveTargetI18n.upsert({
        where: { targetSlug_languageCode: { targetSlug: r.slug, languageCode } },
        create: { targetSlug: r.slug, languageCode, name },
        update: { name },
      });
    }
  }

  const ailments = dictionaryRows("move-ailments", manual.moveAilments);
  for (const r of ailments) {
    await prisma.moveAilment.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(r.names)) {
      await prisma.moveAilmentI18n.upsert({
        where: { ailmentSlug_languageCode: { ailmentSlug: r.slug, languageCode } },
        create: { ailmentSlug: r.slug, languageCode, name },
        update: { name },
      });
    }
  }

  const categories = dictionaryRows("move-meta-categories", manual.moveMetaCategories);
  for (const r of categories) {
    await prisma.moveMetaCategory.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(r.names)) {
      await prisma.moveMetaCategoryI18n.upsert({
        where: { metaCategorySlug_languageCode: { metaCategorySlug: r.slug, languageCode } },
        create: { metaCategorySlug: r.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(
    `招式字典: 目标 ${targets.length}、异常状态 ${ailments.length}、元分类 ${categories.length} 行`,
  );
}

/** 图鉴。要先建它才能写 pokedex_group，所以排在版本组之前。
 *  地区编号跳过 —— 那是 PokedexNumber，得先有 pokemon 表数据 */
async function seedPokedexes(regionIds: Map<string, number>, manual: SeedOverrides["pokedexes"]) {
  const pokedexes = read("pokedexes");
  const bySlug = manual ?? {};

  const ids = new Map<string, number>();
  for (const p of pokedexes) {
    const data = {
      slug: p.slug,
      isMainSeries: p.isMainSeries,
      regionId: p.regionSlug ? (regionIds.get(p.regionSlug) ?? null) : null,
    };
    const pokedex = await prisma.pokedex.upsert({
      where: { slug: p.slug },
      create: data,
      update: data,
    });
    ids.set(p.slug, pokedex.id);

    // 数据源这两项只有 en / fr / es / de，中日韩全无 —— 图鉴名不是游戏 ROM 里的
    // 文本，是 PokeAPI 给自己那些记录起的名字，靠志愿者填。人工译名叠在上面
    const names = { ...p.names, ...bySlug[p.slug]?.names };
    const descriptions = { ...p.descriptions, ...bySlug[p.slug]?.descriptions };

    for (const { languageCode, value: name } of localized(names)) {
      await prisma.pokedexI18n.upsert({
        where: { pokedexId_languageCode: { pokedexId: pokedex.id, languageCode } },
        create: { pokedexId: pokedex.id, languageCode, name },
        update: { name },
      });
    }

    for (const { languageCode, value: description } of localized(descriptions)) {
      await prisma.pokedexDescriptionI18n.upsert({
        where: { pokedexId_languageCode: { pokedexId: pokedex.id, languageCode } },
        create: { pokedexId: pokedex.id, languageCode, description },
        update: { description },
      });
    }
  }

  const unknown = Object.keys(bySlug).filter((slug) => !ids.has(slug));
  if (unknown.length) {
    // overrides 里写了快照里没有的 slug，多半是数据源改名或手抖拼错，
    // 静静跳过的话那条译名永远不生效也没人知道
    console.warn(`⚠ overrides.json 里有快照没有的图鉴: ${unknown.join(", ")}`);
  }
  console.log(`图鉴: ${pokedexes.length} 行`);
  return ids;
}

/** 版本组。译名 PokeAPI 一条都不给（那边只有 version 有 names），全靠 overrides.json */
async function seedGroups(
  regionIds: Map<string, number>,
  pokedexIds: Map<string, number>,
  manual: SeedOverrides["groups"],
) {
  const groups = read("groups");

  const ids = new Map<string, number>();
  for (const vg of groups) {
    const data = { slug: vg.slug, order: vg.order, generationId: vg.generationId };
    const group = await prisma.group.upsert({
      where: { slug: vg.slug },
      create: data,
      update: data,
    });
    ids.set(vg.slug, group.id);
    const groupId = group.id;

    for (const { languageCode, value: name } of localized(manual?.[vg.slug]?.names ?? {})) {
      await prisma.groupI18n.upsert({
        where: { groupId_languageCode: { groupId, languageCode } },
        create: { groupId, languageCode, name },
        update: { name },
      });
    }

    for (const slug of vg.regionSlugs) {
      const regionId = regionIds.get(slug);
      if (regionId === undefined) continue;
      await prisma.regionGroup.upsert({
        where: { regionId_groupId: { regionId, groupId } },
        create: { regionId, groupId },
        update: {},
      });
    }
    for (const slug of vg.pokedexSlugs) {
      const pokedexId = pokedexIds.get(slug);
      if (pokedexId === undefined) continue;
      await prisma.pokedexGroup.upsert({
        where: { pokedexId_groupId: { pokedexId, groupId } },
        create: { pokedexId, groupId },
        update: {},
      });
    }
    for (const methodSlug of vg.moveLearnMethodSlugs) {
      await prisma.groupMoveLearnMethod.upsert({
        where: { groupId_methodSlug: { groupId, methodSlug } },
        create: { groupId, methodSlug },
        update: {},
      });
    }
  }

  const unknown = Object.keys(manual ?? {}).filter((slug) => !ids.has(slug));
  if (unknown.length) {
    console.warn(`⚠ overrides.json 里有快照没有的版本组: ${unknown.join(", ")}`);
  }
  console.log(`版本组: ${groups.length} 行`);
  return ids;
}

async function seedVersions(groupIds: Map<string, number>, manual: SeedOverrides["versions"]) {
  const versions = read("versions");

  const ids = new Map<string, number>();
  for (const v of versions) {
    const groupId = groupIds.get(v.groupSlug);
    if (groupId === undefined) continue;

    const data = { slug: v.slug, groupId };
    const version = await prisma.version.upsert({
      where: { slug: v.slug },
      create: data,
      update: data,
    });
    ids.set(v.slug, version.id);

    for (const { languageCode, value: name } of localized({
      ...v.names,
      ...manual?.[v.slug]?.names,
    })) {
      await prisma.versionI18n.upsert({
        where: { versionId_languageCode: { versionId: version.id, languageCode } },
        create: { versionId: version.id, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`版本: ${versions.length} 行`);
  return ids;
}

/**
 * 道具，两千两百多件。
 *
 * 两套说明分开存：ItemEffectI18n 是机制说明（数据源的 effect_entries，
 * 志愿者手写、只有英法），ItemFlavorI18n 是游戏里显示的那句话
 * （从各语言版本 ROM 提取，10 种语言齐全）。两张表各自整表重建。
 */
async function seedItems(groupIds: Map<string, number>) {
  const items = read("items");
  const wiki = wikiEffects("wiki-items");

  const effects: (EffectRow & { itemId: number })[] = [];
  const flavors: { itemId: number; groupId: number; languageCode: LanguageCode; text: string }[] =
    [];

  for (const item of items) {
    const saved = await prisma.item.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, imageName: item.imageName, categorySlug: item.categorySlug },
      update: { imageName: item.imageName, categorySlug: item.categorySlug },
    });
    // 邮件、超级石那批数据源一直没中文名，用百科列表页的补
    for (const { languageCode, value: name } of localized({
      ...wiki.get(item.slug)?.names,
      ...item.names,
    })) {
      await prisma.itemI18n.upsert({
        where: { itemId_languageCode: { itemId: saved.id, languageCode } },
        create: { itemId: saved.id, languageCode, name },
        update: { name },
      });
    }

    // 道具快照没有登场世代。数据源一条机制说明都没给的（一千多件）
    // 从第一代铺开 —— 宁可多几行，也别把百科抓到的中文丢掉
    for (const row of effectRows(item.effects, wiki.get(item.slug)?.effect, 1)) {
      effects.push({ itemId: saved.id, ...row });
    }
    for (const row of flavorRows(item.flavors, wiki.get(item.slug)?.flavors, groupIds)) {
      flavors.push({ itemId: saved.id, ...row });
    }
  }

  await prisma.itemEffectI18n.deleteMany({});
  await insertInBatches(effects, (data) => prisma.itemEffectI18n.createMany({ data }));
  await prisma.itemFlavorI18n.deleteMany({});
  await insertInBatches(flavors, (data) => prisma.itemFlavorI18n.createMany({ data }));
  console.log(
    `道具: ${items.length} 行，机制说明 ${effects.length} 行，游戏文案 ${flavors.length} 行`,
  );
  return new Map(
    await prisma.item
      .findMany({ select: { id: true, slug: true } })
      .then((rows) => rows.map((r) => [r.slug, r.id] as const)),
  );
}

/** 特性，374 个。中文机制说明来自神奇宝贝百科 —— PokeAPI 那边只有英法德 */
async function seedAbilities(groupIds: Map<string, number>) {
  const abilities = read("abilities");
  const wiki = wikiEffects("wiki-abilities");

  const effects: (EffectRow & { abilityId: number })[] = [];
  const flavors: {
    abilityId: number;
    groupId: number;
    languageCode: LanguageCode;
    text: string;
  }[] = [];

  const ids = new Map<string, number>();
  for (const a of abilities) {
    const saved = await prisma.ability.upsert({
      where: { slug: a.slug },
      create: { slug: a.slug },
      update: {},
    });
    ids.set(a.slug, saved.id);

    // 数据源没给中文名的（传说 Z-A 那几个新特性）用百科的补
    for (const { languageCode, value: name } of localized({
      ...wiki.get(a.slug)?.names,
      ...a.names,
    })) {
      await prisma.abilityI18n.upsert({
        where: { abilityId_languageCode: { abilityId: saved.id, languageCode } },
        create: { abilityId: saved.id, languageCode, name },
        update: { name },
      });
    }

    const zh = wiki.get(a.slug);
    for (const row of effectRows(a.effects, zh?.effect, a.introducedInGenerationId))
      effects.push({ abilityId: saved.id, ...row });
    for (const row of flavorRows(a.flavors, zh?.flavors, groupIds)) {
      flavors.push({ abilityId: saved.id, ...row });
    }
  }

  // 快照里没有的清掉：数据源那 60 个外传专用特性曾经进过库，
  // upsert 不会把它们删掉。FormAbility 没有引用它们，删得动
  const stale = await prisma.ability.deleteMany({ where: { slug: { notIn: [...ids.keys()] } } });
  if (stale.count) console.log(`  清掉 ${stale.count} 个不在快照里的特性`);

  await prisma.abilityEffectI18n.deleteMany({});
  await insertInBatches(effects, (data) => prisma.abilityEffectI18n.createMany({ data }));
  await prisma.abilityFlavorI18n.deleteMany({});
  await insertInBatches(flavors, (data) => prisma.abilityFlavorI18n.createMany({ data }));
  console.log(
    `特性: ${abilities.length} 行，机制说明 ${effects.length} 行，游戏文案 ${flavors.length} 行`,
  );
  return ids;
}

/** 招式，937 个。数值每代一行 —— 喷射火焰 Gen1~5 威力 95、Gen6 起 90 */
async function seedMoves(typeIds: Map<string, number>, groupIds: Map<string, number>) {
  const moves = read("moves");
  const wiki = wikiEffects("wiki-moves");

  const generations: {
    moveId: number;
    generationId: number;
    typeId: number;
    damageClass: "PHYSICAL" | "SPECIAL" | "STATUS";
    power: number | null;
    accuracy: number | null;
    pp: number | null;
  }[] = [];
  const effects: (EffectRow & { moveId: number })[] = [];
  const flavors: { moveId: number; groupId: number; languageCode: LanguageCode; text: string }[] =
    [];

  const ids = new Map<string, number>();
  for (const m of moves) {
    // 标记位来自百科，数据源没有；meta 那一坨数据源不分世代，直接挂在招式上
    const flags = wiki.get(m.slug)?.flags ?? {};
    const data = {
      priority: m.priority,
      targetSlug: m.meta.targetSlug,
      ailmentSlug: m.meta.ailmentSlug,
      metaCategorySlug: m.meta.metaCategorySlug,
      minHits: m.meta.minHits,
      maxHits: m.meta.maxHits,
      minTurns: m.meta.minTurns,
      maxTurns: m.meta.maxTurns,
      drain: m.meta.drain,
      healing: m.meta.healing,
      critRate: m.meta.critRate,
      ailmentChance: m.meta.ailmentChance,
      flinchChance: m.meta.flinchChance,
      statChance: m.meta.statChance,
      makesContact: flags.makesContact ?? null,
      blockedByProtect: flags.blockedByProtect ?? null,
      reflectedByMagicCoat: flags.reflectedByMagicCoat ?? null,
      stolenBySnatch: flags.stolenBySnatch ?? null,
      copiedByMirrorMove: flags.copiedByMirrorMove ?? null,
      triggersKingsRock: flags.triggersKingsRock ?? null,
    };
    const saved = await prisma.move.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, ...data },
      update: data,
    });
    ids.set(m.slug, saved.id);

    for (const { languageCode, value: name } of localized(m.names)) {
      await prisma.moveI18n.upsert({
        where: { moveId_languageCode: { moveId: saved.id, languageCode } },
        create: { moveId: saved.id, languageCode, name },
        update: { name },
      });
    }

    for (const [generation, values] of Object.entries(m.generations)) {
      const typeId = typeIds.get(values.typeSlug);
      // 太晶爆发那种非标准属性不在库里，整行跳过而不是写半行进去
      if (typeId === undefined) continue;
      generations.push({
        moveId: saved.id,
        generationId: Number(generation),
        typeId,
        damageClass: values.damageClass,
        power: values.power,
        accuracy: values.accuracy,
        pp: values.pp,
      });
    }

    const zh = wiki.get(m.slug);
    for (const row of effectRows(m.effects, zh?.effect, m.introducedInGenerationId)) {
      effects.push({ moveId: saved.id, ...row });
    }
    for (const row of flavorRows(m.flavors, zh?.flavors, groupIds)) {
      flavors.push({ moveId: saved.id, ...row });
    }
  }

  // Ｚ招式和极巨招式已经拆去各自的表，库里旧的那七十多条得清掉。
  // 它们没有 MoveLearn 行也不会被进化条件引用，删得动
  const stale = await prisma.move.deleteMany({ where: { slug: { notIn: [...ids.keys()] } } });
  if (stale.count) console.log(`  清掉 ${stale.count} 条已拆走的招式`);

  await prisma.moveGeneration.deleteMany({});
  await insertInBatches(generations, (data) => prisma.moveGeneration.createMany({ data }));
  await prisma.moveEffectI18n.deleteMany({});
  await insertInBatches(effects, (data) => prisma.moveEffectI18n.createMany({ data }));
  await prisma.moveFlavorI18n.deleteMany({});
  await insertInBatches(flavors, (data) => prisma.moveFlavorI18n.createMany({ data }));
  console.log(
    `招式: ${moves.length} 行，世代数值 ${generations.length} 行，` +
      `机制说明 ${effects.length} 行，游戏文案 ${flavors.length} 行`,
  );
  return ids;
}

/**
 * 全部物种和它们的 1351 个形态。
 *
 * 跟字典表不一样，这里用批量写而不是逐行 upsert —— 一千多只摊开是几万行，
 * 加上八万条图鉴说明，逐行来是十几万次数据库往返。
 *
 * 物种、译名、图鉴编号用 createMany + skipDuplicates：主键都是数据源给的
 * 固定值，重复跑不会变。形态得逐只 upsert 拿自增 id，之后子表按 formId
 * 整批删了重插。
 *
 * 图鉴说明挂在物种上（数据源那边就是这么给的），所以同一物种的每个形态
 * 都写一份 —— 阿罗拉六尾在游戏里的说明跟关都六尾不同，这层差异数据源补不了。
 */
async function seedPokemon(
  dict: {
    pokedexes: Map<string, number>;
    types: Map<string, number>;
    colors: Map<string, number>;
    versions: Map<string, number>;
    abilities: Map<string, number>;
  },
  manual: SeedOverrides["forms"],
) {
  const rows = read("pokemon");
  const descriptions = new Map(read("pokemon-descriptions").map((d) => [d.slug, d.descriptions]));
  const chinese = wikiDescriptions();

  // 传说标记会变（数据源修订过分类），所以不能只靠 skipDuplicates 建一次就不管
  await prisma.pokemon.createMany({
    data: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      isBaby: p.isBaby,
      isLegendary: p.isLegendary,
      isMythical: p.isMythical,
    })),
    skipDuplicates: true,
  });
  // 先清零再按标记批量置位，四条 SQL —— 逐行 update 要打一千多次库。
  // 清零这一步不能省：数据源修订过分类，之前标成传说的可能已经不是了
  await prisma.pokemon.updateMany({
    data: { isBaby: false, isLegendary: false, isMythical: false },
  });
  for (const [flag, ids] of [
    ["isBaby", rows.filter((p) => p.isBaby).map((p) => p.id)],
    ["isLegendary", rows.filter((p) => p.isLegendary).map((p) => p.id)],
    ["isMythical", rows.filter((p) => p.isMythical).map((p) => p.id)],
  ] as const) {
    if (ids.length) {
      await prisma.pokemon.updateMany({ where: { id: { in: ids } }, data: { [flag]: true } });
    }
  }
  // 整表重建而不是 createMany + skipDuplicates：分类要拿百科的补上，
  // 跳过重复的话库里那些空分类永远也更新不到
  let genusFromWiki = 0;
  await prisma.pokemonI18n.deleteMany({});
  await prisma.pokemonI18n.createMany({
    data: rows.flatMap((p) =>
      p.names.map((n) => {
        const code = n.languageCode as LanguageCode;
        // 数据源第九世代那批物种的中文分类是空的
        const fromWiki = n.genus ? null : chinese.get(p.slug)?.genus?.[code];
        if (fromWiki) genusFromWiki++;
        return {
          pokemonId: p.id,
          languageCode: code,
          name: n.name,
          genus: n.genus || fromWiki || null,
        };
      }),
    ),
  });
  await prisma.pokedexNumber.createMany({
    data: rows.flatMap((p) =>
      p.dexNumbers.flatMap((d) => {
        // 数据源偶尔引用没进字典表的图鉴，跳过而不是让整批炸掉
        const pokedexId = dict.pokedexes.get(d.pokedexSlug);
        return pokedexId === undefined ? [] : [{ pokemonId: p.id, pokedexId, number: d.number }];
      }),
    ),
    skipDuplicates: true,
  });

  /** 形态 slug → 自增 id。进化关系和招式学习表都靠它 */
  const formIds = new Map<string, number>();
  for (const p of rows) {
    for (const f of p.forms) {
      const data = {
        pokemonId: p.id,
        isDefault: f.isDefault,
        fullImage: f.fullImage,
        detailImage: f.detailImage,
      };
      const form = await prisma.form.upsert({
        where: { slug: f.slug },
        create: { slug: f.slug, ...data },
        update: data,
      });
      formIds.set(f.slug, form.id);
    }
  }

  /** 摊平成 (形态 id, 形态快照) 对，下面几张子表都按它展开 */
  const forms = rows.flatMap((p) =>
    p.forms.map((f) => ({ id: formIds.get(f.slug)!, species: p.slug, form: f })),
  );
  const ids = [...formIds.values()];

  await prisma.formI18n.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formI18n.createMany({
    data: forms.flatMap(({ id, form }) => {
      // 形态名只有非默认形态有（「阿罗拉的样子」）；数据源缺中文，靠 overrides 补
      const names: Localized = { ...manual?.[form.slug]?.names };
      for (const n of form.names) names[n.languageCode as LanguageCode] ??= n.name;
      return localized(names).map(({ languageCode, value: name }) => ({
        formId: id,
        languageCode,
        name,
      }));
    }),
  });

  await prisma.formType.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formType.createMany({
    data: forms.flatMap(({ id, form }) =>
      form.types.flatMap((t) => {
        const primaryTypeId = dict.types.get(t.primarySlug);
        if (primaryTypeId === undefined) return [];
        return [
          {
            formId: id,
            generationId: t.generationId,
            primaryTypeId,
            secondaryTypeId: t.secondarySlug ? (dict.types.get(t.secondarySlug) ?? null) : null,
          },
        ];
      }),
    ),
  });

  await prisma.formColor.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formColor.createMany({
    data: forms.flatMap(({ id, form }) =>
      form.colors.flatMap((c) => {
        const colorId = dict.colors.get(c.colorSlug);
        return colorId === undefined ? [] : [{ formId: id, generationId: c.generationId, colorId }];
      }),
    ),
  });

  await prisma.formStat.deleteMany({ where: { formId: { in: ids } } });
  const statRows = forms.flatMap(({ id, form }) => form.stats.map((st) => ({ formId: id, ...st })));
  await insertInBatches(statRows, (data) => prisma.formStat.createMany({ data }));

  await prisma.formAbility.deleteMany({ where: { formId: { in: ids } } });
  const abilityRows = forms.flatMap(({ id, form }) =>
    form.abilities.flatMap((a) => {
      const abilityId = dict.abilities.get(a.abilitySlug);
      return abilityId === undefined
        ? []
        : [{ formId: id, generationId: a.generationId, abilityId, slot: a.slot }];
    }),
  );
  await insertInBatches(abilityRows, (data) => prisma.formAbility.createMany({ data }));

  // 图鉴说明两个数据源合并后一次写入。同一 (版本, 语言) 以百科为准 ——
  // PokeAPI 的中文只有 8 个版本组、722 只，朱紫那 127 只一条都没有。
  //
  // 不分两趟写：先插 PokeAPI 再删了重插百科的话，那个 deleteMany 得按
  // (形态, 版本, 语言) 三元组匹配几万行，一批五千个 OR 条件能跑几分钟
  await prisma.formDescriptionI18n.deleteMany({ where: { formId: { in: ids } } });
  let chineseRows = 0;
  const descriptionRows = forms.flatMap(({ id, species }) => {
    const merged = new Map<string, { versionSlug: string; languageCode: string; text: string }>();
    for (const d of descriptions.get(species) ?? []) {
      merged.set(`${d.versionSlug} ${d.languageCode}`, d);
    }
    for (const d of chinese.get(species)?.descriptions ?? []) {
      merged.set(`${d.versionSlug} ${d.languageCode}`, d);
      chineseRows++;
    }

    return [...merged.values()].flatMap((d) => {
      const versionId = dict.versions.get(d.versionSlug);
      return versionId === undefined
        ? []
        : [{ formId: id, versionId, languageCode: d.languageCode as LanguageCode, text: d.text }];
    });
  });
  await insertInBatches(descriptionRows, (data) =>
    prisma.formDescriptionI18n.createMany({ data, skipDuplicates: true }),
  );

  console.log(
    `宝可梦: ${rows.length} 只 / ${forms.length} 个形态，种族值 ${statRows.length} 行，` +
      `特性 ${abilityRows.length} 行，图鉴说明 ${descriptionRows.length} 行` +
      `（其中来自百科的中文 ${chineseRows} 行），分类补了 ${genusFromWiki} 行`,
  );
  return formIds;
}

/**
 * 百科的中文图鉴说明，按物种 slug 建索引。
 *
 * PokeAPI 的中文只覆盖 722 只、8 个版本组，朱紫那 127 只一条都没有；
 * 百科从红绿版到朱紫全有。文件读不到就当没有中文，不让 seed 挂掉
 */
function wikiDescriptions(): Map<string, WikiPokemonDescriptionSnapshot> {
  try {
    const snapshot = readWiki("wiki-pokemon-descriptions");
    if (snapshot.unmatched.length) {
      console.warn(
        `⚠ wiki-pokemon-descriptions: ${snapshot.unmatched.length} 只没抓到中文图鉴说明`,
      );
    }
    return new Map(snapshot.rows.map((r) => [r.slug, r]));
  } catch {
    console.warn("⚠ 读不到 wiki-pokemon-descriptions.json，中文图鉴说明会缺");
    return new Map();
  }
}

/**
 * 招式学习表，一百万行。
 *
 * 快照是 gzip 的，解开就是一百万条五元组。整表重建 —— 它没有下游引用，
 * 而按 formId 逐批删再插会把删除也做一百万次。
 *
 * 流式处理：一边展开一边攒够 BATCH 就插，不把一百万个对象同时留在内存里
 */
async function seedMoveLearns(dict: {
  forms: Map<string, number>;
  moves: Map<string, number>;
  groups: Map<string, number>;
  methods: Set<string>;
}) {
  const snapshot = readGzip("move-learns");

  await prisma.moveLearn.deleteMany({});

  type Row = {
    formId: number;
    moveId: number;
    groupId: number;
    methodSlug: string;
    level: number;
    machineNumber: string | null;
  };
  let batch: Row[] = [];
  let total = 0;
  const flush = async () => {
    if (!batch.length) return;
    // skipDuplicates：同一 (形态, 招式, 版本组, 学法, 等级) 数据源偶尔给两条，
    // 唯一键会挡下来，不该让整批炸掉
    await prisma.moveLearn.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
    batch = [];
  };

  for (const entry of snapshot) {
    const formId = dict.forms.get(entry.formSlug);
    if (formId === undefined) continue;
    for (const [moveSlug, groupSlug, methodSlug, level, machineNumber] of entry.learns) {
      const moveId = dict.moves.get(moveSlug);
      const groupId = dict.groups.get(groupSlug);
      if (moveId === undefined || groupId === undefined || !dict.methods.has(methodSlug)) continue;
      batch.push({ formId, moveId, groupId, methodSlug, level, machineNumber });
      if (batch.length >= BATCH) await flush();
    }
  }
  await flush();
  console.log(`招式学习: ${total} 行`);
}

/**
 * 进化关系，以及从它们算出来的进化链。
 *
 * 链不是数据源给的 —— 把首尾相接的进化关系并成连通分量，一个分量一条链，
 * 再回填 Form.evolutionChainId。用并查集而不是图遍历：只需要知道「谁和谁同一组」，
 * 不需要知道谁在谁前面，那个信息在 Evolution 行上本来就有。
 */
async function seedEvolutions(dict: {
  forms: Map<string, number>;
  groups: Map<string, number>;
  items: Map<string, number>;
  moves: Map<string, number>;
  types: Map<string, number>;
  regions: Map<string, number>;
  triggers: Set<string>;
}) {
  const rows = read("evolutions");

  const skipped = new Set<string>();
  const data = rows.flatMap((e) => {
    const fromFormId = dict.forms.get(e.fromFormSlug);
    const toFormId = dict.forms.get(e.toFormSlug);
    const groupId = dict.groups.get(e.groupSlug);
    if (fromFormId === undefined || toFormId === undefined || groupId === undefined) {
      skipped.add(`${e.fromFormSlug}→${e.toFormSlug}`);
      return [];
    }
    if (!dict.triggers.has(e.triggerSlug)) {
      skipped.add(e.triggerSlug);
      return [];
    }
    return [
      {
        fromFormId,
        toFormId,
        groupId,
        triggerSlug: e.triggerSlug,
        minLevel: e.minLevel,
        minHappiness: e.minHappiness,
        minAffection: e.minAffection,
        minBeauty: e.minBeauty,
        minSteps: e.minSteps,
        minMoveCount: e.minMoveCount,
        minDamageTaken: e.minDamageTaken,
        // 条件引用的道具/招式/属性不在库里就当没这个条件 —— 丢掉整行的话
        // 「用水之石进化」会直接消失，留着行至少还有触发方式和其余条件
        itemId: e.itemSlug ? (dict.items.get(e.itemSlug) ?? null) : null,
        heldItemId: e.heldItemSlug ? (dict.items.get(e.heldItemSlug) ?? null) : null,
        knownMoveId: e.knownMoveSlug ? (dict.moves.get(e.knownMoveSlug) ?? null) : null,
        knownMoveTypeId: e.knownMoveTypeSlug ? (dict.types.get(e.knownMoveTypeSlug) ?? null) : null,
        usedMoveId: e.usedMoveSlug ? (dict.moves.get(e.usedMoveSlug) ?? null) : null,
        partyFormId: e.partyFormSlug ? (dict.forms.get(e.partyFormSlug) ?? null) : null,
        partyTypeId: e.partyTypeSlug ? (dict.types.get(e.partyTypeSlug) ?? null) : null,
        tradeFormId: e.tradeFormSlug ? (dict.forms.get(e.tradeFormSlug) ?? null) : null,
        regionId: e.regionSlug ? (dict.regions.get(e.regionSlug) ?? null) : null,
        locationName: e.locationName,
        timeOfDay: e.timeOfDay,
        gender: e.gender,
        needsRain: e.needsRain,
        needsMultiplayer: e.needsMultiplayer,
        nearSpecialRock: e.nearSpecialRock,
        turnUpsideDown: e.turnUpsideDown,
        attackVsDefense: e.attackVsDefense,
      },
    ];
  });

  // 整表重建。链是从这些行算出来的，所以链也一起重建
  await prisma.form.updateMany({ data: { evolutionChainId: null } });
  await prisma.evolutionChain.deleteMany({});
  await prisma.evolution.deleteMany({});
  await insertInBatches(data, (batch) => prisma.evolution.createMany({ data: batch }));

  // 并查集：把首尾相接的进化关系并成一组
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let root = x;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!;
    // 路径压缩，一千多个形态其实不压也行，但写出来才不用担心退化成链
    let cur = x;
    while (parent.get(cur) !== undefined && parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    parent.set(a, parent.get(a) ?? a);
    parent.set(b, parent.get(b) ?? b);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  for (const e of data) union(e.fromFormId, e.toFormId);

  const members = new Map<number, number[]>();
  for (const formId of parent.keys()) {
    const root = find(formId);
    const list = members.get(root);
    if (list) list.push(formId);
    else members.set(root, [formId]);
  }

  for (const formIds of members.values()) {
    const chain = await prisma.evolutionChain.create({ data: {} });
    await prisma.form.updateMany({
      where: { id: { in: formIds } },
      data: { evolutionChainId: chain.id },
    });
  }

  if (skipped.size) {
    console.warn(`⚠ ${skipped.size} 条进化关系两端或版本组不在库里，已跳过`);
  }
  console.log(`进化: ${data.length} 行，进化链 ${members.size} 条`);
}

/**
 * Ｚ招式，第七世代独有。
 *
 * 数值和说明来自数据源，转化关系（谁 + 什么原招式 → 什么Ｚ招式）来自百科 ——
 * 数据源那边Ｚ招式就是普通招式，看不出谁由谁变来
 */
async function seedZMoves(dict: {
  types: Map<string, number>;
  forms: Map<string, number>;
  moves: Map<string, number>;
  items: Map<string, number>;
  groups: Map<string, number>;
}) {
  const rows = read("z-moves");
  const wiki = new Map(
    (() => {
      try {
        const snapshot = readWiki("wiki-z-moves");
        if (snapshot.unmatched.length) {
          console.warn(`⚠ wiki-z-moves: ${snapshot.unmatched.length} 条没对上数据源的 slug`);
        }
        return snapshot.rows.map((r) => [r.slug, r] as const);
      } catch {
        console.warn("⚠ 读不到 wiki-z-moves.json，Ｚ招式的转化关系会缺");
        return [];
      }
    })(),
  );

  const effects: {
    zMoveId: number;
    languageCode: LanguageCode;
    effect: string;
    shortEffect: string | null;
  }[] = [];
  const flavors: { zMoveId: number; groupId: number; languageCode: LanguageCode; text: string }[] =
    [];

  let linked = 0;
  for (const z of rows) {
    const typeId = dict.types.get(z.typeSlug);
    if (typeId === undefined) continue;

    const link = wiki.get(z.slug);
    const data = {
      typeId,
      damageClass: z.damageClass,
      power: z.power,
      pp: z.pp,
      formId: link?.formSlug ? (dict.forms.get(link.formSlug) ?? null) : null,
      baseMoveId: link?.baseMoveSlug ? (dict.moves.get(link.baseMoveSlug) ?? null) : null,
      itemId: link?.itemSlug ? (dict.items.get(link.itemSlug) ?? null) : null,
    };
    if (data.formId && data.baseMoveId) linked++;

    const saved = await prisma.zMove.upsert({
      where: { slug: z.slug },
      create: { slug: z.slug, ...data },
      update: data,
    });

    for (const { languageCode, value: name } of localized({ ...z.names, ...link?.names })) {
      await prisma.zMoveI18n.upsert({
        where: { zMoveId_languageCode: { zMoveId: saved.id, languageCode } },
        create: { zMoveId: saved.id, languageCode, name },
        update: { name },
      });
    }
    for (const [code, text] of Object.entries(z.effects)) {
      effects.push({
        zMoveId: saved.id,
        languageCode: code as LanguageCode,
        shortEffect: text.short,
        effect: text.effect,
      });
    }
    for (const row of flavorRows(z.flavors, undefined, dict.groups)) {
      flavors.push({ zMoveId: saved.id, ...row });
    }
  }

  await prisma.zMoveEffectI18n.deleteMany({});
  await insertInBatches(effects, (data) => prisma.zMoveEffectI18n.createMany({ data }));
  await prisma.zMoveFlavorI18n.deleteMany({});
  await insertInBatches(flavors, (data) => prisma.zMoveFlavorI18n.createMany({ data }));
  console.log(`Ｚ招式: ${rows.length} 条，转化关系认全的 ${linked} 条，说明 ${effects.length} 行`);
}

/**
 * 极巨招式，第八世代独有。
 *
 * 泛用的十九条来自数据源，超极巨那二十多条数据源一条都没收，全部来自百科
 */
async function seedMaxMoves(dict: {
  types: Map<string, number>;
  forms: Map<string, number>;
  groups: Map<string, number>;
}) {
  const rows = read("max-moves");
  let gmax: {
    slug: string;
    names: Localized;
    typeSlug: string;
    formSlug: string | null;
    effect: Localized;
  }[] = [];
  try {
    const snapshot = readWiki("wiki-max-moves");
    if (snapshot.unmatched.length) {
      console.warn(`⚠ wiki-max-moves: ${snapshot.unmatched.length} 条没抓下来`);
    }
    gmax = snapshot.rows;
  } catch {
    console.warn("⚠ 读不到 wiki-max-moves.json，超极巨招式会缺");
  }

  const effects: {
    maxMoveId: number;
    languageCode: LanguageCode;
    effect: string;
    shortEffect: string | null;
  }[] = [];
  const flavors: {
    maxMoveId: number;
    groupId: number;
    languageCode: LanguageCode;
    text: string;
  }[] = [];

  for (const m of rows) {
    const typeId = dict.types.get(m.typeSlug);
    if (typeId === undefined) continue;
    const data = { typeId, power: m.power, pp: m.pp, formId: null };
    const saved = await prisma.maxMove.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug, ...data },
      update: data,
    });
    for (const { languageCode, value: name } of localized(m.names)) {
      await prisma.maxMoveI18n.upsert({
        where: { maxMoveId_languageCode: { maxMoveId: saved.id, languageCode } },
        create: { maxMoveId: saved.id, languageCode, name },
        update: { name },
      });
    }
    for (const [code, text] of Object.entries(m.effects)) {
      effects.push({
        maxMoveId: saved.id,
        languageCode: code as LanguageCode,
        shortEffect: text.short,
        effect: text.effect,
      });
    }
    for (const row of flavorRows(m.flavors, undefined, dict.groups)) {
      flavors.push({ maxMoveId: saved.id, ...row });
    }
  }

  // 超极巨招式：百科只给招式名、属性、所属形态和一句附加效果
  for (const g of gmax) {
    const typeId = dict.types.get(g.typeSlug);
    if (typeId === undefined) continue;
    const data = {
      typeId,
      power: null,
      pp: null,
      formId: g.formSlug ? (dict.forms.get(g.formSlug) ?? null) : null,
    };
    const saved = await prisma.maxMove.upsert({
      where: { slug: g.slug },
      create: { slug: g.slug, ...data },
      update: data,
    });
    for (const { languageCode, value: name } of localized(g.names)) {
      await prisma.maxMoveI18n.upsert({
        where: { maxMoveId_languageCode: { maxMoveId: saved.id, languageCode } },
        create: { maxMoveId: saved.id, languageCode, name },
        update: { name },
      });
    }
    for (const { languageCode, value: effect } of localized(g.effect)) {
      effects.push({ maxMoveId: saved.id, languageCode, shortEffect: null, effect });
    }
  }

  await prisma.maxMoveEffectI18n.deleteMany({});
  await insertInBatches(effects, (data) => prisma.maxMoveEffectI18n.createMany({ data }));
  await prisma.maxMoveFlavorI18n.deleteMany({});
  await insertInBatches(flavors, (data) => prisma.maxMoveFlavorI18n.createMany({ data }));
  console.log(
    `极巨招式: 泛用 ${rows.length} 条 + 超极巨 ${gmax.length} 条，` +
      `认出形态的 ${gmax.filter((g) => g.formSlug).length} 条，说明 ${effects.length} 行`,
  );
}

// ── 入口 ──────────────────────────────────────────────────────

async function main() {
  // 顺序按外键依赖。图鉴排在版本组之前（pokedex_group 要两边都在），
  // 道具和特性排在版本组之后（说明按版本组存），招式排在属性之后（每代一行带属性）
  const manual = overrides();

  await seedLanguages();
  const regionIds = await seedRegions(manual.regions);
  const generationCount = await seedGenerations(regionIds);
  const typeIds = await seedTypes(generationCount);
  const colorIds = await seedColors();
  await seedMoveLearnMethods(manual.moveLearnMethods);
  await seedEvolutionTriggers(manual.evolutionTriggers);
  await seedNatures();
  await seedItemCategories(manual.itemCategories);
  await seedMoveDictionaries(manual);
  const pokedexIds = await seedPokedexes(regionIds, manual.pokedexes);
  const groupIds = await seedGroups(regionIds, pokedexIds, manual.groups);
  const versionIds = await seedVersions(groupIds, manual.versions);
  const itemIds = await seedItems(groupIds);
  const abilityIds = await seedAbilities(groupIds);
  const moveIds = await seedMoves(typeIds, groupIds);

  // 字典表全部就位之后才灌宝可梦 —— 它的属性、颜色、图鉴编号、图鉴说明、特性
  // 分别指向 type / color / pokedex / version / ability
  const formIds = await seedPokemon(
    {
      pokedexes: pokedexIds,
      types: typeIds,
      colors: colorIds,
      versions: versionIds,
      abilities: abilityIds,
    },
    manual.forms,
  );

  const methods = new Set(read("move-learn-methods").map((m) => m.slug));
  await seedMoveLearns({ forms: formIds, moves: moveIds, groups: groupIds, methods });

  // Ｚ招式引用普通招式（原招式）和形态，所以排在两者之后
  await seedZMoves({
    types: typeIds,
    forms: formIds,
    moves: moveIds,
    items: itemIds,
    groups: groupIds,
  });
  await seedMaxMoves({ types: typeIds, forms: formIds, groups: groupIds });

  const triggers = new Set(read("evolution-triggers").map((t) => t.slug));
  await seedEvolutions({
    forms: formIds,
    groups: groupIds,
    items: itemIds,
    moves: moveIds,
    types: typeIds,
    regions: regionIds,
    triggers,
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
