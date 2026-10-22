using PKHeX.Core;

namespace PkhexBridge;

/// <summary>
/// 单只宝可梦的读写。
///
/// 每个 setter 结尾都要 <see cref="MonEntry.Flush"/> —— 手里的 PKM 是从存档里
/// 抄出来的脱离副本，不写回去，导出的还是改之前那份。
/// </summary>
public static partial class Bridge
{
    private const int NatureCount = 25;
    private const int MaxLevel = 100;
    private const int MaxFriendship = 255;
    private const int StatCount = 6;
    private const int MoveCount = 4;

    public static string GetMon(int mon)
    {
        EnsureInitialized();
        var entry = Handles.GetMon(mon);
        var pk = entry.Entity;
        var pi = pk.PersonalInfo;
        var strings = GetStrings(entry.Owner);

        return BridgeJson.Write(new MonDetailDto
        {
            Handle = entry.Id,
            Box = entry.Box,
            Slot = entry.Slot,
            Kind = entry.Kind == SlotKind.Party ? "party" : "box",

            Species = pk.Species,
            Form = pk.Form,
            FormCount = pi.FormCount,

            Nickname = GetDisplayName(pk, strings),
            IsNicknamed = pk.IsNicknamed,
            Level = pk.CurrentLevel,
            Exp = pk.EXP,

            Nature = (int)pk.Nature,
            StatNature = (int)pk.StatAlignment,

            Ability = pk.Ability,
            AbilityIndex = GetAbilityIndex(pk),
            Abilities = GetAbilities(pi),

            Gender = pk.Gender,
            GenderRatio = pi.Gender,

            IsShiny = pk.IsShiny,
            IsEgg = pk.IsEgg,
            HeldItem = pk.HeldItem,
            Ball = pk.Ball,

            Ivs = ReadIVs(pk),
            Evs = ReadEVs(pk),
            Moves = ReadMoves(pk),
            Friendship = pk.CurrentFriendship,

            OtName = pk.OriginalTrainerName,
            Tid16 = pk.TID16,
            Sid16 = pk.SID16,
        });
    }

    public static int[] GetIVs(int mon)
    {
        EnsureInitialized();
        return ReadIVs(Handles.GetMon(mon).Entity);
    }

    public static int[] GetEVs(int mon)
    {
        EnsureInitialized();
        return ReadEVs(Handles.GetMon(mon).Entity);
    }

    public static int[] GetMoves(int mon)
    {
        EnsureInitialized();
        return ReadMoves(Handles.GetMon(mon).Entity);
    }

    /// <summary>
    /// 换种族要连带修一串东西：PersonalInfo 是按当前 Species/Form 解析的，
    /// 光改编号会留下上一个物种的形态、特性和性别。
    /// </summary>
    public static void SetSpecies(int mon, int value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;

        if (value < 1 || value > pk.MaxSpeciesID)
            throw BridgeException.OutOfRange("species", value);

        var wasNicknamed = pk.IsNicknamed;
        var abilityIndex = GetAbilityIndex(pk);

        pk.Species = (ushort)value;

        // 形态先归位，后面的特性和性别都要读新物种的 PersonalInfo
        if (pk.Form >= pk.PersonalInfo.FormCount)
            pk.Form = 0;

        pk.RefreshAbility(abilityIndex);
        pk.Gender = pk.GetSaneGender();

        // 原本就没起昵称的，昵称字段里存的是旧种族名，要跟着换
        if (!wasNicknamed)
            pk.ClearNickname();

        pk.Heal();
        entry.Flush();
    }

    public static void SetForm(int mon, int value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;

        if (value < 0 || value >= pk.PersonalInfo.FormCount)
            throw BridgeException.OutOfRange("form", value);

        var abilityIndex = GetAbilityIndex(pk);
        pk.Form = (byte)value;
        pk.RefreshAbility(abilityIndex);
        pk.Gender = pk.GetSaneGender();
        pk.Heal();
        entry.Flush();
    }

    public static void SetNickname(int mon, string value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;

        if (value.Length > pk.MaxStringLengthNickname)
            throw BridgeException.OutOfRange("nickname length", value.Length);

        // 空串等于「取消昵称」，写回物种默认名
        if (value.Length == 0)
            pk.ClearNickname();
        else
            pk.SetNickname(value);

        entry.Flush();
    }

    public static void SetLevel(int mon, int value)
    {
        var entry = Require(mon);
        if (value < 1 || value > MaxLevel)
            throw BridgeException.OutOfRange("level", value);

        // CurrentLevel 的 setter 会按成长曲线反算 EXP 并同步 Stat_Level
        entry.Entity.CurrentLevel = (byte)value;
        entry.Entity.ResetPartyStats();
        entry.Flush();
    }

    public static void SetExp(int mon, int value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;

        var max = Experience.GetEXP(MaxLevel, pk.PersonalInfo.EXPGrowth);
        if (value < 0 || value > max)
            throw BridgeException.OutOfRange("exp", value);

        pk.EXP = (uint)value;
        pk.ResetPartyStats();
        entry.Flush();
    }

    /// <summary>
    /// 第八世代起性格拆成两个字节：真性格在 Data[0x20]，薄荷性格在 Data[0x21]。
    /// CommonEdits.SetNature 在 Format &gt;= 8 时只写后者，UI 上「性格」会看着没变，
    /// 所以这里两个一起写。
    /// </summary>
    public static void SetNature(int mon, int value)
    {
        var entry = Require(mon);
        if ((uint)value >= NatureCount)
            throw BridgeException.OutOfRange("nature", value);

        MonMutations.ApplyNature(entry.Entity, (Nature)value);
        entry.Flush();
    }

