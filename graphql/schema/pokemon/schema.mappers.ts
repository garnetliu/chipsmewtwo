/**
 * GraphQL 类型的 parent 形状。
 *
 * 不写的话，codegen 会拿生成的 Pokemon 类型当 parent，于是每个非空字段都得由
 * 上一层塞好 —— 而 artworkUrl 这种是 resolver 现算的，PokemonDbSource 不返回它。
 * 这里声明「查库只给 id 和 slug，其余字段各自解析」。
 */
export type PokemonMapper = { id: string; slug: string };
