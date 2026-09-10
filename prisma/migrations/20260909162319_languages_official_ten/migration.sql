-- 语言从 6 种扩到 10 种：宝可梦官方游戏的 9 种语言，加上日文假名表记。
--
-- 新增 ko / fr / de / es / it 不需要迁移 —— language 表的行是 seed 从
-- lib/pokeapi/language.ts 的 LANGUAGES 常量灌的，跑一次 seed 就有。
-- 这条迁移只负责删掉 ja-Latn（罗马字），因为 upsert 不会删行。
--
-- 为什么删：整个字典集里 ja-roma 只有 1 条有值，而且那条属于被过滤掉的
-- 非标准属性（stellar = " Stella"，连开头空格都没清）。库里合计 5 行。
--
-- language 上的外键是 RESTRICT，所以得先清引用行。遍历而不是写 20 条
-- DELETE：按需拉的那几张表（form_description_i18n 之类）在不同机器上
-- 存的宝可梦不一样，漏一张就是迁移在别人机器上失败。
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
    WHERE k.confrelid = 'language'::regclass
  LOOP
    EXECUTE format('DELETE FROM %I WHERE "languageCode" = %L', t, 'ja-Latn');
  END LOOP;
END $$;

DELETE FROM "language" WHERE code = 'ja-Latn';
