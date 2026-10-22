-- 形态的图片拆成大图和小图两列。
--
-- imageName 原本只存一个文件名，现在改名 fullImage（475×475 的官方美术图），
-- 另加 detailImage（96×96 的点阵图，列表缩略图用）。
--
-- 两列各自照数据源的对应字段填，不共用一个值 —— 现在两种图在数据源里同名、
-- 只是放在不同目录，但哪天某个形态只有其中一种，两列就能如实反映。
-- 已有的行 detailImage 先留空，重新导入时补上。
ALTER TABLE "form" RENAME COLUMN "imageName" TO "fullImage";
ALTER TABLE "form" ADD COLUMN "detailImage" TEXT;
