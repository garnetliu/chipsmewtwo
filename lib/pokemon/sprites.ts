/**
 * 图片地址。
 *
 * 文件名存在库里（Form.imageName / Item.imageName），这里只负责拼前缀 ——
 * 图片按数据源自己的编号命名，地区形态是一万开头的另一套（阿罗拉六尾的图是
 * 10103.png，不是 37.png），从 Pokemon.id 或 slug 都推不出来。
 * 而且数据源并不是每条都有图：156 个道具里 38 个没有，拼出来的地址会是 404。
 *
 * 图片本身来自 PokeAPI 的 sprites 仓库，用 jsDelivr 分发。official-artwork
 * 那批就是宝可梦官方图鉴在用的原图（跟 assets.pokemon.com 上的同名文件比过
 * sha256，逐字节相同），所以画质上没有更好的来源。
 *
 * 版本钉死在一个 commit 上，不用 @master：
 *   @master     cache-control: max-age=604800, s-maxage=43200   （CDN 边缘只留 12 小时）
 *   @<commit>   cache-control: max-age=31536000, immutable      （一年）
 * 钉住之后上游换图也不会让页面当场跟着变。
 *
 * 要升级：换下面的 SPRITES_COMMIT，翻一眼 PokeAPI/sprites 的提交记录确认没有
 * 删文件或改目录，然后重跑一次导入 —— 文件名可能也变了。
 */

/** PokeAPI/sprites 的 commit。见文件头，不要改成 @master 或分支名 */
const SPRITES_COMMIT = "712e6d9f915a1d2bdfbe991d04eea75e3ad950e7";

const BASE = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@${SPRITES_COMMIT}/sprites`;

/** 官方美术图，475×475，详情页用。参数是 Form.fullImage */
export function fullImageUrl(fileName: string): string {
  return `${BASE}/pokemon/other/official-artwork/${fileName}`;
}

/** 点阵图，96×96，几百字节，列表缩略图用。参数是 Form.detailImage */
export function detailImageUrl(fileName: string): string {
  return `${BASE}/pokemon/${fileName}`;
}

/** 道具图标。官方那边没有道具图，这一类只有这一个来源。参数是 Item.imageName */
export function itemImageUrl(imageName: string): string {
  return `${BASE}/items/${imageName}`;
}
