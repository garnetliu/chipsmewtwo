-- 形态和道具各加一列存图片文件名。
--
-- 图片按数据源自己的编号命名，地区形态是一万开头的另一套（阿罗拉六尾的图是
-- 10103.png，不是 37.png），从 Pokemon.id 或 Form.slug 都推不出来，只能导入时记下。
--
-- 可空：数据源没收录图的条目就是 null，跟「还没导入」用同一个值表示 ——
-- 这两种情况在页面上都是没图可显示，不需要区分。
ALTER TABLE "form" ADD COLUMN "imageName" TEXT;
ALTER TABLE "item" ADD COLUMN "imageName" TEXT;
