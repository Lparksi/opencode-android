# Project handoff

- Read `docs/codex-environment.md` and `docs/runtime-investigation.md` before continuing implementation.
- Build a standalone Android APK running OpenCode locally, using the official Web UI where practical. No desktop/server dependency or separate Termux installation. Start with ARM64 and API-backed models.
- Upstream is pinned in `upstream.lock.json`. Do not silently update tags or build from dev/latest.
- Reference `kelai141/dsh-mobile-apk` for embedded Android runtime design. Its success does not prove OpenCode Android compatibility.
- `.upstream/` and `.tools/` are local, reproducible working directories; do not commit downloads, node_modules, runtime snapshots, caches, secrets or signing keys.
- Report host/Linux checks separately from Android app-UID checks. No APK or Android device verification has been completed yet.
- Keep verification results and environment rebuild instructions current as work progresses.
