#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Maintenance Calendar..."

docker compose up -d --build

echo ""
echo "Services running:"
echo "  Frontend  -> http://localhost:8080"
echo "  Backend   -> http://localhost:3000"
echo ""
echo "Run ./stop.sh to stop."
