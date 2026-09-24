using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;

using PkhexBridge;

namespace PkhexBridge.Wasm;

/// <summary>
/// [JSExport] 的转发壳，和 lib/pkhex/exports.ts 的 BridgeExports 一一对应
/// （方法名、参数个数、参数类型）。**这里只许有转发，不许有逻辑** ——
/// 逻辑写进 PkhexBridge 那个普通类库，xUnit 才测得到。
///
/// 封送规则：byte[] ↔ Uint8Array、int[] ↔ Int32Array、string ↔ string。
/// 托管对象过不了边界，所以存档和个体都用 int handle 指代。
/// </summary>
[SupportedOSPlatform("browser")]
public static partial class Exports
{
    [JSExport]
    internal static string Initialize() => Bridge.Initialize();

    [JSExport]
    internal static int LoadSave(byte[] data) => Bridge.LoadSave(data);

    [JSExport]
    internal static void CloseSave(int sav) => Bridge.CloseSave(sav);

    [JSExport]
    internal static byte[] ExportSave(int sav) => Bridge.ExportSave(sav);

    [JSExport]
    internal static string GetSaveInfo(int sav) => Bridge.GetSaveInfo(sav);

    [JSExport]
    internal static string GetBox(int sav, int box) => Bridge.GetBox(sav, box);

    [JSExport]
    internal static string GetParty(int sav) => Bridge.GetParty(sav);

    [JSExport]
    internal static string GetStringTables(int sav) => Bridge.GetStringTables(sav);

    [JSExport]
    internal static string GetMon(int mon) => Bridge.GetMon(mon);

    /// <summary>JSON: LegalityReport。最重的一条，别频繁调</summary>
    [JSExport]
    internal static string GetLegality(int mon) => Bridge.GetLegality(mon);

    [JSExport]
    internal static int[] GetIVs(int mon) => Bridge.GetIVs(mon);

    [JSExport]
    internal static int[] GetEVs(int mon) => Bridge.GetEVs(mon);

    [JSExport]
    internal static int[] GetMoves(int mon) => Bridge.GetMoves(mon);

    [JSExport]
    internal static void SetSpecies(int mon, int value) => Bridge.SetSpecies(mon, value);

    [JSExport]
    internal static void SetForm(int mon, int value) => Bridge.SetForm(mon, value);

    [JSExport]
    internal static void SetNickname(int mon, string value) => Bridge.SetNickname(mon, value);

    [JSExport]
    internal static void SetLevel(int mon, int value) => Bridge.SetLevel(mon, value);

    [JSExport]
    internal static void SetExp(int mon, int value) => Bridge.SetExp(mon, value);

    [JSExport]
    internal static void SetNature(int mon, int value) => Bridge.SetNature(mon, value);

    [JSExport]
    internal static void SetStatNature(int mon, int value) => Bridge.SetStatNature(mon, value);

    [JSExport]
    internal static void SetAbilityIndex(int mon, int value) => Bridge.SetAbilityIndex(mon, value);

    [JSExport]
    internal static void SetGender(int mon, int value) => Bridge.SetGender(mon, value);

    [JSExport]
    internal static void SetShiny(int mon, bool value) => Bridge.SetShiny(mon, value);

    [JSExport]
    internal static void SetHeldItem(int mon, int value) => Bridge.SetHeldItem(mon, value);

    [JSExport]
    internal static void SetBall(int mon, int value) => Bridge.SetBall(mon, value);

    [JSExport]
    internal static void SetIVs(int mon, int[] value) => Bridge.SetIVs(mon, value);

    [JSExport]
    internal static void SetEVs(int mon, int[] value) => Bridge.SetEVs(mon, value);

    [JSExport]
    internal static void SetMoves(int mon, int[] value) => Bridge.SetMoves(mon, value);

    [JSExport]
    internal static void SetFriendship(int mon, int value) => Bridge.SetFriendship(mon, value);
}
