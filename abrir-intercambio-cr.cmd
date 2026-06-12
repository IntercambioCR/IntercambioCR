@echo off
cd /d "%~dp0"
title Intercambio CR - servidor local
echo.
echo Iniciando Intercambio CR...
echo Esta ventana debe quedar abierta mientras uses la pagina.
echo.
echo URL: http://127.0.0.1:3010
echo.
start "" cmd.exe /c "timeout /t 8 >nul && start http://127.0.0.1:3010"
call npm.cmd run clean
call npm.cmd run dev -- --hostname 127.0.0.1 -p 3010
pause
