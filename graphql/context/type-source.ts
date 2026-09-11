/**
 * 属性。18 个，是全局字典 —— 谁是火系存在 form_type 里（见 FormSource），
 * 这里只管属性本身的身份和译名
 */
import { createNameLoader } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";
import type { Type } from "@/prisma/generated/client";

/** 库里的行，字段名即列名 */
export type TypeRow = Pick<Type, "id" | "slug" | "color">;

export class TypeSource {
  /** 属性译名，例如「火」 */
  nameOf(typeId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: typeId, language });
  }

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.typeI18n.findMany({
      where: { typeId: { in: ids } },
      select: { typeId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.typeId, languageCode: r.languageCode, name: r.name }));
  });
}
