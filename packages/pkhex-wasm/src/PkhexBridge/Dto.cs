namespace PkhexBridge;

/// <summary>
/// 跨 wasm 边界的数据形状，和 lib/pkhex/types.ts 是手写的一对镜像。
///
/// 属性名用 PascalCase，序列化时由 BridgeJson 统一转 camelCase，
/// 所以这边加字段时要按 TS 那边的名字反推（tid16 → Tid16，otName → OtName）。
/// ContractTests 会把 key 集合钉死，防止单边漂移。
/// </summary>
public sealed record SaveInfoDto
{
    public required int Handle { get; init; }
    public required int Generation { get; init; }
    public required string Context { get; init; }
    public required int Version { get; init; }
    public required string VersionName { get; init; }
    public required string Ot { get; init; }
    public required int OtGender { get; init; }
    public required int Language { get; init; }
    public required int Tid16 { get; init; }
    public required int Sid16 { get; init; }
    public required long Id32 { get; init; }
    public required long DisplayTid { get; init; }
    public required long DisplaySid { get; init; }
    public required int BoxCount { get; init; }
    public required int BoxSlotCount { get; init; }
    public required int SlotCount { get; init; }
    public required int PartyCount { get; init; }
    public required string[] BoxNames { get; init; }
    public required int MaxSpeciesId { get; init; }
    public required int MaxMoveId { get; init; }
    public required int MaxItemId { get; init; }
    public required int MaxAbilityId { get; init; }
    public required int MaxBallId { get; init; }
    public required int MaxIv { get; init; }
    public required int MaxEv { get; init; }
}

/// <summary>箱子/队伍里一格的摘要。只够画格子，空格子在数组里是 null。</summary>
public sealed record SlotSummaryDto
{
    public required int Handle { get; init; }
    /// <summary>队伍槽位固定填 -1，和 lib/pkhex/slot.ts 的 PARTY_BOX_INDEX 对齐</summary>
    public required int Box { get; init; }
    public required int Slot { get; init; }
    public required int Species { get; init; }
    public required int Form { get; init; }
    public required string Nickname { get; init; }
    public required int Level { get; init; }
    public required bool IsShiny { get; init; }
    public required bool IsEgg { get; init; }
    public required int Gender { get; init; }
    public required int HeldItem { get; init; }
    public required int Ball { get; init; }
}

public sealed record MonDetailDto
{
    public required int Handle { get; init; }
    public required int Box { get; init; }
    public required int Slot { get; init; }
    /// <summary>"box" 或 "party"</summary>
    public required string Kind { get; init; }

    public required int Species { get; init; }
    public required int Form { get; init; }
    public required int FormCount { get; init; }

    public required string Nickname { get; init; }
    public required bool IsNicknamed { get; init; }
    public required int Level { get; init; }
    public required long Exp { get; init; }

    public required int Nature { get; init; }
    public required int StatNature { get; init; }

    public required int Ability { get; init; }
    public required int AbilityIndex { get; init; }
    public required int[] Abilities { get; init; }

    public required int Gender { get; init; }
    public required int GenderRatio { get; init; }

    public required bool IsShiny { get; init; }
    public required bool IsEgg { get; init; }
    public required int HeldItem { get; init; }
    public required int Ball { get; init; }

    /// <summary>顺序固定 HP, ATK, DEF, SPA, SPD, SPE，和 PKHeX 内部的 SPE 在前不一样</summary>
    public required int[] Ivs { get; init; }
    public required int[] Evs { get; init; }
    public required int[] Moves { get; init; }
    public required int Friendship { get; init; }

    public required string OtName { get; init; }
    public required int Tid16 { get; init; }
    public required int Sid16 { get; init; }
}

/// <summary>PKHeX 自带的本地化字符串表，按存档语言取好，下标即游戏内部编号。</summary>
public sealed record StringTablesDto
{
    public required string[] Natures { get; init; }
    public required string[] Moves { get; init; }
    public required string[] Items { get; init; }
    public required string[] Abilities { get; init; }
    public required string[] Balls { get; init; }
    public required string[] Species { get; init; }
    public required string[] Types { get; init; }
}

/// <summary>
/// 合法性检查的一条问题。<see cref="Severity"/> 只会是 "invalid" 或 "fishy" ——
/// Valid 的条目不进这个列表。
/// </summary>
public sealed record LegalityIssueDto
{
    public required string Severity { get; init; }
    /// <summary>PKHeX 的 CheckIdentifier，指出是哪一组检查（Move / IVs / Encounter …）</summary>
    public required string Identifier { get; init; }
    public required string Message { get; init; }
}

public sealed record LegalityReportDto
{
    /// <summary>只看 Invalid。有 fishy 但没有 invalid 时这里仍然是 true</summary>
    public required bool Valid { get; init; }
    public required LegalityIssueDto[] Issues { get; init; }
    /// <summary>PKHeX 自己排版的整段报告，逐条消息拿不全时的兜底</summary>
    public required string Report { get; init; }
}
