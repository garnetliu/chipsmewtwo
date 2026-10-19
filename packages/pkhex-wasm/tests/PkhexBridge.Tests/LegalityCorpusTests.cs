using System.Text.Json;

using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>
/// 拿 PKHeX 自己那套对照集跑 <see cref="Bridge.CheckEntity(byte[], string)"/>。
///
/// 这是整个桥接层唯一一处**答案不是我们自己定的**的断言：文件在 Legal/ 就必须判合法，
/// 在 Illegal/ 就必须判不合法。相遇表被裁掉、判定被短路成常量这类事故，
/// 表现都是「一边倒」，只有两边都有已知答案的样本才抓得住。
///
/// 注意这里跑的是**未裁剪的宿主构建**，证明不了 wasm 产物里的表还在 ——
/// 那一步只能在浏览器里对真产物跑。
/// </summary>
public class LegalityCorpusTests
{
    /// <summary>
    /// 不给格式提示时会被认错的那几个 —— **这不是待修的缺陷清单，是退化行为的边界。**
    ///
    /// <see cref="EntityFormat"/> 有三个「两种格式字节同构」的分支
    /// （Format6or7 / Format8or8b / Format9or9a），PKHeX 在源码里直接写了
    /// "Could be either; let other clues like extension/current save file format differentiate."。
    /// 没有提示时它取的默认是 PK7 / PK8 / PK9，于是这 8 个 .pk6 被当成 PK7
    /// （报的都是第七世代才有的回忆判定）、2 个 .pb8 被当成 PK8（报相遇找不到）。
    ///
    /// 正常路径会带上扩展名，这 10 个也是绿的（见
    /// <see cref="VerdictMatchesTheCuratedAnswer"/>）。这份清单钉的是：
    /// **不给提示时的退化只发生在这三对同构格式上，数量就是 10，一个不多。**
    /// 多出任何一个都说明格式识别出了别的问题 —— 那是真事故，不是这里的已知情况。
    /// </summary>
    private static readonly string[] AmbiguousWithoutExtension =
    [
        "Legal/Generation 6 Static/351 - Castform - 4988DDF4362E.pk6",
        "Legal/Generation 6 Static/360 - Egg - 4E07D3239217 Hot Springs Wynaut.pk6",
        "Legal/Generation 6/035 - Clefairy - 2A2C8A94FA80 dexnav.pk6",
        "Legal/Generation 6/087 - Dewgong - B33438369BC5 dexnav.pk6",
        "Legal/Generation 6/097 - Hypno - F845514A2D54 dexnav.pk6",
        "Legal/Generation 6/263 - Zigzagoon - 2746E8288E7E.pk6",
        "Legal/Generation 6/276 ★ - Nirondelle - 0F8089C9AA57 flute level1.pk6",
        "Legal/Generation 6/665-17 - Spewpa - 9DBBA19BC145 Route 7 berry field.pk6",
        "Legal/Generation 8/454 - Toxicroak - 74B8A6FA55D1 underlevel area6-3badge.pb8",
        "Legal/Generation 8/481 ★ - Mesprit - 1FE0DA9D86A4 roamer8 force shiny.pb8",
    ];

    [Fact]
    public void CorpusIsPresent()
    {
        Assert.Equal(207, LegalityCorpus.All.Length);
        Assert.Equal(155, LegalityCorpus.All.Count(e => e.ExpectedValid));
        Assert.Equal(52, LegalityCorpus.All.Count(e => !e.ExpectedValid));
    }

    /// <summary>
    /// 主判据。加载步骤和 PKHeX 自己跑这套文件的那段完全一致
    /// （<c>Tests/PKHeX.Core.Tests/Legality/LegalityTests.cs</c> 的 <c>VerifyAll</c>）：
    /// 扩展名 → <see cref="EntityFileExtension.GetContextFromExtension"/> → <c>prefer</c>。
    /// </summary>
    [Theory]
    [MemberData(nameof(LegalityCorpus.Names), MemberType = typeof(LegalityCorpus))]
    public void VerdictMatchesTheCuratedAnswer(string name)
    {
        var entry = LegalityCorpus.Get(name);
        var report = Read(name);
        var actual = report.GetProperty("valid").GetBoolean();

        Assert.True(
            actual == entry.ExpectedValid,
            $"{name}：对照集说{Say(entry.ExpectedValid)}，我们判成{Say(actual)}{Environment.NewLine}{Describe(report)}");
    }

