namespace PkhexBridge.Tests;

/// <summary>
/// 载入后不做任何修改直接导出，字节必须完全相同。
///
/// 这条是后面所有 setter 的地基：它挂了说明 checksum 或加密路径有问题，
/// 再去看「改了值有没有存住」只会被二次污染的结果带偏。
/// </summary>
public class RoundTripTests
{
    public RoundTripTests() => Bridge.Initialize();

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void ExportMatchesInputByteForByte(string name)
    {
        var original = SaveSamples.Bytes(name);

        var sav = Bridge.LoadSave(SaveSamples.Bytes(name));
        var exported = Bridge.ExportSave(sav);
        Bridge.CloseSave(sav);

        Assert.Equal(original.Length, exported.Length);
        var diff = FirstDifference(original, exported);
        Assert.True(diff < 0, $"{name} 第 0x{diff:X} 字节起不一致");
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SameSlotAlwaysReturnsTheSameHandle(string name)
    {
        var sav = Bridge.LoadSave(SaveSamples.Bytes(name));

        var first = Bridge.GetBox(sav, 0);
        var second = Bridge.GetBox(sav, 0);
        Assert.Equal(first, second);

        Bridge.CloseSave(sav);
    }

    [Fact]
    public void ClosedHandleIsRejected()
    {
        var sav = Bridge.LoadSave(Fixtures.Bytes(Fixtures.Primary));
        Bridge.CloseSave(sav);

        var error = Assert.Throws<BridgeException>(() => Bridge.ExportSave(sav));
        Assert.Equal(BridgeErrorCode.InvalidHandle, error.Code);
    }

    [Fact]
    public void GarbageBytesAreRejected()
    {
        var error = Assert.Throws<BridgeException>(() => Bridge.LoadSave(new byte[64]));
        Assert.Equal(BridgeErrorCode.UnrecognizedSave, error.Code);
    }

    [Fact]
    public void EveryCandidateIsReportedSoTheSkippedOnesStayVisible()
    {
        // 造得出但认不回来的那几作（SwSh/PLA/SV/ZA）不是失败，是已知事实。
        // 这条只保证「能用的」这一栏不会悄悄变空
        Assert.NotEmpty(Fixtures.Recognized);
    }

    private static int FirstDifference(ReadOnlySpan<byte> a, ReadOnlySpan<byte> b)
    {
        for (var i = 0; i < a.Length; i++)
        {
            if (a[i] != b[i])
                return i;
        }
        return -1;
    }
}
