-- 招式伤害分类的 enum 改名：DamageClass → MoveCategory。
-- move_generation 还没灌数据，所以直接换列而不用转换现有值
CREATE TYPE "MoveCategory" AS ENUM ('PHYSICAL', 'SPECIAL', 'STATUS');
ALTER TABLE "move_generation" DROP COLUMN "damageClass",
ADD COLUMN     "damageClass" "MoveCategory" NOT NULL;
DROP TYPE "DamageClass";

-- 进化条件用的两个 enum
CREATE TYPE "TimeOfDay" AS ENUM ('DAY', 'NIGHT', 'DUSK');
CREATE TYPE "EvolutionGender" AS ENUM ('MALE', 'FEMALE');

-- ─────────────────────────────────────────────────────────────
-- 两处改名走 RENAME 而不是 DROP + CREATE，表里的数据留着
-- （pokemon_dex_number 130 行、pokemon_flavor_text 676 行，都是按需补进来的）
-- ─────────────────────────────────────────────────────────────

-- pokemon_dex_number → pokedex_entry
ALTER TABLE "pokemon_dex_number" RENAME TO "pokedex_entry";
ALTER TABLE "pokedex_entry" RENAME CONSTRAINT "pokemon_dex_number_pkey" TO "pokedex_entry_pkey";
ALTER TABLE "pokedex_entry" RENAME CONSTRAINT "pokemon_dex_number_pokemonId_fkey" TO "pokedex_entry_pokemonId_fkey";
ALTER TABLE "pokedex_entry" RENAME CONSTRAINT "pokemon_dex_number_pokedexId_fkey" TO "pokedex_entry_pokedexId_fkey";
ALTER INDEX "pokemon_dex_number_pokedexId_number_key" RENAME TO "pokedex_entry_pokedexId_number_key";

-- pokemon_flavor_text → pokemon_description
ALTER TABLE "pokemon_flavor_text" RENAME TO "pokemon_description";
ALTER TABLE "pokemon_description" RENAME CONSTRAINT "pokemon_flavor_text_pkey" TO "pokemon_description_pkey";
ALTER TABLE "pokemon_description" RENAME CONSTRAINT "pokemon_flavor_text_formId_fkey" TO "pokemon_description_formId_fkey";
ALTER TABLE "pokemon_description" RENAME CONSTRAINT "pokemon_flavor_text_versionId_fkey" TO "pokemon_description_versionId_fkey";
ALTER TABLE "pokemon_description" RENAME CONSTRAINT "pokemon_flavor_text_languageCode_fkey" TO "pokemon_description_languageCode_fkey";
ALTER INDEX "pokemon_flavor_text_formId_versionId_languageCode_key" RENAME TO "pokemon_description_formId_versionId_languageCode_key";
ALTER SEQUENCE "pokemon_flavor_text_id_seq" RENAME TO "pokemon_description_id_seq";

-- ─────────────────────────────────────────────────────────────
-- 道具。进化条件的 itemId / heldItemId 指向它
-- ─────────────────────────────────────────────────────────────
CREATE TABLE "item" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "item_name" (
    "itemId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "item_name_pkey" PRIMARY KEY ("itemId","languageCode")
);

CREATE UNIQUE INDEX "item_slug_key" ON "item"("slug");
CREATE INDEX "item_name_name_idx" ON "item_name"("name");

ALTER TABLE "item_name" ADD CONSTRAINT "item_name_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_name" ADD CONSTRAINT "item_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 图鉴颜色从物种级搬到形态 × 世代
-- ─────────────────────────────────────────────────────────────
CREATE TABLE "pokemon_form_color" (
    "formId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,

    CONSTRAINT "pokemon_form_color_pkey" PRIMARY KEY ("formId","generationId")
);

CREATE INDEX "pokemon_form_color_colorId_idx" ON "pokemon_form_color"("colorId");

