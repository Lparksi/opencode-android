# Android 本地运行验证记录

## 目标与边界

引擎、Shell、项目、数据库都在手机内；首版模型经 API 调用。独立 APK、ARM64、免 Root。复用官方 Web UI；不要求另装 Termux。离线模型、手机控制、无障碍与 Shizuku 不属于首版。

## 固定上游

2026-11-01 核实最近的 v2 非预发布 release 为 v2.2.5，2026-10-30T23:17:23Z 发布。GitHub `releases/latest` 当时指向 v1.19.5，所以使用 releases 列表筛选 v2 后固定 tag 和完整 SHA。详见 upstream.lock.json。

源码存放于被忽略的 `.upstream/`。checkout 脚本验证 SHA 和干净工作区，不会重置已有修改。

## 官方前端可复用

v2.2.5 的 `packages/app/package.json` 定义 SolidJS/Vite Web 应用与独立 build 命令；`packages/cli/src/services/web-ui.ts` 提供前端静态资源、SPA 路由和 API 分流。优先让 WebView 打开本机引擎所服务的页面，使 UI/API 同源。仍需实测软键盘、文件选择和 WebView 支持。

## DSH 参考与适用范围

参考 https://github.com/kelai141/dsh-mobile-apk ，不是连接桌面网关的同名客户端。

已查阅源码：

- `app/src/main/java/com/dsharnessmobile/shell/EngineManager.kt`：私有 usr/home、ProcessBuilder、linker64 回退、运行环境变量、CA 与 OpenSSL 路径、termux-exec 子进程适配。
- `scripts/relocate-snapshot.py`：文本路径、符号链接重定位；不以变长字符串替换 ELF。
- `app/build.gradle.kts`：打包运行快照，minSdk 26，targetSdk 34。
- `README.md` 与 `THIRD_PARTY_NOTICES.md`：Termux 衍生环境、组件许可。

采用的思路：内置 Bionic 运行环境、启动本地 Node 引擎、WebView UI。现阶段未复制 DSH 业务代码或快照。源码注释对系统限制的说明视为待验证依据；不能视为所有 Android 版本均可运行的保证。APK 内执行和子进程必须以应用 UID 实测。

## OpenCode 特有障碍

| 模块 | v2.2.5 源码证据 | 需要完成 |
| --- | --- | --- |
| Node 构建 | `packages/cli/script/build-node.ts` 固定 Node 26.4.0 | Android 运行时版本与能力匹配，不直接使用 Linux SEA |
| 构建目标 | `packages/cli/src/node/target.ts` 只有 darwin/linux/win32，Linux 原生资产固定 glibc | 单独 Android bundle/资产装配路径 |
| SQLite | `packages/core/src/database/sqlite.node.ts` 使用 node:sqlite | 在 Android Node 验证 WAL、重启持久化及实际数据库接口 |
| PTY | `packages/core/src/pty/pty.node.ts` 加载 @lydell/node-pty，可通过 OPENCODE_NODE_PTY_PATH 指定 | Bionic 编译 addon 和 spawn helper |
| 持久终端 | `packages/core/src/persistent-pty/binary.node.ts` 使用 OPENCODE_PTY_BIN 或 opencode-pty | 编译/验证 Android helper，不只验证聊天 |
| 文件搜索 | `packages/core/src/filesystem/fff.node.ts` 对缺失模块有降级入口 | 检查调用方是否完整降级，不能直接认定可用 |
| 文件监听 | `packages/core/src/filesystem/watcher.ts` 仅为 linux 选择 inotify | 补 Android backend 与 Bionic watcher，或经过验证的降级 |
| Node 参数 | `packages/cli/src/node/target.ts` 使用 experimental-ffi、use-system-ca | 实测 Android Node 是否支持，保持 TLS 验证 |

## 已完成验证

当前环境为 Linux x64，Node v24.19.0、Java 21；未配置 Android SDK、adb、模拟器或真机。

`runtime/probe.mjs` 首轮报告 PTY 缺依赖；使用固定 Bun 1.4.4 和上游 frozen lockfile 安装依赖后，从 core 模块树解析 PTY 重跑，文件 UTF-8 读写、SQLite WAL/关闭重开、Shell 子进程、Git 初始化、文件监听、本机 HTTP、PTY 输出与退出共 7 项全部通过。结果见 `docs/evidence/linux-runtime-probe.json`。上游源码保持干净。此探针只验证基础能力，不证明完整 OpenCode 可启动。

`runtime/android-probe.sh` 依据 DSH 的环境组织方式编写，显式传入实际 filesDir，先检查必需文件，再调用系统 linker 启动 Node。它不下载或安装快照。尚未在 Android 上运行。

官方 Web 前端已用 Bun 1.4.4 构建通过，输出在 `.upstream/opencode/packages/app/dist`，未压缩目录约 158 MiB。构建证据见 `docs/evidence/web-build.json`；可用 `bash scripts/build-web.sh` 重建。该尺寸包含上游资源，APK 资源裁剪和压缩尚未处理，WebView 尚未验证。

## 接下来的交付门槛

1. 准备可追溯的 Android Node/Bash/Git/termux-exec/CA 运行资产，固定版本、哈希与各组件许可；处理新应用前缀。
2. 完成 OpenCode Android JS bundle、PTY 和 watcher 适配；构建机上做引擎集成验证。
3. 加入最小 APK 宿主，在应用 UID 下执行探针并保留 JSON 结果。
4. 接入本机鉴权、前台服务与官方 UI，实测创建会话→读文件→改文件→执行命令→重启恢复。
5. 通过上述闭环后再处理键盘、小屏、导入导出和后台恢复。

没有设备验证结果前，不把普通 Linux ARM64 二进制、DSH 的运行记录或网页能打开算作 Android 本地运行已完成。
