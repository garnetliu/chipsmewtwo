-- 图鉴说明表补上 form 前缀。
--
-- 这张表挂的是 formId，不是 pokemonId —— 图鉴说明是按形态存的
-- （阿罗拉六尾和关都六尾在同一版本里各有一段介绍）。叫 pokemon_description
-- 会让人以为它跟 pokemon_i18n 一样挂在物种上。
-- 库里其余形态级的表都是 pokemon_form_ 前缀，这张跟上。
ALTER TABLE "pokemon_description_i18n" RENAME TO "pokemon_form_description_i18n";
ALTER TABLE "pokemon_form_description_i18n" RENAME CONSTRAINT "pokemon_description_i18n_pkey" TO "pokemon_form_description_i18n_pkey";
ALTER TABLE "pokemon_form_description_i18n" RENAME CONSTRAINT "pokemon_description_i18n_formId_fkey" TO "pokemon_form_description_i18n_formId_fkey";
ALTER TABLE "pokemon_form_description_i18n" RENAME CONSTRAINT "pokemon_description_i18n_languageCode_fkey" TO "pokemon_form_description_i18n_languageCode_fkey";
ALTER TABLE "pokemon_form_description_i18n" RENAME CONSTRAINT "pokemon_description_i18n_versionId_fkey" TO "pokemon_form_description_i18n_versionId_fkey";
ALTER INDEX "pokemon_description_i18n_formId_versionId_languageCode_key" RENAME TO "pokemon_form_description_i18n_formId_versionId_languageCode_key";
