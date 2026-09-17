-- CreateTable
CREATE TABLE "z_move" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "damageClass" "MoveCategory",
    "power" INTEGER,
    "formId" INTEGER,
    "baseMoveId" INTEGER,
    "itemId" INTEGER,

    CONSTRAINT "z_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "z_move_i18n" (
    "zMoveId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "z_move_i18n_pkey" PRIMARY KEY ("zMoveId","languageCode")
);

-- CreateTable
CREATE TABLE "z_move_effect_i18n" (
    "zMoveId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "shortEffect" TEXT,
    "effect" TEXT NOT NULL,

    CONSTRAINT "z_move_effect_i18n_pkey" PRIMARY KEY ("zMoveId","languageCode")
);

-- CreateTable
CREATE TABLE "z_move_flavor_i18n" (
    "zMoveId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "z_move_flavor_i18n_pkey" PRIMARY KEY ("zMoveId","groupId","languageCode")
);

-- CreateTable
CREATE TABLE "max_move" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "power" INTEGER,
    "formId" INTEGER,

    CONSTRAINT "max_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "max_move_i18n" (
    "maxMoveId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "max_move_i18n_pkey" PRIMARY KEY ("maxMoveId","languageCode")
);

-- CreateTable
CREATE TABLE "max_move_effect_i18n" (
    "maxMoveId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "shortEffect" TEXT,
    "effect" TEXT NOT NULL,

    CONSTRAINT "max_move_effect_i18n_pkey" PRIMARY KEY ("maxMoveId","languageCode")
);

-- CreateTable
CREATE TABLE "max_move_flavor_i18n" (
    "maxMoveId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "max_move_flavor_i18n_pkey" PRIMARY KEY ("maxMoveId","groupId","languageCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "z_move_slug_key" ON "z_move"("slug");

-- CreateIndex
CREATE INDEX "z_move_typeId_idx" ON "z_move"("typeId");

-- CreateIndex
CREATE INDEX "z_move_formId_idx" ON "z_move"("formId");

-- CreateIndex
CREATE INDEX "z_move_i18n_name_idx" ON "z_move_i18n"("name");

-- CreateIndex
CREATE INDEX "z_move_flavor_i18n_groupId_idx" ON "z_move_flavor_i18n"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "max_move_slug_key" ON "max_move"("slug");

-- CreateIndex
CREATE INDEX "max_move_typeId_idx" ON "max_move"("typeId");

-- CreateIndex
CREATE INDEX "max_move_formId_idx" ON "max_move"("formId");

-- CreateIndex
CREATE INDEX "max_move_i18n_name_idx" ON "max_move_i18n"("name");

-- CreateIndex
CREATE INDEX "max_move_flavor_i18n_groupId_idx" ON "max_move_flavor_i18n"("groupId");

-- AddForeignKey
ALTER TABLE "z_move" ADD CONSTRAINT "z_move_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move" ADD CONSTRAINT "z_move_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move" ADD CONSTRAINT "z_move_baseMoveId_fkey" FOREIGN KEY ("baseMoveId") REFERENCES "move"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move" ADD CONSTRAINT "z_move_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_i18n" ADD CONSTRAINT "z_move_i18n_zMoveId_fkey" FOREIGN KEY ("zMoveId") REFERENCES "z_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_i18n" ADD CONSTRAINT "z_move_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_effect_i18n" ADD CONSTRAINT "z_move_effect_i18n_zMoveId_fkey" FOREIGN KEY ("zMoveId") REFERENCES "z_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_effect_i18n" ADD CONSTRAINT "z_move_effect_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_flavor_i18n" ADD CONSTRAINT "z_move_flavor_i18n_zMoveId_fkey" FOREIGN KEY ("zMoveId") REFERENCES "z_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_flavor_i18n" ADD CONSTRAINT "z_move_flavor_i18n_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "z_move_flavor_i18n" ADD CONSTRAINT "z_move_flavor_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move" ADD CONSTRAINT "max_move_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move" ADD CONSTRAINT "max_move_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_i18n" ADD CONSTRAINT "max_move_i18n_maxMoveId_fkey" FOREIGN KEY ("maxMoveId") REFERENCES "max_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_i18n" ADD CONSTRAINT "max_move_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_effect_i18n" ADD CONSTRAINT "max_move_effect_i18n_maxMoveId_fkey" FOREIGN KEY ("maxMoveId") REFERENCES "max_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_effect_i18n" ADD CONSTRAINT "max_move_effect_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_flavor_i18n" ADD CONSTRAINT "max_move_flavor_i18n_maxMoveId_fkey" FOREIGN KEY ("maxMoveId") REFERENCES "max_move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_flavor_i18n" ADD CONSTRAINT "max_move_flavor_i18n_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "max_move_flavor_i18n" ADD CONSTRAINT "max_move_flavor_i18n_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
