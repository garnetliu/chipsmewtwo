using System.Buffers.Binary;

using PkhexBridge;

using PKHeX.Core;

namespace FixtureGen;

/// <summary>造出来的一份空白存档。<see cref="Recognized"/> 为假说明 SaveUtil 认不回来。</summary>
/// <param name="HasLegalSample">一号箱第 <see cref="FixtureFactory.LegalSlot"/> 格有没有摆上合法个体</param>
public sealed record Fixture(string Name, GameVersion Version, byte[] Bytes, bool Recognized, bool HasLegalSample);

/// <summary>
/// 空白存档工厂。
///
/// PKHeX 能 new 出任何一作的 SaveFile，但**能造出来不等于能被 SaveUtil 认回来** ——
/// SwSh/PLA/SV/ZA 的识别要过 SwishCrypto 的哈希校验，空白档里那块数据是空的。
/// 所以这里造完一律回头 GetSaveFile 验一次，只有认得回来的才算数。
/// </summary>
public static class FixtureFactory
{
    /// <summary>候选清单。第 6～9 世代里每种存档结构挑一到两作。</summary>
    public static readonly (string Name, GameVersion Version)[] Candidates =
    [
        ("gen6-xy", GameVersion.X),
        ("gen6-oras", GameVersion.OR),
        ("gen7-sm", GameVersion.SN),
        ("gen7-usum", GameVersion.US),
        ("gen7b-lgpe", GameVersion.GP),
        ("gen8-swsh", GameVersion.SW),
        ("gen8a-pla", GameVersion.PLA),
        ("gen8b-bdsp", GameVersion.BD),
        ("gen9-sv", GameVersion.SL),
        ("gen9a-za", GameVersion.ZA),
    ];

    /// <summary>
    /// 合法样本的候选种族。挨个试，第一只能造出合法个体的就算数 ——
    /// 某些作上特定种族的相遇分支会全军覆没（BDSP 的皮卡丘就是），单押一个会落空。
    /// </summary>
    private static readonly ushort[] LegalSpeciesCandidates = [25, 1, 4, 7, 133, 74];

    /// <summary>相遇生成器的候选上限，见 <see cref="CreateLegal"/></summary>
    private const int LegalSearchLimit = 400;

    /// <summary>箱子和队伍里塞几只，让读接口和 setter 有东西可改。</summary>
    private static readonly (ushort Species, byte Level)[] Seeds =
    [
        (25, 50), (6, 78), (94, 66), (130, 55), (448, 80), (3, 36),
    ];

    public static Fixture Build(string name, GameVersion version)
    {
        Bridge.Initialize();

        var sav = BlankSaveFile.Get(version);
        var hasLegal = Populate(sav);

        // 补魔数必须在 Write 之前：Write 会按当前字节重算校验和，
        // 补在后面等于把校验和作废，重新载入再导出就对不上了
        PatchFooterMagic(sav);

        var bytes = sav.Write().ToArray();

        // 验证要用副本：SaveFile 是直接包住传进去那段内存的，第七世代的构造函数
        // 还会顺手 ClearMemeCrypto 把签名区清零，拿原数组验一次就把它改坏了
        var recognized = SaveUtil.GetSaveFile(bytes.ToArray()) is not null;
        return new Fixture(name, version, bytes, recognized, hasLegal);
    }

    public static IEnumerable<Fixture> BuildAll()
    {
        foreach (var (name, version) in Candidates)
            yield return Build(name, version);
    }

    /// <summary>
    /// 合法个体固定摆在一号箱第 10 格。前面 0～5 格是手工捏的、必定不合法的那批，
    /// 中间留空。测试和浏览器烟测都按这个约定取，别挪。
    /// </summary>
    public const int LegalSlot = 10;

    private static bool Populate(SaveFile sav)
    {
        for (var i = 0; i < Seeds.Length; i++)
        {
            var (species, level) = Seeds[i];
            if (species > sav.BlankPKM.MaxSpeciesID)
                continue;

            sav.SetBoxSlotAtIndex(Create(sav, species, level), 0, i, EntityImportSettings.None);

            // 皮伊的队伍是一张指向箱子槽位的索引表，空白档里那张表还是 0xFFFF，
            // 往里写会在 GetPartyOffset 直接越界。其余各作正常写
            if (sav.HasParty && sav is not SAV7b)
                sav.SetPartySlotAtIndex(Create(sav, species, level), i, EntityImportSettings.None);
        }

        // 再摆一只由 PKHeX 自己的相遇生成器造出来的合法个体。
        // 只有不合法的样本证明不了检查是好的 —— 全都判不合法同样是一种坏掉的方式
        var legal = CreateLegal(sav);
        if (legal is null)
            return false;

        sav.SetBoxSlotAtIndex(legal, 0, LegalSlot, EntityImportSettings.None);
        return true;
    }

