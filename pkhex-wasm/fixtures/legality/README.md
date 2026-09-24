# 合法性对照集

PKHeX 自己维护的一套**人工策划的合法/非法个体文件**，原样搬进来，一个字节没改。

| | |
| --- | --- |
| 来源仓库 | <https://github.com/kwsch/PKHeX> |
| tag | `26.08.26`（和 `PkhexBridge.csproj` 里 pin 的 PKHeX.Core 版本同一个） |
| 原路径 | `Tests/PKHeX.Core.Tests/Legality/{Legal,Illegal}` |
| 许可 | GPL-3.0-or-later，和本仓库一致（见根目录 `LICENSE`） |
| 数量 | 207 个文件，41,482 字节（`Legal/` 155 个、`Illegal/` 52 个） |

## 为什么要它

我们最大的隐忧是 **IL trimmer 把 PKHeX 的相遇表裁掉之后，表现是「全都合法」而不是报错**。
自己构造的差分实验只能做到个位数样本，这套文件的答案是已知的，能把同样的证伪做到两百多个。

**目录就是答案**：`Legal/` 下的每个文件必须判成合法，`Illegal/` 下的每个必须判成不合法。
文件名就是用例描述，而且常常成对出现 —— 同一只宝可梦一个合法一个非法，差别写在名字里：

```
Legal/Generation 8/0761 - Bounsweet - FE9A9FC902E6 raid downlevel antishiny.pk8
Illegal/Gen8/0761 - Bounsweet - FDD89FC902E6 raid downleveled antishiny bad weight.pk8
```

## 谁在用

`tests/PkhexBridge.Tests/LegalityCorpus.cs` 从这里按目录枚举，
`LegalityCorpusTests.cs` 逐个断言。加载步骤（长度筛选 → 扩展名推 `EntityContext` →
`EntityFormat.GetFromBytes`）照抄 PKHeX 自己的
`Tests/PKHeX.Core.Tests/Legality/LegalityTests.cs` 里的 `VerifyAll`，别自己另发明一套。

**扩展名不是可有可无的。** PK6/PK7、PK8/PB8、PK9/PA9 这三对字节同构，光看字节分不出来，
`GetFromBytes` 没提示时默认取后者。实测这套样本：不给提示 197/207，给了 207/207。

## 改动纪律

- **不要编辑、不要增删这里的文件。** 要升级就整个目录按新 tag 重新拉一遍，同时更新上面那张表
- 只有 `Legal/` 和 `Illegal/` 两个子树来自上游；README 是我们自己的
- 和 `fixtures/private/` 无关 —— 那是用户的真存档，不进 git
