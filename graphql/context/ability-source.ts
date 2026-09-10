/**
 * 特性。哪个形态在哪一代有哪个特性存在 form_ability 里（见 FormSource），
 * 这里只管特性本身的身份和译名。
 *
 * 效果说明（ability_effect_i18n）还没有导入路径，等 ability 域用得上时再加
 */
import { createNameLoader } from "@/lib/pokemon/language";
import { prisma } from "@/lib/prisma";

export class AbilitySource {
  /** 特性译名，例如「引火」 */
  nameOf(abilityId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: abilityId, language });
  }

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.abilityI18n.findMany({
      where: { abilityId: { in: ids } },
      select: { abilityId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.abilityId, languageCode: r.languageCode, name: r.name }));
  });
}
