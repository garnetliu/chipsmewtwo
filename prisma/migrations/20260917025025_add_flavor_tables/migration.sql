-- CreateTable
CREATE TABLE "item_flavor_i18n" (
    "itemId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "item_flavor_i18n_pkey" PRIMARY KEY ("itemId","groupId","languageCode")
);

-- CreateTable
CREATE TABLE "ability_flavor_i18n" (
    "abilityId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ability_flavor_i18n_pkey" PRIMARY KEY ("abilityId","groupId","languageCode")
);

-- CreateTable
CREATE TABLE "move_flavor_i18n" (
    "moveId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "move_flavor_i18n_pkey" PRIMARY KEY ("moveId","groupId","languageCode")
);

-- CreateIndex
CREATE INDEX "item_flavor_i18n_groupId_idx" ON "item_flavor_i18n"("groupId");

-- CreateIndex
CREATE INDEX "ability_flavor_i18n_groupId_idx" ON "ability_flavor_i18n"("groupId");

-- CreateIndex
CREATE INDEX "move_flavor_i18n_groupId_idx" ON "move_flavor_i18n"("groupId");

-- AddForeignKey
ALTER TABLE "item_flavor_i18n" ADD CONSTRAINT "item_flavor_i18n_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_flavor_i18n" ADD CONSTRAINT "item_flavor_i18n_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_flavor_i18n" ADD CONSTRAINT "item_flavor_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_flavor_i18n" ADD CONSTRAINT "ability_flavor_i18n_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "ability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_flavor_i18n" ADD CONSTRAINT "ability_flavor_i18n_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_flavor_i18n" ADD CONSTRAINT "ability_flavor_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_flavor_i18n" ADD CONSTRAINT "move_flavor_i18n_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_flavor_i18n" ADD CONSTRAINT "move_flavor_i18n_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_flavor_i18n" ADD CONSTRAINT "move_flavor_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
