-- 进化这一组表统一 evolution 前缀，顺带两处改动：
--
-- 1. pokemon_evolution → evolution。加上已有的 evolution_chain / evolution_trigger /
--    evolution_trigger_name，一眼能看出是一组。
-- 2. relativePhysicalStats 的 1 / 0 / -1 换成 EvolutionStatComparison 枚举。
--    0 表示「攻防相等」（战舞郎那一支）是有意义的值，而它在 falsy 判断里跟
--    「没有这个条件」长得一样，用数字存迟早漏掉一支。
-- 3. pokemon_evolution_condition_text 那张按语言存的兜底表去掉，
--    改成 evolution.conditionNote 一列。兜底说明是人工填的逃生舱，
--    全库预计不超过几条，不值得单开一张表。
--
-- 两张表都是空的，所以直接 DROP + CREATE，没有数据要搬。
-- CreateEnum
CREATE TYPE "EvolutionStatComparison" AS ENUM ('ATTACK_HIGHER', 'EQUAL', 'DEFENSE_HIGHER');

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_fromFormId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_heldItemId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_itemId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_knownMoveId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_knownMoveTypeId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_partyFormId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_partyTypeId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_regionId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_toFormId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_tradeFormId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_triggerSlug_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_usedMoveId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution" DROP CONSTRAINT "pokemon_evolution_versionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution_condition_text" DROP CONSTRAINT "pokemon_evolution_condition_text_evolutionId_fkey";

-- DropForeignKey
ALTER TABLE "pokemon_evolution_condition_text" DROP CONSTRAINT "pokemon_evolution_condition_text_languageCode_fkey";

-- DropTable
DROP TABLE "pokemon_evolution";

-- DropTable
DROP TABLE "pokemon_evolution_condition_text";

-- CreateTable
CREATE TABLE "evolution" (
    "id" SERIAL NOT NULL,
    "fromFormId" INTEGER NOT NULL,
    "toFormId" INTEGER NOT NULL,
    "versionGroupId" INTEGER NOT NULL,
    "triggerSlug" TEXT NOT NULL,
    "minLevel" INTEGER,
    "minHappiness" INTEGER,
    "minAffection" INTEGER,
    "minBeauty" INTEGER,
    "minSteps" INTEGER,
    "minMoveCount" INTEGER,
    "minDamageTaken" INTEGER,
    "itemId" INTEGER,
    "heldItemId" INTEGER,
    "knownMoveId" INTEGER,
    "knownMoveTypeId" INTEGER,
    "usedMoveId" INTEGER,
    "partyFormId" INTEGER,
    "partyTypeId" INTEGER,
    "tradeFormId" INTEGER,
    "regionId" INTEGER,
    "locationName" TEXT,
    "timeOfDay" "TimeOfDay",
    "gender" "EvolutionGender",
    "needsRain" BOOLEAN NOT NULL DEFAULT false,
    "needsMultiplayer" BOOLEAN NOT NULL DEFAULT false,
    "nearSpecialRock" BOOLEAN NOT NULL DEFAULT false,
    "turnUpsideDown" BOOLEAN NOT NULL DEFAULT false,
    "attackVsDefense" "EvolutionStatComparison",
    "conditionNote" TEXT,

    CONSTRAINT "evolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evolution_fromFormId_idx" ON "evolution"("fromFormId");

-- CreateIndex
CREATE INDEX "evolution_toFormId_idx" ON "evolution"("toFormId");

-- CreateIndex
CREATE INDEX "evolution_versionGroupId_idx" ON "evolution"("versionGroupId");

-- CreateIndex
CREATE INDEX "evolution_triggerSlug_idx" ON "evolution"("triggerSlug");

-- CreateIndex
CREATE INDEX "evolution_itemId_idx" ON "evolution"("itemId");

-- CreateIndex
CREATE INDEX "evolution_heldItemId_idx" ON "evolution"("heldItemId");

-- CreateIndex
CREATE INDEX "evolution_regionId_idx" ON "evolution"("regionId");

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_fromFormId_fkey" FOREIGN KEY ("fromFormId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_toFormId_fkey" FOREIGN KEY ("toFormId") REFERENCES "pokemon_form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_triggerSlug_fkey" FOREIGN KEY ("triggerSlug") REFERENCES "evolution_trigger"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_heldItemId_fkey" FOREIGN KEY ("heldItemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_knownMoveId_fkey" FOREIGN KEY ("knownMoveId") REFERENCES "move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_knownMoveTypeId_fkey" FOREIGN KEY ("knownMoveTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_usedMoveId_fkey" FOREIGN KEY ("usedMoveId") REFERENCES "move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_partyFormId_fkey" FOREIGN KEY ("partyFormId") REFERENCES "pokemon_form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_partyTypeId_fkey" FOREIGN KEY ("partyTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_tradeFormId_fkey" FOREIGN KEY ("tradeFormId") REFERENCES "pokemon_form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

