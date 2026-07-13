#!/bin/bash
set -e

PORT=3000
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

stopped=0

if pgrep -f "node server.js" > /dev/null 2>&1; then
    pkill -f "node server.js" || true
    stopped=1
    sleep 1
fi

if lsof -ti :"$PORT" > /dev/null 2>&1; then
    lsof -ti :"$PORT" | xargs kill 2>/dev/null || true
    stopped=1
    sleep 1
fi

if lsof -ti :"$PORT" > /dev/null 2>&1; then
    echo "Failed to stop server: port $PORT is still in use."
    lsof -i :"$PORT" 2>/dev/null || true
    exit 1
fi

if [ "$stopped" -eq 1 ]; then
    echo "Server stopped (port $PORT is free)."
else
    echo "No Tianji server process found (port $PORT is already free)."
fi
