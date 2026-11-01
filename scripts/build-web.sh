#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
node scripts/checkout-upstream.mjs
BUN_VERSION=$(node -p 'JSON.parse(require("fs").readFileSync("upstream.lock.json", "utf8")).build.bun')
npm install --cache "$ROOT/.tools/npm-cache" --prefix "$ROOT/.tools" --no-audit --no-fund "bun@$BUN_VERSION"
export PATH="$ROOT/.tools/node_modules/.bin:$PATH"
export BUN_INSTALL_CACHE_DIR="$ROOT/.tools/bun-cache"
cd "$ROOT/.upstream/opencode"
bun install --frozen-lockfile
bun run --cwd packages/app build
