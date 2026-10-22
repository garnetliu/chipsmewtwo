using PKHeX.Core;

namespace PkhexBridge;

public static partial class Bridge
{
    /// <summary>只收第 6～9 世代。再往前的存档结构差太远，编辑面板的字段对不上</summary>
    private const int MinGeneration = 6;
    private const int MaxGeneration = 9;

    /// <summary>载入一份存档，返回存档句柄。</summary>
    public static int LoadSave(byte[] data)
    {
        EnsureInitialized();

        if (data.Length == 0)
            throw BridgeException.UnrecognizedSave(0);

        // GetVariantSAV 在 26.08.26 已经没了，现在是 GetSaveFile(Memory<byte>, string? path)
        var sav = SaveUtil.GetSaveFile(data) ?? throw BridgeException.UnrecognizedSave(data.Length);
        if (sav.Generation is < MinGeneration or > MaxGeneration)
            throw BridgeException.UnsupportedGeneration(sav.Generation);

        return Handles.AddSave(sav).Id;
    }

    public static void CloseSave(int sav) => Handles.RemoveSave(sav);

    /// <summary>导出当前字节。Write 返回的是 Memory&lt;byte&gt;，要 ToArray 才能过 JS 边界。</summary>
    public static byte[] ExportSave(int sav)
    {
        EnsureInitialized();
        return Handles.GetSave(sav).Sav.Write().ToArray();
    }

    public static string GetSaveInfo(int sav)
    {
        EnsureInitialized();
        var entry = Handles.GetSave(sav);
        var file = entry.Sav;

        // 各种上限取自 BlankPKM：它是本存档的个体格式，上限跟着格式走，
        // 而不是跟着「这作能遇到哪些宝可梦」走
        var blank = file.BlankPKM;

        return BridgeJson.Write(new SaveInfoDto
        {
            Handle = entry.Id,
            Generation = file.Generation,
            Context = file.Context.ToString(),
            Version = (int)file.Version,
            VersionName = file.Version.ToString(),
            Ot = file.OT,
            OtGender = file.Gender,
            Language = file.Language,
            Tid16 = file.TID16,
            Sid16 = file.SID16,
            Id32 = file.ID32,
            DisplayTid = file.DisplayTID,
            DisplaySid = file.DisplaySID,
            BoxCount = file.BoxCount,
            BoxSlotCount = file.BoxSlotCount,
            SlotCount = file.SlotCount,
            PartyCount = file.PartyCount,
            BoxNames = GetBoxNames(file),
            MaxSpeciesId = blank.MaxSpeciesID,
            MaxMoveId = blank.MaxMoveID,
            MaxItemId = blank.MaxItemID,
            MaxAbilityId = blank.MaxAbilityID,
            MaxBallId = blank.MaxBallID,
            MaxIv = blank.MaxIV,
            MaxEv = blank.MaxEV,
        });
    }

    public static string GetBox(int sav, int box)
    {
        EnsureInitialized();
        var entry = Handles.GetSave(sav);
        var file = entry.Sav;

        if ((uint)box >= file.BoxCount)
            throw BridgeException.OutOfRange("box", box);

        var strings = GetStrings(entry);
        // 空槽位留 null，数组定长 —— TS 那边的形状是 (SlotSummary | null)[]
        var result = new SlotSummaryDto[file.BoxSlotCount];
        for (var slot = 0; slot < result.Length; slot++)
            result[slot] = ReadSummary(entry, SlotKind.Box, box, slot, strings)!;

        return BridgeJson.Write(result);
    }

    public static string GetParty(int sav)
    {
        EnsureInitialized();
        var entry = Handles.GetSave(sav);

        var strings = GetStrings(entry);
        var result = new SlotSummaryDto[6];
        for (var slot = 0; slot < result.Length; slot++)
            result[slot] = ReadSummary(entry, SlotKind.Party, PartyBoxIndex, slot, strings)!;

        return BridgeJson.Write(result);
    }

    public static string GetStringTables(int sav)
    {
        EnsureInitialized();
        var entry = Handles.GetSave(sav);
        var strings = GetStrings(entry);
        var context = entry.Sav.Context;

        return BridgeJson.Write(new StringTablesDto
        {
            Natures = strings.natures,
            Moves = strings.movelist,
            // 道具表按世代有增删（BDSP 的 TM 编号、第九世代的三位数 TM），
            // 走 GetItemStrings 才和存档里的编号对得上
            Items = strings.GetItemStrings(context, entry.Sav.Version),
            Abilities = strings.abilitylist,
            Balls = strings.balllist,
            Species = strings.specieslist,
            Types = strings.types,
        });
    }

    /// <summary>队伍槽位的 box 值。和 lib/pkhex/slot.ts 的 PARTY_BOX_INDEX 一致</summary>
    internal const int PartyBoxIndex = -1;

    internal static GameStrings GetStrings(SaveEntry entry)
    {
        // 一份存档只取一次：GameStrings 构造要读十几个字符串资源，按语言缓存在 GameInfo 里
        return entry.Strings ??= GameInfo.GetStrings(((LanguageID)entry.Sav.Language).GetLanguageCode());
    }

    private static SlotSummaryDto? ReadSummary(SaveEntry entry, SlotKind kind, int box, int slot, GameStrings strings)
    {
        var peek = kind == SlotKind.Party ? PeekParty(entry, slot) : entry.Sav.GetBoxSlotAtIndex(box, slot);

        if (peek is null || peek.Species == 0)
            return null;

        var mon = Handles.GetOrAddMon(entry, kind, box, slot, () => peek);
        var pk = mon.Entity;

        return new SlotSummaryDto
        {
            Handle = mon.Id,
            Box = box,
            Slot = slot,
            Species = pk.Species,
            Form = pk.Form,
            Nickname = GetDisplayName(pk, strings),
            Level = pk.CurrentLevel,
            IsShiny = pk.IsShiny,
            IsEgg = pk.IsEgg,
            Gender = pk.Gender,
            HeldItem = pk.HeldItem,
            Ball = pk.Ball,
        };
    }

    /// <summary>
    /// 队伍槽位要防一手：皮伊（SAV7b）的队伍是一张指向箱子槽位的索引表，
    /// 表没建起来时 GetPartyOffset 会直接抛越界。这种槽位当空格处理。
    /// </summary>
    private static PKM? PeekParty(SaveEntry entry, int slot)
    {
        if (!entry.Sav.HasParty)
            return null;
        try { return entry.Sav.GetPartySlotAtIndex(slot); }
        catch (ArgumentOutOfRangeException) { return null; }
    }

    /// <summary>没起昵称时 Nickname 里存的是原始语言的种族名，统一改从字符串表取。</summary>
    internal static string GetDisplayName(PKM pk, GameStrings strings)
    {
        if (pk.IsEgg)
            return strings.EggName;
        if (pk.IsNicknamed)
            return pk.Nickname;
        return (uint)pk.Species < strings.specieslist.Length ? strings.specieslist[pk.Species] : pk.Nickname;
    }

    private static string[] GetBoxNames(SaveFile sav)
    {
        var result = new string[sav.BoxCount];
        for (var i = 0; i < result.Length; i++)
        {
            // 第八世代以后不少作根本不存箱名，只能退回 "Box 1" 这种默认值
            result[i] = sav is IBoxDetailNameRead reader
                ? Safe(reader, i)
                : BoxDetailNameExtensions.GetDefaultBoxName(i);
        }
        return result;

        static string Safe(IBoxDetailNameRead reader, int index)
        {
            try { return reader.GetBoxName(index); }
            catch { return BoxDetailNameExtensions.GetDefaultBoxName(index); }
        }
    }
}
