/*
  Warnings:

  - The primary key for the `pokemon_form_stat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `baseValue` on the `pokemon_form_stat` table. All the data in the column will be lost.
  - You are about to drop the column `stat` on the `pokemon_form_stat` table. All the data in the column will be lost.
  - The primary key for the `pokemon_form_type` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `slot` on the `pokemon_form_type` table. All the data in the column will be lost.
  - You are about to drop the column `typeId` on the `pokemon_form_type` table. All the data in the column will be lost.
  - Added the required column `attack` to the `pokemon_form_stat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defense` to the `pokemon_form_stat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hp` to the `pokemon_form_stat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `speed` to the `pokemon_form_stat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryTypeId` to the `pokemon_form_type` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pokemon_form_type" DROP CONSTRAINT "pokemon_form_type_typeId_fkey";

-- DropIndex
DROP INDEX "pokemon_form_type_typeId_idx";

-- AlterTable
ALTER TABLE "pokemon_form_stat" DROP CONSTRAINT "pokemon_form_stat_pkey",
DROP COLUMN "baseValue",
DROP COLUMN "stat",
ADD COLUMN     "attack" INTEGER NOT NULL,
ADD COLUMN     "defense" INTEGER NOT NULL,
ADD COLUMN     "hp" INTEGER NOT NULL,
ADD COLUMN     "special" INTEGER,
ADD COLUMN     "specialAttack" INTEGER,
ADD COLUMN     "specialDefense" INTEGER,
ADD COLUMN     "speed" INTEGER NOT NULL,
ADD CONSTRAINT "pokemon_form_stat_pkey" PRIMARY KEY ("formId", "generationId");

-- AlterTable
ALTER TABLE "pokemon_form_type" DROP CONSTRAINT "pokemon_form_type_pkey",
DROP COLUMN "slot",
DROP COLUMN "typeId",
ADD COLUMN     "primaryTypeId" INTEGER NOT NULL,
ADD COLUMN     "secondaryTypeId" INTEGER,
ADD CONSTRAINT "pokemon_form_type_pkey" PRIMARY KEY ("formId", "generationId");

-- DropEnum
DROP TYPE "StatKind";

-- CreateIndex
CREATE INDEX "pokemon_form_type_primaryTypeId_idx" ON "pokemon_form_type"("primaryTypeId");

-- CreateIndex
CREATE INDEX "pokemon_form_type_secondaryTypeId_idx" ON "pokemon_form_type"("secondaryTypeId");

-- AddForeignKey
ALTER TABLE "pokemon_form_type" ADD CONSTRAINT "pokemon_form_type_primaryTypeId_fkey" FOREIGN KEY ("primaryTypeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_form_type" ADD CONSTRAINT "pokemon_form_type_secondaryTypeId_fkey" FOREIGN KEY ("secondaryTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
