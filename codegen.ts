import { defineConfig } from "@eddeee888/gcg-typescript-resolver-files";
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "**/schema.graphql",
  generates: {
    "graphql/generated/": {
      preset: "client",
      documents: ["app/**/*.{ts,tsx}", "graphql/apollo/**/*.{ts,tsx}"],
      config: {
        useTypeImports: true,
        /**
         * 生成带 " $fragmentRefs" 标记的类型，Apollo 的 GraphQLCodegenDataMasking
         * 靠这个标记在类型层面遮住 fragment 字段，跟运行时的 dataMasking 配套。
         * 类型那一侧还要 type/apollo.d.ts 把 TypeOverrides 换掉才完整。
         *
         * @see https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations#inlineFragmentTypes
         * @see https://www.apollographql.com/docs/react/data/fragments
         */
        inlineFragmentTypes: "mask",
        /**
         * 认识 @unmask 指令：加了它的 fragment spread 不遮，父级直接能读。
         * 指令本身的声明在 graphql/client-directives.graphql。
         *
         * @see https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations#customDirectives
         */
        customDirectives: { apolloUnmask: true },
      },
      /**
       * 关掉 codegen 自己那套 masking 运行时（useFragment / getFragmentData）——
       * 官方明说两者「不能同时使用，不兼容只存在于运行时行为」，
       * 解 fragment 统一用 @apollo/client/react 的 useFragment。
       *
       * 注意这个开关只管运行时那套函数，不管类型 —— masked 类型是上面
       * inlineFragmentTypes: "mask" 生成的，两件事别搞混。
       *
       * @see https://www.apollographql.com/docs/react/data/fragments
       * @see https://the-guild.dev/graphql/codegen/plugins/presets/preset-client
       */
      presetConfig: { fragmentMasking: false },
    },
    "graphql/schema": defineConfig({
      mergeSchema: false,
      add: {
        "./types.generated.ts": {
          content: "/* eslint-disable @typescript-eslint/no-explicit-any */",
        },
      },
      typesPluginsConfig: { useTypeImports: true, contextType: "../context#MyContext" },
    }),
  },
  hooks: { afterAllFileWrite: ["eslint --fix"] },
};

export default config;
