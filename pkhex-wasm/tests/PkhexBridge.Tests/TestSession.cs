using System.Text.Json;

using FixtureGen;

namespace PkhexBridge.Tests;

/// <summary>
/// 测试里反复要做的那套动作：载入存档、拿第一只的句柄、导出再重新载入。
///
/// setter 的验证**必须**走导出再载入这一圈 —— 只看内存里的对象会同时漏掉
/// 「没写回存档」和「checksum 没更新」两类 bug。
/// </summary>
internal sealed class TestSession : IDisposable
{
    public int Sav { get; private set; }
    public int Mon { get; private set; }

    private TestSession(int sav, int mon)
    {
        Sav = sav;
        Mon = mon;
    }

    /// <summary>名字来自 <see cref="SaveSamples"/>，生成夹具和真存档都走这里。</summary>
    public static TestSession Open(string name)
    {
        Bridge.Initialize();
        var sav = Bridge.LoadSave(SaveSamples.Bytes(name));
        return new TestSession(sav, FirstBoxHandle(sav));
    }

    /// <summary>导出当前存档，关掉旧句柄，再从导出的字节重新载入。</summary>
    public void Reload()
    {
        var bytes = Bridge.ExportSave(Sav);
        Bridge.CloseSave(Sav);

        Sav = Bridge.LoadSave(bytes);
        Mon = FirstBoxHandle(Sav);
    }

    public JsonElement Detail() => JsonDocument.Parse(Bridge.GetMon(Mon)).RootElement;

    /// <summary>
    /// 一号箱第 10 格那只 —— FixtureGen 用 PKHeX 自己的相遇生成器造的合法个体。
    /// 前几格是手工捏的必定不合法的样本，两边要分开取。
    ///
    /// **只有生成夹具有这个约定**，真存档那一号箱里是用户自己的宝可梦，
    /// 用了这个属性的测试就只能挂 <see cref="Fixtures.Names"/>。
    /// </summary>
    public int LegalMon => HandleAt(FixtureFactory.LegalSlot);

    private int HandleAt(int slot)
    {
        var box = JsonDocument.Parse(Bridge.GetBox(Sav, 0)).RootElement[slot];
        if (box.ValueKind is JsonValueKind.Null)
            throw new InvalidOperationException($"一号箱第 {slot} 格是空的");
        return box.GetProperty("handle").GetInt32();
    }

    public JsonElement SaveInfo() => JsonDocument.Parse(Bridge.GetSaveInfo(Sav)).RootElement;

    public void Dispose() => Bridge.CloseSave(Sav);

    private static int FirstBoxHandle(int sav)
    {
        var box = JsonDocument.Parse(Bridge.GetBox(sav, 0)).RootElement;
        foreach (var slot in box.EnumerateArray())
        {
            if (slot.ValueKind is not JsonValueKind.Null)
                return slot.GetProperty("handle").GetInt32();
        }
        throw new InvalidOperationException("fixture 的一号箱是空的");
    }
}
