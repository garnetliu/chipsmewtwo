/**
 * 字典表的种子数据。
 *
 * 这些是游戏史实，四千多行，永远不变，所以一次性灌好而不是走 PokeAPISource
 * 那套「查库 miss 才拉」的按需逻辑 —— 压根没有 miss 的概念。
 *
 * 而且它是 PokeAPISource 能工作的前提：写 pokemon_i18n 要 language 表有行、
 * 写属性要 generation 和 type 表有行，字典表空着的话，从 PokeAPI 拉回来的
 * 宝可梦一条也插不进去，全都外键报错。
 *
 * 数据读的是 prisma/seed-data/*.json —— PokeAPI 某一刻的快照，跟代码一起进 git。
 * 这里不联网：建库不该依赖 pokeapi.co 可用，数据源改了什么也该在 diff 里看得见。
 * 要跟进数据源的更新跑 pnpm seed:refresh（scripts/refresh-seed-data.ts）。
 *
 * 跑法：pnpm exec prisma db seed（migrate dev 也会自动执行）
 *
 * 可以重复跑：实体和译名走 upsert；相克表和道具说明整表重建 —— 那两张是纯导入
 * 数据、没有下游引用，而 upsert 会把上一版的行留在库里删不掉。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type LanguageCode, LANGUAGES } from "@/lib/pokeapi/language";
import { prisma } from "@/lib/prisma";
import {
  type DamageTo,
  type Localized,
  SEED_DATA_DIR,
  SEED_OVERRIDES_FILE,
  type SeedData,
  type SeedOverrides,
  type TypeSnapshot,
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

// ── 快照读取 ──────────────────────────────────────────────────

/** 路径相对项目根 —— seed 和刷新脚本都由 pnpm 从根目录启动 */
function read<K extends keyof SeedData>(name: K): SeedData[K] {
  const path = join(SEED_DATA_DIR, `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as SeedData[K];
}

/** 人工译名。跟快照放一起，但由人维护，pnpm seed:refresh 不碰它 */
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

async function seedRegions() {
  const regions = read("regions");

  const ids = new Map<string, number>();
  for (const r of regions) {
    const region = await prisma.region.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug },
      update: {},
    });
    ids.set(r.slug, region.id);

    for (const { languageCode, value: name } of localized(r.names)) {
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

async function seedMoveLearnMethods() {
  const methods = read("move-learn-methods");

  for (const m of methods) {
    await prisma.moveLearnMethod.upsert({
      where: { slug: m.slug },
      create: { slug: m.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(m.names)) {
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
async function seedEvolutionTriggers() {
  const triggers = read("evolution-triggers");

  for (const t of triggers) {
    await prisma.evolutionTrigger.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug },
      update: {},
    });
    for (const { languageCode, value: name } of localized(t.names)) {
      await prisma.evolutionTriggerI18n.upsert({
        where: { triggerSlug_languageCode: { triggerSlug: t.slug, languageCode } },
        create: { triggerSlug: t.slug, languageCode, name },
        update: { name },
      });
    }
  }
  console.log(`进化触发方式: ${triggers.length} 行`);
}

async function seedItems() {
  const items = read("items");

  const rows: {
    itemId: number;
    generationId: number;
    languageCode: LanguageCode;
    effect: string;
  }[] = [];
  for (const item of items) {
    const saved = await prisma.item.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, imageName: item.imageName },
      update: { imageName: item.imageName },
    });
    for (const { languageCode, value: name } of localized(item.names)) {
      await prisma.itemI18n.upsert({
        where: { itemId_languageCode: { itemId: saved.id, languageCode } },
        create: { itemId: saved.id, languageCode, name },
        update: { name },
      });
    }

    // 说明按世代存，每代一份完整值 —— 雷之石的文案 Gen3 是「Makes certain species
    // of POKéMON evolve.」，Gen6 起改成「A peculiar stone that can make...」，
    // 拿最新值糊到老世代上就是错的。
    //
    // shortEffect 一律 null：快照里的文本是游戏原文（flavor text），没有短版。
    // 那一列原来装 effect_entries 的 short_effect，而 effect_entries 是志愿者
    // 手写的机制描述、只有英法文，换成游戏原文之后 10 种语言都有了
    for (const [generation, texts] of Object.entries(item.descriptions)) {
      for (const { languageCode, value: effect } of localized(texts)) {
        rows.push({ itemId: saved.id, generationId: Number(generation), languageCode, effect });
      }
    }
  }

  // 整表重建而不是逐行 upsert：三千多行，而且这张表没有下游引用。
  // upsert 还会把上一版的行留在库里 —— 换数据源那次，老的 effect_entries
  // 全写在 generationId=9，新数据一行都不覆盖到它们
  await prisma.itemEffectI18n.deleteMany({});
  await prisma.itemEffectI18n.createMany({ data: rows });
  console.log(`道具: ${items.length} 行，说明 ${rows.length} 行`);
}

/** 图鉴。要先建它才能写 pokedex_group，所以排在版本组之前。
 *  地区编号跳过 —— 那是 PokedexNumber，得先有 pokemon 表数据 */
async function seedPokedexes(regionIds: Map<string, number>) {
  const pokedexes = read("pokedexes");
  const manual = overrides().pokedexes ?? {};

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
    const names = { ...p.names, ...manual[p.slug]?.names };
    const descriptions = { ...p.descriptions, ...manual[p.slug]?.descriptions };

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

  const unknown = Object.keys(manual).filter((slug) => !ids.has(slug));
  if (unknown.length) {
    // overrides 里写了快照里没有的 slug，多半是数据源改名或手抖拼错，
    // 静静跳过的话那条译名永远不生效也没人知道
    console.warn(`⚠ overrides.json 里有快照没有的图鉴: ${unknown.join(", ")}`);
  }
  console.log(`图鉴: ${pokedexes.length} 行`);
  return ids;
}

async function seedGroups(regionIds: Map<string, number>, pokedexIds: Map<string, number>) {
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

    // 版本组没有译名，PokeAPI 不给，所以只写本体和三张中间表
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
  console.log(`版本组: ${groups.length} 行`);
  return ids;
}

async function seedVersions(groupIds: Map<string, number>) {
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

    for (const { languageCode, value: name } of localized(v.names)) {
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
 * 全部物种和它们的默认形态。
 *
 * 跟字典表不一样，这里用批量写而不是逐行 upsert —— 一千多只摊开是三万多行，
 * 加上十万条图鉴说明，逐行来是十几万次数据库往返。
 *
 * 物种、译名、图鉴编号用 createMany + skipDuplicates：主键都是数据源给的
 * 固定值，重复跑不会变。形态得逐只 upsert 拿自增 id，之后子表按 formId
 * 整批删了重插 —— 只清这批 formId 的行，按需拉进来的地区形态不受影响。
 */
async function seedPokemon(dict: {
  pokedexes: Map<string, number>;
  types: Map<string, number>;
  colors: Map<string, number>;
  versions: Map<string, number>;
}) {
  const rows = read("pokemon");
  const descriptions = new Map(read("pokemon-descriptions").map((d) => [d.slug, d.descriptions]));

  await prisma.pokemon.createMany({
    data: rows.map((p) => ({ id: p.id, slug: p.slug })),
    skipDuplicates: true,
  });
  await prisma.pokemonI18n.createMany({
    data: rows.flatMap((p) =>
      p.names.map((n) => ({
        pokemonId: p.id,
        languageCode: n.languageCode as LanguageCode,
        name: n.name,
        genus: n.genus,
      })),
    ),
    skipDuplicates: true,
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

  const formIds = new Map<number, number>();
  for (const p of rows) {
    const data = {
      pokemonId: p.id,
      isDefault: p.form.isDefault,
      fullImage: p.form.fullImage,
      detailImage: p.form.detailImage,
    };
    const form = await prisma.form.upsert({
      where: { slug: p.form.slug },
      create: { slug: p.form.slug, ...data },
      update: data,
    });
    formIds.set(p.id, form.id);
  }

  const ids = [...formIds.values()];
  await prisma.formType.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formType.createMany({
    data: rows.flatMap((p) =>
      p.form.types.flatMap((t) => {
        const primaryTypeId = dict.types.get(t.primarySlug);
        if (primaryTypeId === undefined) return [];
        return [
          {
            formId: formIds.get(p.id)!,
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
    data: rows.flatMap((p) =>
      p.form.colors.flatMap((c) => {
        const colorId = dict.colors.get(c.colorSlug);
        return colorId === undefined
          ? []
          : [{ formId: formIds.get(p.id)!, generationId: c.generationId, colorId }];
      }),
    ),
  });

  await prisma.formStat.deleteMany({ where: { formId: { in: ids } } });
  await prisma.formStat.createMany({
    data: rows.flatMap((p) => p.form.stats.map((st) => ({ formId: formIds.get(p.id)!, ...st }))),
  });

  await prisma.formDescriptionI18n.deleteMany({ where: { formId: { in: ids } } });
  const descriptionRows = rows.flatMap((p) =>
    (descriptions.get(p.slug) ?? []).flatMap((d) => {
      const versionId = dict.versions.get(d.versionSlug);
      return versionId === undefined
        ? []
        : [
            {
              formId: formIds.get(p.id)!,
              versionId,
              languageCode: d.languageCode as LanguageCode,
              text: d.text,
            },
          ];
    }),
  );
  // 十万行一次性塞过去会超出参数上限，分批
  for (let i = 0; i < descriptionRows.length; i += 5000) {
    await prisma.formDescriptionI18n.createMany({ data: descriptionRows.slice(i, i + 5000) });
  }

  console.log(`宝可梦: ${rows.length} 只，图鉴说明 ${descriptionRows.length} 行`);
}

// ── 入口 ──────────────────────────────────────────────────────

async function main() {
  // 顺序按外键依赖：语言 → 地区 → 世代 → 属性 → 颜色 → 学习方式 →
  // 进化触发方式 → 道具 → 图鉴 → 版本组 → 版本。
  // 图鉴排在版本组之前，因为 pokedex_group 要两边都存在
  await seedLanguages();
  const regionIds = await seedRegions();
  const generationCount = await seedGenerations(regionIds);
  const typeIds = await seedTypes(generationCount);
  const colorIds = await seedColors();
  await seedMoveLearnMethods();
  await seedEvolutionTriggers();
  await seedItems();
  const pokedexIds = await seedPokedexes(regionIds);
  const groupIds = await seedGroups(regionIds, pokedexIds);
  const versionIds = await seedVersions(groupIds);

  // 字典表全部就位之后才灌宝可梦 —— 它的属性、颜色、图鉴编号、图鉴说明
  // 分别指向 type / color / pokedex / version
  await seedPokemon({
    pokedexes: pokedexIds,
    types: typeIds,
    colors: colorIds,
    versions: versionIds,
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
