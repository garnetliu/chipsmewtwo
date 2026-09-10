-- 进化链从物种级挪到形态级。
--
-- 挂在 pokemon 上时，喵喵的三个形态会混进同一条链（数据源那边就是这么给的），
-- 查出来的「家族」答不出「伽勒尔喵喵变不了猫老大」。挂到 pokemon_form 上之后
-- 关都线、阿罗拉线、伽勒尔线各自一条链。
--
-- 同时去掉 sourceId：链是 pokemon_evolution 那些边的连通分量，属于派生数据，
-- 不需要记数据源的编号来对账，边导入完之后算一遍回填就行。
-- 现存的两行链是按物种级建的，删掉 sourceId 后没有任何形态指向它们，一并清掉。
DELETE FROM "evolution_chain";

-- DropForeignKey
ALTER TABLE "pokemon" DROP CONSTRAINT "pokemon_evolutionChainId_fkey";

-- DropIndex
DROP INDEX "evolution_chain_sourceId_key";

-- DropIndex
DROP INDEX "pokemon_evolutionChainId_idx";

-- AlterTable
ALTER TABLE "evolution_chain" DROP COLUMN "sourceId";

-- AlterTable
ALTER TABLE "pokemon" DROP COLUMN "evolutionChainId";

-- AlterTable
ALTER TABLE "pokemon_form" ADD COLUMN     "evolutionChainId" INTEGER;

-- CreateIndex
CREATE INDEX "pokemon_form_evolutionChainId_idx" ON "pokemon_form"("evolutionChainId");

-- AddForeignKey
ALTER TABLE "pokemon_form" ADD CONSTRAINT "pokemon_form_evolutionChainId_fkey" FOREIGN KEY ("evolutionChainId") REFERENCES "evolution_chain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

