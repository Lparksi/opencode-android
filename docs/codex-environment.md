# Codex 环境重建与任务交接

更新日期：2026-11-01。项目仓库：https://github.com/Lparksi/opencode-android 。

## 当前目标与状态

构建独立 Android APK：OpenCode v2 在手机本地操作文件、执行 Shell 并保存会话，不依赖电脑、不另装 Termux、免 Root。首版 ARM64，模型通过 API 调用，优先复用官方 Web 前端。参考 kelai141/dsh-mobile-apk 的内置 Termux 衍生环境与 WebView 架构。

已完成版本锁定、上游源码下载、官方 Web 构建和宿主基础探针。尚未建立 Android Gradle 工程、构建 Android 运行资产、运行完整 OpenCode 引擎或产出 APK。不要将宿主探针通过等同于 Android 可用。

## 目前已验证的软件环境

| 软件 | 版本/要求 | 用途 |
| --- | --- | --- |
| 操作系统 | Linux x86_64，当前 Debian 系环境 | 构建宿主 |
| Node.js | 24.19.0 | 仓库脚本、基础探针；含 node:sqlite |
| npm | 11.9.0 | 安装固定版本 Bun |
| Bun | 1.4.4 | OpenCode 上游依赖与 Web 构建 |
| Java | OpenJDK 21 | 已安装；尚未跑 Android 构建 |
| Git | 支持 HTTPS clone/fetch | 拉取固定上游提交 |
| Python | Python 3 | 辅助检查和资产工具 |
| 基础工具 | bash、curl、tar、xz、unzip、zip、rg、ca-certificates | 下载、构建与检查 |

上游 Node SEA 构建脚本使用 **26.4.0**。这与当前脚本运行所用 Node 24.19.0 不是同一个要求；Android Node 的版本与 FFI/SQLite 能力仍待验证，不可直接拿 Linux Node 发行包当 Android runtime。

建议 Codex 工作区预留 **20 GiB 以上**空间；完整 Android 工具链和模拟器需要更多。这是规划容量，不是测量所得最低要求。当前已用空间约 3.6 GiB。

## 下一阶段需增加的软件

- Android SDK Command-line Tools、Platform Tools（adb）。
- Android SDK Platform 36、Build Tools 36.0.0 可先预装，作为后续 APK 工程的候选构建环境；尚未验证。
- Android NDK 与 CMake：PTY、watcher 等 Bionic 原生组件适配需要，版本应在确定 native 构建路线后固定；当前未选定，不要误写成已验证依赖。
- Android 真机或支持硬件虚拟化的模拟器。主目标为 ARM64 真机；x86_64 模拟器可验证宿主流程，但不能替代 ARM64 验证。设备必须由 adb 可见，或者连接到实际可访问的设备环境。
- Python 3、C/C++ 编译工具和 pkg-config 可预装，供原生依赖调查使用。

参考 DSH 快照中的 Gradle 8.11.1、AGP 8.8.2、Kotlin 2.0.21 只是参考项目版本；本项目尚未选定 Android 构建插件。后续用项目 Gradle Wrapper 固定版本，不需要全局安装 Gradle。

## Codex 配置要求

- 工作目录为本仓库根目录；路径不必固定为 /workspace/opencode-android，仓库脚本按自身位置定位。
- 工作区和缓存目录可写。设置 ANDROID_HOME/ANDROID_SDK_ROOT 到安装好的 SDK，GRADLE_USER_HOME 到可写缓存目录。
- 保留环境自带的 HTTPS 代理与 CA 信任，使用正常证书校验。
- 可访问 github.com、api.github.com、codeload.github.com、GitHub Release 下载域名、registry.npmjs.org、nodejs.org，以及 Android/Gradle/Maven 官方下载服务（dl.google.com、maven.google.com、services.gradle.org、downloads.gradle.org、repo.maven.apache.org、plugins.gradle.org）。实际下载可能有重定向，按报错补充所需官方域名。
- 模拟器需要 /dev/kvm 和相应设备权限；真机需要 adb/USB 或已配置的远程设备连接。仅安装 adb 不代表有可用设备。
- 目前无需模型 API key、云账号或发布签名密钥。后续模型闭环测试才需要用户配置模型凭据；不要把凭据提交 Git。

## 恢复步骤

```bash
# 在仓库根目录：验证/获取固定上游源码
node scripts/checkout-upstream.mjs
node scripts/checkout-upstream.mjs --reference

# 安装固定 Bun、上游 frozen 依赖并构建官方 Web UI
bash scripts/build-web.sh

# 复现已验证的 Linux 探针（包含上游 PTY 模块）
OPENCODE_RUNTIME_ROOT="$PWD/.upstream/opencode/packages/core" \
  SHELL=/bin/sh node runtime/probe.mjs
```

独立运行 `node runtime/probe.mjs` 时默认从当前目录解析 PTY，未安装对应模块会如实失败。完整基础验证应使用上面的 OPENCODE_RUNTIME_ROOT。

源码下载脚本遇到 SHA 不符或已有修改会退出，不自动覆盖。构建输出位于 `.upstream/opencode/packages/app/dist`。`.upstream/`、`.tools/`、缓存和构建产物未提交，需要在新环境重建。

## 下次从这里继续

1. 阅读 `upstream.lock.json`、`docs/runtime-investigation.md` 与 `docs/evidence/`。
2. 解决 OpenCode Android bundle/原生资产装配：上游只支持桌面 Node target，Linux 资产为 glibc，Android 必须使用 Bionic 资产。
3. 固定 Android Node、Bash、Git、CA、termux-exec 与 PTY/watch 原生组件来源、版本、哈希、许可及前缀处理。
4. 建立最小 APK，用应用自身 UID 运行 `runtime/probe.mjs`。`runtime/android-probe.sh` 目前只有环境配方，需要预先准备运行资产；不能单独变出可用 runtime。
5. 完成真实闭环：会话→读写文件→执行命令→重启恢复，再做移动界面适配。

用户已授权开始实现，并明确要求锁定最近 release；已选定 v2.2.5。未经新要求不要自动追随最新版本。详细阻碍与来源路径见运行调查记录。
