using System.Text.Json;

using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>
/// 只有真存档才测得到的几件事。
///
/// 空白夹具停在第 8b 世代（SwSh / PLA / SV / ZA 的空白档过不了 SwishCrypto 的哈希校验），
/// 所以「第九世代能不能读、能不能改、改完导出还认不认得」这条路本来是空的。
/// 这里的用例全部按目录里实际有什么来跑，**不假设任何具体内容** ——
/// 箱子里是用户自己的宝可梦，合法的不合法的都有可能。
///
/// 目录空着（用户没放存档）时这些用例会被跳过，不是失败。
/// </summary>
public class RealSaveTests
{
    /// <summary>真存档普遍装得很满，全跑一遍太慢，挑前面这些只就够说明问题了。</summary>
    private const int LegalitySampleSize = 12;

    private static readonly string[] ReportKeys = ["valid", "issues", "report"];

    /// <summary>第八世代起个体数据把性格拆成两个字节：真性格 0x20、薄荷 0x21。</summary>
    private const int NatureOffset = 0x20;
    private const int StatAlignmentOffset = 0x21;
    private const int TargetNature = 3; // 固执

    public RealSaveTests() => Bridge.Initialize();

    /// <summary>
    /// 放进来了却认不出来的文件要吵出来。
    /// 悄悄跳过等于「我明明放了存档，测试却一条都没跑」，比报错更难发现。
    /// </summary>
    [Fact]
    public void EveryFileInTheFolderIsRecognized()
    {
        foreach (var save in RealSaves.All)
        {
            Assert.True(
                save.Recognized,
                $"{save.FileName}（{save.Bytes.Length} 字节）SaveUtil 认不出来，第 6～9 世代之外的存档不支持");
        }
    }

    /// <summary>
    /// 真存档的结构性事实：世代在支持范围内，箱子/队伍的数组长度和 SaveInfo 自己报的对得上。
    /// </summary>
    [Theory(SkipTestWithoutData = true)]
    [MemberData(nameof(RealSaves.Names), MemberType = typeof(RealSaves))]
    public void SaveInfoMatchesTheActualLayout(string name)
    {
        using var session = TestSession.Open(name);
        var info = session.SaveInfo();

        var generation = info.GetProperty("generation").GetInt32();
        Assert.InRange(generation, 6, 9);

        var boxCount = info.GetProperty("boxCount").GetInt32();
        var boxSlotCount = info.GetProperty("boxSlotCount").GetInt32();
        Assert.True(boxCount > 0, "boxCount 必须为正");
        Assert.True(boxSlotCount > 0, "boxSlotCount 必须为正");
        Assert.Equal(boxCount, info.GetProperty("boxNames").GetArrayLength());
        Assert.True(info.GetProperty("maxSpeciesId").GetInt32() > 0);

        // 每一箱都要能读出来，而且是定长数组 —— 空槽是 null，不是短数组
        for (var box = 0; box < boxCount; box++)
        {
            var slots = JsonDocument.Parse(Bridge.GetBox(session.Sav, box)).RootElement;
            Assert.Equal(boxSlotCount, slots.GetArrayLength());
            foreach (var slot in slots.EnumerateArray())
            {
                if (slot.ValueKind is JsonValueKind.Null)
                    continue;
                Assert.Equal(box, slot.GetProperty("box").GetInt32());
                Assert.InRange(slot.GetProperty("species").GetInt32(), 1, info.GetProperty("maxSpeciesId").GetInt32());
                Assert.False(string.IsNullOrWhiteSpace(slot.GetProperty("nickname").GetString()));
            }
        }

        Assert.Equal(6, JsonDocument.Parse(Bridge.GetParty(session.Sav)).RootElement.GetArrayLength());
    }

