using System.Text.Json;
using System.Text.Json.Serialization;

namespace PkhexBridge;

/// <summary>
/// JSON 必须走源生成。<c>PublishTrimmed</c> 在 wasm 工程上默认开着，
/// 反射式的 JsonSerializer 会因为拿不到类型元数据在运行期直接抛，
/// 而且是上线才炸 —— 本地 dotnet test 不裁剪，根本测不出来。
/// </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveInfoDto))]
[JsonSerializable(typeof(SlotSummaryDto))]
[JsonSerializable(typeof(SlotSummaryDto[]))]
[JsonSerializable(typeof(MonDetailDto))]
[JsonSerializable(typeof(StringTablesDto))]
[JsonSerializable(typeof(LegalityReportDto))]
internal sealed partial class BridgeJsonContext : JsonSerializerContext;

internal static class BridgeJson
{
    public static string Write(SaveInfoDto value) => JsonSerializer.Serialize(value, BridgeJsonContext.Default.SaveInfoDto);
    // 定长数组，空槽位留 null —— TS 那边的形状是 (SlotSummary | null)[]
    public static string Write(SlotSummaryDto[] value) => JsonSerializer.Serialize(value, BridgeJsonContext.Default.SlotSummaryDtoArray);
    public static string Write(MonDetailDto value) => JsonSerializer.Serialize(value, BridgeJsonContext.Default.MonDetailDto);
    public static string Write(StringTablesDto value) => JsonSerializer.Serialize(value, BridgeJsonContext.Default.StringTablesDto);
    public static string Write(LegalityReportDto value) => JsonSerializer.Serialize(value, BridgeJsonContext.Default.LegalityReportDto);
}
