-- pokedex_entry → pokedex_number。
--
-- entry 是从数据源的 entry_number 抄来的，但那边的 entry 有两个意思：
-- 编号是一个，flavor_text_entries 那段图鉴介绍文案是另一个（存在
-- form_description_i18n）。表名里留着 entry，看名字判断不出它存编号还是文案。
-- 这张表除了主键就只有 number 一列，直接叫 number。
ALTER TABLE "pokedex_entry" RENAME TO "pokedex_number";
ALTER TABLE "pokedex_number" RENAME CONSTRAINT "pokedex_entry_pkey" TO "pokedex_number_pkey";
ALTER TABLE "pokedex_number" RENAME CONSTRAINT "pokedex_entry_pokedexId_fkey" TO "pokedex_number_pokedexId_fkey";
ALTER TABLE "pokedex_number" RENAME CONSTRAINT "pokedex_entry_pokemonId_fkey" TO "pokedex_number_pokemonId_fkey";
ALTER INDEX "pokedex_entry_pokedexId_number_key" RENAME TO "pokedex_number_pokedexId_number_key";
