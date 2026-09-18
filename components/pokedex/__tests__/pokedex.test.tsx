import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Card, PokeCard } from "@/components/pokedex/card";
import { DataTable, DataTableCell, DataTableHead } from "@/components/pokedex/data-table";
import { GenChip } from "@/components/pokedex/gen-chip";
import { typeColorVar, versionColorVar, versionInkVar } from "@/components/pokedex/token";
import { TypeTag } from "@/components/pokedex/type-tag";
import { VerBadge } from "@/components/pokedex/ver-badge";

test("属性色和版本色按 slug 拼 token，查不到落到 unknown", () => {
  expect(typeColorVar("fire")).toBe("var(--color-type-fire, var(--color-type-unknown))");
  expect(versionColorVar("black-2")).toBe(
    "var(--color-version-black-2, var(--color-version-unknown))",
  );
  // 浅底版本另有 ink 变量，其余版本靠 var() 兜底值落回白字
  expect(versionInkVar("yellow")).toBe("var(--color-version-yellow-ink, #fff)");
});

test("slug 里的杂字符不会漏进 var()", () => {
  expect(typeColorVar("fire); background: red; --x:(")).toBe(
    "var(--color-type-firebackgroundred--x, var(--color-type-unknown))",
  );
});

test("TypeTag 把属性色写进行内样式", () => {
  render(<TypeTag slug="grass">草</TypeTag>);
  const tag = screen.getByText("草");
  expect(tag.style.background).toContain("--color-type-grass");
  expect(tag.className).toContain("text-white");
});

test("VerBadge 同时给出底色和字色", () => {
  render(<VerBadge slug="yellow">黄</VerBadge>);
  const badge = screen.getByText("黄");
  expect(badge.style.background).toContain("--color-version-yellow");
  expect(badge.style.color).toContain("--color-version-yellow-ink");
});

test("GenChip 选中态标在 data-selected 和 aria-pressed 上", () => {
  render(
    <>
      <GenChip>Gen 1</GenChip>
      <GenChip selected>Gen 3</GenChip>
    </>,
  );
  const idle = screen.getByRole("button", { name: "Gen 1" });
  const active = screen.getByRole("button", { name: "Gen 3" });
  expect(idle.hasAttribute("data-selected")).toBe(false);
  expect(idle.getAttribute("aria-pressed")).toBe("false");
  expect(active.getAttribute("data-selected")).toBe("true");
  expect(active.getAttribute("aria-pressed")).toBe("true");
});

test("PokeCard 在 Card 之上加 hover 抬升，且 className 能覆盖", () => {
  const { container } = render(
    <>
      <Card className="p-4">卡片</Card>
      <PokeCard className="p-5">可点卡片</PokeCard>
    </>,
  );
  const [card, poke] = Array.from(container.querySelectorAll("div"));
  expect(card.className).toContain("shadow-(--shadow-pokedex)");
  expect(card.className).toContain("p-4");
  expect(poke.getAttribute("data-slot")).toBe("poke-card");
  expect(poke.className).toContain("hover:-translate-y-0.5");
  expect(poke.className).toContain("p-5");
});

test("DataTable 的表头和单元格带上各自的排版", () => {
  const { container } = render(
    <DataTable>
      <tbody>
        <tr>
          <DataTableHead>版本</DataTableHead>
          <DataTableCell>红</DataTableCell>
        </tr>
      </tbody>
    </DataTable>,
  );
  expect(container.querySelector("table")?.className).toContain("text-[13px]");
  expect(screen.getByText("版本").className).toContain("py-[0.65rem]");
  expect(screen.getByText("红").className).toContain("border-t");
});
