-- 清掉扩语言之前按需拉回来的译名，让它们重新拉一次。
--
-- 这几张表的内容是 PokeAPISource 在「查库 miss 才拉」时写的缓存，写的时候
-- 只支持 6 种语言，所以老行只有中日英。而 PokeAPISource 不会回头补 ——
-- 库里有行就算命中，不再请求数据源。结果是同一个查询对老宝可梦回退成中文、
-- 对新拉的正常返回韩文，行为不一致。
--
-- 删掉之后下次访问页面会重新拉，补齐 10 种语言。字典表不受影响，
-- 那些是 seed 从快照灌的，跑一次 seed 就是新的。
DELETE FROM "form_description_i18n";
DELETE FROM "pokemon_i18n";
DELETE FROM "form_i18n";
