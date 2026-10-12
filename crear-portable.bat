@echo off
setlocal
cd /d "%~dp0"
title PROMINER - Crear paquete portable

echo ============================================
echo    Crear PROMINER-Portable (ZIP)
echo ============================================
echo.

echo Cerrando el servidor si esta en ejecucion (libera la base de datos)...
taskkill /FI "WINDOWTITLE eq PROMINER Server*" /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1

echo.
echo Construyendo el ZIP...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_portable.ps1"

echo.
echo ============================================
echo    Archivo generado: PROMINER-Portable-v2.1.0.zip
echo ============================================
echo.
pause