    /// <summary>
    /// 走 <see cref="EncounterMovesetGenerator"/> 枚举本作真实存在的相遇方式，
    /// 逐个转成个体再拿 <see cref="LegalityAnalysis"/> 复核，取第一只判定合法的。
    /// </summary>
    /// <remarks>
    /// 生成器是懒枚举而且分支极多，这里只看前 <see cref="LegalSearchLimit"/> 个候选，
    /// 免得某些作上把构建卡住。找不到就返回 null，那份存档只是少一只合法样本。
    /// </remarks>
    private static PKM? CreateLegal(SaveFile sav)
    {
        foreach (var species in LegalSpeciesCandidates)
        {
            var found = CreateLegal(sav, species);
            if (found is not null)
                return found;
        }
        return null;
    }

    private static PKM? CreateLegal(SaveFile sav, ushort species)
    {
        var template = sav.BlankPKM;
        if (species > template.MaxSpeciesID)
            return null;

        template.Species = species;
        template.Gender = template.GetSaneGender();

        var tried = 0;
        foreach (var encounter in EncounterMovesetGenerator.GenerateEncounters(template, sav, ReadOnlyMemory<ushort>.Empty))
        {
            if (++tried > LegalSearchLimit)
                break;
            if (encounter is not IEncounterConvertible convertible)
                continue;

            var pk = convertible.ConvertToPKM(sav);
            // 生成器可能给出别的世代格式，塞不进这份存档
            if (pk.GetType() != sav.PKMType)
                continue;
            if (new LegalityAnalysis(pk).Valid)
                return pk;
        }

        return null;
    }

    private static PKM Create(SaveFile sav, ushort species, byte level)
    {
        var pk = sav.BlankPKM;
        ((ITrainerInfo)sav).ApplyTo(pk);

        pk.Species = species;
        pk.Form = 0;
        pk.RefreshAbility(0);
        pk.Gender = pk.GetSaneGender();
        pk.CurrentLevel = level;
        pk.Nature = (Nature)(species % 25);
        pk.StatAlignment = pk.Nature;
        pk.Ball = 4;
        pk.CurrentFriendship = 70;
        pk.MetLevel = level;

        pk.IV_HP = pk.IV_ATK = pk.IV_DEF = pk.IV_SPA = pk.IV_SPD = pk.IV_SPE = 31;

        Span<ushort> moves = stackalloc ushort[4];
        moves[0] = 33; // 撞击，从第一世代一路存在到现在，各作都认
        pk.SetMoves(moves);

        pk.ClearNickname();
        pk.Heal();
        pk.RefreshChecksum();
        return pk;
    }

    /// <summary>
    /// 补上识别用的魔数。
    ///
    /// SaveUtil 认第六/七世代只看末尾 0x1F0 处的 "BEEF"，空白档那块是 0；
    /// 皮伊（SAV7b）还要多看一处块号，而且它的块信息表在 0xB8600，
    /// 不在文件末尾，两处偏移都得单独写。
    /// </summary>
    private static void PatchFooterMagic(SaveFile sav)
    {
        if (sav is not SAV_BEEF)
            return;

        const uint magic = 0x42454546; // "BEEF"
        var data = sav.Data;

        if (sav is SAV7b)
        {
            const int belugaChunk = 0xB8800 - 0x200;
            BinaryPrimitives.WriteUInt32LittleEndian(data[(belugaChunk + 0x10)..], magic);
            // 块信息表里第 19 项的 id 必须是 0x13，SaveUtil 拿它做二次确认
            BinaryPrimitives.WriteUInt16LittleEndian(data[(belugaChunk + 0xB0)..], 0x13);
            return;
        }

        BinaryPrimitives.WriteUInt32LittleEndian(data[(data.Length - 0x1F0)..], magic);
    }
}
