# 批次 1 · wasm 桥接层

**可与批次 2 并发。** 允许写入：`pkhex-wasm/**`、`lib/pkhex/runtime.ts`、`lib/pkhex/index.ts`、
`next.config.ts`、`docker-compose.yml`、`package.json`（只加 scripts）、`.gitignore`。
**不许碰** `lib/pkhex/types.ts`、`lib/pkhex/exports.ts`、`app/**`、`graphql/**`、`components/**`。

本机没有 dotnet 且装不了（macOS 13.3 Intel，.NET 9/10 官方都不支持）。**全部构建在 Docker 里跑。**

---

## 1-1 工程骨架 + Docker 跑通

**改哪里**：新建 `pkhex-wasm/`，含 `Directory.Build.props`、`Dockerfile`、`build.sh`、
`.gitignore`、`PkhexBridge.slnx`，两个工程 `src/PkhexBridge/`（`Microsoft.NET.Sdk`）和
`src/PkhexBridge.Wasm/`（`Microsoft.NET.Sdk.WebAssembly`），一个测试工程
`tests/PkhexBridge.Tests/`（xUnit）。`docker-compose.yml` 加 `profiles: ["tools"]` 的
`pkhex-build` service，NuGet 缓存用**命名卷**不要 bind mount。`package.json` 加
`pkhex:build` 和 `pkhex:shell` 两条 script。

**达到什么效果**：`pnpm pkhex:build` 能在容器里把三个工程都编过（此时还没接 PKHeX.Core）。

**怎么算验证通过**：`pnpm pkhex:build` 退出码 0，输出里能看到三个工程 build succeeded。

拆两个工程的理由：逻辑全在普通 SDK 的库里，xUnit 才测得到；wasm 工程只留 `[JSExport]` 转发壳。

**坑：镜像里要单独装 `python3`，而且必须装在 `dotnet workload install` 那一层之后。**
Linux 版的 emscripten 不自带 python，编 native 资产时会在
`WasmApp.Common.targets` 里报 `unable to find python in $PATH`，四个 `.c` 全编不过 ——
错误信息只字不提 python 是哪个包的事，很容易被当成 workload 没装全。
装的位置同样要命：`RUN apt-get install python3` 放在 workload 之前，
每改一次这行就把上面那层几百兆、要下 40 分钟的 workload 缓存整个作废。

## 1-2 crypto provider

**改哪里**：`src/PkhexBridge/` 加 `PKHeX.Core` 26.8.26 和 `BouncyCastle.Cryptography` 2.7.0 两个
包引用，写 `Crypto/ManagedAes.cs`、`Crypto/ManagedMd5.cs`、`Bridge.Init.cs`、`BridgeError.cs`。
测试 `tests/PkhexBridge.Tests/CryptoVectorTests.cs`。

**达到什么效果**：`RuntimeCryptographyProvider.Aes` / `.Md5` 挂上纯托管实现。
浏览器 wasm 上 `System.Security.Cryptography` 的 AES/MD5 会抛 `PlatformNotSupportedException`，
而 Gen7 的 MemeCrypto 和 BDSP 的整档校验都要用它们。

只需三种形状：AES-128-ECB-NoPadding、AES-128-CBC-NoPadding、MD5。**只直接
`new AesEngine()` / `new MD5Digest()`，不要走 `CipherUtilities.GetCipher(...)` 那种反射工厂** ——
裁剪会把它杀掉。

`Bridge.Initialize()` 幂等、返回 PKHeX.Core 版本串；`EnsureInitialized()` 给后面所有入口用。

**坑：`Initialize()` 里还要拨一次 `GameInfo.Strings`。**
`GameInfo.Strings` 是**全局静态**的，默认英文。相遇地点名走的是
`ILocation.GetEncounterLocation` → `GameInfo.GetLocationName`，读的就是这个全局值，
**不认 `Report(language)` 或局部 localizer 指定的语言**。不设的话，合法性报告里
二十几行全是中文、唯独「地点」那一行是英文 —— 而 zh-Hans 的地点表其实是全的，
这种缺法最容易被当成「PKHeX 没翻译」糊弄过去。所以要
`GameInfo.Strings = GameInfo.GetStrings("zh-Hans")`。
这和 `GetStringTables` 不冲突：那边显式调 `GameInfo.GetStrings(存档语言码)`，
仍然按存档语言走，全局值影响不到它。

