-- 兜底说明改回独立表。
--
-- 上一次迁移把它压成了 evolution.conditionNote 一列，但这一列存的恰好是
-- 给用户看的展示文案（「在磁场区域升级」这类），是最需要多语言的那种内容。
-- 单列只能存一种语言，而且用不上 lib/pokemon/language.ts 的 pickByLanguage
-- 那套「请求语言 → 默认语言 → 有的第一条」回退 —— 库里另外 20 张多语言表
-- 都是独立表，没理由让这一处特殊。
-- AlterTable
ALTER TABLE "evolution" DROP COLUMN "conditionNote";

-- CreateTable
CREATE TABLE "evolution_note" (
    "evolutionId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "evolution_note_pkey" PRIMARY KEY ("evolutionId","languageCode")
);

-- AddForeignKey
ALTER TABLE "evolution_note" ADD CONSTRAINT "evolution_note_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_note" ADD CONSTRAINT "evolution_note_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

