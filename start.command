#!/bin/bash
# Bấm đúp file này để chạy (giống ./run.sh)
cd "$(dirname "$0")" || exit 1
exec ./run.sh "$@"
