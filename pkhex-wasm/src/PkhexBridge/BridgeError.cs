namespace PkhexBridge;

/// <summary>
/// 跨 wasm 边界的错误码。[JSExport] 只把 message 字符串带到 JS，
/// 异常类型和堆栈全丢，所以错误码编进 message，由 lib/pkhex/errors.ts 的
/// toPkhexError 正则捞出来。两边的清单要一起改。
/// </summary>
public static class BridgeErrorCode
{
    public const string NotInitialized = "PKHEX_NOT_INITIALIZED";
    public const string UnrecognizedSave = "PKHEX_UNRECOGNIZED_SAVE";
    public const string UnsupportedGeneration = "PKHEX_UNSUPPORTED_GENERATION";
    public const string InvalidHandle = "PKHEX_INVALID_HANDLE";
    public const string OutOfRange = "PKHEX_OUT_OF_RANGE";
    public const string EmptySlot = "PKHEX_EMPTY_SLOT";
    public const string Internal = "PKHEX_INTERNAL";
}

/// <summary>message 固定拼成 "CODE: 细节"，不要改这个格式。</summary>
public sealed class BridgeException(string code, string detail) : Exception($"{code}: {detail}")
{
    public string Code { get; } = code;

    public static BridgeException NotInitialized()
        => new(BridgeErrorCode.NotInitialized, "调用前必须先执行 Initialize()");

    public static BridgeException UnrecognizedSave(int length)
        => new(BridgeErrorCode.UnrecognizedSave, $"认不出这份 {length} 字节的数据");

    public static BridgeException UnsupportedGeneration(int generation)
        => new(BridgeErrorCode.UnsupportedGeneration, $"只支持第 6～9 世代，这份是第 {generation} 世代");

    public static BridgeException InvalidHandle(int handle)
        => new(BridgeErrorCode.InvalidHandle, $"句柄 {handle} 无效或已关闭");

    public static BridgeException OutOfRange(string what, long value)
        => new(BridgeErrorCode.OutOfRange, $"{what} 的值 {value} 超出范围");

    public static BridgeException EmptySlot(int box, int slot)
        => new(BridgeErrorCode.EmptySlot, $"箱 {box} 第 {slot} 格是空的");

    public static BridgeException Internal(string detail)
        => new(BridgeErrorCode.Internal, detail);
}
