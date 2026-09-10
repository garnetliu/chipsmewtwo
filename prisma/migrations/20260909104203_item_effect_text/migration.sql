-- CreateTable
CREATE TABLE "item_effect_text" (
    "itemId" INTEGER NOT NULL,
    "generationId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "shortEffect" TEXT,
    "effect" TEXT NOT NULL,

    CONSTRAINT "item_effect_text_pkey" PRIMARY KEY ("itemId","generationId","languageCode")
);

-- AddForeignKey
ALTER TABLE "item_effect_text" ADD CONSTRAINT "item_effect_text_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_effect_text" ADD CONSTRAINT "item_effect_text_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_effect_text" ADD CONSTRAINT "item_effect_text_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

