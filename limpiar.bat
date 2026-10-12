@echo off
setlocal
title PROMINER - Limpiar datos operativos
color 0E
cd /d "%~dp0"

echo ============================================
echo    PROMINER - LIMPIAR DATOS OPERATIVOS
echo ============================================
echo.
echo Esta accion borra los MOVIMIENTOS:
echo    recepciones, cilindros, guias, ordenes de
echo    trabajo, llenados, entregas y transacciones.
echo.
echo Se CONSERVAN los catalogos:
echo    clientes, trabajadores, productos, plantas y cargos.
echo.
echo Esta accion NO se puede deshacer.
echo.

set /p CONFIRMA="Escriba SI para confirmar y limpiar: "
if /i not "%CONFIRMA%"=="SI" (
    echo.
    echo Cancelado. No se modifico nada.
    pause
    exit /b 1
)

echo.
echo Deteniendo PROMINER si esta en ejecucion...
taskkill /FI "WINDOWTITLE eq PROMINER Server*" /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
timeout /t 1 >nul

REM Elegir el ejecutable de Node (portable primero, luego sistema)
set "NODE_CMD=node"
if exist "%~dp0node.exe" set "NODE_CMD=%~dp0node.exe"

echo.
echo Ejecutando limpieza...
"%NODE_CMD%" "%~dp0backend\limpiar_datos.js"
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo completar la limpieza.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    LIMPIEZA COMPLETADA
echo ============================================
echo.
pause
