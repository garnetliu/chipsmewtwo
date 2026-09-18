import type { MyContext } from "@/graphql/context";
import { firstSentence } from "@/graphql/context/search-source";
import { LATEST_GENERATION } from "@/lib/pokemon/defaults";

import type { SearchResultResolvers } from "./../../types.generated";

/**
 * 宝可梦的副文本：「No.0001 · 草/毒」。
 *
 * 编号就是物种主键，补到四位。属性挂在形态上，取默认形态最新世代那一组 ——
 * 关都六尾和阿罗拉六尾属性不同，模态框一行只放得下一组，跟列表页一样取默认形态。
 * 属性取不到就只给编号，不让整行变成 null
 */
async function pokemonSubtitle(pokemonId: number, ctx: MyContext): Promise<string> {
  const number = `No.${String(pokemonId).padStart(4, "0")}`;

  const forms = await ctx.dataSources.form.ofPokemon(pokemonId);
  const defaultForm = forms.find((form) => form.isDefault);
  if (!defaultForm) return number;

  const types = await ctx.dataSources.form.typesOf(defaultForm.id, LATEST_GENERATION);
  if (!types?.length) return number;

  const names = await Promise.all(
    types.map((type) => ctx.dataSources.type.nameOf(Number(type.id), ctx.language)),
  );
  const label = names.filter((name) => name !== null).join("/");

  return label ? `${number} · ${label}` : number;
}

/**
 * kind、name、slug 都在 SearchSource 查出来的行里，默认解析就够，只有副文本要回库。
 *
 * 四类的副文本各有各的来源，所以按类型分派 —— 走的是各域自己的 source，
 * 不另开一套取数，说明的世代、语言回退规则跟详情页一致
 */
export const SearchResult: SearchResultResolvers = {
  subtitle: (parent, _arg, ctx) => {
    const { kind, id } = parent;
    const { move, item, ability } = ctx.dataSources;

    switch (kind) {
      case "POKEMON":
        return pokemonSubtitle(id, ctx);
      case "MOVE":
        return move.effectOf(id, ctx.language).then(firstSentence);
      case "ITEM":
        // 取完整说明而不是一句话说明：一句话版只有英法两种语言，
        // 完整说明简中有，副文本能给中文就给中文
        return item.effectOf(id, ctx.language).then(firstSentence);
      case "ABILITY":
        return ability.effectOf(id, ctx.language).then((row) => firstSentence(row?.effect));
    }
  },
};
