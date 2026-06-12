@echo off
cd /d "%~dp0"
title Intercambio CR - localhost 3000
echo Iniciando Intercambio CR en http://localhost:3000
echo.
echo IMPORTANTE:
echo - No cierres esta ventana.
echo - Si Windows pregunta por permisos de Node.js, presiona Permitir.
echo.
echo Limpiando cache...
call npm.cmd run clean
echo.
echo Abriendo navegador en unos segundos...
start "" cmd.exe /c "timeout /t 10 >nul && start http://localhost:3000"
echo.
echo Iniciando servidor...
call npm.cmd run dev -- --hostname localhost -p 3000
echo.
echo El servidor se cerro. Si ves un error arriba, enviamelo.
pause
