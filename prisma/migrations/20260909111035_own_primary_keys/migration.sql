-- 主键不再借用数据源的编号。
--
-- item.id 原本是 PokeAPI 的道具编号（80~2232，稀疏），region.id 是它的地区编号，
-- type / pokemon_color / pokedex / version_group / version 虽然 schema 里写着
-- autoincrement，但 seed 一直显式塞数据源的 id 进去，序列从没被用过。
-- 现在这些表的主键一律是库自己的自增值，跨表引用走 slug。
--
-- 现有 id 全部作废，所以清表重灌：字典表本来就是从数据源拉的，跑一次 seed 就回来；
-- 宝可梦数据是按需补的，访问页面时会重新拉。auth 那四张表跟这些没有外键关联，不受影响。
TRUNCATE TABLE "region", "item", "evolution_chain" RESTART IDENTITY CASCADE;

-- 进化链没有 slug 可当业务键，留一列记数据源的链编号，导入时靠它判断是否已建过
ALTER TABLE "evolution_chain" ADD COLUMN "sourceId" INTEGER NOT NULL;
CREATE UNIQUE INDEX "evolution_chain_sourceId_key" ON "evolution_chain"("sourceId");

-- item 和 region 原本是「外部给值」的主键，现在补上序列
CREATE SEQUENCE item_id_seq;
ALTER TABLE "item" ALTER COLUMN "id" SET DEFAULT nextval('item_id_seq');
ALTER SEQUENCE item_id_seq OWNED BY "item"."id";

CREATE SEQUENCE region_id_seq;
ALTER TABLE "region" ALTER COLUMN "id" SET DEFAULT nextval('region_id_seq');
ALTER SEQUENCE region_id_seq OWNED BY "region"."id";
