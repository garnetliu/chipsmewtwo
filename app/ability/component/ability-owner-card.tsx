import { PokeCard } from "@/components/pokedex/card";
import { DetailImage, DetailLink } from "@/components/pokedex/detail-shell";
import { typeGradient } from "@/components/pokedex/token";
import { TypeTag } from "@/components/pokedex/type-tag";
import type { GET_ABILITY } from "@/graphql/apollo/query";
import type { DocumentType } from "@/graphql/generated";

/** 详情查询里「拥有该特性的 Pokémon」的一项。document 全带 @unmask，字段直接读 */
type Owner = NonNullable<DocumentType<typeof GET_ABILITY>["abilityBySlug"]>["pokemon"][number];

interface IProps {
  pokemon: Owner;
}

/**
 * 拥有者网格里的一张卡。
 *
 * 这里摆的是物种不是形态，所以既不标隐藏特性，也不区分形态 ——
 * 同一只的多个形态在库里已经合成一条了
 */
export function AbilityOwnerCard(props: Readonly<IProps>) {
  const { pokemon } = props;

  // 一条译名都没有时回退到英文 slug，别把空白卡片摆出去
  const name = pokemon.name ?? pokemon.slug;
  const types = pokemon.defaultForm?.types ?? [];

  // 色块底色是第一属性色的 135° 渐变，和精灵列表卡同一档
  const background = typeGradient(types[0]?.slug ?? "unknown");

  return (
    <DetailLink href={`/pokemon/${pokemon.slug}`} backLabel="特性详情">
      <PokeCard className="flex items-center gap-3 p-4">
        <DetailImage
          src={pokemon.defaultForm?.detailImageUrl}
          alt={name}
          sizes="48px"
          className="size-12 rounded-lg"
          style={{ background }}
        />

        <div className="min-w-0">
          {/* id 就是全国图鉴编号，补到四位，和精灵列表卡一个写法 */}
          <div className="font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
            {`No.${String(pokemon.id).padStart(4, "0")}`}
          </div>

          <div className="truncate text-[14px] font-bold">{name}</div>

          <div className="mt-1 flex flex-wrap gap-1">
            {types.map((type) => (
              <TypeTag key={type.id} slug={type.slug}>
                {type.name ?? type.slug}
              </TypeTag>
            ))}
          </div>
        </div>
      </PokeCard>
    </DetailLink>
  );
}
