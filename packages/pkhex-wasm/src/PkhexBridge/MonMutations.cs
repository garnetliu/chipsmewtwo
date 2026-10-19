using System.Runtime.CompilerServices;

using PKHeX.Core;

[assembly: InternalsVisibleTo("PkhexBridge.Tests")]

namespace PkhexBridge;

/// <summary>
/// 需要单独钉住行为的那几处写法。拆出来是为了让 xUnit 能直接拿 PK8/PK9
/// 这种裸个体来测 —— 第八、九世代没有能被 SaveUtil 认回来的空白存档，
/// 走不了「载入存档再取句柄」那条路。
/// </summary>
internal static class MonMutations
{
    /// <summary>
    /// 性格要两个字节一起写。
    ///
    /// 第八世代起 Nature 在 Data[0x20]、StatAlignment（薄荷性格）在 Data[0x21]，
    /// 而 <c>CommonEdits.SetNature</c> 在 Format &gt;= 8 时**只写 StatAlignment**，
    /// 界面上的「性格」看着纹丝不动。NatureTests 把这个上游行为钉成了文档。
    /// </summary>
    public static void ApplyNature(PKM pk, Nature value)
    {
        pk.Nature = value;
        pk.StatAlignment = value;
    }
}