顺带记一条上游事实：报告里的「遭遇类型」永远是英文。它来自
`IEncounterable.LongName`（硬编码英文 `Name` + 枚举名），PKHeX 自己在所有语言下都这样，
不要试图去修。

**怎么算验证通过**：`CryptoVectorTests` 绿。AES 用 FIPS-197 附录 C.1 的 AES-128 已知答案向量，
MD5 用 RFC 1321 的测试向量。这是唯一能证明 crypto 没写错且不依赖存档的手段。

## 1-3 handle 表 + 载入/导出

**改哪里**：`Handles.cs`、`Bridge.Save.cs`、`Dto.cs`、`BridgeJson.cs`、
`tools/FixtureGen/`、`tests/.../Fixtures.cs`、`tests/.../RoundTripTests.cs`。

**达到什么效果**：`LoadSave(byte[]) -> int`、`CloseSave(int)`、`ExportSave(int) -> byte[]`。

关键语义：`SaveFile.GetBoxSlotAtIndex` 返回的是 `.ToArray()` 出来的**脱离副本**，改了不会自动
回存档。所以个体 handle 记 `(存档handle, 槽位类型, box, slot, PKM副本)`，每个 setter 写完立刻
`SetBoxSlotAtIndex(pk, box, slot, EntityImportSettings.None)` flush 回去。
handle 按 `(sav, kind, box, slot)` 缓存，同一槽位重复取返回同一个 int。

API 事实（已核实 tag 26.08.26，不要凭记忆）：
- `SaveUtil.GetVariantSAV` **已不存在**，用 `SaveUtil.GetSaveFile(Memory<byte>, string? path = null)`
- `SaveFile.Write(BinaryExportSetting = None)` 返回 **`Memory<byte>`**，要 `.ToArray()`
- 只接受第 6～9 世代，其余抛 `PKHEX_UNSUPPORTED_GENERATION`

JSON **必须走 `JsonSerializerContext` 源生成**，`PublishTrimmed` 默认 true，反射式序列化运行期会炸。

`tools/FixtureGen` 用 `BlankSaveFile.Get(...)` 造空白存档写到 `public/pkhex-fixtures/`。
**实测过的结论**：只有 Gen6 / Gen7 / Gen7b / Gen8b(BDSP) 造出来的能被 `SaveUtil` 重新识别
（Gen6/7 还要手工补 `0x42454546` footer magic），SwSh/PLA/SV/ZA 的造不出能识别的。
自己复测一遍，把实际能造出来的写进报告。

**Gen8/Gen9 的缺口已经补上了，靠真存档，不是靠造。** 见下面的 1-9。

造夹具有三个坑，每一个都会让 `RoundTripTests` 以看不懂的方式挂掉：

- **补魔数要在 `Write()` 之前。** `Write()` 会按当前字节重算校验和；补在后面等于把刚算好的
  校验和作废，重新载入再导出就对不上。往 `sav.Data` 上写，别往 `Write()` 的返回值上写
- **Gen7b（皮伊）光补 BEEF 不够。** 它的块信息表不在文件末尾，在 `0xB8800 - 0x200`，
  所以 BEEF 要写到 `0xB8600 + 0x10`；`SaveUtil` 还会二次确认块信息表里第 19 项的 id 是
  `0x13`，那一处（`+0xB0`）也得补。两个补丁同样都在 `Write()` 之前
