@echo off
cd /d "%~dp0"
set LOG=diagnostico-localhost.txt
echo Diagnostico Intercambio CR > "%LOG%"
echo Fecha: %date% %time% >> "%LOG%"
echo Carpeta: %cd% >> "%LOG%"
echo. >> "%LOG%"
echo === Node === >> "%LOG%"
where node >> "%LOG%" 2>&1
node -v >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo === npm === >> "%LOG%"
where npm.cmd >> "%LOG%" 2>&1
npm.cmd -v >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo === Puertos 3000 y 3010 antes === >> "%LOG%"
netstat -ano | findstr ":3000 :3010" >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo === Build rapido === >> "%LOG%"
call npm.cmd run build >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo === Intento de arranque 3000 === >> "%LOG%"
echo Si esta ventana queda en Ready, abre http://localhost:3000 y NO cierres la ventana.
echo Si se cierra o falla, se abrira el diagnostico.
echo.
call npm.cmd run start >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo === Puertos despues === >> "%LOG%"
netstat -ano | findstr ":3000 :3010" >> "%LOG%" 2>&1
start notepad "%LOG%"
pause
