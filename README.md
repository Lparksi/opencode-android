# OpenCode Android

独立 Android APK 的开发工作区：在手机上运行 OpenCode 引擎与项目文件，优先复用官方 Web 前端。当前为运行时验证阶段，尚未产出可用 APK。

本项目由第三方开发，与 OpenCode 官方无隶属关系。

## 固定版本

- OpenCode **v2.2.5**，提交 `9bbb8ce18c80f099e0e448775f59d965ead40a21`。
- 运行环境参考 `kelai141/dsh-mobile-apk`，提交 `0972fc2423dc9f11e9525d9e22231e03f822543f`。
- 完整版本信息在 `upstream.lock.json`；构建不跟随 `latest` 或 `dev`。

```sh
node scripts/checkout-upstream.mjs
node scripts/checkout-upstream.mjs --reference
node runtime/probe.mjs
bash scripts/build-web.sh
```

探针返回非零表示有检查失败。Linux 上通过不代表 Android 已通过；必须在 APK 自身 UID 下再运行。探针不请求模型，不读取密钥，临时项目在结束后删除。

设计、源码依据、验证结果与下一步见 [docs/runtime-investigation.md](docs/runtime-investigation.md)。

Codex 环境重建、软件要求和任务交接见 [docs/codex-environment.md](docs/codex-environment.md)。
