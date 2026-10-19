using System.Text.Json;

namespace PkhexBridge.Tests;

/// <summary>
/// 合法性检查。
///
/// 挂 <see cref="Fixtures.Names"/> 的几条依赖生成夹具的约定内容（合法样本摆在一号箱第 10 格），
/// 真存档没有这个约定，只能喂给挂 <see cref="SaveSamples.Names"/> 的那两条。
/// 真实个体上的合法性另见 <see cref="RealSaveTests"/>。
///
/// 这里只能证明「逻辑接对了」；真正要防的那件事 —— 裁剪把相遇表裁掉之后
/// 表现成「全都合法」而不是报错 —— xUnit 测不到（本地不裁剪），
/// 只能靠浏览器里对一只确定不合法的个体跑一遍来证伪。
/// </summary>
public class LegalityTests
{
    private static readonly string[] ReportKeys = ["valid", "issues", "report"];
    private static readonly string[] IssueKeys = ["severity", "identifier", "message"];

    // 只看形状，不依赖箱子里摆的是什么，所以真存档也一起喂进来
    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void ReportMatchesTheContract(string name)
    {
        using var session = TestSession.Open(name);
        var report = JsonDocument.Parse(Bridge.GetLegality(session.Mon)).RootElement;

        Assert.Equal(ReportKeys, report.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.NotEqual(JsonValueKind.Null, report.GetProperty("issues").ValueKind);

        var text = report.GetProperty("report").GetString();
        Assert.False(string.IsNullOrWhiteSpace(text));
        // 整段报告走的是 verbose，会去读相遇模板，比非 verbose 更容易翻车。
        // 排版一旦抛异常会被兜底成这条错误串，不断言的话就悄悄退化成一句报错文案了
        Assert.DoesNotContain(BridgeErrorCode.Internal, text);

        foreach (var issue in report.GetProperty("issues").EnumerateArray())
        {
            Assert.Equal(IssueKeys, issue.EnumerateObject().Select(p => p.Name).ToArray());
            var severity = issue.GetProperty("severity").GetString();
            Assert.True(severity is "invalid" or "fishy", $"没见过的严重程度 {severity}");
            Assert.False(string.IsNullOrWhiteSpace(issue.GetProperty("identifier").GetString()));
            // 本地化拿不到时要退回英文枚举名，绝不能是空串
            Assert.False(string.IsNullOrWhiteSpace(issue.GetProperty("message").GetString()));
        }
    }

    /// <summary>
    /// 空白存档里摆进去的那几只没有任何相遇来源，必须被判成不合法，
    /// 而且要给出理由。issues 空着等于面板上什么都不说。
    /// </summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void FabricatedMonIsRejectedWithReasons(string name)
    {
        using var session = TestSession.Open(name);
        var report = JsonDocument.Parse(Bridge.GetLegality(session.Mon)).RootElement;

        Assert.False(report.GetProperty("valid").GetBoolean());
        Assert.NotEmpty(report.GetProperty("issues").EnumerateArray());
    }

    /// <summary>
    /// 反面：由 PKHeX 自己的相遇生成器造出来的那只必须判成合法，issues 空。
    ///
    /// 光有「不合法」的样本证明不了什么 —— 相遇表被裁掉、或者判定写死成假，
    /// 表现都是「全都不合法」，和「全都合法」一样是坏的。
    /// </summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void GeneratedLegalMonIsAccepted(string name)
    {
        using var session = TestSession.Open(name);
        var report = JsonDocument.Parse(Bridge.GetLegality(session.LegalMon)).RootElement;

        var invalid = report
            .GetProperty("issues")
            .EnumerateArray()
            .Where(i => i.GetProperty("severity").GetString() == "invalid")
            .Select(Describe)
            .ToArray();

        Assert.True(report.GetProperty("valid").GetBoolean(), string.Join(" | ", invalid));
        Assert.Empty(invalid);
    }

    /// <summary>
    /// 空白存档的训练家是 PKHeX 自己填的占位值，合法个体身上会留下两条
    /// 「可疑的初训家信息」的 fishy。这正好把契约钉死：**fishy 不影响 valid**，
    /// 拦下它会把一堆正常个体误伤。
    /// </summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void FishyIssuesDoNotMakeItInvalid(string name)
    {
        using var session = TestSession.Open(name);
        var report = JsonDocument.Parse(Bridge.GetLegality(session.LegalMon)).RootElement;

        var severities = report
            .GetProperty("issues")
            .EnumerateArray()
            .Select(i => i.GetProperty("severity").GetString())
            .ToArray();

        Assert.NotEmpty(severities);
        Assert.All(severities, s => Assert.Equal("fishy", s));
        Assert.True(report.GetProperty("valid").GetBoolean());
    }

    /// <summary>
    /// 招式的判定不在 LegalityAnalysis.Results 里，单独挂在 Info.Moves / Info.Relearn 上。
    /// 这条钉的就是那条路径：拿一只本来完全合法的，只把招式换成学不会的，
    /// issues 里必须真的出现招式条目 —— 不然就是 valid=false 配一个空列表。
    /// </summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void IllegalMovesOnAnOtherwiseLegalMonAreReported(string name)
    {
        using var session = TestSession.Open(name);
        var mon = session.LegalMon;
        Assert.True(JsonDocument.Parse(Bridge.GetLegality(mon)).RootElement.GetProperty("valid").GetBoolean());

        // 1 号招式是「拍击」，候选里那几只都学不会
        Bridge.SetMoves(mon, [1, 0, 0, 0]);
        var report = JsonDocument.Parse(Bridge.GetLegality(mon)).RootElement;

        var issues = report.GetProperty("issues").EnumerateArray().ToArray();
        Assert.False(report.GetProperty("valid").GetBoolean());
        Assert.NotEmpty(issues);
        Assert.Contains(issues, i => i.GetProperty("identifier").GetString() == nameof(PKHeX.Core.CheckIdentifier.CurrentMove));
        Assert.All(issues, i => Assert.False(string.IsNullOrWhiteSpace(i.GetProperty("message").GetString())));
    }

    /// <summary>努力值总和超过 510，这条判定不依赖相遇表，纯粹验「改了能被看见」。</summary>
    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void EffortValuesOverTheCapAreReported(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetEVs(session.Mon, [252, 252, 252, 252, 252, 252]);
        session.Reload();

        var report = JsonDocument.Parse(Bridge.GetLegality(session.Mon)).RootElement;
        var identifiers = report
            .GetProperty("issues")
            .EnumerateArray()
            .Select(i => i.GetProperty("identifier").GetString())
            .ToArray();

        Assert.False(report.GetProperty("valid").GetBoolean());
        Assert.Contains("EVs", identifiers);
    }

    /// <summary>
    /// 检查跑的是句柄手里那份副本，所以刚改完不用重新载入也该立刻反映出来。
    /// </summary>
    [Fact]
    public void ChecksSeePendingEdits()
    {
        using var session = TestSession.Open(Fixtures.Primary);
        var before = IssueCount(session.Mon);

        Bridge.SetEVs(session.Mon, [252, 252, 252, 252, 252, 252]);

        Assert.True(IssueCount(session.Mon) > before);
    }

    [Fact]
    public void InvalidHandleIsRejected()
    {
        var error = Assert.Throws<BridgeException>(() => Bridge.GetLegality(999999));
        Assert.Equal(BridgeErrorCode.InvalidHandle, error.Code);
    }

    private static string Describe(JsonElement issue)
        => $"{issue.GetProperty("severity").GetString()}/{issue.GetProperty("identifier").GetString()}: {issue.GetProperty("message").GetString()}";

    private static int IssueCount(int mon)
        => JsonDocument.Parse(Bridge.GetLegality(mon)).RootElement.GetProperty("issues").GetArrayLength();
}
