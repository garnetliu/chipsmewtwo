-- CreateEnum
CREATE TYPE "BerryFirmness" AS ENUM ('VERY_SOFT', 'SOFT', 'HARD', 'VERY_HARD', 'SUPER_HARD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatKind" ADD VALUE 'ACCURACY';
ALTER TYPE "StatKind" ADD VALUE 'EVASION';

-- CreateTable
CREATE TABLE "item_form_change" (
    "itemId" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "groupId" INTEGER,

    CONSTRAINT "item_form_change_pkey" PRIMARY KEY ("itemId","formId")
);

-- CreateTable
CREATE TABLE "item_type_change" (
    "itemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,

    CONSTRAINT "item_type_change_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "item_type_boost" (
    "itemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "boostPercent" INTEGER NOT NULL,
    "generationId" INTEGER,

    CONSTRAINT "item_type_boost_pkey" PRIMARY KEY ("itemId","typeId")
);

-- CreateTable
CREATE TABLE "item_nature" (
    "itemId" INTEGER NOT NULL,
    "natureSlug" TEXT NOT NULL,

    CONSTRAINT "item_nature_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "machine" (
    "itemId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "moveId" INTEGER NOT NULL,

    CONSTRAINT "machine_pkey" PRIMARY KEY ("itemId","groupId")
);

-- CreateTable
CREATE TABLE "berry" (
    "itemId" INTEGER NOT NULL,
    "growthTime" INTEGER NOT NULL,
    "maxHarvest" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "smoothness" INTEGER NOT NULL,
    "soilDryness" INTEGER NOT NULL,
    "firmness" "BerryFirmness" NOT NULL,
    "naturalGiftPower" INTEGER,
    "naturalGiftTypeId" INTEGER,
    "spicy" INTEGER NOT NULL,
    "dry" INTEGER NOT NULL,
    "sweet" INTEGER NOT NULL,
    "bitter" INTEGER NOT NULL,
    "sour" INTEGER NOT NULL,

    CONSTRAINT "berry_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "move_stat_change" (
    "moveId" INTEGER NOT NULL,
    "stat" "StatKind" NOT NULL,
    "change" INTEGER NOT NULL,

    CONSTRAINT "move_stat_change_pkey" PRIMARY KEY ("moveId","stat")
);

-- CreateIndex
CREATE INDEX "item_form_change_formId_idx" ON "item_form_change"("formId");

-- CreateIndex
CREATE INDEX "item_form_change_groupId_idx" ON "item_form_change"("groupId");

-- CreateIndex
CREATE INDEX "item_type_change_typeId_idx" ON "item_type_change"("typeId");

-- CreateIndex
CREATE INDEX "item_type_boost_typeId_idx" ON "item_type_boost"("typeId");

-- CreateIndex
CREATE INDEX "item_nature_natureSlug_idx" ON "item_nature"("natureSlug");

-- CreateIndex
CREATE INDEX "machine_moveId_idx" ON "machine"("moveId");

-- CreateIndex
CREATE INDEX "machine_groupId_idx" ON "machine"("groupId");

-- CreateIndex
CREATE INDEX "berry_naturalGiftTypeId_idx" ON "berry"("naturalGiftTypeId");

-- AddForeignKey
ALTER TABLE "item_form_change" ADD CONSTRAINT "item_form_change_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_form_change" ADD CONSTRAINT "item_form_change_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_form_change" ADD CONSTRAINT "item_form_change_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_change" ADD CONSTRAINT "item_type_change_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_change" ADD CONSTRAINT "item_type_change_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_boost" ADD CONSTRAINT "item_type_boost_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_boost" ADD CONSTRAINT "item_type_boost_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_boost" ADD CONSTRAINT "item_type_boost_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_nature" ADD CONSTRAINT "item_nature_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_nature" ADD CONSTRAINT "item_nature_natureSlug_fkey" FOREIGN KEY ("natureSlug") REFERENCES "nature"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine" ADD CONSTRAINT "machine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine" ADD CONSTRAINT "machine_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine" ADD CONSTRAINT "machine_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berry" ADD CONSTRAINT "berry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berry" ADD CONSTRAINT "berry_naturalGiftTypeId_fkey" FOREIGN KEY ("naturalGiftTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_stat_change" ADD CONSTRAINT "move_stat_change_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE CASCADE ON UPDATE CASCADE;
