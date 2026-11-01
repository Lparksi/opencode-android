#!/system/bin/sh
# Use the app's own UID (instrumentation/run-as), with its actual filesDir.
# Usage: sh android-probe.sh /data/user/0/<package>/files /path/to/probe.mjs
set -eu
APP_FILES=${1:?Pass the actual Android application filesDir}
PROBE_FILE=${2:?Pass the absolute path to probe.mjs}
case "$APP_FILES" in /*) ;; *) echo 'filesDir must be absolute' >&2; exit 2;; esac
case "$PROBE_FILE" in /*) ;; *) echo 'probe path must be absolute' >&2; exit 2;; esac
PREFIX="$APP_FILES/usr"
for REQUIRED in "$PREFIX/bin/node" "$PREFIX/bin/bash" "$PREFIX/lib/libtermux-exec-ld-preload.so" "$PREFIX/etc/tls/cert.pem" "$PREFIX/etc/tls/openssl.cnf" "$PROBE_FILE"; do
  if [ ! -f "$REQUIRED" ]; then echo "Missing runtime file: $REQUIRED" >&2; exit 2; fi
done
export PREFIX
export HOME="$APP_FILES/home"
export TMPDIR="$HOME/tmp"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache"
export PATH="$PREFIX/bin:/system/bin"
export SHELL="$PREFIX/bin/bash"
export LD_LIBRARY_PATH="$PREFIX/lib"
export LD_PRELOAD="$PREFIX/lib/libtermux-exec-ld-preload.so"
export TERMUX_EXEC__SYSTEM_LINKER_EXEC=1
export TERMUX_APP__DATA_DIR="${APP_FILES%/files}"
export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"
export NODE_EXTRA_CA_CERTS="$SSL_CERT_FILE"
export CURL_CA_BUNDLE="$SSL_CERT_FILE"
export GIT_SSL_CAINFO="$SSL_CERT_FILE"
export OPENSSL_CONF="$PREFIX/etc/tls/openssl.cnf"
export OPENCODE_RUNTIME_ROOT="$PREFIX/lib/opencode"
mkdir -p "$TMPDIR" "$HOME/workspaces" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME"
cd "$HOME/workspaces"
exec /system/bin/linker64 "$PREFIX/bin/node" "$PROBE_FILE"
