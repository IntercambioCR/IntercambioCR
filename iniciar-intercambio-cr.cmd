@echo off
cd /d "%~dp0"
echo Limpiando cache de Next...
call npm.cmd run clean
echo.
echo Iniciando Intercambio CR en http://127.0.0.1:3001
echo Mantenga esta ventana abierta mientras usa la aplicacion.
echo.
call npm.cmd run dev -- --hostname 127.0.0.1 -p 3001
pause
