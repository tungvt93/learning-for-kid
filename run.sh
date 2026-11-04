#!/bin/bash
# Chạy Bé Vui Học.   Cách dùng:  ./run.sh          (cổng mặc định 8765)
#                              ./run.sh 9000     (chọn cổng khác)
#                              PORT=9000 ./run.sh
cd "$(dirname "$0")" || exit 1
PORT="${1:-${PORT:-8765}}"
exec python3 server.py "$PORT"
