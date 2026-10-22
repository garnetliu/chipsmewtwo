using FixtureGen;

// 输出目录由 build.sh 传进来，默认是仓库里的 public/pkhex-fixtures
var target = args.Length > 0 ? args[0] : "public/pkhex-fixtures";
Directory.CreateDirectory(target);

// 整目录重建：认不回来的那几作会从候选里消失，旧文件留着会误导
foreach (var stale in Directory.GetFiles(target, "*.sav"))
    File.Delete(stale);

var made = 0;
foreach (var fixture in FixtureFactory.BuildAll())
{
    if (!fixture.Recognized)
    {
        Console.WriteLine($"  skip {fixture.Name,-12} {fixture.Bytes.Length,9} bytes  SaveUtil 认不回来");
        continue;
    }

    var path = Path.Combine(target, $"{fixture.Name}.sav");
    File.WriteAllBytes(path, fixture.Bytes);
    var legal = fixture.HasLegalSample ? $"合法样本在一号箱第 {FixtureFactory.LegalSlot} 格" : "造不出合法样本";
    Console.WriteLine($"  ok   {fixture.Name,-12} {fixture.Bytes.Length,9} bytes  {legal}");
    made++;
}

Console.WriteLine($"fixtures: {made}/{FixtureFactory.Candidates.Length}");
