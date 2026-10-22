/**
 * 游戏版本。图鉴说明按版本存（见 FormSource.descriptionsOf），
 * 这里只管版本本身的身份和译名
 */
import { prisma } from "@pkcw/prisma";
import type { Version } from "@pkcw/prisma/generated/client";
import { createNameLoader } from "@pkcw/prisma/pokemon/language";

/** 跟着图鉴说明一起 join 出来的那几列 */
export type VersionRow = Pick<Version, "id" | "slug">;

export class VersionSource {
  /** 版本译名，例如「红」 */
  nameOf(versionId: number, language: string): Promise<string | null> {
    return this.#nameLoader.load({ id: versionId, language });
  }

  readonly #nameLoader = createNameLoader(async (ids) => {
    const rows = await prisma.versionI18n.findMany({
      where: { versionId: { in: ids } },
      select: { versionId: true, languageCode: true, name: true },
    });
    return rows.map((r) => ({ id: r.versionId, languageCode: r.languageCode, name: r.name }));
  });
}
