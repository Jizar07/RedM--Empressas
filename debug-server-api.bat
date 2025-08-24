@echo off
echo Debugging Server API Endpoints...
echo.

cd /d "%~dp0"
node debug-server-api.js

echo.
echo Debug completed. Press any key to close...
pause > nul