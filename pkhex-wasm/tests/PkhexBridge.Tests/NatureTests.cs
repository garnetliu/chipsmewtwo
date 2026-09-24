using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>
/// 性格的两个字节。第八世代起个体数据把性格拆成了「真性格」和「薄荷性格」，
/// 只写一个会出现「改了没反应」或者「能力值变了但性格没变」。
/// </summary>
public class NatureTests
{
    private const int NatureOffset = 0x20;
    private const int StatAlignmentOffset = 0x21;
    private const byte Target = 3; // 固执

    public NatureTests() => Bridge.Initialize();

    public static TheoryData<string> Format8Plus =>
    [
        nameof(PK8),
        nameof(PK9),
    ];

    [Theory]
    [MemberData(nameof(Format8Plus))]
    public void ApplyNatureWritesBothBytes(string kind)
    {
        var pk = Create(kind);

        MonMutations.ApplyNature(pk, (Nature)Target);

        Assert.Equal(Target, pk.Data[NatureOffset]);
        Assert.Equal(Target, pk.Data[StatAlignmentOffset]);
    }

    /// <summary>
    /// 把上游行为钉成文档：<c>CommonEdits.SetNature</c> 在 Format &gt;= 8 时
    /// 只改 0x21。哪天 PKHeX 改了这里，这条会红，提醒我们把 ApplyNature 也跟着改。
    /// </summary>
    [Theory]
    [MemberData(nameof(Format8Plus))]
    public void UpstreamSetNatureOnlyWritesStatAlignment(string kind)
    {
        var pk = Create(kind);
        pk.Data[NatureOffset] = 0;
        pk.Data[StatAlignmentOffset] = 0;

        pk.SetNature((Nature)Target);

        Assert.Equal(0, pk.Data[NatureOffset]);
        Assert.Equal(Target, pk.Data[StatAlignmentOffset]);
    }

    /// <summary>第六/七世代 StatAlignment 就是 Nature 的别名，写一个等于写两个。</summary>
    [Fact]
    public void BeforeFormat8TheTwoValuesAreTheSameByte()
    {
        var pk = new PK7();
        MonMutations.ApplyNature(pk, (Nature)Target);

        Assert.Equal((Nature)Target, pk.Nature);
        Assert.Equal((Nature)Target, pk.StatAlignment);
        Assert.Equal(Target, pk.Data[0x1C]);
    }

    private static PKM Create(string kind) => kind switch
    {
        nameof(PK8) => new PK8(),
        nameof(PK9) => new PK9(),
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, null),
    };
}
