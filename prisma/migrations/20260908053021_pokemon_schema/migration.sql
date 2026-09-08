-- CreateEnum
CREATE TYPE "DamageClass" AS ENUM ('PHYSICAL', 'SPECIAL', 'STATUS');

-- CreateEnum
CREATE TYPE "StatKind" AS ENUM ('HP', 'ATTACK', 'DEFENSE', 'SPECIAL_ATTACK', 'SPECIAL_DEFENSE', 'SPEED', 'SPECIAL');

-- CreateTable
CREATE TABLE "language" (
    "code" TEXT NOT NULL,
    "nameNative" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "move_learn_method" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "move_learn_method_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "move_learn_method_name" (
    "methodSlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "move_learn_method_name_pkey" PRIMARY KEY ("methodSlug","languageCode")
);

-- CreateTable
CREATE TABLE "evolution_trigger" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "evolution_trigger_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "evolution_trigger_name" (
    "triggerSlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "evolution_trigger_name_pkey" PRIMARY KEY ("triggerSlug","languageCode")
);

-- CreateTable
CREATE TABLE "generation" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_name" (
    "generationId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "generation_name_pkey" PRIMARY KEY ("generationId","languageCode")
);

-- CreateTable
CREATE TABLE "version_group" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "generationId" INTEGER NOT NULL,

    CONSTRAINT "version_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_group_name" (
    "versionGroupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "version_group_name_pkey" PRIMARY KEY ("versionGroupId","languageCode")
);

-- CreateTable
CREATE TABLE "version" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "versionGroupId" INTEGER NOT NULL,

    CONSTRAINT "version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_name" (
    "versionId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "version_name_pkey" PRIMARY KEY ("versionId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon_color" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "pokemon_color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_color_name" (
    "colorId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "pokemon_color_name_pkey" PRIMARY KEY ("colorId","languageCode")
);

