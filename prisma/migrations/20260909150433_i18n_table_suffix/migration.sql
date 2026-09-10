-- 按语言存内容的表统一 _i18n 后缀。
--
-- 这 20 张表原来的后缀有四种：_name（14 张）、_text（3 张）、
-- _description（2 张）、_note（1 张）。后缀说的是「这一列存什么」，
-- 于是从表名看不出它带没带 languageCode —— type_name 和 pokedex_entry
-- 长得一样像实体的附属表，实际前者按语言存、后者不是。
-- 换成 _i18n 之后，扫一眼就能把翻译表挑出来；存什么看列名。
--
-- 用 RENAME 而不是 DROP + CREATE：这些表里有 seed 灌的字典数据和
-- 按需拉回来的译名，rename 一行不丢。
-- 约束和索引名也一起 rename —— Postgres 不会跟着表名改，而 Prisma 是
-- 从表名推导约束名的，留着旧名下次 migrate dev 就报 drift。
ALTER TABLE "move_learn_method_name" RENAME TO "move_learn_method_i18n";
ALTER TABLE "move_learn_method_i18n" RENAME CONSTRAINT "move_learn_method_name_pkey" TO "move_learn_method_i18n_pkey";
ALTER TABLE "move_learn_method_i18n" RENAME CONSTRAINT "move_learn_method_name_languageCode_fkey" TO "move_learn_method_i18n_languageCode_fkey";
ALTER TABLE "move_learn_method_i18n" RENAME CONSTRAINT "move_learn_method_name_methodSlug_fkey" TO "move_learn_method_i18n_methodSlug_fkey";
ALTER TABLE "evolution_trigger_name" RENAME TO "evolution_trigger_i18n";
ALTER TABLE "evolution_trigger_i18n" RENAME CONSTRAINT "evolution_trigger_name_pkey" TO "evolution_trigger_i18n_pkey";
ALTER TABLE "evolution_trigger_i18n" RENAME CONSTRAINT "evolution_trigger_name_languageCode_fkey" TO "evolution_trigger_i18n_languageCode_fkey";
ALTER TABLE "evolution_trigger_i18n" RENAME CONSTRAINT "evolution_trigger_name_triggerSlug_fkey" TO "evolution_trigger_i18n_triggerSlug_fkey";
ALTER TABLE "item_name" RENAME TO "item_i18n";
ALTER TABLE "item_i18n" RENAME CONSTRAINT "item_name_pkey" TO "item_i18n_pkey";
ALTER TABLE "item_i18n" RENAME CONSTRAINT "item_name_itemId_fkey" TO "item_i18n_itemId_fkey";
ALTER TABLE "item_i18n" RENAME CONSTRAINT "item_name_languageCode_fkey" TO "item_i18n_languageCode_fkey";
ALTER INDEX "item_name_name_idx" RENAME TO "item_i18n_name_idx";
ALTER TABLE "item_effect_text" RENAME TO "item_effect_i18n";
ALTER TABLE "item_effect_i18n" RENAME CONSTRAINT "item_effect_text_pkey" TO "item_effect_i18n_pkey";
ALTER TABLE "item_effect_i18n" RENAME CONSTRAINT "item_effect_text_generationId_fkey" TO "item_effect_i18n_generationId_fkey";
ALTER TABLE "item_effect_i18n" RENAME CONSTRAINT "item_effect_text_itemId_fkey" TO "item_effect_i18n_itemId_fkey";
ALTER TABLE "item_effect_i18n" RENAME CONSTRAINT "item_effect_text_languageCode_fkey" TO "item_effect_i18n_languageCode_fkey";
ALTER TABLE "generation_name" RENAME TO "generation_i18n";
ALTER TABLE "generation_i18n" RENAME CONSTRAINT "generation_name_pkey" TO "generation_i18n_pkey";
ALTER TABLE "generation_i18n" RENAME CONSTRAINT "generation_name_generationId_fkey" TO "generation_i18n_generationId_fkey";
ALTER TABLE "generation_i18n" RENAME CONSTRAINT "generation_name_languageCode_fkey" TO "generation_i18n_languageCode_fkey";
ALTER TABLE "version_group_name" RENAME TO "version_group_i18n";
ALTER TABLE "version_group_i18n" RENAME CONSTRAINT "version_group_name_pkey" TO "version_group_i18n_pkey";
ALTER TABLE "version_group_i18n" RENAME CONSTRAINT "version_group_name_languageCode_fkey" TO "version_group_i18n_languageCode_fkey";
ALTER TABLE "version_group_i18n" RENAME CONSTRAINT "version_group_name_versionGroupId_fkey" TO "version_group_i18n_versionGroupId_fkey";
ALTER TABLE "version_name" RENAME TO "version_i18n";
ALTER TABLE "version_i18n" RENAME CONSTRAINT "version_name_pkey" TO "version_i18n_pkey";
ALTER TABLE "version_i18n" RENAME CONSTRAINT "version_name_languageCode_fkey" TO "version_i18n_languageCode_fkey";
ALTER TABLE "version_i18n" RENAME CONSTRAINT "version_name_versionId_fkey" TO "version_i18n_versionId_fkey";
ALTER TABLE "pokemon_color_name" RENAME TO "pokemon_color_i18n";
ALTER TABLE "pokemon_color_i18n" RENAME CONSTRAINT "pokemon_color_name_pkey" TO "pokemon_color_i18n_pkey";
ALTER TABLE "pokemon_color_i18n" RENAME CONSTRAINT "pokemon_color_name_colorId_fkey" TO "pokemon_color_i18n_colorId_fkey";
ALTER TABLE "pokemon_color_i18n" RENAME CONSTRAINT "pokemon_color_name_languageCode_fkey" TO "pokemon_color_i18n_languageCode_fkey";
ALTER TABLE "pokedex_name" RENAME TO "pokedex_i18n";
ALTER TABLE "pokedex_i18n" RENAME CONSTRAINT "pokedex_name_pkey" TO "pokedex_i18n_pkey";
ALTER TABLE "pokedex_i18n" RENAME CONSTRAINT "pokedex_name_languageCode_fkey" TO "pokedex_i18n_languageCode_fkey";
ALTER TABLE "pokedex_i18n" RENAME CONSTRAINT "pokedex_name_pokedexId_fkey" TO "pokedex_i18n_pokedexId_fkey";
ALTER TABLE "pokedex_description" RENAME TO "pokedex_description_i18n";
ALTER TABLE "pokedex_description_i18n" RENAME CONSTRAINT "pokedex_description_pkey" TO "pokedex_description_i18n_pkey";
ALTER TABLE "pokedex_description_i18n" RENAME CONSTRAINT "pokedex_description_languageCode_fkey" TO "pokedex_description_i18n_languageCode_fkey";
ALTER TABLE "pokedex_description_i18n" RENAME CONSTRAINT "pokedex_description_pokedexId_fkey" TO "pokedex_description_i18n_pokedexId_fkey";
ALTER TABLE "pokemon_name" RENAME TO "pokemon_i18n";
ALTER TABLE "pokemon_i18n" RENAME CONSTRAINT "pokemon_name_pkey" TO "pokemon_i18n_pkey";
ALTER TABLE "pokemon_i18n" RENAME CONSTRAINT "pokemon_name_languageCode_fkey" TO "pokemon_i18n_languageCode_fkey";
ALTER TABLE "pokemon_i18n" RENAME CONSTRAINT "pokemon_name_pokemonId_fkey" TO "pokemon_i18n_pokemonId_fkey";
ALTER INDEX "pokemon_name_name_idx" RENAME TO "pokemon_i18n_name_idx";
ALTER TABLE "pokemon_form_name" RENAME TO "pokemon_form_i18n";
ALTER TABLE "pokemon_form_i18n" RENAME CONSTRAINT "pokemon_form_name_pkey" TO "pokemon_form_i18n_pkey";
ALTER TABLE "pokemon_form_i18n" RENAME CONSTRAINT "pokemon_form_name_formId_fkey" TO "pokemon_form_i18n_formId_fkey";
ALTER TABLE "pokemon_form_i18n" RENAME CONSTRAINT "pokemon_form_name_languageCode_fkey" TO "pokemon_form_i18n_languageCode_fkey";
ALTER INDEX "pokemon_form_name_name_idx" RENAME TO "pokemon_form_i18n_name_idx";
ALTER TABLE "pokemon_description" RENAME TO "pokemon_description_i18n";
ALTER TABLE "pokemon_description_i18n" RENAME CONSTRAINT "pokemon_description_pkey" TO "pokemon_description_i18n_pkey";
ALTER TABLE "pokemon_description_i18n" RENAME CONSTRAINT "pokemon_description_formId_fkey" TO "pokemon_description_i18n_formId_fkey";
ALTER TABLE "pokemon_description_i18n" RENAME CONSTRAINT "pokemon_description_languageCode_fkey" TO "pokemon_description_i18n_languageCode_fkey";
ALTER TABLE "pokemon_description_i18n" RENAME CONSTRAINT "pokemon_description_versionId_fkey" TO "pokemon_description_i18n_versionId_fkey";
ALTER INDEX "pokemon_description_formId_versionId_languageCode_key" RENAME TO "pokemon_description_i18n_formId_versionId_languageCode_key";
ALTER TABLE "evolution_note" RENAME TO "evolution_note_i18n";
ALTER TABLE "evolution_note_i18n" RENAME CONSTRAINT "evolution_note_pkey" TO "evolution_note_i18n_pkey";
ALTER TABLE "evolution_note_i18n" RENAME CONSTRAINT "evolution_note_evolutionId_fkey" TO "evolution_note_i18n_evolutionId_fkey";
ALTER TABLE "evolution_note_i18n" RENAME CONSTRAINT "evolution_note_languageCode_fkey" TO "evolution_note_i18n_languageCode_fkey";
ALTER TABLE "type_name" RENAME TO "type_i18n";
ALTER TABLE "type_i18n" RENAME CONSTRAINT "type_name_pkey" TO "type_i18n_pkey";
ALTER TABLE "type_i18n" RENAME CONSTRAINT "type_name_languageCode_fkey" TO "type_i18n_languageCode_fkey";
ALTER TABLE "type_i18n" RENAME CONSTRAINT "type_name_typeId_fkey" TO "type_i18n_typeId_fkey";
ALTER INDEX "type_name_name_idx" RENAME TO "type_i18n_name_idx";
ALTER TABLE "ability_name" RENAME TO "ability_i18n";
ALTER TABLE "ability_i18n" RENAME CONSTRAINT "ability_name_pkey" TO "ability_i18n_pkey";
ALTER TABLE "ability_i18n" RENAME CONSTRAINT "ability_name_abilityId_fkey" TO "ability_i18n_abilityId_fkey";
ALTER TABLE "ability_i18n" RENAME CONSTRAINT "ability_name_languageCode_fkey" TO "ability_i18n_languageCode_fkey";
ALTER INDEX "ability_name_name_idx" RENAME TO "ability_i18n_name_idx";
ALTER TABLE "ability_effect_text" RENAME TO "ability_effect_i18n";
ALTER TABLE "ability_effect_i18n" RENAME CONSTRAINT "ability_effect_text_pkey" TO "ability_effect_i18n_pkey";
ALTER TABLE "ability_effect_i18n" RENAME CONSTRAINT "ability_effect_text_abilityId_fkey" TO "ability_effect_i18n_abilityId_fkey";
ALTER TABLE "ability_effect_i18n" RENAME CONSTRAINT "ability_effect_text_generationId_fkey" TO "ability_effect_i18n_generationId_fkey";
ALTER TABLE "ability_effect_i18n" RENAME CONSTRAINT "ability_effect_text_languageCode_fkey" TO "ability_effect_i18n_languageCode_fkey";
ALTER TABLE "move_name" RENAME TO "move_i18n";
ALTER TABLE "move_i18n" RENAME CONSTRAINT "move_name_pkey" TO "move_i18n_pkey";
ALTER TABLE "move_i18n" RENAME CONSTRAINT "move_name_languageCode_fkey" TO "move_i18n_languageCode_fkey";
ALTER TABLE "move_i18n" RENAME CONSTRAINT "move_name_moveId_fkey" TO "move_i18n_moveId_fkey";
ALTER INDEX "move_name_name_idx" RENAME TO "move_i18n_name_idx";
ALTER TABLE "move_effect_text" RENAME TO "move_effect_i18n";
ALTER TABLE "move_effect_i18n" RENAME CONSTRAINT "move_effect_text_pkey" TO "move_effect_i18n_pkey";
ALTER TABLE "move_effect_i18n" RENAME CONSTRAINT "move_effect_text_generationId_fkey" TO "move_effect_i18n_generationId_fkey";
ALTER TABLE "move_effect_i18n" RENAME CONSTRAINT "move_effect_text_languageCode_fkey" TO "move_effect_i18n_languageCode_fkey";
ALTER TABLE "move_effect_i18n" RENAME CONSTRAINT "move_effect_text_moveId_fkey" TO "move_effect_i18n_moveId_fkey";
ALTER TABLE "region_name" RENAME TO "region_i18n";
ALTER TABLE "region_i18n" RENAME CONSTRAINT "region_name_pkey" TO "region_i18n_pkey";
ALTER TABLE "region_i18n" RENAME CONSTRAINT "region_name_languageCode_fkey" TO "region_i18n_languageCode_fkey";
ALTER TABLE "region_i18n" RENAME CONSTRAINT "region_name_regionId_fkey" TO "region_i18n_regionId_fkey";
