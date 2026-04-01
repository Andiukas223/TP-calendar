@echo off
cd /d "%~dp0"
echo Stopping Maintenance Calendar...
docker compose down
echo Stopped. Data is preserved in .\data\
