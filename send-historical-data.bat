@echo off
echo Sending Historical Discord Data to Webbased System...
echo.

cd /d "%~dp0"
node send-historical-data.js

echo.
echo Historical data transfer completed. Press any key to close...
pause > nul