- **校验「认不认得回来」必须用副本。** `SaveFile` 是直接包住你传进去那段内存的，
  而第七世代的构造函数里有 `ClearMemeCrypto()`，会**原地**把签名区清零。
  拿原数组去 `SaveUtil.GetSaveFile(bytes)` 验一次，就等于把刚写好的夹具改坏了 ——
  症状是 Gen7 的 RoundTrip 在 `0x6BB00`(SM) / `0x6C100`(USUM) 起不一致，
  正好是 MemeCrypto 签名区的起点

另外：Gen7b 的队伍是一张指向箱子槽位的索引表，空白档里那张表还没建起来，
往 `SetPartySlotAtIndex` 里写会在 `GetPartyOffset` 直接越界。造夹具时跳过它的队伍，
`GetParty` 那边也要对越界兜底，否则用户传一份残档进来就是整页崩。

**怎么算验证通过**：`RoundTripTests` 绿 —— 载入后不做任何修改直接导出，**字节完全相同**。
这条挂了说明 checksum/加密路径有问题，后面全不用看。

## 1-4 读接口

**改哪里**：`Bridge.Save.cs` 补 `GetSaveInfo` / `GetBox` / `GetParty` / `GetStringTables`，
`Bridge.Mon.cs` 写 `GetMon` / `GetIVs` / `GetEVs` / `GetMoves`。测试 `ContractTests.cs`。

**达到什么效果**：返回的 JSON 形状和 `lib/pkhex/types.ts` 里的 `SaveInfo` / `SlotSummary` /
`MonDetail` / `PkhexStringTables` **逐字段对上**（camelCase）。那份文件是契约，读它，不要改它。

- `GetBox` / `GetParty` 返回定长数组，空槽是 `null`，队伍的 `box` 字段填 **-1**
- IV/EV/招式顺序统一 **HP, ATK, DEF, SPA, SPD, SPE**
- `maxXxx` 那批来自 `sav.BlankPKM` 上的 `PKM.MaxSpeciesID` 等
- `boxNames` 只在 `sav is IBoxDetailNameRead` 时有值，否则用 `GetDefaultBoxName(i)`
- `stringTables` 用 PKHeX 自带的本地化字符串表，按存档语言取

**怎么算验证通过**：`ContractTests` 对 `GetSaveInfo` / `GetMon` / `GetStringTables` 的 JSON
key 集合做快照断言，和 `lib/pkhex/types.ts` 的字段名逐个对照，缺一个都算不过。

## 1-5 十六个 setter

**改哪里**：`Bridge.Mon.cs`。测试 `MutatorTests.cs`、`NatureTests.cs`。

**达到什么效果**：`SetSpecies SetForm SetNickname SetLevel SetExp SetNature SetStatNature
SetAbilityIndex SetGender SetShiny SetHeldItem SetBall SetIVs SetEVs SetMoves SetFriendship`
全部可用，越界抛 `PKHEX_OUT_OF_RANGE`。

几个必须按这个写法来的（已核实源码）：

- **性格**：PK9 把性格拆成两个字节，`Nature` 在 `Data[0x20]`、`StatAlignment`（旧名 StatNature）
  在 `Data[0x21]`。`CommonEdits.SetNature` 在 `Format >= 8` 时**只写 `StatAlignment`**，
  所以 UI 上「性格」看着没变。正确写法是 `pk.Nature = value; pk.StatAlignment = value;` 两个一起写。
  没有 `Natures.ChangeAll` 这个东西。`SetStatNature` 单独暴露，只写薄荷
- **特性走 index 不走 ability id**：`CommonEdits.SetAbility(id)` 在 id 不在物种可选池里时
  **静默 return 不改**。所以接口收 0/1/2 的下标，内部走 `pk.RefreshAbility(n)`
- **种族**：`PersonalInfo` 按当前 Species/Form 解析，换完种族必须跟着修 Form（越界归 0）、
  `RefreshAbility`、Gender（`IsGenderValid()` 为假时按 `PersonalInfo.Gender` 的魔数重设），
  原本没昵称的要 `ClearNickname()`，最后 `Heal()`。不修就会留下上一个物种的形态特性性别
