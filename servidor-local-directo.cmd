@echo off
cd /d "%~dp0"
title Intercambio CR - servidor directo
echo Iniciando Intercambio CR con Node directo.
echo.
echo URL: http://127.0.0.1:3004
echo.
echo IMPORTANTE: deja esta ventana abierta.
echo Si Windows pregunta por permisos de Node.js, presiona Permitir.
echo.
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 -p 3004
echo.
echo El servidor se cerro. Copia cualquier error que aparezca arriba.
pause
