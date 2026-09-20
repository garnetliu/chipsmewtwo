-- AlterTable
ALTER TABLE "form" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "weight" INTEGER;

-- AlterTable
ALTER TABLE "form_stat" ADD COLUMN     "evAttack" INTEGER,
ADD COLUMN     "evDefense" INTEGER,
ADD COLUMN     "evHp" INTEGER,
ADD COLUMN     "evSpecialAttack" INTEGER,
ADD COLUMN     "evSpecialDefense" INTEGER,
ADD COLUMN     "evSpeed" INTEGER;

-- AlterTable
ALTER TABLE "pokemon" ADD COLUMN     "evoStage" INTEGER,
ADD COLUMN     "genderCode" INTEGER,
ADD COLUMN     "growthRateId" INTEGER;

-- CreateTable
CREATE TABLE "growth_rate" (
    "id" INTEGER NOT NULL,

    CONSTRAINT "growth_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_rate_i18n" (
    "growthRateId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "growth_rate_i18n_pkey" PRIMARY KEY ("growthRateId","languageCode")
);

-- CreateTable
CREATE TABLE "egg_group" (
    "id" INTEGER NOT NULL,

    CONSTRAINT "egg_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egg_group_i18n" (
    "eggGroupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "egg_group_i18n_pkey" PRIMARY KEY ("eggGroupId","languageCode")
);

-- CreateTable
CREATE TABLE "pokemon_egg_group" (
    "pokemonId" INTEGER NOT NULL,
    "eggGroupId" INTEGER NOT NULL,

    CONSTRAINT "pokemon_egg_group_pkey" PRIMARY KEY ("pokemonId","eggGroupId")
);

-- CreateTable
CREATE TABLE "pokemon_vital" (
    "pokemonId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "captureRate" INTEGER NOT NULL,
    "baseHappiness" INTEGER NOT NULL,
    "hatchCycles" INTEGER NOT NULL,

    CONSTRAINT "pokemon_vital_pkey" PRIMARY KEY ("pokemonId","groupId")
);

-- CreateTable
CREATE TABLE "form_presence" (
    "formId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "form_presence_pkey" PRIMARY KEY ("formId","groupId")
);

-- CreateIndex
CREATE INDEX "pokemon_egg_group_eggGroupId_idx" ON "pokemon_egg_group"("eggGroupId");

-- CreateIndex
CREATE INDEX "form_presence_groupId_idx" ON "form_presence"("groupId");

-- AddForeignKey
ALTER TABLE "pokemon" ADD CONSTRAINT "pokemon_growthRateId_fkey" FOREIGN KEY ("growthRateId") REFERENCES "growth_rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_rate_i18n" ADD CONSTRAINT "growth_rate_i18n_growthRateId_fkey" FOREIGN KEY ("growthRateId") REFERENCES "growth_rate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_rate_i18n" ADD CONSTRAINT "growth_rate_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_group_i18n" ADD CONSTRAINT "egg_group_i18n_eggGroupId_fkey" FOREIGN KEY ("eggGroupId") REFERENCES "egg_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egg_group_i18n" ADD CONSTRAINT "egg_group_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_egg_group" ADD CONSTRAINT "pokemon_egg_group_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_egg_group" ADD CONSTRAINT "pokemon_egg_group_eggGroupId_fkey" FOREIGN KEY ("eggGroupId") REFERENCES "egg_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_vital" ADD CONSTRAINT "pokemon_vital_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_vital" ADD CONSTRAINT "pokemon_vital_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_presence" ADD CONSTRAINT "form_presence_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_presence" ADD CONSTRAINT "form_presence_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

