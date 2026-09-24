using PKHeX.Core;

namespace PkhexBridge;

/// <summary>
/// 合法性检查。
///
/// <see cref="LegalityAnalysis"/> 是 PKHeX.Core 里最重的一块：它要把相遇表、招式来源表
/// 整个翻一遍。所以它是独立入口，不塞进 GetMon，也不给整箱批量跑。
/// </summary>
public static partial class Bridge
{
    /// <summary>
    /// 报告固定用简体中文，不跟存档语言走 —— 界面文案全是中文硬编码，
    /// 一份日文存档也该给中文提示。语言码取自 GameLanguage.AllSupportedLanguages。
    /// </summary>
    private const string ReportLanguage = "zh-Hans";

    public static string GetLegality(int mon)
    {
        EnsureInitialized();
        var entry = Handles.GetMon(mon);
        var pk = entry.Entity;

        var analysis = new LegalityAnalysis(pk);
        var localizer = LegalityLocalizationContext.Create(analysis, ReportLanguage);

        var issues = new List<LegalityIssueDto>();
        foreach (var check in analysis.Results)
        {
            // Valid 的条目不进列表；IsNotGeneric 再滤掉「这项没问题」那种占位结果
            if (check.Judgement == Severity.Valid || !check.IsNotGeneric())
                continue;

            issues.Add(new LegalityIssueDto
            {
                Severity = check.Judgement == Severity.Invalid ? "invalid" : "fishy",
                Identifier = check.Identifier.ToString(),
                Message = Describe(localizer, check),
            });
        }

        AddMoveIssues(localizer, analysis, pk, issues);

        return BridgeJson.Write(new LegalityReportDto
        {
            // LegalityAnalysis.Valid 的口径正好是「Parse、招式、回忆招式里都没有 Invalid」，
            // Fishy 算 Valid。和契约里「只看 Invalid」一致，不用自己再判一遍
            Valid = analysis.Valid,
            Issues = [.. issues],
            Report = SafeReport(localizer),
        });
    }

    /// <summary>
    /// 招式的判定不在 <see cref="LegalityAnalysis.Results"/> 里，单独挂在
    /// <c>Info.Moves</c> / <c>Info.Relearn</c> 上。不把它们捞出来，就会出现
    /// 「valid 是 false 但 issues 是空的」——面板上等于什么都没说。
    /// </summary>
    private static void AddMoveIssues(
        LegalityLocalizationContext localizer,
        LegalityAnalysis analysis,
        PKM pk,
        List<LegalityIssueDto> issues)
    {
        var lines = new List<string>();

        LegalityFormatting.AddMoves(localizer, analysis.Info.Moves, lines, pk.Context, state: false);
        Collect(lines, nameof(CheckIdentifier.CurrentMove), issues);

        lines.Clear();
        LegalityFormatting.AddRelearn(localizer, analysis.Info.Relearn, lines, state: false);
        Collect(lines, nameof(CheckIdentifier.RelearnMove), issues);

        static void Collect(List<string> lines, string identifier, List<LegalityIssueDto> issues)
        {
            foreach (var line in lines)
            {
                issues.Add(new LegalityIssueDto
                {
                    // 走到这里的都是 state: false 捞出来的，按定义就是不合法
                    Severity = "invalid",
                    Identifier = identifier,
                    Message = line,
                });
            }
        }
    }

    private static string Describe(LegalityLocalizationContext localizer, in CheckResult check)
    {
        string text;
        try
        {
            text = localizer.Humanize(check);
        }
        catch (ArgumentOutOfRangeException)
        {
            // 某些结果码在本地化表里没有对应条目，Humanize 会直接抛。
            // 宁可给一条难看的英文，也不要让面板上出现空白项
            return Fallback(check);
        }

        // Humanize 会在前面拼一段严重程度（"无效: ……"），severity 已经单独给了，去掉重复
        var prefix = string.Format(localizer.Settings.Lines.F0_1, localizer.Settings.Description(check.Judgement), string.Empty);
        if (prefix.Length != 0 && text.StartsWith(prefix, StringComparison.Ordinal))
            text = text[prefix.Length..];

        return text.Length != 0 ? text : Fallback(check);
    }

    private static string Fallback(in CheckResult check) => $"{check.Identifier}: {check.Result}";

    /// <summary>
    /// 整段报告走 verbose。
    ///
    /// 非 verbose 版只列不合法的那几条，是 <c>issues</c> 的子集 —— 面板上已经逐条画过了，
    /// 再用 PKHeX 的排版说一遍纯属冗余。verbose 多出来的**相遇信息块**
    /// （相遇方式、地点、PID/IV 细节）才是它的价值所在：那是整个界面里别处拿不到的信息，
    /// 「这只是以什么方式合法的」正是用 PKHeX 的人想知道的。
    /// </summary>
    private static string SafeReport(LegalityLocalizationContext localizer)
    {
        try
        {
            return localizer.Report(verbose: true);
        }
        catch (Exception e)
        {
            // 整段报告只是折叠区里的附加信息，排版环节炸了不该把整次检查一起拖下水。
            // verbose 会去读相遇模板，匹配不上相遇的个体在这里翻车的可能性比非 verbose 高
            return $"{BridgeErrorCode.Internal}: 报告排版失败 - {e.Message}";
        }
    }
}
