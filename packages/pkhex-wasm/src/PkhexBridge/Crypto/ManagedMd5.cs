using Org.BouncyCastle.Crypto.Digests;

using PKHeX.Core;

namespace PkhexBridge.Crypto;

/// <summary>
/// 纯托管的 MD5。BDSP（SAV8BS）的整档校验拿它算摘要，
/// 而 wasm 上 <c>MD5.HashData</c> 同样是 PlatformNotSupportedException。
/// </summary>
internal sealed class ManagedMd5Provider : IMd5Provider
{
    public void HashData(ReadOnlySpan<byte> source, Span<byte> destination)
    {
        // MD5Digest 有内部状态，不能做成共享单例，每次算一份新的
        var digest = new MD5Digest();
        digest.BlockUpdate(source);
        digest.DoFinal(destination);
    }
}