- **等级**：`CurrentLevel` 的 setter 会按成长曲线反算 EXP 并同步 `Stat_Level`，之后 `ResetPartyStats()`
- **闪光**：`IsShiny` 只读，必须走 `CommonEdits.SetIsShiny`
- **招式**：写完 `HealPP()`。另外记住一件事 —— **招式的合法性判定不在
  `LegalityAnalysis.Results` 里**，它单独挂在 `Info.Moves` / `Info.Relearn` 上，
  是 `MoveResult[]` 不是 `CheckResult`。`AssertValid()` 会把这两个数组算进
  `LegalityAnalysis.Valid`，但只遍历 `Results` 收集问题的话，一只「只有招式不合法」的个体
  会得到 `valid: false` 配一个**空的 issues 数组** —— 面板上就是「说你不合法，但一条理由都列不出」，
  用户完全无从下手，比直接报错还糟。要用
  `LegalityFormatting.AddMoves(ctx, Info.Moves, lines, pk.Context, state: false)` 和
  `AddRelearn(ctx, Info.Relearn, lines, state: false)` 把它们单独捞出来，
  标成 `CurrentMove` / `RelearnMove`。实测确认过：拿一只由相遇生成器造出来的合法个体，
  只把招式换成学不会的那一个，走 `Results` 一条都收不到

**怎么算验证通过**：
- `NatureTests`：对 PK8 和 PK9 调 `SetNature(mon, 3)`，断言 `Data[0x20] == 3 && Data[0x21] == 3`；
  再单独跑一次 `CommonEdits.SetNature` 断言它只改了 `0x21`，把上游行为钉成文档
- `MutatorTests`：16 项每项走 **改 → `ExportSave` → 重新 `LoadSave` → 读回来等于改的值**。
  **必须走导出再载入**，只看内存对象会漏掉 flush 和 checksum

## 1-6 JSExport 壳 + publish 落产物

**改哪里**：`src/PkhexBridge.Wasm/Program.cs`、`Exports.cs`，`build.sh` 补 publish 与拷贝。

**达到什么效果**：`Exports.cs` 和 `lib/pkhex/exports.ts` 的 `BridgeExports` **逐个方法对上**
（方法名、参数个数、参数类型）。里面只有转发，没有逻辑。

csproj 关键开关：`AllowUnsafeBlocks=true`（源生成器 emit unsafe）、
`WasmFingerprintAssets=false`（文件名不带哈希，git diff 干净）、
`RunAOTCompilation=false`（开了体积翻倍）、`WasmEnableThreads=false`（开了要 COOP/COEP，
会打断 Apollo 和外链图片）、`InvariantGlobalization=true`（省 ~1.3 MB icudt.dat）。
`PublishTrimmed` 保持 SDK 默认的 true。**不要开 `UseSystemResourceKeys`** —— 异常消息会变成短码。

`build.sh` 顺序：`dotnet test`（门禁，不过就不出产物）→ `dotnet publish` →
`rm -rf public/pkhex` 整目录重建（文件名不带指纹，旧文件不会自动消失）→ 拷 `_framework` →
删 `.pdb/.map/.br/.gz` → 跑 FixtureGen → 写 `public/pkhex/manifest.json` →
按 `HOST_UID`/`HOST_GID` `chown -R` → 打印裸大小和 gzip 总量。

`manifest.json` 形如 `{ "totalBytes": N, "files": { "<文件名>": <解压后字节数> } }`，
是进度条的分母（见 1-7）。**必须构建时生成**：net10 把 boot config 内联进了 `dotnet.js`，
下载开始之前拿不到总大小，没有它就只能画不确定进度条。它跟产物一起进 git。
容器里没有 `python3` 之外的脚本环境可依赖，用 `find -printf` + `awk` 拼就行，别引 `bc`。

