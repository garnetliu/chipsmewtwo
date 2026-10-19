# 本机是 macOS 13.3 Intel，.NET 9/10 官方都不支持这个系统版本，装不上 SDK，
# 所以 C# 侧的编译、测试、publish 全部只在这个镜像里跑。
FROM mcr.microsoft.com/dotnet/sdk:10.0

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_PACKAGES=/nuget

# browser-wasm 的 RID 包和 wasm-tools workload 一起烤进镜像，
# 不然每次 run 都要重新下几百兆
RUN dotnet workload install wasm-tools --skip-sign-check

# emscripten 在 linux 上不带自己的 python，编 native 资产时直接报
# "unable to find python in $PATH"。放在 workload 之后装，免得动一行就把
# 上面那层几百兆的缓存全作废
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
 && ln -sf /usr/bin/python3 /usr/local/bin/python \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
