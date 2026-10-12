@echo off
setlocal
title PROMINER - Control de Envases
color 0A
cd /d "%~dp0"

echo ============================================
echo    PROMINER - Control de Envases
echo ============================================
echo.

REM 1) Verificar node.exe embebido (version portable, no requiere Node instalado)
if not exist "%~dp0node.exe" (
    echo [ERROR] No se encontro node.exe junto a este archivo.
    echo         El paquete portable esta incompleto.
    pause
    exit /b 1
)
echo [OK] Usando Node.js portable

REM 2) Liberar el puerto 3000 si quedo ocupado
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)

REM 3) Iniciar el servidor (API + interfaz) con el node embebido
echo Iniciando servidor PROMINER...
start "PROMINER Server" /D "%~dp0backend" cmd /k ""%~dp0node.exe" server.js"

REM 4) Abrir el navegador
timeout /t 4 >nul
start "" "http://localhost:3000"

echo.
echo ============================================
echo    PROMINER INICIADO
echo ============================================
echo.
echo La ventana "PROMINER Server" muestra los registros del servidor.
echo Para DETENER: ejecute detener.bat o cierre esa ventana.
echo.
exit /b 0