**怎么算验证通过**：`pnpm pkhex:build` 后 `ls public/pkhex/_framework/` 里有 `dotnet.js`
（**net10 默认没有独立的 `dotnet.boot.js`**，boot config 内联进 `dotnet.js`，不要去引用它）、
`dotnet.native.wasm`、`PKHeX.Core.wasm`、`PkhexBridge.Wasm.wasm`。
gzip 总量打印出来，超过 8 MB 就是有东西没被裁掉。

## 1-7 TS 加载器 + next.config

**改哪里**：`lib/pkhex/runtime.ts`、`lib/pkhex/index.ts`、`next.config.ts`。

**达到什么效果**：`loadPkhex(): Promise<PkhexApi>` 可用，`PkhexApi` / `SaveSession` / `MonEditor`
的实现严格符合 `lib/pkhex/types.ts`。

- 动态导入必须写成路径来自变量 + 双 magic comment：
  `await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ entry)`
- 拿到 exports 后**立刻** `Initialize()`
- **单例 promise 在 reject 时必须清空**（`booting = null`），否则「重试」按钮永远失效
- 所有跨边界调用过一个 `call()` 包装，异常用 `toPkhexError` 归一成 `PkhexError`
- `dotnet.js` 没有 `.d.ts`（那个 MSBuild target 是 .NET 11 才有的），手写最小结构接口，
  只声明真正用到的 `dotnet.create` / `getConfig` / `getAssemblyExports` / `withResourceLoader`
- **进度条要真百分比。** 分母取构建时生成的 `/pkhex/manifest.json` 的 `totalBytes`
  （拿不到就置 0、`ratio` 也置 0，让 UI 退回不确定进度条，**不要抛错** ——
  进度条挂了不该让整个功能用不了）；分子在 `withResourceLoader` 里自己 `fetch(defaultUri)`、
  把 `response.body` 包一层计数的 `ReadableStream` 再 `new Response(stream, { headers })` 交回去。
  头要原样带上，否则 `dotnet.native.wasm` 丢掉 `application/wasm` 会退出流式编译。
  已经在下载中时再订阅要挂到同一次下载上，最后一帧的 `ratio` 必须正好是 1

  **坑：`dotnetjs` 类型的资源不能返回 `Response`，必须透传。**
  在 `withResourceLoader` 里给它包 `Response`，运行时会直接断言失败：
  `Assert failed: loadBootResource response for 'dotnetjs' type should be a URL string`。
  判 `type.startsWith("dotnetjs")` 就 `return undefined` 走默认路径。
  这几个 js 加起来约 600 KB，占总量 3% 不到，收尾补一帧 100% 就补平了
- `next.config.ts` 当前是空的，整体替换成带 `headers()` 的版本：`/pkhex/:path*` 给
  `Cache-Control: public, max-age=0, must-revalidate`（文件名不带哈希，不能 immutable）
  和 `Cross-Origin-Resource-Policy: same-origin`；`/pkhex-fixtures/:path*` 给 `no-store`。
  **不要设 COOP/COEP** —— 开了会切到跨源隔离，打断 Apollo 和外链图片，而且没开多线程也不需要

**怎么算验证通过**：`pnpm exec tsc --noEmit` 零错误（`.next/**/validator.ts` 关于
`app/effort-values/page.js` 的两条是既有陈旧产物，忽略），`pnpm lint` 干净。

## 1-8 wasm 边界烟测

**改哪里**：临时页 `app/(auth)/pkhex/debug/page.tsx`。
**这是批次 1 唯一允许碰 `app/` 的地方**，且只能新建这一个文件，不许改 `app/(auth)/pkhex/page.tsx`。

**达到什么效果**：`"use client"`，`useEffect` 里把 `loadPkhex` 挂到 `window.__pkhex`，
其余什么都不渲染。产品 UI 落地后删掉。

**怎么算验证通过**：Playwright MCP 打开 `/pkhex/debug` → `browser_evaluate` 里
`fetch('/pkhex-fixtures/<造出来的那份>')` → `loadSave` → 读箱子 → 改昵称/IV/性格 →
`export` → 重新 `loadSave` 读回 → 改的值还在。
`browser_console_messages` 无未捕获异常；`browser_network_requests` 里 `_framework` 下全 200
且 `dotnet.native.wasm` 的 `Content-Type` 是 `application/wasm`。
把 evaluate 的返回值原样贴进报告。

