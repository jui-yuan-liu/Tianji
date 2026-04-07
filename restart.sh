#!/bin/bash
pkill -f "node server.js"
sleep 1
nohup npm start > server.log 2>&1 &
echo "Server restarted via npm start (with DB init)"
