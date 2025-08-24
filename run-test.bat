@echo off
echo Running User-Channel Link Test...
echo.

cd /d "%~dp0"
node test-user-channel-link.js

echo.
echo Test completed. Press any key to close...
pause > nul