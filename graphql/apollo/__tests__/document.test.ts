import { readFileSync } from "node:fs";

import {
  buildASTSchema,
  type DocumentNode,
  extendSchema,
  type GraphQLSchema,
  Kind,
  parse,
  validate,
  visit,
} from "graphql";
import { describe, expect, test } from "vitest";

import * as documents from "@/graphql/apollo/query";
import { typeDefs } from "@/graphql/schema/typeDefs.generated";

/**
 * 服务端 SDL 加上客户端那一条 @unmask —— codegen 也是这么并的（见 codegen.ts），
 * 少了它每一处 @unmask 都会被判成未知指令
 */
const schema: GraphQLSchema = extendSchema(
  buildASTSchema(typeDefs),
  parse(readFileSync("graphql/client-directives.graphql", "utf8")),
);

/** 页面组件只从 @/graphql/apollo/query 取 document，这里就按导出的全量跑 */
const ALL = Object.entries(documents) as Array<[string, DocumentNode]>;

/**
 * 列表查询不许出现的字段。全是「一条要摊成几十行」的那种，只给详情页用。
 *
 * 四个域现在都是 XxxSummary 进列表、Xxx 进详情，forms / evolutionChain /
 * versionStats / availability 这些在 Summary 上根本没有，SDL 层就拦住了。
 * 这条用例挡的是 SDL 拦不住的那部分 —— descriptions、stats、abilities 挂在 Form 上，
 * 列表和详情共用同一个 Form 类型
 */
const HEAVY_FIELDS = [
  "descriptions",
  "stats",
  "evolutionChain",
  "versionStats",
  "availability",
  "forms",
  "abilities",
];

/** document 里选到的全部字段名，fragment 定义也算 —— 列表查询的字段都藏在 fragment 里 */
function fieldNames(document: DocumentNode): string[] {
  const names: string[] = [];

  visit(document, {
    [Kind.FIELD]: (node) => {
      names.push(node.name.value);
    },
  });

  return names;
}

describe("每个 document 都对得上 SDL", () => {
  test.for(ALL)("%s", ([, document]) => {
    expect(validate(schema, document)).toEqual([]);
  });
});

describe("列表查询不带详情页才要的重字段", () => {
  const lists = ALL.filter(([name]) => name.endsWith("_LIST"));

  // 四个列表页各一个，少了哪个都说明这里漏跑了
  test("四个列表 document 都在", () => {
    expect(lists.map(([name]) => name).sort()).toEqual([
      "GET_ABILITY_LIST",
      "GET_ITEM_LIST",
      "GET_MOVE_LIST",
      "GET_POKEMON_LIST",
    ]);
  });

  test.for(lists)("%s", ([, document]) => {
    expect(fieldNames(document).filter((name) => HEAVY_FIELDS.includes(name))).toEqual([]);
  });
});
