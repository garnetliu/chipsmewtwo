using System.Security.Cryptography;

using PkhexBridge;

using PKHeX.Core;

namespace PkhexBridge.Tests;

/// <summary>
/// crypto provider 的已知答案测试。
///
/// 这是唯一一种不依赖任何存档文件、又能证明 AES/MD5 没写错的办法 ——
/// 真存档跑通只能说明「没抛异常」，算错一位也照样解得出一堆垃圾。
/// </summary>
public class CryptoVectorTests
{
    public CryptoVectorTests() => Bridge.Initialize();

    // FIPS-197 附录 C.1 的 AES-128 已知答案
    private const string Fips197Key = "000102030405060708090a0b0c0d0e0f";
    private const string Fips197Plain = "00112233445566778899aabbccddeeff";
    private const string Fips197Cipher = "69c4e0d86a7b0430d8cdb78070b4c55a";

    // NIST SP 800-38A F.1.1 / F.2.1 的多块向量，用同一把 key
    private const string Nist38AKey = "2b7e151628aed2a6abf7158809cf4f3c";
    private const string Nist38AIv = "000102030405060708090a0b0c0d0e0f";

    private const string Nist38APlain =
        "6bc1bee22e409f96e93d7e117393172a" +
        "ae2d8a571e03ac9c9eb76fac45af8e51" +
        "30c81c46a35ce411e5fbc1191a0a52ef" +
        "f69f2445df4f9b17ad2b417be66c3710";

    private const string Nist38AEcb =
        "3ad77bb40d7a3660a89ecaf32466ef97" +
        "f5d3d58503b9699de785895a96fdbaaf" +
        "43b1cd7f598ece23881b00e3ed030688" +
        "7b0c785e27e8ad3f8223207104725dd4";

    private const string Nist38ACbc =
        "7649abac8119b246cee98e9b12e9197d" +
        "5086cb9b507219ee95db113a917678b2" +
        "73bed6b8e3c1743b7116e69e22229516" +
        "3ff1caa1681fac09120eca307586e1a7";

    [Fact]
    public void InitializeReplacesTheDefaultProviders()
    {
        Assert.Equal("ManagedAesProvider", RuntimeCryptographyProvider.Aes.GetType().Name);
        Assert.Equal("ManagedMd5Provider", RuntimeCryptographyProvider.Md5.GetType().Name);
    }

    [Fact]
    public void InitializeIsIdempotentAndReturnsCoreVersion()
    {
        var first = Bridge.Initialize();
        var second = Bridge.Initialize();
        Assert.Equal(first, second);
        Assert.StartsWith("26.8.26", first);
    }

    [Fact]
    public void EcbMatchesFips197()
    {
        using var aes = Create(Fips197Key, CipherMode.ECB);
        var plain = Convert.FromHexString(Fips197Plain);
        var actual = new byte[plain.Length];

        aes.EncryptEcb(plain, actual);
        Assert.Equal(Fips197Cipher, Convert.ToHexStringLower(actual));

        var back = new byte[plain.Length];
        aes.DecryptEcb(actual, back);
        Assert.Equal(Fips197Plain, Convert.ToHexStringLower(back));
    }

    [Fact]
    public void EcbMatchesNistMultiBlock()
    {
        using var aes = Create(Nist38AKey, CipherMode.ECB);
        var plain = Convert.FromHexString(Nist38APlain);
        var actual = new byte[plain.Length];

        aes.EncryptEcb(plain, actual);
        Assert.Equal(Nist38AEcb, Convert.ToHexStringLower(actual));
    }

    /// <summary>
    /// MemeCrypto 是拿同一段内存当输入和输出调的（<c>aes.EncryptEcb(slice, slice)</c>），
    /// 实现里必须先把块抄走，不然会一路算错还不报错。
    /// </summary>
    [Fact]
    public void EcbWorksInPlace()
    {
        using var aes = Create(Nist38AKey, CipherMode.ECB);
        var buffer = Convert.FromHexString(Nist38APlain);

        aes.EncryptEcb(buffer, buffer);
        Assert.Equal(Nist38AEcb, Convert.ToHexStringLower(buffer));

        aes.DecryptEcb(buffer, buffer);
        Assert.Equal(Nist38APlain, Convert.ToHexStringLower(buffer));
    }

    [Fact]
    public void CbcMatchesNist()
    {
        using var aes = Create(Nist38AKey, CipherMode.CBC, Nist38AIv);
        var plain = Convert.FromHexString(Nist38APlain);
        var actual = new byte[plain.Length];

        aes.EncryptCbc(plain, actual);
        Assert.Equal(Nist38ACbc, Convert.ToHexStringLower(actual));

        var back = new byte[plain.Length];
        aes.DecryptCbc(actual, back);
        Assert.Equal(Nist38APlain, Convert.ToHexStringLower(back));
    }

    /// <summary>
    /// PKHeX 的默认实现每次调用都从构造时那个 IV 重新起链（它读的是 <c>_aes.IV</c>），
    /// 所以同一个实例连调两次必须得到同样的结果。
    /// </summary>
    [Fact]
    public void CbcRestartsFromTheInitialIvOnEveryCall()
    {
        using var aes = Create(Nist38AKey, CipherMode.CBC, Nist38AIv);
        var plain = Convert.FromHexString(Nist38APlain);
        var first = new byte[plain.Length];
        var second = new byte[plain.Length];

        aes.EncryptCbc(plain, first);
        aes.EncryptCbc(plain, second);

        Assert.Equal(Convert.ToHexStringLower(first), Convert.ToHexStringLower(second));
    }

    [Fact]
    public void CbcWorksInPlace()
    {
        using var aes = Create(Nist38AKey, CipherMode.CBC, Nist38AIv);
        var buffer = Convert.FromHexString(Nist38APlain);

        aes.EncryptCbc(buffer, buffer);
        Assert.Equal(Nist38ACbc, Convert.ToHexStringLower(buffer));

        aes.DecryptCbc(buffer, buffer);
        Assert.Equal(Nist38APlain, Convert.ToHexStringLower(buffer));
    }

    // RFC 1321 附录 A.5 的七条测试向量
    [Theory]
    [InlineData("", "d41d8cd98f00b204e9800998ecf8427e")]
    [InlineData("a", "0cc175b9c0f1b6a831c399e269772661")]
    [InlineData("abc", "900150983cd24fb0d6963f7d28e17f72")]
    [InlineData("message digest", "f96b697d7cb7938d525a2f31aaf161d0")]
    [InlineData("abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b")]
    [InlineData("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f")]
    [InlineData("12345678901234567890123456789012345678901234567890123456789012345678901234567890", "57edf4a22be3c955ac49da2e2107b67a")]
    public void Md5MatchesRfc1321(string input, string expected)
    {
        Span<byte> digest = stackalloc byte[16];
        RuntimeCryptographyProvider.Md5.HashData(System.Text.Encoding.ASCII.GetBytes(input), digest);
        Assert.Equal(expected, Convert.ToHexStringLower(digest));
    }

    private static IAesCryptographyProvider.IAes Create(string key, CipherMode mode, string? iv = null)
        => RuntimeCryptographyProvider.Aes.Create(
            Convert.FromHexString(key), mode, PaddingMode.None,
            iv is null ? null : Convert.FromHexString(iv));
}
