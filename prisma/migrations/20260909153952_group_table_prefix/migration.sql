-- version_group* → group*，外键列 versionGroupId → groupId。
--
-- 库里只有这一种组，version_ 前缀不区分任何东西。反向的两张中间表
-- （region_version_group / pokedex_version_group）一起去掉中段，
-- 否则 group 和 version_group 两套叫法混着用。
--
-- group 是 Postgres 保留字，所以这张表在手写 SQL 里必须带引号
-- （SELECT * FROM "group"）。Prisma 生成的语句一律带引号，查询层不受影响。
ALTER TABLE "version_group" RENAME TO "group";
ALTER TABLE "version_group_i18n" RENAME TO "group_i18n";
ALTER TABLE "version_group_move_learn_method" RENAME TO "group_move_learn_method";
ALTER TABLE "region_version_group" RENAME TO "region_group";
ALTER TABLE "pokedex_version_group" RENAME TO "pokedex_group";
ALTER TABLE "group_i18n" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "group_move_learn_method" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "region_group" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "pokedex_group" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "version" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "evolution" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "move_learn" RENAME COLUMN "versionGroupId" TO "groupId";
ALTER TABLE "group" RENAME CONSTRAINT "version_group_pkey" TO "group_pkey";
ALTER TABLE "group" RENAME CONSTRAINT "version_group_generationId_fkey" TO "group_generationId_fkey";
ALTER INDEX "version_group_slug_key" RENAME TO "group_slug_key";
ALTER INDEX "version_group_generationId_idx" RENAME TO "group_generationId_idx";
ALTER INDEX "version_group_order_idx" RENAME TO "group_order_idx";
ALTER TABLE "group_i18n" RENAME CONSTRAINT "version_group_i18n_pkey" TO "group_i18n_pkey";
ALTER TABLE "group_i18n" RENAME CONSTRAINT "version_group_i18n_languageCode_fkey" TO "group_i18n_languageCode_fkey";
ALTER TABLE "group_i18n" RENAME CONSTRAINT "version_group_i18n_versionGroupId_fkey" TO "group_i18n_groupId_fkey";
ALTER TABLE "group_move_learn_method" RENAME CONSTRAINT "version_group_move_learn_method_pkey" TO "group_move_learn_method_pkey";
ALTER TABLE "group_move_learn_method" RENAME CONSTRAINT "version_group_move_learn_method_methodSlug_fkey" TO "group_move_learn_method_methodSlug_fkey";
ALTER TABLE "group_move_learn_method" RENAME CONSTRAINT "version_group_move_learn_method_versionGroupId_fkey" TO "group_move_learn_method_groupId_fkey";
ALTER INDEX "version_group_move_learn_method_methodSlug_idx" RENAME TO "group_move_learn_method_methodSlug_idx";
ALTER TABLE "region_group" RENAME CONSTRAINT "region_version_group_pkey" TO "region_group_pkey";
ALTER TABLE "region_group" RENAME CONSTRAINT "region_version_group_regionId_fkey" TO "region_group_regionId_fkey";
ALTER TABLE "region_group" RENAME CONSTRAINT "region_version_group_versionGroupId_fkey" TO "region_group_groupId_fkey";
ALTER INDEX "region_version_group_versionGroupId_idx" RENAME TO "region_group_groupId_idx";
ALTER TABLE "pokedex_group" RENAME CONSTRAINT "pokedex_version_group_pkey" TO "pokedex_group_pkey";
ALTER TABLE "pokedex_group" RENAME CONSTRAINT "pokedex_version_group_pokedexId_fkey" TO "pokedex_group_pokedexId_fkey";
ALTER TABLE "pokedex_group" RENAME CONSTRAINT "pokedex_version_group_versionGroupId_fkey" TO "pokedex_group_groupId_fkey";
ALTER INDEX "pokedex_version_group_versionGroupId_idx" RENAME TO "pokedex_group_groupId_idx";
ALTER TABLE "version" RENAME CONSTRAINT "version_versionGroupId_fkey" TO "version_groupId_fkey";
ALTER INDEX "version_versionGroupId_idx" RENAME TO "version_groupId_idx";
ALTER TABLE "evolution" RENAME CONSTRAINT "evolution_versionGroupId_fkey" TO "evolution_groupId_fkey";
ALTER INDEX "evolution_versionGroupId_idx" RENAME TO "evolution_groupId_idx";
ALTER TABLE "move_learn" RENAME CONSTRAINT "move_learn_versionGroupId_fkey" TO "move_learn_groupId_fkey";
ALTER INDEX "move_learn_formId_moveId_versionGroupId_methodSlug_level_key" RENAME TO "move_learn_formId_moveId_groupId_methodSlug_level_key";
ALTER INDEX "move_learn_versionGroupId_idx" RENAME TO "move_learn_groupId_idx";
