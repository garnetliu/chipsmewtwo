import { expect, test } from "vitest";

import { resolveLanguageTag } from "@/lib/pokemon/language";

/**
 * 测试框架自身的冒烟：能解析 TS、能走通 @/ 路径别名、断言能跑。
 * 顺带钉住 resolveLanguageTag 的简繁区分 —— 这条最容易在改动里被弄丢。
 */
test("resolveLanguageTag 把地区码补成字形码来区分简繁", () => {
  expect(resolveLanguageTag("zh-CN")).toBe("zh-Hans");
  expect(resolveLanguageTag("zh-TW")).toBe("zh-Hant");
  expect(resolveLanguageTag("en-US")).toBe("en");
  expect(resolveLanguageTag("not a locale")).toBeNull();
});
