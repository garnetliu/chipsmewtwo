namespace PkhexBridge.Tests;

/// <summary>
/// 两类存档来源合成的数据源。
///
/// - <see cref="Fixtures"/>：FixtureGen 现造的空白档，**内容是约定好的**
///   （一号箱第 10 格是合法样本、前几格必定不合法），依赖这些约定的测试只能用它
/// - <see cref="RealSaves"/>：用户放在 fixtures/private 下的真存档，内容完全未知，
///   但它是 SwSh / PLA / SV / ZA 唯一的来源
///
/// 所以这里只喂「有一份能用的存档就行」的测试：RoundTrip、十六个 setter 的
/// 改→导出→重载→读回、合法性报告的形状。断言里不许出现对具体内容的假设。
/// </summary>
public static class SaveSamples
{
    public static TheoryData<string> Names
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (var fixture in Fixtures.Recognized)
                data.Add(fixture.Name);
            foreach (var save in RealSaves.Recognized)
                data.Add(save.Name);
            return data;
        }
    }

    /// <summary>按名字前缀分派，两边的名字空间互不重叠。</summary>
    public static byte[] Bytes(string name)
        => name.StartsWith(RealSaves.Prefix, StringComparison.Ordinal)
            ? RealSaves.Bytes(name)
            : Fixtures.Bytes(name);
}
