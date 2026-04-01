#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Stopping Maintenance Calendar..."

docker compose down

echo "Stopped. Data is preserved in ./data/"
