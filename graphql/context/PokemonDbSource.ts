/**
 * 查库的 DataSource，网站的主线。
 *
 * 每个方法配一个 DataLoader：列表页 20 只宝可梦各自查 name 和 types，
 * 走 DataLoader 是 2 次 `IN (...)` 查询而不是 40 次单查。
 *
 * 必须每个请求新建实例 —— DataLoader 的缓存是按实例存的，跨请求复用
 * 会把上一个请求的数据喂给下一个。实例化在 app/api/graphql/route.ts。
 *
 * 形态相关的方法（types/stats/color/abilities/descriptions）key 都是 formId
 * 而不是 pokemonId：这些值本来就是形态的属性，关都六尾和阿罗拉六尾的属性、
 * 种族值、图鉴颜色全不一样。要哪个形态由上层决定，这里不替它挑
 */
import DataLoader from "dataloader";

import { pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";

/** 库里的 slug 换成前端要的译名。这个语言没收录时是别的语言的值，见 pickByLanguage */
export type NameRow = { name: string; genus: string | null };

/** 已经是 GraphQL Form 的形状（除了带参数的字段）。图片是文件名，前缀由 resolver 拼 */
export type FormRow = {
  id: string;
  slug: string;
  isDefault: boolean;
  fullImage: string | null;
  detailImage: string | null;
};

/** 已经是 GraphQL Type 的形状（除了带参数的 name），所以 resolver 不用再转 */
export type TypeRow = { id: string; slug: string; color: string };

/** 已经是 GraphQL FormStats 的形状 */
export type StatsRow = {
  id: string;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number | null;
  specialDefense: number | null;
  speed: number;
  special: number | null;
};

/** 已经是 GraphQL FormColor 的形状 */
export type ColorRow = { id: string; slug: string; color: string };

/** 已经是 GraphQL FormAbility 的形状（isHidden 由 resolver 从 slot 算） */
export type AbilityRow = { id: string; slot: number; ability: { id: string; slug: string } };

/** 已经是 GraphQL FormDescription 的形状 */
export type DescriptionRow = {
  id: string;
  text: string;
  languageCode: string;
  version: { id: string; slug: string };
};

/** DataLoader 的 key 是复合值，拼成字符串当 cacheKey */
type PokemonLanguageKey = { pokemonId: number; language: string };
type FormGenerationKey = { formId: number; generationId: number };
type FormLanguageKey = { formId: number; language: string };
type NameKey = { id: number; language: string };

/** 译名表统一成这个形状，见 createNameLoader */
type I18nRow = { id: number; languageCode: string; name: string };

/**
 * 译名 loader。type / color / ability / version / form 的译名表结构一样
 * （外键 + languageCode + name），查法也一样，所以只写一遍，各自传查询进来。
 *
 * 查的是每个 id 的全部语言而不是只查请求的那一种 —— 请求的语言没收录时要回退
 * 到默认语言或别的语言（pickByLanguage），只查一种的话拿不到可回退的行。
 * 项目只导 10 种语言，量很小
 */
function createNameLoader(fetch: (ids: number[]) => Promise<I18nRow[]>) {
  return new DataLoader<NameKey, string | null, string>(
    async (keys) => {
      const rows = await fetch([...new Set(keys.map((k) => k.id))]);

      const byId = new Map<number, I18nRow[]>();
      for (const row of rows) {
        const list = byId.get(row.id);
        if (list) list.push(row);
        else byId.set(row.id, [row]);
      }
      return keys.map((k) => pickByLanguage(byId.get(k.id) ?? [], k.language)?.name ?? null);
    },
    { cacheKeyFn: (k) => `${k.id}:${k.language}` },
  );
}

export class PokemonDbSource {
  /**
   * 按全国图鉴编号或英文 slug 找一只。纯数字当编号，否则当 slug ——
   * 库里这两者在不同列，得分开查。
   *
   * 返回的对象就是 GraphQL Pokemon 的标量部分，其余字段由字段 resolver
   * 各自走 DataLoader 取
   */
  async findOne(idOrSlug: string): Promise<{ id: string; slug: string } | null> {
    const dexNumber = /^\d+$/.test(idOrSlug) ? Number(idOrSlug) : null;
    const row = await prisma.pokemon.findFirst({
      where: dexNumber !== null ? { id: dexNumber } : { slug: idOrSlug },
      select: { id: true, slug: true },
    });
    return row ? { id: String(row.id), slug: row.slug } : null;
  }

  async findPage(offset: number, limit: number): Promise<{ id: string; slug: string }[]> {
    const rows = await prisma.pokemon.findMany({
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
      select: { id: true, slug: true },
    });
    return rows.map((r) => ({ id: String(r.id), slug: r.slug }));
  }

  /** 库里一共多少只，翻页用。不走 DataLoader，一次请求最多问一次 */
  countAll(): Promise<number> {
    return prisma.pokemon.count();
  }

  /** 物种的译名和分类。name 和 genus 两个字段调它，DataLoader 会合并成一次查询 */
  nameOf(pokemonId: number, language: string): Promise<NameRow | null> {
    return this.#nameLoader.load({ pokemonId, language });
  }

  /** 一只的全部形态，默认形态排第一。defaultForm 和 forms 两个字段共用它 */
  formsOf(pokemonId: number): Promise<FormRow[]> {
    return this.#formsLoader.load(pokemonId);
  }

  /** 形态名，例如「阿罗拉的样子」。form_i18n 目前没有导入路径，所以恒为 null */
  formNameOf(formId: number, language: string): Promise<string | null> {
    return this.#formNameLoader.load({ id: formId, language });
  }

  /** 返回的数组顺序就是属性槽位：第一个是第一属性，单属性只有一个元素 */
  typesOf(formId: number, generationId: number): Promise<TypeRow[] | null> {
    return this.#typesLoader.load({ formId, generationId });
  }

  statsOf(formId: number, generationId: number): Promise<StatsRow | null> {
    return this.#statsLoader.load({ formId, generationId });
  }

  /** 图鉴颜色。Gen1/Gen2 不插行，那两代是 null */
  colorOf(formId: number, generationId: number): Promise<ColorRow | null> {
    return this.#colorLoader.load({ formId, generationId });
  }

  /** 特性，按槽位排。form_ability 目前没有导入路径，所以恒为空数组 */
  abilitiesOf(formId: number, generationId: number): Promise<AbilityRow[]> {
    return this.#abilitiesLoader.load({ formId, generationId });
  }

  /** 图鉴说明，每个版本一条，按版本排 */
  descriptionsOf(formId: number, language: string): Promise<DescriptionRow[]> {
    return this.#descriptionsLoader.load({ formId, language });
  }

  /** 属性本体的译名 */
  typeNameOf(typeId: number, language: string): Promise<string | null> {
    return this.#typeNameLoader.load({ id: typeId, language });
  }

  /** 图鉴颜色的译名 */
  colorNameOf(colorId: number, language: string): Promise<string | null> {
    return this.#colorNameLoader.load({ id: colorId, language });
  }

  /** 特性的译名 */
  abilityNameOf(abilityId: number, language: string): Promise<string | null> {
    return this.#abilityNameLoader.load({ id: abilityId, language });
  }

  /** 游戏版本的译名 */
  versionNameOf(versionId: number, language: string): Promise<string | null> {
    return this.#versionNameLoader.load({ id: versionId, language });
  }

  // ── DataLoader ──────────────────────────────────────────────

  /**
   * 物种的译名。跟 createNameLoader 那批的区别是它还要带 genus，
   * 而且 name 和 genus 两个字段共用一次查询，所以单独写。
   * 查全部语言再挑的道理同上
   */
  readonly #nameLoader = new DataLoader<PokemonLanguageKey, NameRow | null, string>(
    async (keys) => {
      const rows = await prisma.pokemonI18n.findMany({
        where: { pokemonId: { in: [...new Set(keys.map((k) => k.pokemonId))] } },
        select: { pokemonId: true, languageCode: true, name: true, genus: true },
      });

      const byPokemon = new Map<number, typeof rows>();
      for (const row of rows) {
        const list = byPokemon.get(row.pokemonId);
        if (list) list.push(row);
        else byPokemon.set(row.pokemonId, [row]);
      }
      return keys.map((k) => pickByLanguage(byPokemon.get(k.pokemonId) ?? [], k.language));
    },
    { cacheKeyFn: (k) => `${k.pokemonId}:${k.language}` },
  );

  /**
   * 形态列表。图片文件名跟着一起查出来，Form.fullImageUrl / detailImageUrl
   * 直接读 parent，不用再多一次查询。
   *
   * 默认形态排第一，前端不用自己找 —— 列表页取 defaultForm 就是这一条
   */
  readonly #formsLoader = new DataLoader<number, FormRow[]>(async (pokemonIds) => {
    const rows = await prisma.form.findMany({
      where: { pokemonId: { in: [...pokemonIds] } },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
      select: {
        id: true,
        pokemonId: true,
        slug: true,
        isDefault: true,
        fullImage: true,
        detailImage: true,
      },
    });

    const byPokemon = new Map<number, FormRow[]>();
    for (const row of rows) {
      const form: FormRow = {
        id: String(row.id),
        slug: row.slug,
        isDefault: row.isDefault,
        fullImage: row.fullImage,
        detailImage: row.detailImage,
      };
      const list = byPokemon.get(row.pokemonId);
      if (list) list.push(form);
      else byPokemon.set(row.pokemonId, [form]);
    }
    return pokemonIds.map((id) => byPokemon.get(id) ?? []);
  });

  /**
   * 属性。库里是宽表（primary/secondary 两列），这里摊平成数组，顺序即槽位。
   *
   * 数组本身不需要 id：Apollo 缓存列表存的是元素引用，而元素 PokemonType
   * 有 id（type 表主键），所以火系全局只存一份
   */
  readonly #typesLoader = new DataLoader<FormGenerationKey, TypeRow[] | null, string>(
    async (keys) => {
      const rows = await prisma.formType.findMany({
        where: {
          OR: keys.map((k) => ({ formId: k.formId, generationId: k.generationId })),
        },
        select: {
          formId: true,
          generationId: true,
          primaryType: { select: { id: true, slug: true, color: true } },
          secondaryType: { select: { id: true, slug: true, color: true } },
        },
      });

      const byKey = new Map(
        rows.map((r) => [
          `${r.formId}:${r.generationId}`,
          [
            {
              id: String(r.primaryType.id),
              slug: r.primaryType.slug,
              color: r.primaryType.color,
            },
            // 单属性的宝可梦这一项是 null，filter 掉
            ...(r.secondaryType
              ? [
                  {
                    id: String(r.secondaryType.id),
                    slug: r.secondaryType.slug,
                    color: r.secondaryType.color,
                  },
                ]
              : []),
          ] satisfies TypeRow[],
        ]),
      );
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  readonly #statsLoader = new DataLoader<FormGenerationKey, StatsRow | null, string>(
    async (keys) => {
      const rows = await prisma.formStat.findMany({
        where: {
          OR: keys.map((k) => ({ formId: k.formId, generationId: k.generationId })),
        },
        select: {
          formId: true,
          generationId: true,
          hp: true,
          attack: true,
          defense: true,
          specialAttack: true,
          specialDefense: true,
          speed: true,
          special: true,
        },
      });

      const byKey = new Map(
        rows.map((r) => [
          `${r.formId}:${r.generationId}`,
          {
            id: `${r.formId}:${r.generationId}`,
            hp: r.hp,
            attack: r.attack,
            defense: r.defense,
            specialAttack: r.specialAttack,
            specialDefense: r.specialDefense,
            speed: r.speed,
            special: r.special,
          } satisfies StatsRow,
        ]),
      );
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  /** 图鉴颜色。id 用 color 表主键，10 种颜色全局复用同一份缓存 */
  readonly #colorLoader = new DataLoader<FormGenerationKey, ColorRow | null, string>(
    async (keys) => {
      const rows = await prisma.formColor.findMany({
        where: {
          OR: keys.map((k) => ({ formId: k.formId, generationId: k.generationId })),
        },
        select: {
          formId: true,
          generationId: true,
          color: { select: { id: true, slug: true, color: true } },
        },
      });

      const byKey = new Map(
        rows.map((r) => [
          `${r.formId}:${r.generationId}`,
          {
            id: String(r.color.id),
            slug: r.color.slug,
            color: r.color.color,
          } satisfies ColorRow,
        ]),
      );
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  /**
   * 特性。返回空数组而不是 null —— Gen1/Gen2 是真的没有特性这个机制，
   * 跟「这一代没导入」分不开，统一当空处理
   */
  readonly #abilitiesLoader = new DataLoader<FormGenerationKey, AbilityRow[], string>(
    async (keys) => {
      const rows = await prisma.formAbility.findMany({
        where: {
          OR: keys.map((k) => ({ formId: k.formId, generationId: k.generationId })),
        },
        orderBy: { slot: "asc" },
        select: {
          formId: true,
          generationId: true,
          slot: true,
          ability: { select: { id: true, slug: true } },
        },
      });

      const byKey = new Map<string, AbilityRow[]>();
      for (const row of rows) {
        const key = `${row.formId}:${row.generationId}`;
        const item: AbilityRow = {
          id: `${key}:${row.slot}`,
          slot: row.slot,
          ability: { id: String(row.ability.id), slug: row.ability.slug },
        };
        const list = byKey.get(key);
        if (list) list.push(item);
        else byKey.set(key, [item]);
      }
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? []);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  /**
   * 图鉴说明。每个版本挑一条，回退规则同译名，所以跟译名 loader 一样查全部语言 ——
   * 但量级差两个数量级：一只形态有几十个版本 × 十种语言，几百行。
   * 查一只没问题，整页一起查会拉出上千行，这个字段是留给详情页的
   */
  readonly #descriptionsLoader = new DataLoader<FormLanguageKey, DescriptionRow[], string>(
    async (keys) => {
      const rows = await prisma.formDescriptionI18n.findMany({
        where: { formId: { in: [...new Set(keys.map((k) => k.formId))] } },
        orderBy: { versionId: "asc" },
        select: {
          id: true,
          formId: true,
          versionId: true,
          languageCode: true,
          text: true,
          version: { select: { id: true, slug: true } },
        },
      });

      // 先按形态分，再按版本分：挑语言是在「同一形态同一版本的几条译文」里挑
      const byForm = new Map<number, Map<number, typeof rows>>();
      for (const row of rows) {
        let byVersion = byForm.get(row.formId);
        if (!byVersion) {
          byVersion = new Map();
          byForm.set(row.formId, byVersion);
        }
        const list = byVersion.get(row.versionId);
        if (list) list.push(row);
        else byVersion.set(row.versionId, [row]);
      }

      return keys.map((k) => {
        const byVersion = byForm.get(k.formId);
        if (!byVersion) return [];

        const picked: DescriptionRow[] = [];
        // Map 保持插入顺序，上面按 versionId 排过，所以出来就是版本顺序
        for (const list of byVersion.values()) {
          const row = pickByLanguage(list, k.language);
          if (!row) continue;
          picked.push({
            id: String(row.id),
            text: row.text,
            languageCode: row.languageCode,
            version: { id: String(row.version.id), slug: row.version.slug },
          });
        }
        return picked;
      });
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.language}` },
  );

  readonly #formNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.formI18n.findMany({
      where: { formId: { in: ids } },
      select: { formId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.formId, languageCode: r.languageCode, name: r.name }));
  });

  readonly #typeNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.typeI18n.findMany({
      where: { typeId: { in: ids } },
      select: { typeId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.typeId, languageCode: r.languageCode, name: r.name }));
  });

  readonly #colorNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.colorI18n.findMany({
      where: { colorId: { in: ids } },
      select: { colorId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.colorId, languageCode: r.languageCode, name: r.name }));
  });

  readonly #abilityNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.abilityI18n.findMany({
      where: { abilityId: { in: ids } },
      select: { abilityId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.abilityId, languageCode: r.languageCode, name: r.name }));
  });

  readonly #versionNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.versionI18n.findMany({
      where: { versionId: { in: ids } },
      select: { versionId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.versionId, languageCode: r.languageCode, name: r.name }));
  });
}
