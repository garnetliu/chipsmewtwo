-- AlterTable
ALTER TABLE "evolution" ADD COLUMN     "fromVariantId" INTEGER,
ADD COLUMN     "toVariantId" INTEGER;

-- CreateTable
CREATE TABLE "form_variant" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "fullImage" TEXT,
    "detailImage" TEXT,
    "primaryTypeId" INTEGER,
    "secondaryTypeId" INTEGER,

    CONSTRAINT "form_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_variant_i18n" (
    "variantId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "form_variant_i18n_pkey" PRIMARY KEY ("variantId","languageCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_variant_slug_key" ON "form_variant"("slug");

-- CreateIndex
CREATE INDEX "form_variant_formId_idx" ON "form_variant"("formId");

-- CreateIndex
CREATE INDEX "form_variant_primaryTypeId_idx" ON "form_variant"("primaryTypeId");

-- CreateIndex
CREATE INDEX "form_variant_i18n_name_idx" ON "form_variant_i18n"("name");

-- AddForeignKey
ALTER TABLE "form_variant" ADD CONSTRAINT "form_variant_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_variant" ADD CONSTRAINT "form_variant_primaryTypeId_fkey" FOREIGN KEY ("primaryTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_variant" ADD CONSTRAINT "form_variant_secondaryTypeId_fkey" FOREIGN KEY ("secondaryTypeId") REFERENCES "type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_variant_i18n" ADD CONSTRAINT "form_variant_i18n_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "form_variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_variant_i18n" ADD CONSTRAINT "form_variant_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_fromVariantId_fkey" FOREIGN KEY ("fromVariantId") REFERENCES "form_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution" ADD CONSTRAINT "evolution_toVariantId_fkey" FOREIGN KEY ("toVariantId") REFERENCES "form_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
