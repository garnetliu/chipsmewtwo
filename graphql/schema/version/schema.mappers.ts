/** 查库只给 id 和 slug，译名由字段 resolver 走 loader 取 */
export type VersionMapper = { id: string; slug: string };
