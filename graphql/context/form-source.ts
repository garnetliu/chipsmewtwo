/**
 * 形态。属性、种族值、图片、图鉴颜色、特性、图鉴说明都挂在这一层。
 *
 * 除了 ofPokemon，方法的 key 都是 formId 而不是 pokemonId：这些值本来就是
 * 形态的属性，关都六尾和阿罗拉六尾的属性、种族值、图鉴颜色全不一样。
 * 要哪个形态由上层决定，这里不替它挑。
 *
 * 必须每个请求新建实例，理由同 PokemonSource。返回的都是库里的行，
 * 字段名即列名 —— form_stat 和 form_ability 在库里是复合主键、没有单列 id，
 * GraphQL 要的那个缓存键由各自的 resolver 拼
 */
import DataLoader from "dataloader";

import { createNameLoader, pickByLanguage } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type {
  Ability,
  Color,
  Form,
  FormAbility,
  FormDescriptionI18n,
  FormStat,
} from "@/prisma/generated/client";

import type { TypeRow } from "./type-source";
import type { VersionRow } from "./version-source";

/** 图片存的是文件名，前缀由 resolver 拼（lib/pokemon/sprites.ts） */
export type FormRow = Pick<
  Form,
  "id" | "pokemonId" | "slug" | "isDefault" | "fullImage" | "detailImage"
>;

/** 图鉴颜色，10 种，是全局字典，所以直接是 color 表的行 */
export type FormColorRow = Color;

/** 特性槽位，ability 一起 join 出来 */
export type FormAbilityRow = Pick<FormAbility, "formId" | "generationId" | "slot"> & {
  ability: Ability;
};

/** 图鉴说明，version 一起 join 出来 */
export type FormDescriptionRow = FormDescriptionI18n & { version: VersionRow };

type GenerationKey = { formId: number; generationId: number };
type LanguageKey = { formId: number; language: string };

export class FormSource {
  /** 一只的全部形态，默认形态排第一。defaultForm 和 forms 两个字段共用它 */
  ofPokemon(pokemonId: number): Promise<FormRow[]> {
    return this.#formsLoader.load(pokemonId);
  }

  /** 形态名，例如「阿罗拉的样子」。form_i18n 目前没有导入路径，所以恒为 null */
  nameOf(formId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: formId, language });
  }

  /** 分类（「狐狸宝可梦」）。跟形态名分开存，所以也是两个 loader */
  genusOf(formId: number, language: string): Promise<string | null> {
    return this.#genusLoader.load({ id: formId, language });
  }

  /** 返回的数组顺序就是属性槽位：第一个是第一属性，单属性只有一个元素 */
  typesOf(formId: number, generationId: number): Promise<TypeRow[] | null> {
    return this.#typesLoader.load({ formId, generationId });
  }

  statsOf(formId: number, generationId: number): Promise<FormStat | null> {
    return this.#statsLoader.load({ formId, generationId });
  }

  /** 图鉴颜色。Gen1/Gen2 不插行，那两代是 null */
  colorOf(formId: number, generationId: number): Promise<FormColorRow | null> {
    return this.#colorLoader.load({ formId, generationId });
  }

  /**
   * 图鉴颜色的译名。颜色是全局字典，本该在自己的 source 里 —— 但 GraphQL 那边
   * 它只以 FormColor 出现，没有独立的域，所以跟着形态放这儿
   */
  colorNameOf(colorId: number, language: string): Promise<string | null> {
    return this.#colorNameLoader.load({ id: colorId, language });
  }

  /** 特性，按槽位排。form_ability 目前没有导入路径，所以恒为空数组 */
  abilitiesOf(formId: number, generationId: number): Promise<FormAbilityRow[]> {
    return this.#abilitiesLoader.load({ formId, generationId });
  }

  /** 图鉴说明，每个版本一条，按版本排 */
  descriptionsOf(formId: number, language: string): Promise<FormDescriptionRow[]> {
    return this.#descriptionsLoader.load({ formId, language });
  }

  // ── DataLoader ──────────────────────────────────────────────

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
      const list = byPokemon.get(row.pokemonId);
      if (list) list.push(row);
      else byPokemon.set(row.pokemonId, [row]);
    }
    return pokemonIds.map((id) => byPokemon.get(id) ?? []);
  });

  /**
   * 属性。库里是宽表（primary/secondary 两列），这里摊平成数组，顺序即槽位。
   *
   * 数组本身不需要 id：Apollo 缓存列表存的是元素引用，而元素 Type 有 id
   * （type 表主键），所以火系全局只存一份
   */
  readonly #typesLoader = new DataLoader<GenerationKey, TypeRow[] | null, string>(
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
          // 单属性的宝可梦第二项是 null，去掉
          [r.primaryType, ...(r.secondaryType ? [r.secondaryType] : [])] satisfies TypeRow[],
        ]),
      );
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  readonly #statsLoader = new DataLoader<GenerationKey, FormStat | null, string>(
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
          evHp: true,
          evAttack: true,
          evDefense: true,
          evSpecialAttack: true,
          evSpecialDefense: true,
          evSpeed: true,
        },
      });

      const byKey = new Map(rows.map((r) => [`${r.formId}:${r.generationId}`, r]));
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  readonly #colorLoader = new DataLoader<GenerationKey, FormColorRow | null, string>(
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

      const byKey = new Map(rows.map((r) => [`${r.formId}:${r.generationId}`, r.color]));
      return keys.map((k) => byKey.get(`${k.formId}:${k.generationId}`) ?? null);
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.generationId}` },
  );

  /**
   * 特性。返回空数组而不是 null —— Gen1/Gen2 是真的没有特性这个机制，
   * 跟「这一代没导入」分不开，统一当空处理
   */
  readonly #abilitiesLoader = new DataLoader<GenerationKey, FormAbilityRow[], string>(
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

      const byKey = new Map<string, FormAbilityRow[]>();
      for (const row of rows) {
        const key = `${row.formId}:${row.generationId}`;
        const list = byKey.get(key);
        if (list) list.push(row);
        else byKey.set(key, [row]);
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
  readonly #descriptionsLoader = new DataLoader<LanguageKey, FormDescriptionRow[], string>(
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

        const picked: FormDescriptionRow[] = [];
        // Map 保持插入顺序，上面按 versionId 排过，所以出来就是版本顺序
        for (const list of byVersion.values()) {
          const row = pickByLanguage(list, k.language);
          if (row) picked.push(row);
        }
        return picked;
      });
    },
    { cacheKeyFn: (k) => `${k.formId}:${k.language}` },
  );

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.formI18n.findMany({
      where: { formId: { in: ids } },
      select: { formId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.formId, languageCode: r.languageCode, name: r.name }));
  });

  readonly #genusLoader = createNameLoader(async (ids) => {
    const rows = await prisma.formGenusI18n.findMany({
      where: { formId: { in: ids } },
      select: { formId: true, languageCode: true, genus: true },
    });
    return rows.map((r) => ({ id: r.formId, languageCode: r.languageCode, name: r.genus }));
  });

  readonly #colorNameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.colorI18n.findMany({
      where: { colorId: { in: ids } },
      select: { colorId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.colorId, languageCode: r.languageCode, name: r.name }));
  });
}
