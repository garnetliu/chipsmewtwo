namespace PkhexBridge.Tests;

/// <summary>
/// 十六个 setter，每项都走「改 → 导出 → 重新载入 → 读回来」一圈。
/// 断言只看重新载入之后的值，中途的内存状态一概不信。
/// </summary>
public class MutatorTests
{
    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetSpecies(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetSpecies(session.Mon, 3);
        session.Reload();

        Assert.Equal(3, session.Detail().GetProperty("species").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetForm(string name)
    {
        using var session = TestSession.Open(name);
        var formCount = session.Detail().GetProperty("formCount").GetInt32();

        if (formCount <= 1)
        {
            // 本作这只没有可选形态，越界必须报错而不是静默写进去
            var error = Assert.Throws<BridgeException>(() => Bridge.SetForm(session.Mon, 1));
            Assert.Equal(BridgeErrorCode.OutOfRange, error.Code);
            return;
        }

        Bridge.SetForm(session.Mon, 1);
        session.Reload();

        Assert.Equal(1, session.Detail().GetProperty("form").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetNickname(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetNickname(session.Mon, "Nick");
        session.Reload();

        var detail = session.Detail();
        Assert.Equal("Nick", detail.GetProperty("nickname").GetString());
        Assert.True(detail.GetProperty("isNicknamed").GetBoolean());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetNicknameWithEmptyStringClearsIt(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetNickname(session.Mon, "Nick");
        Bridge.SetNickname(session.Mon, "");
        session.Reload();

        Assert.False(session.Detail().GetProperty("isNicknamed").GetBoolean());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetLevel(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetLevel(session.Mon, 42);
        session.Reload();

        Assert.Equal(42, session.Detail().GetProperty("level").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetExp(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetExp(session.Mon, 100000);
        session.Reload();

        Assert.Equal(100000, session.Detail().GetProperty("exp").GetInt64());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetNatureWritesBothBytes(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetNature(session.Mon, 3);
        session.Reload();

        var detail = session.Detail();
        Assert.Equal(3, detail.GetProperty("nature").GetInt32());
        Assert.Equal(3, detail.GetProperty("statNature").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetStatNature(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetNature(session.Mon, 3);
        Bridge.SetStatNature(session.Mon, 5);
        session.Reload();

        var detail = session.Detail();
        Assert.Equal(5, detail.GetProperty("statNature").GetInt32());

        // 第六/七世代两者是同一个字节，写薄荷就等于写真性格；第八世代起才分家
        var generation = session.SaveInfo().GetProperty("generation").GetInt32();
        var expected = generation >= 8 ? 3 : 5;
        Assert.Equal(expected, detail.GetProperty("nature").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetAbilityIndex(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetAbilityIndex(session.Mon, 1);
        session.Reload();

        var detail = session.Detail();
        Assert.Equal(1, detail.GetProperty("abilityIndex").GetInt32());
        Assert.Equal(detail.GetProperty("abilities")[1].GetInt32(), detail.GetProperty("ability").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetGender(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetGender(session.Mon, 1);
        session.Reload();

        Assert.Equal(1, session.Detail().GetProperty("gender").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetShiny(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetShiny(session.Mon, true);
        session.Reload();

        Assert.True(session.Detail().GetProperty("isShiny").GetBoolean());

        Bridge.SetShiny(session.Mon, false);
        session.Reload();

        Assert.False(session.Detail().GetProperty("isShiny").GetBoolean());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetHeldItem(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetHeldItem(session.Mon, 1);
        session.Reload();

        Assert.Equal(1, session.Detail().GetProperty("heldItem").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetBall(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetBall(session.Mon, 3);
        session.Reload();

        Assert.Equal(3, session.Detail().GetProperty("ball").GetInt32());
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetIVs(string name)
    {
        using var session = TestSession.Open(name);
        int[] expected = [1, 2, 3, 4, 5, 6];
        Bridge.SetIVs(session.Mon, expected);
        session.Reload();

        Assert.Equal(expected, Bridge.GetIVs(session.Mon));
        Assert.Equal(expected, ToArray(session.Detail().GetProperty("ivs")));
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetEVs(string name)
    {
        using var session = TestSession.Open(name);
        int[] expected = [4, 8, 12, 16, 20, 24];
        Bridge.SetEVs(session.Mon, expected);
        session.Reload();

        Assert.Equal(expected, Bridge.GetEVs(session.Mon));
        Assert.Equal(expected, ToArray(session.Detail().GetProperty("evs")));
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetMoves(string name)
    {
        using var session = TestSession.Open(name);
        int[] expected = [1, 2, 3, 4];
        Bridge.SetMoves(session.Mon, expected);
        session.Reload();

        Assert.Equal(expected, Bridge.GetMoves(session.Mon));
        Assert.Equal(expected, ToArray(session.Detail().GetProperty("moves")));
    }

    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetFriendship(string name)
    {
        using var session = TestSession.Open(name);
        Bridge.SetFriendship(session.Mon, 123);
        session.Reload();

        Assert.Equal(123, session.Detail().GetProperty("friendship").GetInt32());
    }

    /// <summary>
    /// 换种族要顺手把形态、特性、性别和昵称都修回去，
    /// 不然会留下上一个物种的残留值，界面上看起来就是「乱码宝可梦」。
    /// </summary>
    [Theory]
    [MemberData(nameof(SaveSamples.Names), MemberType = typeof(SaveSamples))]
    public void SetSpeciesRepairsDerivedFields(string name)
    {
        using var session = TestSession.Open(name);

        // 先造一个「旧物种的形态」，再换成没有形态分支的妙蛙花
        var before = session.Detail();
        if (before.GetProperty("formCount").GetInt32() > 1)
            Bridge.SetForm(session.Mon, 1);

        Bridge.SetSpecies(session.Mon, 3);
        session.Reload();

        var detail = session.Detail();
        Assert.Equal(3, detail.GetProperty("species").GetInt32());
        Assert.True(detail.GetProperty("form").GetInt32() < detail.GetProperty("formCount").GetInt32());
        Assert.Contains(detail.GetProperty("ability").GetInt32(), ToArray(detail.GetProperty("abilities")));
        Assert.False(detail.GetProperty("isNicknamed").GetBoolean());
    }

    [Theory]
    [InlineData("species", 0)]
    [InlineData("species", 99999)]
    [InlineData("level", 0)]
    [InlineData("level", 101)]
    [InlineData("nature", 25)]
    [InlineData("statNature", 25)]
    [InlineData("abilityIndex", 3)]
    [InlineData("gender", 3)]
    [InlineData("ball", 99999)]
    [InlineData("heldItem", 99999)]
    [InlineData("friendship", 256)]
    [InlineData("exp", -1)]
    public void OutOfRangeValuesAreRejected(string field, int value)
    {
        using var session = TestSession.Open(Fixtures.Primary);

        var error = Assert.Throws<BridgeException>(() => Apply(session.Mon, field, value));
        Assert.Equal(BridgeErrorCode.OutOfRange, error.Code);
    }

    [Fact]
    public void OutOfRangeTuplesAreRejected()
    {
        using var session = TestSession.Open(Fixtures.Primary);

        Assert.Equal(BridgeErrorCode.OutOfRange,
            Assert.Throws<BridgeException>(() => Bridge.SetIVs(session.Mon, [32, 0, 0, 0, 0, 0])).Code);
        Assert.Equal(BridgeErrorCode.OutOfRange,
            Assert.Throws<BridgeException>(() => Bridge.SetIVs(session.Mon, [0, 0, 0])).Code);
        Assert.Equal(BridgeErrorCode.OutOfRange,
            Assert.Throws<BridgeException>(() => Bridge.SetEVs(session.Mon, [0, 0, 0, 0, 0, 9999])).Code);
        Assert.Equal(BridgeErrorCode.OutOfRange,
            Assert.Throws<BridgeException>(() => Bridge.SetMoves(session.Mon, [99999, 0, 0, 0])).Code);
    }

    private static void Apply(int mon, string field, int value)
    {
        switch (field)
        {
            case "species": Bridge.SetSpecies(mon, value); break;
            case "level": Bridge.SetLevel(mon, value); break;
            case "nature": Bridge.SetNature(mon, value); break;
            case "statNature": Bridge.SetStatNature(mon, value); break;
            case "abilityIndex": Bridge.SetAbilityIndex(mon, value); break;
            case "gender": Bridge.SetGender(mon, value); break;
            case "ball": Bridge.SetBall(mon, value); break;
            case "heldItem": Bridge.SetHeldItem(mon, value); break;
            case "friendship": Bridge.SetFriendship(mon, value); break;
            case "exp": Bridge.SetExp(mon, value); break;
            default: throw new ArgumentOutOfRangeException(nameof(field), field, null);
        }
    }

    private static int[] ToArray(System.Text.Json.JsonElement element)
        => [.. element.EnumerateArray().Select(x => x.GetInt32())];
}
