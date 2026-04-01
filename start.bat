@echo off
cd /d "%~dp0"
echo Starting Maintenance Calendar...
docker compose up -d --build
echo.
echo Services running:
echo   Frontend  -^> http://localhost:8080
echo   Backend   -^> http://localhost:3000
echo.
echo Run stop.bat to stop.
