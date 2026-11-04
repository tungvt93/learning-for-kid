#!/bin/bash
# Tắt Bé Vui Học đang chạy.   Cách dùng:  ./stop.sh          (cổng mặc định 8765)
#                                        ./stop.sh 9000
PORT="${1:-${PORT:-8765}}"
PIDS=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null)
if [ -z "$PIDS" ]; then echo "Không có chương trình nào đang chạy ở cổng $PORT."; exit 0; fi
echo "$PIDS" | xargs kill && echo "Đã tắt chương trình ở cổng $PORT (PID: $(echo $PIDS | tr '\n' ' '))."
