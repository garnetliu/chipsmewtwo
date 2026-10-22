-- CreateEnum
CREATE TYPE "StatKind" AS ENUM ('ATTACK', 'DEFENSE', 'SPECIAL_ATTACK', 'SPECIAL_DEFENSE', 'SPEED');

-- CreateEnum
CREATE TYPE "BerryFlavor" AS ENUM ('SPICY', 'DRY', 'SWEET', 'BITTER', 'SOUR');

-- AlterTable
ALTER TABLE "item" ADD COLUMN     "categorySlug" TEXT;

-- AlterTable
ALTER TABLE "move" ADD COLUMN     "ailmentChance" INTEGER,
ADD COLUMN     "ailmentSlug" TEXT,
ADD COLUMN     "blockedByProtect" BOOLEAN,
ADD COLUMN     "copiedByMirrorMove" BOOLEAN,
ADD COLUMN     "critRate" INTEGER,
ADD COLUMN     "drain" INTEGER,
ADD COLUMN     "flinchChance" INTEGER,
ADD COLUMN     "healing" INTEGER,
ADD COLUMN     "makesContact" BOOLEAN,
ADD COLUMN     "maxHits" INTEGER,
ADD COLUMN     "maxTurns" INTEGER,
ADD COLUMN     "metaCategorySlug" TEXT,
ADD COLUMN     "minHits" INTEGER,
ADD COLUMN     "minTurns" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reflectedByMagicCoat" BOOLEAN,
ADD COLUMN     "statChance" INTEGER,
ADD COLUMN     "stolenBySnatch" BOOLEAN,
ADD COLUMN     "targetSlug" TEXT,
ADD COLUMN     "triggersKingsRock" BOOLEAN;

-- AlterTable
ALTER TABLE "pokemon" ADD COLUMN     "isBaby" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLegendary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMythical" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "item_category" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "item_category_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "item_category_i18n" (
    "categorySlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "item_category_i18n_pkey" PRIMARY KEY ("categorySlug","languageCode")
);

-- CreateTable
CREATE TABLE "nature" (
    "slug" TEXT NOT NULL,
    "increasedStat" "StatKind",
    "decreasedStat" "StatKind",
    "likesFlavor" "BerryFlavor",
    "hatesFlavor" "BerryFlavor",

    CONSTRAINT "nature_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "nature_i18n" (
    "natureSlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "nature_i18n_pkey" PRIMARY KEY ("natureSlug","languageCode")
);

-- CreateTable
CREATE TABLE "move_target" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "move_target_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "move_target_i18n" (
    "targetSlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "move_target_i18n_pkey" PRIMARY KEY ("targetSlug","languageCode")
);

-- CreateTable
CREATE TABLE "move_ailment" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "move_ailment_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "move_ailment_i18n" (
    "ailmentSlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "move_ailment_i18n_pkey" PRIMARY KEY ("ailmentSlug","languageCode")
);

-- CreateTable
CREATE TABLE "move_meta_category" (
    "slug" TEXT NOT NULL,

    CONSTRAINT "move_meta_category_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "move_meta_category_i18n" (
    "metaCategorySlug" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "move_meta_category_i18n_pkey" PRIMARY KEY ("metaCategorySlug","languageCode")
);

-- CreateIndex
CREATE INDEX "item_categorySlug_idx" ON "item"("categorySlug");

-- CreateIndex
CREATE INDEX "move_targetSlug_idx" ON "move"("targetSlug");

-- CreateIndex
CREATE INDEX "move_ailmentSlug_idx" ON "move"("ailmentSlug");

-- CreateIndex
CREATE INDEX "move_metaCategorySlug_idx" ON "move"("metaCategorySlug");

-- CreateIndex
CREATE INDEX "pokemon_isLegendary_idx" ON "pokemon"("isLegendary");

-- CreateIndex
CREATE INDEX "pokemon_isMythical_idx" ON "pokemon"("isMythical");

-- AddForeignKey
ALTER TABLE "item_category_i18n" ADD CONSTRAINT "item_category_i18n_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "item_category"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_category_i18n" ADD CONSTRAINT "item_category_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "item_category"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nature_i18n" ADD CONSTRAINT "nature_i18n_natureSlug_fkey" FOREIGN KEY ("natureSlug") REFERENCES "nature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nature_i18n" ADD CONSTRAINT "nature_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_target_i18n" ADD CONSTRAINT "move_target_i18n_targetSlug_fkey" FOREIGN KEY ("targetSlug") REFERENCES "move_target"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_target_i18n" ADD CONSTRAINT "move_target_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_ailment_i18n" ADD CONSTRAINT "move_ailment_i18n_ailmentSlug_fkey" FOREIGN KEY ("ailmentSlug") REFERENCES "move_ailment"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_ailment_i18n" ADD CONSTRAINT "move_ailment_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_meta_category_i18n" ADD CONSTRAINT "move_meta_category_i18n_metaCategorySlug_fkey" FOREIGN KEY ("metaCategorySlug") REFERENCES "move_meta_category"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_meta_category_i18n" ADD CONSTRAINT "move_meta_category_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move" ADD CONSTRAINT "move_targetSlug_fkey" FOREIGN KEY ("targetSlug") REFERENCES "move_target"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move" ADD CONSTRAINT "move_ailmentSlug_fkey" FOREIGN KEY ("ailmentSlug") REFERENCES "move_ailment"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move" ADD CONSTRAINT "move_metaCategorySlug_fkey" FOREIGN KEY ("metaCategorySlug") REFERENCES "move_meta_category"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
