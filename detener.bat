@echo off
setlocal enableextensions
title PROMINER - Deteniendo
color 0C

echo Deteniendo PROMINER...

REM Cerrar la ventana del servidor si existe
taskkill /FI "WINDOWTITLE eq PROMINER Server*" /F >nul 2>&1

REM Liberar el puerto 3000 (proceso node que sirve la aplicacion)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   Cerrando proceso PID %%p...
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo PROMINER detenido.
timeout /t 2 >nul
