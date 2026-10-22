using FixtureGen;

namespace PkhexBridge.Tests;

/// <summary>
/// 测试用的空白存档。整套测试跑一次现造，不往仓库里塞二进制。
/// </summary>
public static class Fixtures
{
    private static readonly Lazy<Fixture[]> Built = new(() => FixtureFactory.BuildAll().ToArray());

    public static Fixture[] All => Built.Value;

    /// <summary>只有 SaveUtil 认得回来的才进测试 —— 造得出但读不回的档没有任何意义。</summary>
    public static Fixture[] Recognized => [.. All.Where(f => f.Recognized)];

    /// <summary>所有能用的存档名，给 Theory 当数据源。</summary>
    public static TheoryData<string> Names
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (var fixture in Recognized)
                data.Add(fixture.Name);
            return data;
        }
    }

    /// <summary>每次都给一份新的拷贝：SaveFile 会直接拿这段内存当自己的缓冲区。</summary>
    public static byte[] Bytes(string name)
        => Recognized.First(f => f.Name == name).Bytes.ToArray();

    /// <summary>挑一份当默认档。取最新的那作，覆盖面最广。</summary>
    public static string Primary => Recognized[^1].Name;
}