ALTER TABLE "pokemon_form_color" ADD CONSTRAINT "pokemon_form_color_formId_fkey" FOREIGN KEY ("formId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pokemon_form_color" ADD CONSTRAINT "pokemon_form_color_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pokemon_form_color" ADD CONSTRAINT "pokemon_form_color_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "pokemon_color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 把 pokemon.colorId 上已有的值按世代摊到每个形态上。
-- 「按颜色查找图鉴」是 Gen3 引入的功能，所以从第三代起每代一行。
-- 这批是物种级的旧值，形态和世代的真实差异要等另一个数据源覆盖
INSERT INTO "pokemon_form_color" ("formId", "generationId", "colorId")
SELECT f."id", g."id", p."colorId"
FROM "pokemon_form" f
JOIN "pokemon" p ON p."id" = f."pokemonId"
JOIN "generation" g ON g."id" >= 3
WHERE p."colorId" IS NOT NULL;

DROP INDEX "pokemon_colorId_idx";
ALTER TABLE "pokemon" DROP CONSTRAINT "pokemon_colorId_fkey";
ALTER TABLE "pokemon" DROP COLUMN "colorId";

-- ─────────────────────────────────────────────────────────────
-- 进化：物种级 → 形态级，条件从两列扩到一整行
-- pokemon_evolution 是空表，所以直接改结构，不用搬数据
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_fromId_fkey";
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_toId_fkey";
DROP INDEX "pokemon_evolution_fromId_toId_versionGroupId_key";
DROP INDEX "pokemon_evolution_toId_idx";

ALTER TABLE "pokemon_evolution" DROP COLUMN "fromId",
DROP COLUMN "itemName",
DROP COLUMN "toId",
ADD COLUMN     "fromFormId" INTEGER NOT NULL,
ADD COLUMN     "toFormId" INTEGER NOT NULL,
ADD COLUMN     "minHappiness" INTEGER,
ADD COLUMN     "minAffection" INTEGER,
ADD COLUMN     "minBeauty" INTEGER,
ADD COLUMN     "minSteps" INTEGER,
ADD COLUMN     "minMoveCount" INTEGER,
ADD COLUMN     "minDamageTaken" INTEGER,
ADD COLUMN     "itemId" INTEGER,
ADD COLUMN     "heldItemId" INTEGER,
ADD COLUMN     "knownMoveId" INTEGER,
ADD COLUMN     "knownMoveTypeId" INTEGER,
ADD COLUMN     "usedMoveId" INTEGER,
ADD COLUMN     "partyFormId" INTEGER,
ADD COLUMN     "partyTypeId" INTEGER,
ADD COLUMN     "tradeFormId" INTEGER,
ADD COLUMN     "regionId" INTEGER,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "timeOfDay" "TimeOfDay",
ADD COLUMN     "gender" "EvolutionGender",
ADD COLUMN     "needsRain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsMultiplayer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nearSpecialRock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "turnUpsideDown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relativePhysicalStats" INTEGER;

CREATE INDEX "pokemon_evolution_fromFormId_idx" ON "pokemon_evolution"("fromFormId");
CREATE INDEX "pokemon_evolution_toFormId_idx" ON "pokemon_evolution"("toFormId");
CREATE INDEX "pokemon_evolution_itemId_idx" ON "pokemon_evolution"("itemId");
CREATE INDEX "pokemon_evolution_heldItemId_idx" ON "pokemon_evolution"("heldItemId");
CREATE INDEX "pokemon_evolution_regionId_idx" ON "pokemon_evolution"("regionId");

ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_fromFormId_fkey" FOREIGN KEY ("fromFormId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_toFormId_fkey" FOREIGN KEY ("toFormId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_heldItemId_fkey" FOREIGN KEY ("heldItemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_knownMoveId_fkey" FOREIGN KEY ("knownMoveId") REFERENCES "move"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_knownMoveTypeId_fkey" FOREIGN KEY ("knownMoveTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_usedMoveId_fkey" FOREIGN KEY ("usedMoveId") REFERENCES "move"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_partyFormId_fkey" FOREIGN KEY ("partyFormId") REFERENCES "pokemon_form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_partyTypeId_fkey" FOREIGN KEY ("partyTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_tradeFormId_fkey" FOREIGN KEY ("tradeFormId") REFERENCES "pokemon_form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pokemon_evolution" ADD CONSTRAINT "pokemon_evolution_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
