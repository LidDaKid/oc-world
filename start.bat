@echo off
rem double-click me to run oc world on this pc
cd /d "%~dp0"
node tools\dev-server.js --open
pause
