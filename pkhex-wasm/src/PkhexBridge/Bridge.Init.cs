using PkhexBridge.Crypto;

using PKHeX.Core;

namespace PkhexBridge;

/// <summary>
/// 桥接层的全部入口。按职责拆在 Bridge.Init / Bridge.Save / Bridge.Mon 三个文件里，
/// wasm 工程的 Exports 只是这些方法的转发壳。
/// </summary>
public static partial class Bridge
{
    private static bool _initialized;

    /// <summary>
    /// 注册纯托管的 AES/MD5 并返回 PKHeX.Core 的版本串。幂等，重复调不会重复装。
    /// </summary>
    public static string Initialize()
    {
        if (_initialized)
            return CoreVersion;

        RuntimeCryptographyProvider.Aes = new ManagedAesProvider();
        RuntimeCryptographyProvider.Md5 = new ManagedMd5Provider();

        // 相遇地点名走的是 GameInfo 上那个全局 GameStrings（ILocation.GetEncounterLocation
        // → GameInfo.GetLocationName），**不认局部 localizer 指定的语言**。
        // 不在这里拨一次，合法性报告里的地点会固定是英文，而 zh-Hans 的地点表其实是全的。
        GameInfo.Strings = GameInfo.GetStrings(ReportLanguage);

        _initialized = true;

        return CoreVersion;
    }

    /// <summary>
    /// 每个解析入口开头都要过一次。没注册 crypto 就去解 Gen7 存档，
    /// 报出来的会是 PlatformNotSupportedException，根本看不出是时序问题。
    /// </summary>
    internal static void EnsureInitialized()
    {
        if (!_initialized)
            throw BridgeException.NotInitialized();
    }

    /// <summary>
    /// 走 AssemblyName.Version 而不是读特性：裁剪后自定义特性可能被丢掉，
    /// 程序集名上的版本号一定在。
    /// </summary>
    private static string CoreVersion =>
        typeof(SaveFile).Assembly.GetName().Version?.ToString() ?? "unknown";
}