    /// <summary>只写薄荷性格。第六/七世代 StatAlignment 就是 Nature 的别名，等价于 SetNature。</summary>
    public static void SetStatNature(int mon, int value)
    {
        var entry = Require(mon);
        if ((uint)value >= NatureCount)
            throw BridgeException.OutOfRange("statNature", value);

        entry.Entity.StatAlignment = (Nature)value;
        entry.Flush();
    }

    /// <summary>
    /// 收的是 0/1/2 的槽位下标，不是特性编号。
    /// CommonEdits.SetAbility(id) 在 id 不在本物种可选池里时静默 return 不改，
    /// 界面上就成了「点了没反应」。
    /// </summary>
    public static void SetAbilityIndex(int mon, int value)
    {
        var entry = Require(mon);
        if ((uint)value > 2)
            throw BridgeException.OutOfRange("abilityIndex", value);

        entry.Entity.RefreshAbility(value);
        entry.Flush();
    }

    public static void SetGender(int mon, int value)
    {
        var entry = Require(mon);
        if ((uint)value > 2)
            throw BridgeException.OutOfRange("gender", value);

        entry.Entity.Gender = (byte)value;
        entry.Flush();
    }

    /// <summary>IsShiny 是只读的派生值，改闪光要走 CommonEdits 去重算 PID。</summary>
    public static void SetShiny(int mon, bool value)
    {
        var entry = Require(mon);
        entry.Entity.SetIsShiny(value);
        entry.Flush();
    }

    public static void SetHeldItem(int mon, int value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;
        if (value < 0 || value > pk.MaxItemID)
            throw BridgeException.OutOfRange("heldItem", value);

        pk.HeldItem = value;
        entry.Flush();
    }

    public static void SetBall(int mon, int value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;
        if (value < 0 || value > pk.MaxBallID)
            throw BridgeException.OutOfRange("ball", value);

        pk.Ball = (byte)value;
        entry.Flush();
    }

    public static void SetIVs(int mon, int[] value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;
        Check(value, StatCount, 0, pk.MaxIV, "iv");

        // 入参顺序是 HP, ATK, DEF, SPA, SPD, SPE，PKHeX 内部是 SPE 在 SPA 前面
        pk.IV_HP = value[0];
        pk.IV_ATK = value[1];
        pk.IV_DEF = value[2];
        pk.IV_SPA = value[3];
        pk.IV_SPD = value[4];
        pk.IV_SPE = value[5];
        pk.ResetPartyStats();
        entry.Flush();
    }

    public static void SetEVs(int mon, int[] value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;
        Check(value, StatCount, 0, pk.MaxEV, "ev");

        pk.EV_HP = value[0];
        pk.EV_ATK = value[1];
        pk.EV_DEF = value[2];
        pk.EV_SPA = value[3];
        pk.EV_SPD = value[4];
        pk.EV_SPE = value[5];
        pk.ResetPartyStats();
        entry.Flush();
    }

    public static void SetMoves(int mon, int[] value)
    {
        var entry = Require(mon);
        var pk = entry.Entity;
        Check(value, MoveCount, 0, pk.MaxMoveID, "move");

        Span<ushort> moves = stackalloc ushort[MoveCount];
        for (var i = 0; i < MoveCount; i++)
            moves[i] = (ushort)value[i];

        pk.SetMoves(moves);
        // 换了招式 PP 上限也变了，不补的话新招式会是 0 PP
        pk.HealPP();
        entry.Flush();
    }

    public static void SetFriendship(int mon, int value)
    {
        var entry = Require(mon);
        if (value < 0 || value > MaxFriendship)
            throw BridgeException.OutOfRange("friendship", value);

        entry.Entity.CurrentFriendship = (byte)value;
        entry.Flush();
    }

    private static MonEntry Require(int mon)
    {
        EnsureInitialized();
        return Handles.GetMon(mon);
    }

    private static void Check(int[] value, int count, int min, int max, string what)
    {
        if (value.Length != count)
            throw BridgeException.OutOfRange($"{what} count", value.Length);
        foreach (var item in value)
        {
            if (item < min || item > max)
                throw BridgeException.OutOfRange(what, item);
        }
    }

    private static int[] ReadIVs(PKM pk) => [pk.IV_HP, pk.IV_ATK, pk.IV_DEF, pk.IV_SPA, pk.IV_SPD, pk.IV_SPE];

    private static int[] ReadEVs(PKM pk) => [pk.EV_HP, pk.EV_ATK, pk.EV_DEF, pk.EV_SPA, pk.EV_SPD, pk.EV_SPE];

    private static int[] ReadMoves(PKM pk) => [pk.Move1, pk.Move2, pk.Move3, pk.Move4];

    /// <summary>AbilityNumber 存的是 1/2/4 的位标记，界面要的是 0/1/2 的下标。</summary>
    private static int GetAbilityIndex(PKM pk) => pk.AbilityNumber switch
    {
        1 => 0,
        2 => 1,
        4 => 2,
        // 有些存档里这一位是脏的，退回按特性编号在池子里找
        _ => Math.Max(0, pk.PersonalInfo.GetIndexOfAbility(pk.Ability)),
    };

    /// <summary>三个槽位的特性编号。本物种槽位不足时重复前一个，UI 那边永远拿到三格。</summary>
    private static int[] GetAbilities(PersonalInfo pi)
    {
        var result = new int[3];
        for (var i = 0; i < result.Length; i++)
            result[i] = i < pi.AbilityCount ? pi.GetAbilityAtIndex(i) : result[i - 1];
        return result;
    }
}