    /// <summary>
    /// 不合法的那批必须**说得出理由**。valid=false 配一个空 issues 列表在面板上等于什么都没说，
    /// 而且那正是招式判定（Info.Moves / Info.Relearn 那条路径）漏掉时的表现。
    /// </summary>
    [Theory]
    [MemberData(nameof(LegalityCorpus.Names), MemberType = typeof(LegalityCorpus))]
    public void IllegalEntriesCarryAnInvalidIssue(string name)
    {
        if (LegalityCorpus.Get(name).ExpectedValid)
            return;

        var report = Read(name);
        var severities = report
            .GetProperty("issues")
            .EnumerateArray()
            .Select(i => i.GetProperty("severity").GetString())
            .ToArray();

        // Illegal/ 下的应该都是 invalid 而不是 fishy —— 只有 fishy 的话 valid 会是 true，
        // 上面那条就先红了；这里钉的是「理由确实列出来了」
        Assert.True(
            severities.Contains("invalid"),
            $"{name}：判成不合法，但 issues 里一条 invalid 都没有（{string.Join(", ", severities)}）");
    }

    /// <summary>
    /// 不给格式提示（extension 传空串）时跑整套对照集，偏差必须精确等于
    /// <see cref="AmbiguousWithoutExtension"/>。
    ///
    /// 留着这条不是为了记录一个待修的问题 —— 问题已经在契约层解决了（调用方传扩展名）。
    /// 它钉的是**没提示时的退化是已知且有界的**：范围只在那三对字节同构的格式上，
    /// 数量恒为 10。任何新增的偏差都不是「本来就这样」，而是格式识别真的坏了。
    /// </summary>
    [Fact]
    public void ByteOnlyEntryDeviatesOnlyOnAmbiguousFormats()
    {
        var deviations = LegalityCorpus.All
            // 空串 = 不给提示，正是契约里写的那个约定值
            .Where(e => ValidOf(Bridge.CheckEntity(LegalityCorpus.Bytes(e.Name), "")) != e.ExpectedValid)
            .Select(e => e.Name)
            .Order(StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(AmbiguousWithoutExtension.Order(StringComparer.Ordinal), deviations);
    }

    /// <summary>长度对不上的字节要给出明确错误码，而不是被当成一只判成不合法。</summary>
    [Fact]
    public void GarbageBytesAreRejected()
    {
        var error = Assert.Throws<BridgeException>(() => Bridge.CheckEntity(new byte[7], "pk9"));
        Assert.Equal(BridgeErrorCode.UnrecognizedEntity, error.Code);
    }

    /// <summary>
    /// CheckEntity 不该有 LoadSave 那条第 6～9 世代的限制 —— 那是编辑面板的约束，
    /// 判定本身是世代无关的。对照集里 pk1 / pk2 / pk3 占了将近三分之一，
    /// 真被挡掉的话上面两条会大面积红，这条把意图写明白。
    /// </summary>
    [Fact]
    public void OldGenerationsAreNotRefused()
    {
        var old = LegalityCorpus.All
            .Where(e => LegalityCorpus.Prefer(e.Name) is EntityContext.Gen1 or EntityContext.Gen2 or EntityContext.Gen3)
            .ToArray();

        Assert.NotEmpty(old);
        foreach (var entry in old)
            Assert.NotEqual(JsonValueKind.Undefined, Read(entry.Name).GetProperty("valid").ValueKind);
    }

    /// <summary>
    /// 走公开的 <c>CheckEntity(byte[], string)</c>，和 UI 拖文件进来时那条路径完全一致。
    /// 名字直接当扩展名喂进去：GetContextFromExtension 内部是 EndsWith，带目录的相对路径也认。
    /// PKHeX 自己的 VerifyAll 传的也是完整文件路径。
    /// </summary>
    private static JsonElement Read(string name)
        => JsonDocument.Parse(Bridge.CheckEntity(LegalityCorpus.Bytes(name), name)).RootElement;

    private static bool ValidOf(string json)
        => JsonDocument.Parse(json).RootElement.GetProperty("valid").GetBoolean();

    private static string Say(bool valid) => valid ? "合法" : "不合法";

    private static string Describe(JsonElement report)
    {
        var lines = report
            .GetProperty("issues")
            .EnumerateArray()
            .Select(i => $"  [{i.GetProperty("severity").GetString()}] {i.GetProperty("identifier").GetString()}: {i.GetProperty("message").GetString()}");
        return string.Join(Environment.NewLine, lines);
    }
}
