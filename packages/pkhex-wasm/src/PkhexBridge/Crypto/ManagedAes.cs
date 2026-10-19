using System.Security.Cryptography;

using Org.BouncyCastle.Crypto.Engines;
using Org.BouncyCastle.Crypto.Parameters;

using PKHeX.Core;

namespace PkhexBridge.Crypto;

/// <summary>
/// 纯托管的 AES，替掉 <see cref="System.Security.Cryptography.Aes"/>。
/// </summary>
/// <remarks>
/// 浏览器 wasm 上 System.Security.Cryptography 的对称加密整体抛
/// PlatformNotSupportedException，而第七世代的 MemeCrypto 签名校验和
/// HOME 格式的载荷都要用 AES，不换掉就连存档都打不开。
///
/// PKHeX 只用到三种形状：AES-128-ECB-NoPadding、AES-128-CBC-NoPadding，
/// 加上单独的 MD5。这里只实现这些，别的形状直接抛，免得静默算错。
/// </remarks>
internal sealed class ManagedAesProvider : IAesCryptographyProvider
{
    public IAesCryptographyProvider.IAes Create(byte[] key, CipherMode mode, PaddingMode padding, byte[]? iv = null)
    {
        // 填充一律由 PKHeX 自己在外面处理，这里收到别的填充模式说明上游改了用法
        if (padding is not PaddingMode.None)
            throw BridgeException.Internal($"不支持的 AES 填充模式 {padding}");
        if (mode is not (CipherMode.ECB or CipherMode.CBC))
            throw BridgeException.Internal($"不支持的 AES 工作模式 {mode}");

        return new ManagedAes(key, iv);
    }
}

internal sealed class ManagedAes : IAesCryptographyProvider.IAes
{
    private const int BlockSize = 16;

    // 刻意直接 new AesEngine()，不走 CipherUtilities.GetCipher(...) 那种按名字找实现的
    // 反射工厂 —— PublishTrimmed 会把工厂能到达的实现全裁掉，运行期只剩找不到算法的异常
    private readonly AesEngine _encryptor = new();
    private readonly AesEngine _decryptor = new();

    /// <summary>CBC 的初始向量。PKHeX 的默认实现每次调用都从这个值重新起链，这里照抄</summary>
    private readonly byte[] _iv;

    public ManagedAes(byte[] key, byte[]? iv)
    {
        var parameter = new KeyParameter(key);
        _encryptor.Init(true, parameter);
        _decryptor.Init(false, parameter);

        _iv = new byte[BlockSize];
        iv?.AsSpan(0, Math.Min(iv.Length, BlockSize)).CopyTo(_iv);
    }

    public void EncryptEcb(ReadOnlySpan<byte> plaintext, Span<byte> destination)
        => ProcessEcb(_encryptor, plaintext, destination);

    public void DecryptEcb(ReadOnlySpan<byte> ciphertext, Span<byte> destination)
        => ProcessEcb(_decryptor, ciphertext, destination);

    public void EncryptCbc(ReadOnlySpan<byte> plaintext, Span<byte> destination)
    {
        Guard(plaintext, destination);
        Span<byte> chain = stackalloc byte[BlockSize];
        Span<byte> block = stackalloc byte[BlockSize];
        _iv.CopyTo(chain);

        for (var i = 0; i < plaintext.Length; i += BlockSize)
        {
            plaintext.Slice(i, BlockSize).CopyTo(block);
            Xor(block, chain);
            _encryptor.ProcessBlock(block, destination.Slice(i, BlockSize));
            destination.Slice(i, BlockSize).CopyTo(chain);
        }
    }

    public void DecryptCbc(ReadOnlySpan<byte> ciphertext, Span<byte> destination)
    {
        Guard(ciphertext, destination);
        Span<byte> chain = stackalloc byte[BlockSize];
        Span<byte> block = stackalloc byte[BlockSize];
        _iv.CopyTo(chain);

        for (var i = 0; i < ciphertext.Length; i += BlockSize)
        {
            // 先把密文块抄走：调用方常拿同一段内存既当输入又当输出，
            // 直接拿 destination 当下一轮的链值会读到已经解完的明文
            ciphertext.Slice(i, BlockSize).CopyTo(block);
            _decryptor.ProcessBlock(block, destination.Slice(i, BlockSize));
            Xor(destination.Slice(i, BlockSize), chain);
            block.CopyTo(chain);
        }
    }

    public void Dispose() { }

    private static void ProcessEcb(AesEngine engine, ReadOnlySpan<byte> source, Span<byte> destination)
    {
        Guard(source, destination);
        Span<byte> block = stackalloc byte[BlockSize];

        for (var i = 0; i < source.Length; i += BlockSize)
        {
            // MemeCrypto 是原地加密（source 和 destination 是同一段），
            // 先抄进临时块再处理，避免依赖引擎对重叠内存的行为
            source.Slice(i, BlockSize).CopyTo(block);
            engine.ProcessBlock(block, destination.Slice(i, BlockSize));
        }
    }

    private static void Guard(ReadOnlySpan<byte> source, Span<byte> destination)
    {
        if (source.Length % BlockSize != 0)
            throw BridgeException.Internal($"AES 输入长度 {source.Length} 不是 16 的整数倍");
        if (destination.Length < source.Length)
            throw BridgeException.Internal("AES 输出缓冲区比输入短");
    }

    private static void Xor(Span<byte> target, ReadOnlySpan<byte> other)
    {
        for (var i = 0; i < target.Length; i++)
            target[i] ^= other[i];
    }
}
