using PKHeX.Core;

namespace PkhexBridge;

internal enum SlotKind
{
    Box,
    Party,
}

/// <summary>
/// 一个槽位的可写视图。
///
/// <c>SaveFile.GetBoxSlotAtIndex</c> 返回的是 <c>.ToArray()</c> 出来的脱离副本，
/// 改它不会动到存档字节。所以这里把「副本 + 它来自哪一格」绑在一起，
/// 每个 setter 写完立刻 Flush 回存档，前端那边就不需要额外的 commit 调用。
/// </summary>
internal sealed class MonEntry(int id, SaveEntry owner, SlotKind kind, int box, int slot, PKM entity)
{
    public int Id { get; } = id;
    public SaveEntry Owner { get; } = owner;
    public SlotKind Kind { get; } = kind;
    public int Box { get; } = box;
    public int Slot { get; } = slot;
    public PKM Entity { get; } = entity;

    public void Flush()
    {
        // EntityImportSettings.None 一定要显式传：默认值会按全局开关去「适配到本存档」，
        // 把训练家信息、图鉴、记录一起改掉，用户只想改个昵称
        if (Kind == SlotKind.Party)
            Owner.Sav.SetPartySlotAtIndex(Entity, Slot, EntityImportSettings.None);
        else
            Owner.Sav.SetBoxSlotAtIndex(Entity, Box, Slot, EntityImportSettings.None);
    }
}

internal sealed class SaveEntry(int id, SaveFile sav)
{
    public int Id { get; } = id;
    public SaveFile Sav { get; } = sav;

    /// <summary>
    /// 同一格重复取要返回同一个 int —— 前端拿 handle 当 React key，
    /// 每次读箱子都换一批新 id 会让整个网格重新挂载
    /// </summary>
    public Dictionary<(SlotKind Kind, int Box, int Slot), MonEntry> Slots { get; } = [];

    /// <summary>存档语言对应的字符串表，一份存档只取一次</summary>
    public GameStrings? Strings { get; set; }
}

/// <summary>
/// 托管对象过不了 JS 边界，所以存档和个体都用自增 int 指代。
/// 单线程 wasm，不用加锁。
/// </summary>
internal static class Handles
{
    private static int _next = 1;
    private static readonly Dictionary<int, SaveEntry> Saves = [];
    private static readonly Dictionary<int, MonEntry> Mons = [];

    public static SaveEntry AddSave(SaveFile sav)
    {
        var entry = new SaveEntry(_next++, sav);
        Saves[entry.Id] = entry;
        return entry;
    }

    public static SaveEntry GetSave(int handle)
        => Saves.TryGetValue(handle, out var entry) ? entry : throw BridgeException.InvalidHandle(handle);

    public static void RemoveSave(int handle)
    {
        var entry = GetSave(handle);
        foreach (var mon in entry.Slots.Values)
            Mons.Remove(mon.Id);
        entry.Slots.Clear();
        Saves.Remove(handle);
    }

    public static MonEntry GetOrAddMon(SaveEntry sav, SlotKind kind, int box, int slot, Func<PKM> read)
    {
        var key = (kind, box, slot);
        if (sav.Slots.TryGetValue(key, out var existing))
            return existing;

        var entry = new MonEntry(_next++, sav, kind, box, slot, read());
        sav.Slots[key] = entry;
        Mons[entry.Id] = entry;
        return entry;
    }

    public static MonEntry GetMon(int handle)
        => Mons.TryGetValue(handle, out var entry) ? entry : throw BridgeException.InvalidHandle(handle);
}
