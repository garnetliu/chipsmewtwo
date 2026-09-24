using System.Text.Json;

namespace PkhexBridge.Tests;

/// <summary>
/// JSON 的 key 集合快照。
///
/// 下面这几份清单是从 lib/pkhex/types.ts 一个字一个字抄下来的。
/// 两边任何一侧加减字段，这里都会红 —— 这是防止 C# 和 TS 单边漂移的唯一关卡。
/// </summary>
public class ContractTests
{
    private static readonly string[] SaveInfoKeys =
    [
        "handle", "generation", "context", "version", "versionName",
        "ot", "otGender", "language", "tid16", "sid16", "id32",
        "displayTid", "displaySid",
        "boxCount", "boxSlotCount", "slotCount", "partyCount", "boxNames",
        "maxSpeciesId", "maxMoveId", "maxItemId", "maxAbilityId", "maxBallId",
        "maxIv", "maxEv",
    ];

    private static readonly string[] SlotSummaryKeys =
    [
        "handle", "box", "slot", "species", "form", "nickname", "level",
        "isShiny", "isEgg", "gender", "heldItem", "ball",
    ];

    private static readonly string[] MonDetailKeys =
    [
        "handle", "box", "slot", "kind",
        "species", "form", "formCount",
        "nickname", "isNicknamed", "level", "exp",
        "nature", "statNature",
        "ability", "abilityIndex", "abilities",
        "gender", "genderRatio",
        "isShiny", "isEgg", "heldItem", "ball",
        "ivs", "evs", "moves", "friendship",
        "otName", "tid16", "sid16",
    ];

    private static readonly string[] StringTableKeys =
    [
        "natures", "moves", "items", "abilities", "balls", "species", "types",
    ];

    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void SaveInfoMatchesTheContract(string name)
    {
        using var session = TestSession.Open(name);
        AssertKeys(SaveInfoKeys, session.SaveInfo());
    }

    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void MonDetailMatchesTheContract(string name)
    {
        using var session = TestSession.Open(name);
        AssertKeys(MonDetailKeys, session.Detail());
    }

    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void SlotSummaryMatchesTheContract(string name)
    {
        using var session = TestSession.Open(name);
        var box = JsonDocument.Parse(Bridge.GetBox(session.Sav, 0)).RootElement;

        foreach (var slot in box.EnumerateArray())
        {
            if (slot.ValueKind is JsonValueKind.Null)
                continue;
            AssertKeys(SlotSummaryKeys, slot);
        }
    }

    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void StringTablesMatchTheContract(string name)
    {
        using var session = TestSession.Open(name);
        var tables = JsonDocument.Parse(Bridge.GetStringTables(session.Sav)).RootElement;

        AssertKeys(StringTableKeys, tables);

        // 下标即编号，所以表长必须盖住本作的上限
        var info = session.SaveInfo();
        Assert.Equal(25, tables.GetProperty("natures").GetArrayLength());
        Assert.True(tables.GetProperty("moves").GetArrayLength() > info.GetProperty("maxMoveId").GetInt32());
        Assert.True(tables.GetProperty("species").GetArrayLength() > info.GetProperty("maxSpeciesId").GetInt32());
        Assert.True(tables.GetProperty("items").GetArrayLength() > 0);
        Assert.True(tables.GetProperty("abilities").GetArrayLength() > 0);
        Assert.True(tables.GetProperty("balls").GetArrayLength() > 0);
        Assert.True(tables.GetProperty("types").GetArrayLength() > 0);
    }

    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void BoxIsFixedLengthWithNullHoles(string name)
    {
        using var session = TestSession.Open(name);
        var info = session.SaveInfo();
        var box = JsonDocument.Parse(Bridge.GetBox(session.Sav, 0)).RootElement;

        Assert.Equal(info.GetProperty("boxSlotCount").GetInt32(), box.GetArrayLength());
        Assert.Contains(box.EnumerateArray(), slot => slot.ValueKind is JsonValueKind.Null);
        Assert.Equal(info.GetProperty("boxCount").GetInt32(), info.GetProperty("boxNames").GetArrayLength());
    }

    /// <summary>队伍槽位的 box 必须是 -1，前端拿它区分箱子坐标和队伍坐标。</summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void PartySlotsUseMinusOneAsBox(string name)
    {
        using var session = TestSession.Open(name);
        var party = JsonDocument.Parse(Bridge.GetParty(session.Sav)).RootElement;

        Assert.Equal(6, party.GetArrayLength());
        foreach (var slot in party.EnumerateArray())
        {
            if (slot.ValueKind is JsonValueKind.Null)
                continue;
            Assert.Equal(-1, slot.GetProperty("box").GetInt32());
            AssertKeys(SlotSummaryKeys, slot);
        }
    }

    /// <summary>IV/EV/招式的顺序是 HP, ATK, DEF, SPA, SPD, SPE，跟 PKHeX 内部不一样。</summary>
    [Theory]
    [MemberData(nameof(Fixtures.Names), MemberType = typeof(Fixtures))]
    public void StatOrderIsHpAtkDefSpaSpdSpe(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetIVs(session.Mon, [1, 2, 3, 4, 5, 6]);
        Bridge.SetEVs(session.Mon, [6, 5, 4, 3, 2, 1]);
        session.Reload();

        Assert.Equal([1, 2, 3, 4, 5, 6], Bridge.GetIVs(session.Mon));
        Assert.Equal([6, 5, 4, 3, 2, 1], Bridge.GetEVs(session.Mon));
        Assert.Equal(4, Bridge.GetEVs(session.Mon)[2]); // DEF 在第三位
    }

    private static void AssertKeys(string[] expected, JsonElement actual)
    {
        var keys = actual.EnumerateObject().Select(p => p.Name).ToArray();

        Assert.Empty(expected.Except(keys));
        Assert.Empty(keys.Except(expected));
        Assert.Equal(expected.Length, keys.Length);
    }
}
