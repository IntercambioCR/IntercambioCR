@echo off
cd /d "%~dp0"
title Intercambio CR - prueba local
echo Preparando Intercambio CR en modo prueba local...
echo Esta ventana debe quedar abierta.
echo URL: http://localhost:3000
echo.
call npm.cmd run clean
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo No se pudo compilar. Copia el error de arriba.
  pause
  exit /b 1
)
start "" cmd.exe /c "timeout /t 5 >nul && start http://localhost:3000"
call npm.cmd run start
echo.
echo El servidor se cerro. Si ves un error arriba, enviamelo.
pause
