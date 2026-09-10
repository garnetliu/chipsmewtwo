-- 形态那一组表去掉 pokemon_ 前缀：pokemon_form* → form*。
--
-- 前缀在库里不区分任何东西 —— 没有别的 form，也不会有。
-- 挂在物种上的表已经叫 pokemon_i18n / pokedex_entry，挂在形态上的
-- 一律 form_ 开头之后，外键看列名（pokemonId 还是 formId）、
-- 表名看前缀，两边对得上。
--
-- 三分钟前的 20260909151438 刚把图鉴说明表改成 pokemon_form_description_i18n，
-- 这次跟着一起去前缀，成了 form_description_i18n。
ALTER TABLE "pokemon_form" RENAME TO "form";
ALTER TABLE "form" RENAME CONSTRAINT "pokemon_form_pkey" TO "form_pkey";
ALTER TABLE "form" RENAME CONSTRAINT "pokemon_form_evolutionChainId_fkey" TO "form_evolutionChainId_fkey";
ALTER TABLE "form" RENAME CONSTRAINT "pokemon_form_pokemonId_fkey" TO "form_pokemonId_fkey";
ALTER INDEX "pokemon_form_evolutionChainId_idx" RENAME TO "form_evolutionChainId_idx";
ALTER INDEX "pokemon_form_pokemonId_idx" RENAME TO "form_pokemonId_idx";
ALTER INDEX "pokemon_form_slug_key" RENAME TO "form_slug_key";
ALTER TABLE "pokemon_form_i18n" RENAME TO "form_i18n";
ALTER TABLE "form_i18n" RENAME CONSTRAINT "pokemon_form_i18n_pkey" TO "form_i18n_pkey";
ALTER TABLE "form_i18n" RENAME CONSTRAINT "pokemon_form_i18n_formId_fkey" TO "form_i18n_formId_fkey";
ALTER TABLE "form_i18n" RENAME CONSTRAINT "pokemon_form_i18n_languageCode_fkey" TO "form_i18n_languageCode_fkey";
ALTER INDEX "pokemon_form_i18n_name_idx" RENAME TO "form_i18n_name_idx";
ALTER TABLE "pokemon_form_color" RENAME TO "form_color";
ALTER TABLE "form_color" RENAME CONSTRAINT "pokemon_form_color_pkey" TO "form_color_pkey";
ALTER TABLE "form_color" RENAME CONSTRAINT "pokemon_form_color_colorId_fkey" TO "form_color_colorId_fkey";
ALTER TABLE "form_color" RENAME CONSTRAINT "pokemon_form_color_formId_fkey" TO "form_color_formId_fkey";
ALTER TABLE "form_color" RENAME CONSTRAINT "pokemon_form_color_generationId_fkey" TO "form_color_generationId_fkey";
ALTER INDEX "pokemon_form_color_colorId_idx" RENAME TO "form_color_colorId_idx";
ALTER TABLE "pokemon_form_type" RENAME TO "form_type";
ALTER TABLE "form_type" RENAME CONSTRAINT "pokemon_form_type_pkey" TO "form_type_pkey";
ALTER TABLE "form_type" RENAME CONSTRAINT "pokemon_form_type_formId_fkey" TO "form_type_formId_fkey";
ALTER TABLE "form_type" RENAME CONSTRAINT "pokemon_form_type_generationId_fkey" TO "form_type_generationId_fkey";
ALTER TABLE "form_type" RENAME CONSTRAINT "pokemon_form_type_primaryTypeId_fkey" TO "form_type_primaryTypeId_fkey";
ALTER TABLE "form_type" RENAME CONSTRAINT "pokemon_form_type_secondaryTypeId_fkey" TO "form_type_secondaryTypeId_fkey";
ALTER INDEX "pokemon_form_type_primaryTypeId_idx" RENAME TO "form_type_primaryTypeId_idx";
ALTER INDEX "pokemon_form_type_secondaryTypeId_idx" RENAME TO "form_type_secondaryTypeId_idx";
ALTER TABLE "pokemon_form_stat" RENAME TO "form_stat";
ALTER TABLE "form_stat" RENAME CONSTRAINT "pokemon_form_stat_pkey" TO "form_stat_pkey";
ALTER TABLE "form_stat" RENAME CONSTRAINT "pokemon_form_stat_formId_fkey" TO "form_stat_formId_fkey";
ALTER TABLE "form_stat" RENAME CONSTRAINT "pokemon_form_stat_generationId_fkey" TO "form_stat_generationId_fkey";
ALTER TABLE "pokemon_form_ability" RENAME TO "form_ability";
ALTER TABLE "form_ability" RENAME CONSTRAINT "pokemon_form_ability_pkey" TO "form_ability_pkey";
ALTER TABLE "form_ability" RENAME CONSTRAINT "pokemon_form_ability_abilityId_fkey" TO "form_ability_abilityId_fkey";
ALTER TABLE "form_ability" RENAME CONSTRAINT "pokemon_form_ability_formId_fkey" TO "form_ability_formId_fkey";
ALTER TABLE "form_ability" RENAME CONSTRAINT "pokemon_form_ability_generationId_fkey" TO "form_ability_generationId_fkey";
ALTER INDEX "pokemon_form_ability_abilityId_idx" RENAME TO "form_ability_abilityId_idx";
ALTER TABLE "pokemon_form_description_i18n" RENAME TO "form_description_i18n";
ALTER TABLE "form_description_i18n" RENAME CONSTRAINT "pokemon_form_description_i18n_pkey" TO "form_description_i18n_pkey";
ALTER TABLE "form_description_i18n" RENAME CONSTRAINT "pokemon_form_description_i18n_formId_fkey" TO "form_description_i18n_formId_fkey";
ALTER TABLE "form_description_i18n" RENAME CONSTRAINT "pokemon_form_description_i18n_languageCode_fkey" TO "form_description_i18n_languageCode_fkey";
ALTER TABLE "form_description_i18n" RENAME CONSTRAINT "pokemon_form_description_i18n_versionId_fkey" TO "form_description_i18n_versionId_fkey";
ALTER INDEX "pokemon_form_description_i18n_formId_versionId_languageCode_key" RENAME TO "form_description_i18n_formId_versionId_languageCode_key";
