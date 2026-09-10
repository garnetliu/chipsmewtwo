// noinspection ES6UnusedImports

/**
 * 把 Apollo 的 masking 类型换成 codegen 那一套实现。
 *
 * 默认走的是 PreserveTypes —— 那里面 FragmentType<T> 直接是 never、
 * MaybeMasked/Unmasked 是恒等类型，等于类型层面完全不 masking。于是运行时
 * dataMasking 真的删了字段，类型上却还看得见，类型就撒谎了。
 *
 * 配套 codegen.ts 里的 inlineFragmentTypes: "mask" —— 那个选项生成
 * " $fragmentRefs" 标记，GraphQLCodegenDataMasking 靠它算出遮掉哪些字段。
 *
 * 两套实现的定义分别在：
 *   node_modules/@apollo/client/masking/PreserveTypes.d.ts
 *   node_modules/@apollo/client/masking/GraphQLCodegenDataMasking.d.ts
 *
 * @see https://www.apollographql.com/docs/react/data/fragments
 *
 * 两行 import 都不能删：
 * - "@apollo/client" 那行是为了让这个文件算模块，否则下面的 declare module
 *   变成「重新声明一个同名模块」而不是「扩展它」
 * - GraphQLCodegenDataMasking 那行 IDE 可能报未使用，那是误报（它在下面的
 *   extends 里）。删掉之后 tsconfig 的 skipLibCheck 会把错误吞掉，
 *   masking 静默退回 PreserveTypes，症状是 useFragment 的 data 变成数组类型
 */
import "@apollo/client";

import type { GraphQLCodegenDataMasking } from "@apollo/client/masking";

declare module "@apollo/client" {
  // 空接口就是模块扩展的写法本身，没有成员可加
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TypeOverrides extends GraphQLCodegenDataMasking.TypeOverrides {}
}