-- CreateTable
CREATE TABLE "evolution_chain" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "evolution_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokedex" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "pokedex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokedex_name" (
    "pokedexId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "pokedex_name_pkey" PRIMARY KEY ("pokedexId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "colorId" INTEGER,
    "evolutionChainId" INTEGER,

    CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_name" (
    "pokemonId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genus" TEXT,

    CONSTRAINT "pokemon_name_pkey" PRIMARY KEY ("pokemonId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon_dex_number" (
    "pokemonId" INTEGER NOT NULL,
    "pokedexId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "pokemon_dex_number_pkey" PRIMARY KEY ("pokemonId","pokedexId")
);

-- CreateTable
CREATE TABLE "pokemon_evolution" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "versionGroupId" INTEGER NOT NULL,
    "triggerSlug" TEXT NOT NULL,
    "minLevel" INTEGER,
    "itemName" TEXT,

    CONSTRAINT "pokemon_evolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_evolution_condition_text" (
    "evolutionId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "pokemon_evolution_condition_text_pkey" PRIMARY KEY ("evolutionId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon_form" (
    "id" SERIAL NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pokemon_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_form_name" (
    "formId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "pokemon_form_name_pkey" PRIMARY KEY ("formId","languageCode")
);

-- CreateTable
CREATE TABLE "type" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "introducedInGenerationId" INTEGER NOT NULL,

    CONSTRAINT "type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_name" (
    "typeId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "type_name_pkey" PRIMARY KEY ("typeId","languageCode")
);

-- CreateTable
CREATE TABLE "type_effectiveness" (
    "generationId" INTEGER NOT NULL,
    "attackerTypeId" INTEGER NOT NULL,
    "defenderTypeId" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "type_effectiveness_pkey" PRIMARY KEY ("generationId","attackerTypeId","defenderTypeId")
);

-- CreateTable
CREATE TABLE "pokemon_form_type" (
    "formId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "pokemon_form_type_pkey" PRIMARY KEY ("formId","generationId","slot")
);

-- CreateTable
CREATE TABLE "pokemon_form_stat" (
    "formId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "stat" "StatKind" NOT NULL,
    "baseValue" INTEGER NOT NULL,

    CONSTRAINT "pokemon_form_stat_pkey" PRIMARY KEY ("formId","generationId","stat")
);

-- CreateTable
CREATE TABLE "ability" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ability_name" (
    "abilityId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ability_name_pkey" PRIMARY KEY ("abilityId","languageCode")
);

-- CreateTable
CREATE TABLE "ability_effect_text" (
    "abilityId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "shortEffect" TEXT,
    "effect" TEXT NOT NULL,

    CONSTRAINT "ability_effect_text_pkey" PRIMARY KEY ("abilityId","generationId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon_form_ability" (
    "formId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "abilityId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "pokemon_form_ability_pkey" PRIMARY KEY ("formId","generationId","slot")
);

-- CreateTable
CREATE TABLE "move" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "move_name" (
    "moveId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "move_name_pkey" PRIMARY KEY ("moveId","languageCode")
);

-- CreateTable
CREATE TABLE "move_generation" (
    "moveId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "damageClass" "DamageClass" NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "pp" INTEGER,

    CONSTRAINT "move_generation_pkey" PRIMARY KEY ("moveId","generationId")
);

-- CreateTable
CREATE TABLE "move_effect_text" (
    "moveId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "shortEffect" TEXT,
    "effect" TEXT NOT NULL,

    CONSTRAINT "move_effect_text_pkey" PRIMARY KEY ("moveId","generationId","languageCode")
);

-- CreateTable
CREATE TABLE "move_learn" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "moveId" INTEGER NOT NULL,
    "versionGroupId" INTEGER NOT NULL,
    "methodSlug" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "machineNumber" TEXT,

    CONSTRAINT "move_learn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_flavor_text" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "versionId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "pokemon_flavor_text_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generation_slug_key" ON "generation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "version_group_slug_key" ON "version_group"("slug");

-- CreateIndex
CREATE INDEX "version_group_generationId_idx" ON "version_group"("generationId");

-- CreateIndex
CREATE UNIQUE INDEX "version_slug_key" ON "version"("slug");

-- CreateIndex
CREATE INDEX "version_versionGroupId_idx" ON "version"("versionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_color_slug_key" ON "pokemon_color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pokedex_slug_key" ON "pokedex"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_slug_key" ON "pokemon"("slug");

-- CreateIndex
CREATE INDEX "pokemon_colorId_idx" ON "pokemon"("colorId");

-- CreateIndex
CREATE INDEX "pokemon_evolutionChainId_idx" ON "pokemon"("evolutionChainId");

-- CreateIndex
CREATE INDEX "pokemon_name_name_idx" ON "pokemon_name"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_dex_number_pokedexId_number_key" ON "pokemon_dex_number"("pokedexId", "number");

-- CreateIndex
CREATE INDEX "pokemon_evolution_toId_idx" ON "pokemon_evolution"("toId");

-- CreateIndex
CREATE INDEX "pokemon_evolution_versionGroupId_idx" ON "pokemon_evolution"("versionGroupId");

-- CreateIndex
CREATE INDEX "pokemon_evolution_triggerSlug_idx" ON "pokemon_evolution"("triggerSlug");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_evolution_fromId_toId_versionGroupId_key" ON "pokemon_evolution"("fromId", "toId", "versionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_form_slug_key" ON "pokemon_form"("slug");

-- CreateIndex
CREATE INDEX "pokemon_form_pokemonId_idx" ON "pokemon_form"("pokemonId");

-- CreateIndex
CREATE INDEX "pokemon_form_name_name_idx" ON "pokemon_form_name"("name");

-- CreateIndex
CREATE UNIQUE INDEX "type_slug_key" ON "type"("slug");

-- CreateIndex
CREATE INDEX "type_introducedInGenerationId_idx" ON "type"("introducedInGenerationId");

-- CreateIndex
CREATE INDEX "type_name_name_idx" ON "type_name"("name");

-- CreateIndex
CREATE INDEX "type_effectiveness_defenderTypeId_idx" ON "type_effectiveness"("defenderTypeId");

-- CreateIndex
CREATE INDEX "pokemon_form_type_typeId_idx" ON "pokemon_form_type"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "ability_slug_key" ON "ability"("slug");

-- CreateIndex
CREATE INDEX "ability_name_name_idx" ON "ability_name"("name");

-- CreateIndex
CREATE INDEX "pokemon_form_ability_abilityId_idx" ON "pokemon_form_ability"("abilityId");

-- CreateIndex
CREATE UNIQUE INDEX "move_slug_key" ON "move"("slug");

-- CreateIndex
CREATE INDEX "move_name_name_idx" ON "move_name"("name");

-- CreateIndex
CREATE INDEX "move_generation_typeId_idx" ON "move_generation"("typeId");

-- CreateIndex
CREATE INDEX "move_learn_moveId_idx" ON "move_learn"("moveId");

-- CreateIndex
CREATE INDEX "move_learn_versionGroupId_idx" ON "move_learn"("versionGroupId");

-- CreateIndex
CREATE INDEX "move_learn_methodSlug_idx" ON "move_learn"("methodSlug");

-- CreateIndex
CREATE UNIQUE INDEX "move_learn_formId_moveId_versionGroupId_methodSlug_level_key" ON "move_learn"("formId", "moveId", "versionGroupId", "methodSlug", "level");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_flavor_text_formId_versionId_languageCode_key" ON "pokemon_flavor_text"("formId", "versionId", "languageCode");

-- AddForeignKey
ALTER TABLE "move_learn_method_name" ADD CONSTRAINT "move_learn_method_name_methodSlug_fkey" FOREIGN KEY ("methodSlug") REFERENCES "move_learn_method"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_learn_method_name" ADD CONSTRAINT "move_learn_method_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_trigger_name" ADD CONSTRAINT "evolution_trigger_name_triggerSlug_fkey" FOREIGN KEY ("triggerSlug") REFERENCES "evolution_trigger"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_trigger_name" ADD CONSTRAINT "evolution_trigger_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_name" ADD CONSTRAINT "generation_name_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_name" ADD CONSTRAINT "generation_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_group" ADD CONSTRAINT "version_group_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_group_name" ADD CONSTRAINT "version_group_name_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_group_name" ADD CONSTRAINT "version_group_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version" ADD CONSTRAINT "version_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_name" ADD CONSTRAINT "version_name_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_name" ADD CONSTRAINT "version_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_color_name" ADD CONSTRAINT "pokemon_color_name_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "pokemon_color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_color_name" ADD CONSTRAINT "pokemon_color_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_name" ADD CONSTRAINT "pokedex_name_pokedexId_fkey" FOREIGN KEY ("pokedexId") REFERENCES "pokedex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_name" ADD CONSTRAINT "pokedex_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon" ADD CONSTRAINT "pokemon_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "pokemon_color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon" ADD CONSTRAINT "pokemon_evolutionChainId_fkey" FOREIGN KEY ("evolutionChainId") REFERENCES "evolution_chain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_name" ADD CONSTRAINT "pokemon_name_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_name" ADD CONSTRAINT "pokemon_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_dex_number" ADD CONSTRAINT "pokemon_dex_number_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_dex_number" ADD CONSTRAINT "pokemon_dex_number_pokedexId_fkey" FOREIGN KEY ("pokedexId") REFERENCES "pokedex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_toId_fkey" FOREIGN KEY ("toId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_triggerSlug_fkey" FOREIGN KEY ("triggerSlug") REFERENCES "evolution_trigger"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution_condition_text" ADD CONSTRAINT "pokemon_evolution_condition_text_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "pokemon_evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_evolution_condition_text" ADD CONSTRAINT "pokemon_evolution_condition_text_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form" ADD CONSTRAINT "pokemon_form_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_name" ADD CONSTRAINT "pokemon_form_name_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_name" ADD CONSTRAINT "pokemon_form_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type" ADD CONSTRAINT "type_introducedInGenerationId_fkey" FOREIGN KEY ("introducedInGenerationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_name" ADD CONSTRAINT "type_name_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_name" ADD CONSTRAINT "type_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_effectiveness" ADD CONSTRAINT "type_effectiveness_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_effectiveness" ADD CONSTRAINT "type_effectiveness_attackerTypeId_fkey" FOREIGN KEY ("attackerTypeId") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_effectiveness" ADD CONSTRAINT "type_effectiveness_defenderTypeId_fkey" FOREIGN KEY ("defenderTypeId") REFERENCES "type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_type" ADD CONSTRAINT "pokemon_form_type_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_type" ADD CONSTRAINT "pokemon_form_type_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_type" ADD CONSTRAINT "pokemon_form_type_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_stat" ADD CONSTRAINT "pokemon_form_stat_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_stat" ADD CONSTRAINT "pokemon_form_stat_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_name" ADD CONSTRAINT "ability_name_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "ability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_name" ADD CONSTRAINT "ability_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_effect_text" ADD CONSTRAINT "ability_effect_text_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "ability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_effect_text" ADD CONSTRAINT "ability_effect_text_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_effect_text" ADD CONSTRAINT "ability_effect_text_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_ability" ADD CONSTRAINT "pokemon_form_ability_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_ability" ADD CONSTRAINT "pokemon_form_ability_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_ability" ADD CONSTRAINT "pokemon_form_ability_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "ability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_name" ADD CONSTRAINT "move_name_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_name" ADD CONSTRAINT "move_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_generation" ADD CONSTRAINT "move_generation_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_generation" ADD CONSTRAINT "move_generation_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_generation" ADD CONSTRAINT "move_generation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_effect_text" ADD CONSTRAINT "move_effect_text_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_effect_text" ADD CONSTRAINT "move_effect_text_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_effect_text" ADD CONSTRAINT "move_effect_text_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_learn" ADD CONSTRAINT "move_learn_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_learn" ADD CONSTRAINT "move_learn_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_learn" ADD CONSTRAINT "move_learn_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_learn" ADD CONSTRAINT "move_learn_methodSlug_fkey" FOREIGN KEY ("methodSlug") REFERENCES "move_learn_method"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_flavor_text" ADD CONSTRAINT "pokemon_flavor_text_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_flavor_text" ADD CONSTRAINT "pokemon_flavor_text_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_flavor_text" ADD CONSTRAINT "pokemon_flavor_text_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
