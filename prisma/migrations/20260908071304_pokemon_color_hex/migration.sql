-- 加 pokemon_color.color（颜色筛选器的色块用色）。
-- 表里已经有 10 行，所以分三步：先加可空列、回填色值、再收紧成 NOT NULL。
-- 色值写在迁移里而不是只放在 seed 里，这样任何人跑完迁移就有完整数据，
-- 不依赖 seed 是否跑过。

-- 1. 先加可空列
ALTER TABLE "pokemon_color" ADD COLUMN "color" VARCHAR(7);

-- 2. 回填。PokeAPI 只给分类名不给色值，这十个是手写的
UPDATE "pokemon_color" SET "color" = CASE "slug"
  WHEN 'black'  THEN '#4A4A4A'
  WHEN 'blue'   THEN '#5B8FE0'
  WHEN 'brown'  THEN '#B1736C'
  WHEN 'gray'   THEN '#9EA0A3'
  WHEN 'green'  THEN '#63BC5A'
  WHEN 'pink'   THEN '#EE99AC'
  WHEN 'purple' THEN '#A45DC4'
  WHEN 'red'    THEN '#E4434A'
  WHEN 'white'  THEN '#E8E8E8'  -- 纯白在浅色底上看不见，压一点灰
  WHEN 'yellow' THEN '#F7D02C'
  ELSE '#888888'
END;

-- 3. 收紧成必填
ALTER TABLE "pokemon_color" ALTER COLUMN "color" SET NOT NULL;
