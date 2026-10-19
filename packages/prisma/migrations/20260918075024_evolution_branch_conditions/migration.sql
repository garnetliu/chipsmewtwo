-- AlterTable
ALTER TABLE "evolution" ADD COLUMN     "conditionChance" INTEGER,
ADD COLUMN     "conditionExpression" TEXT;

-- CreateTable
CREATE TABLE "evolution_nature" (
    "evolutionId" INTEGER NOT NULL,
    "natureSlug" TEXT NOT NULL,

    CONSTRAINT "evolution_nature_pkey" PRIMARY KEY ("evolutionId","natureSlug")
);

-- CreateIndex
CREATE INDEX "evolution_nature_natureSlug_idx" ON "evolution_nature"("natureSlug");

-- AddForeignKey
ALTER TABLE "evolution_nature" ADD CONSTRAINT "evolution_nature_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_nature" ADD CONSTRAINT "evolution_nature_natureSlug_fkey" FOREIGN KEY ("natureSlug") REFERENCES "nature"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
