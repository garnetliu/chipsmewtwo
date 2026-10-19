-- AlterTable
ALTER TABLE "item_form_change" ADD COLUMN     "dlcId" INTEGER;

-- AlterTable
ALTER TABLE "pokedex" ADD COLUMN     "dlcId" INTEGER;

-- CreateTable
CREATE TABLE "dlc" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "dlc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dlc_i18n" (
    "dlcId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "dlc_i18n_pkey" PRIMARY KEY ("dlcId","languageCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "dlc_slug_key" ON "dlc"("slug");

-- CreateIndex
CREATE INDEX "dlc_groupId_idx" ON "dlc"("groupId");

-- CreateIndex
CREATE INDEX "item_form_change_dlcId_idx" ON "item_form_change"("dlcId");

-- CreateIndex
CREATE INDEX "pokedex_dlcId_idx" ON "pokedex"("dlcId");

-- AddForeignKey
ALTER TABLE "dlc" ADD CONSTRAINT "dlc_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dlc_i18n" ADD CONSTRAINT "dlc_i18n_dlcId_fkey" FOREIGN KEY ("dlcId") REFERENCES "dlc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dlc_i18n" ADD CONSTRAINT "dlc_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_form_change" ADD CONSTRAINT "item_form_change_dlcId_fkey" FOREIGN KEY ("dlcId") REFERENCES "dlc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokedex" ADD CONSTRAINT "pokedex_dlcId_fkey" FOREIGN KEY ("dlcId") REFERENCES "dlc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
