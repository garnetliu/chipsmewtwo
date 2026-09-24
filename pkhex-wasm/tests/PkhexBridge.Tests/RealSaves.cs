using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>用户自己放进来的一份真存档。<see cref="Recognized"/> 为假说明 SaveUtil 认不出来。</summary>
public sealed record RealSave(string Name, string FileName, byte[] Bytes, bool Recognized, int Generation);

/// <summary>
/// <c>pkhex-wasm/fixtures/private/</c> 下的真实存档。
///
/// 为什么非要真存档：<c>BlankSaveFile</c> 造出来的空白档只有 Gen6 / Gen7 / Gen7b / Gen8b
/// 能被 <see cref="SaveUtil"/> 重新认回来，SwSh / PLA / SV / ZA 的识别要过 SwishCrypto 的
/// 哈希校验，空白档那块数据是空的 —— 那几代只能靠真存档覆盖。
///
/// 这些文件**不进 git**（见那个目录里的 .gitignore），所以一切按目录里实际有什么来：
/// 目录空着就是零条用例，不是失败。也因此不能像生成夹具那样假设内容
/// （一号箱第 10 格摆着合法样本之类），只能喂「只需要一份能用的存档」的测试。
/// </summary>
public static class RealSaves
{
    /// <summary>名字前缀。和生成夹具的 gen6-xy 这类名字分开，两边合流时不会撞。</summary>
    public const string Prefix = "private/";

    private static readonly Lazy<RealSave[]> Loaded = new(Load);

    public static RealSave[] All => Loaded.Value;

    public static RealSave[] Recognized => [.. All.Where(s => s.Recognized)];

    /// <summary>给 Theory 当数据源。目录空着时是空的，配 SkipTestWithoutData 用。</summary>
    public static TheoryData<string> Names
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (var save in Recognized)
                data.Add(save.Name);
            return data;
        }
    }

    /// <summary>每次都给新的拷贝：SaveFile 直接拿这段内存当自己的缓冲区，共用会互相污染。</summary>
    public static byte[] Bytes(string name)
        => Recognized.First(s => s.Name == name).Bytes.ToArray();

    public static RealSave Get(string name) => Recognized.First(s => s.Name == name);

    private static RealSave[] Load()
    {
        var dir = FindDirectory();
        if (dir is null)
            return [];

        Bridge.Initialize();

        // 按目录枚举，不按扩展名过滤 —— 真存档的文件名通常就叫 main，压根没有扩展名。
        // 只把点开头的挡掉（.gitignore、macOS 的 .DS_Store）
        var files = Directory
            .EnumerateFiles(dir)
            .Where(path => !Path.GetFileName(path).StartsWith('.'))
            .OrderBy(path => path, StringComparer.Ordinal);

        return [.. files.Select(Read)];
    }

    private static RealSave Read(string path)
    {
        var name = Path.GetFileName(path);
        var bytes = File.ReadAllBytes(path);

        // 识别必须拿副本去试：SaveFile 包住的就是传进去那段内存，
        // 第七世代的构造函数还会原地 ClearMemeCrypto 把签名区清零，
        // 拿原数组验一次就等于把手里这份存档改坏了
        var sav = SaveUtil.GetSaveFile(bytes.ToArray());
        return new RealSave(Prefix + name, name, bytes, sav is not null, sav?.Generation ?? 0);
    }

    /// <summary>
    /// 从测试程序集所在目录往上找 <c>fixtures/private</c>。
    /// 测试的工作目录是 bin/Release/net10.0，写死相对路径在容器内外都容易错位。
    /// </summary>
    private static string? FindDirectory()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "fixtures", "private");
            if (Directory.Exists(candidate))
                return candidate;
        }
        return null;
    }
}
