-- pokemon_color → color。
--
-- 这张表是颜色字典（10 行：black / blue / brown ……），不是「宝可梦的颜色」——
-- 后者挂在形态上，是 form_color。pokemon_ 前缀从数据源的资源名 /pokemon-color
-- 抄来的，在库里不区分任何东西：没有第二种颜色分类。
--
-- type 表上那个 color 列存的是十六进制值（属性徽章色），跟这张表不是一回事，
-- 但一个是列名一个是表名，不冲突。
ALTER TABLE "pokemon_color" RENAME TO "color";
ALTER TABLE "color" RENAME CONSTRAINT "pokemon_color_pkey" TO "color_pkey";
ALTER INDEX "pokemon_color_slug_key" RENAME TO "color_slug_key";

ALTER TABLE "pokemon_color_i18n" RENAME TO "color_i18n";
ALTER TABLE "color_i18n" RENAME CONSTRAINT "pokemon_color_i18n_pkey" TO "color_i18n_pkey";
ALTER TABLE "color_i18n" RENAME CONSTRAINT "pokemon_color_i18n_colorId_fkey" TO "color_i18n_colorId_fkey";
ALTER TABLE "color_i18n" RENAME CONSTRAINT "pokemon_color_i18n_languageCode_fkey" TO "color_i18n_languageCode_fkey";
