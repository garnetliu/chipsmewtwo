-- AlterTable
ALTER TABLE "form" ADD COLUMN     "isBattleOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "form_variant" ADD COLUMN     "isBattleOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pokemon_i18n" DROP COLUMN "genus";

-- CreateTable
CREATE TABLE "form_genus_i18n" (
    "formId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "genus" TEXT NOT NULL,

    CONSTRAINT "form_genus_i18n_pkey" PRIMARY KEY ("formId","languageCode")
);

-- CreateIndex
CREATE INDEX "form_genus_i18n_genus_idx" ON "form_genus_i18n"("genus");

-- AddForeignKey
ALTER TABLE "form_genus_i18n" ADD CONSTRAINT "form_genus_i18n_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_genus_i18n" ADD CONSTRAINT "form_genus_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