这一步测的是 xUnit 测不到的三件事：`[JSExport]` 封送是否正确、`PublishTrimmed` 有没有裁掉
运行期要用的东西、crypto provider 在真 wasm 上是否真的绕过了 `PlatformNotSupportedException`。

## 1-9 真存档夹具（Gen9） ✅ 已落地

**状态**：原先挂着的「SwSh/PLA/SV/ZA 造不出夹具，等用户提供真存档再补 Gen8/Gen9」已经关掉 ——
用户放进 `pkhex-wasm/fixtures/private/` 的一份**第九世代（朱/紫）真存档**已经接进测试，
25 条用例跑在它上面（RoundTrip、16 个 setter 的改→导出→重载→读回、合法性）。
`SaveUtil` 把它认成 `SAV9SV` / Generation 9 / 32 箱 × 30 格 / 队伍 6 格，
不改任何东西导出字节完全相同。

**改哪里**：`tests/PkhexBridge.Tests/RealSaves.cs`（按目录枚举真存档）、
`SaveSamples.cs`（两类来源合流的数据源）、`RealSaveTests.cs`（只有真存档测得到的那几条）。

**纪律**：这些存档**一个字节都不进 git**，`fixtures/private/.gitignore` 是 `*` + `!.gitignore`。
报告里只写结构性结论（认成什么、多少箱、哪条过了），不写训练家名、TID/SID、昵称、种族。

**为什么要把数据源劈成两份**（这条别回退）：

- 生成夹具的内容是**约定好的** —— 一号箱第 10 格摆着相遇生成器造出来的合法样本，
  前几格是必定不合法的手工样本。`LegalMon` 那几条合法性测试全靠这个约定
- 真存档的箱子里是用户自己的宝可梦，**什么都可能有**。把它塞进 `Fixtures.Names`
  就等于让那几条测试去赌陌生人的第 10 格

所以：`Fixtures.Names` 继续只喂依赖约定内容的测试；`SaveSamples.Names`（= 生成夹具 + 真存档）
喂「有一份能用的存档就行」的测试；真存档独有的验证放 `RealSaveTests`。
真存档的名字带 `private/` 前缀（`private/main`），和 `gen6-xy` 那套名字空间隔开，合流时不会撞。

**目录为空要跳过而不是失败**：用 `[Theory(SkipTestWithoutData = true)]`（xunit.v3 3.2.2 有这个属性），
空目录下那三条报 Skipped，整体仍然 `Passed!`。反过来，目录里放了**认不出来的文件**必须吵 ——
`EveryFileInTheFolderIsRecognized` 会红，否则表现成「我明明放了存档，测试却一条都没跑」。

**坑：识别真存档必须拿副本去试。** 和造夹具那条同源 —— `SaveFile` 直接包住你传进去那段内存，
第七世代的构造函数还会原地 `ClearMemeCrypto`。拿原数组去 `SaveUtil.GetSaveFile` 验一次，
手里这份存档就被改坏了，而它是**用户的真存档**，没有第二份。

**真存档上的合法性只能断言「自洽」，不能断言结论。** 实测这份档里前 60 只**没有一只** `valid`，
每一只都带 `invalid/Trainer`（`TrashBytesShouldBeEmpty`，昵称/训练家名后面的填充字节没清）。
空白夹具上那两条 `Trainer` **fishy** 在真存档上一条都没出现 —— 那是 `BlankSaveFile` 的假训练家
撞上 PKHeX 硬编码可疑值的产物，确认过是假数据的锅。所以 `RealSaveTests` 断言的是
`valid == 一条 invalid 都没有`、每条问题都说得出理由、整段报告没退化成兜底错误串。
**不要在这里写「真存档应该合法」**，那是在赌用户的存档没被编辑过。
