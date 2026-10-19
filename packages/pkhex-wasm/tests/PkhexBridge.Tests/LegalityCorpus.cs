using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>对照集里的一个文件。<see cref="ExpectedValid"/> 直接由它在 Legal/ 还是 Illegal/ 下决定。</summary>
public sealed record CorpusEntry(string Name, bool ExpectedValid, string Path);

/// <summary>
/// PKHeX 自己那套人工策划的合法/非法对照集，vendor 在 <c>pkhex-wasm/fixtures/legality/</c>
/// （来源和许可见那个目录的 README）。
///
/// 和生成夹具、真存档的区别：**这批的答案是已知的**。目录就是答案 ——
/// <c>Legal/</c> 下的每个文件必须判成合法，<c>Illegal/</c> 下的每个必须判成不合法。
/// 靠自己构造的差分实验只能做到个位数样本，这里是两百多个。
/// </summary>
public static class LegalityCorpus
{
    private static readonly Lazy<CorpusEntry[]> Loaded = new(Load);

    public static CorpusEntry[] All => Loaded.Value;

    /// <summary>给 Theory 当数据源。名字是相对 fixtures/legality 的路径，失败时一眼看出是哪个文件。</summary>
    public static TheoryData<string> Names
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (var entry in All)
                data.Add(entry.Name);
            return data;
        }
    }

    /// <summary>
    /// 格式提示。PKHeX 自己跑这套文件时就是从扩展名推的
    /// （<c>Tests/PKHeX.Core.Tests/Legality/LegalityTests.cs</c> 的 <c>VerifyAll</c>），
    /// <see cref="EntityFileExtension.GetContextFromExtension"/> 内部用 <c>EndsWith</c>，
    /// 整个文件名丢进去就行，不用自己切扩展名。
    /// </summary>
    public static EntityContext Prefer(string name) => EntityFileExtension.GetContextFromExtension(name);

    public static CorpusEntry Get(string name) => All.First(e => e.Name == name);

    /// <summary>每次都给新的拷贝：PKM 直接把这段内存当自己的缓冲区，共用会互相污染。</summary>
    public static byte[] Bytes(string name) => File.ReadAllBytes(Get(name).Path);

    private static CorpusEntry[] Load()
    {
        var dir = FindDirectory()
            ?? throw new DirectoryNotFoundException("找不到 pkhex-wasm/fixtures/legality，对照集没 vendor 进来");

        Bridge.Initialize();

        return
        [
            .. Read(dir, "Legal", expectedValid: true),
            .. Read(dir, "Illegal", expectedValid: false),
        ];
    }

    private static IEnumerable<CorpusEntry> Read(string root, string subFolder, bool expectedValid)
    {
        var path = Path.Combine(root, subFolder);
        return Directory
            .EnumerateFiles(path, "*", SearchOption.AllDirectories)
            // README 和 macOS 的 .DS_Store 不是个体文件
            .Where(p => !Path.GetFileName(p).StartsWith('.') && Path.GetExtension(p) is not ".md")
            .OrderBy(p => p, StringComparer.Ordinal)
            .Select(p => new CorpusEntry(
                // 统一成正斜杠：失败信息里的名字在容器和宿主机上要长得一样
                Name: Path.GetRelativePath(root, p).Replace(Path.DirectorySeparatorChar, '/'),
                ExpectedValid: expectedValid,
                Path: p));
    }

    /// <summary>
    /// 从测试程序集所在目录往上找 <c>fixtures/legality</c>。和 <see cref="RealSaves"/> 同一套办法：
    /// 工作目录是 bin/Release/net10.0，写死相对路径在容器内外都容易错位。
    /// </summary>
    private static string? FindDirectory()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "fixtures", "legality");
            if (Directory.Exists(candidate))
                return candidate;
        }
        return null;
    }
}
