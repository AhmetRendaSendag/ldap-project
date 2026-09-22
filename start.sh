#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

docker compose up --build -d

echo "API'nin hazır olması bekleniyor..."
until curl -sf http://localhost:8000/ > /dev/null 2>&1; do
  sleep 1
done

echo "Tarayıcı açılıyor: http://localhost:8000"
cmd.exe /c start http://localhost:8000 2>/dev/null || true
