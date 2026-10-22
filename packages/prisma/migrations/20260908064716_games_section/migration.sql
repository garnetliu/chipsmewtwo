/*
  Warnings:

  - You are about to drop the column `region` on the `pokedex` table. All the data in the column will be lost.
  - Added the required column `order` to the `version_group` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "generation" ADD COLUMN     "mainRegionId" INTEGER;

-- AlterTable
ALTER TABLE "pokedex" DROP COLUMN "region",
ADD COLUMN     "isMainSeries" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "regionId" INTEGER;

-- AlterTable
ALTER TABLE "version_group" ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "region" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_name" (
    "regionId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "region_name_pkey" PRIMARY KEY ("regionId","languageCode")
);

-- CreateTable
CREATE TABLE "region_version_group" (
    "regionId" INTEGER NOT NULL,
    "versionGroupId" INTEGER NOT NULL,

    CONSTRAINT "region_version_group_pkey" PRIMARY KEY ("regionId","versionGroupId")
);

-- CreateTable
CREATE TABLE "pokedex_version_group" (
    "pokedexId" INTEGER NOT NULL,
    "versionGroupId" INTEGER NOT NULL,

    CONSTRAINT "pokedex_version_group_pkey" PRIMARY KEY ("pokedexId","versionGroupId")
);

-- CreateTable
CREATE TABLE "pokedex_description" (
    "pokedexId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "pokedex_description_pkey" PRIMARY KEY ("pokedexId","languageCode")
);

-- CreateTable
CREATE TABLE "version_group_move_learn_method" (
    "versionGroupId" INTEGER NOT NULL,
    "methodSlug" TEXT NOT NULL,

    CONSTRAINT "version_group_move_learn_method_pkey" PRIMARY KEY ("versionGroupId","methodSlug")
);

-- CreateIndex
CREATE UNIQUE INDEX "region_slug_key" ON "region"("slug");

-- CreateIndex
CREATE INDEX "region_version_group_versionGroupId_idx" ON "region_version_group"("versionGroupId");

-- CreateIndex
CREATE INDEX "pokedex_version_group_versionGroupId_idx" ON "pokedex_version_group"("versionGroupId");

-- CreateIndex
CREATE INDEX "version_group_move_learn_method_methodSlug_idx" ON "version_group_move_learn_method"("methodSlug");

-- CreateIndex
CREATE INDEX "generation_mainRegionId_idx" ON "generation"("mainRegionId");

-- CreateIndex
CREATE INDEX "pokedex_regionId_idx" ON "pokedex"("regionId");

-- CreateIndex
CREATE INDEX "version_group_order_idx" ON "version_group"("order");

-- AddForeignKey
ALTER TABLE "generation" ADD CONSTRAINT "generation_mainRegionId_fkey" FOREIGN KEY ("mainRegionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex" ADD CONSTRAINT "pokedex_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_name" ADD CONSTRAINT "region_name_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_name" ADD CONSTRAINT "region_name_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_version_group" ADD CONSTRAINT "region_version_group_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_version_group" ADD CONSTRAINT "region_version_group_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_version_group" ADD CONSTRAINT "pokedex_version_group_pokedexId_fkey" FOREIGN KEY ("pokedexId") REFERENCES "pokedex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_version_group" ADD CONSTRAINT "pokedex_version_group_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_description" ADD CONSTRAINT "pokedex_description_pokedexId_fkey" FOREIGN KEY ("pokedexId") REFERENCES "pokedex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex_description" ADD CONSTRAINT "pokedex_description_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_group_move_learn_method" ADD CONSTRAINT "version_group_move_learn_method_versionGroupId_fkey" FOREIGN KEY ("versionGroupId") REFERENCES "version_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_group_move_learn_method" ADD CONSTRAINT "version_group_move_learn_method_methodSlug_fkey" FOREIGN KEY ("methodSlug") REFERENCES "move_learn_method"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