    /// <summary>
    /// 性格的两个字节，这回是在真存档的真槽位上验。
    ///
    /// PK9 才是把「真性格」（Data[0x20]）和「薄荷性格」（Data[0x21]）真正拆开的那一代，
    /// 而 <c>CommonEdits.SetNature</c> 在 Format &gt;= 8 时只写薄荷位。之前只能拿
    /// 手工 new 出来的 PK9 对象测，现在能一路测到「改完导出，字节真的落在存档里」。
    /// </summary>
    [Theory(SkipTestWithoutData = true)]
    [MemberData(nameof(RealSaves.Names), MemberType = typeof(RealSaves))]
    public void NatureLandsInBothBytesOfTheExportedSave(string name)
    {
        using var session = TestSession.Open(name);
        var before = session.Detail();
        var box = before.GetProperty("box").GetInt32();
        var slot = before.GetProperty("slot").GetInt32();

        Bridge.SetNature(session.Mon, TargetNature);
        session.Reload();

        var detail = session.Detail();
        Assert.Equal(TargetNature, detail.GetProperty("nature").GetInt32());
        Assert.Equal(TargetNature, detail.GetProperty("statNature").GetInt32());

        // 再直接翻导出字节里那一格，绕开桥自己的读接口自证一次
        var exported = Bridge.ExportSave(session.Sav);
        var sav = SaveUtil.GetSaveFile(exported);
        Assert.NotNull(sav);

        var pk = sav.GetBoxSlotAtIndex(box, slot);
        Assert.NotNull(pk);
        Assert.Equal((Nature)TargetNature, pk.Nature);
        Assert.Equal((Nature)TargetNature, pk.StatAlignment);

        if (pk.Format >= 8)
        {
            Assert.Equal(TargetNature, pk.Data[NatureOffset]);
            Assert.Equal(TargetNature, pk.Data[StatAlignmentOffset]);
        }
    }

    /// <summary>
    /// 真实个体上的合法性检查。
    ///
    /// 真存档里合法不合法都有可能，所以断言的是**自洽**而不是结论：
    /// <c>valid</c> 必须正好等于「一条 invalid 都没有」，每条问题都得说得出理由，
    /// 整段报告不能退化成兜底的错误串。这是空白夹具上测不到的 ——
    /// 那边的个体全是手工捏的，走不到真实相遇分支。
    /// </summary>
    [Theory(SkipTestWithoutData = true)]
    [MemberData(nameof(RealSaves.Names), MemberType = typeof(RealSaves))]
    public void LegalityOnRealMonsIsSelfConsistent(string name)
    {
        using var session = TestSession.Open(name);
        var handles = OccupiedHandles(session, LegalitySampleSize);
        Assert.NotEmpty(handles);

        foreach (var mon in handles)
        {
            var report = JsonDocument.Parse(Bridge.GetLegality(mon)).RootElement;
            Assert.Equal(ReportKeys, report.EnumerateObject().Select(p => p.Name).ToArray());

            var text = report.GetProperty("report").GetString();
            Assert.False(string.IsNullOrWhiteSpace(text));
            Assert.DoesNotContain(BridgeErrorCode.Internal, text);

            var hasInvalid = false;
            foreach (var issue in report.GetProperty("issues").EnumerateArray())
            {
                var severity = issue.GetProperty("severity").GetString();
                Assert.True(severity is "invalid" or "fishy", $"没见过的严重程度 {severity}");
                Assert.False(string.IsNullOrWhiteSpace(issue.GetProperty("identifier").GetString()));
                Assert.False(string.IsNullOrWhiteSpace(issue.GetProperty("message").GetString()));
                hasInvalid |= severity == "invalid";
            }

            // valid 的口径就是「没有 invalid」。fishy 不该把个体拖成不合法，
            // 反过来也不许出现「说你不合法却一条 invalid 都列不出」
            Assert.Equal(!hasInvalid, report.GetProperty("valid").GetBoolean());
        }
    }

    /// <summary>从一号箱开始按顺序取前几只非空槽位的句柄。</summary>
    private static int[] OccupiedHandles(TestSession session, int limit)
    {
        var boxCount = session.SaveInfo().GetProperty("boxCount").GetInt32();
        var result = new List<int>(limit);

        for (var box = 0; box < boxCount && result.Count < limit; box++)
        {
            var slots = JsonDocument.Parse(Bridge.GetBox(session.Sav, box)).RootElement;
            foreach (var slot in slots.EnumerateArray())
            {
                if (slot.ValueKind is JsonValueKind.Null)
                    continue;
                result.Add(slot.GetProperty("handle").GetInt32());
                if (result.Count >= limit)
                    break;
            }
        }

        return [.. result];
    }
}
