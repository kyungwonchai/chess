#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-8080}"
export PORT

echo "=================================================="
echo "  ♟️  체스 마스터 (Chess Master) 서버 시작"
echo "  로컬 주소: http://127.0.0.1:$PORT"
echo "=================================================="

exec node server.mjs
