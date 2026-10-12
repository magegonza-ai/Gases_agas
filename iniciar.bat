@echo off
setlocal
title PROMINER - Control de Envases
color 0A
cd /d "%~dp0"

echo ============================================
echo    PROMINER - Control de Envases
echo ============================================
echo.

REM 1) Verificar Node (local primero, luego sistema)
set "NODE_CMD=node"
if exist "%~dp0node.exe" (
    set "NODE_CMD=%~dp0node.exe"
    echo [OK] Usando Node.js portable: %~dp0node.exe
) else (
    where node >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] No se encuentra Node.js
        echo Instale Node.js 18+ desde https://nodejs.org
        pause
        exit /b 1
    )
    for /f "delims=" %%v in ('node --version') do echo [OK] Node.js %%v
)

echo.

REM 2) Backend deps
if not exist "backend\node_modules\" (
    echo [1/3] Instalando dependencias del backend...
    pushd backend
    call npm install --silent
    if errorlevel 1 ( popd & pause & exit /b 1 )
    popd
) else (
    echo [1/3] Dependencias backend OK
)

REM 3) Frontend deps
if not exist "frontend\node_modules\" (
    echo [2/3] Instalando dependencias del frontend...
    pushd frontend
    call npm install --silent
    if errorlevel 1 ( popd & pause & exit /b 1 )
    popd
) else (
    echo [2/3] Dependencias frontend OK
)

REM 4) Compilar frontend
echo [3/3] Compilando interfaz...
pushd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo al compilar el frontend
    popd
    pause
    exit /b 1
)
popd
echo      Interfaz compilada correctamente
echo.

REM 5) Liberar puerto 3000
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)

REM 6) Iniciar servidor
echo Iniciando servidor PROMINER...
if exist "%~dp0node.exe" (
    start "PROMINER Server" /D "%~dp0backend" cmd /k ""%~dp0node.exe" server.js"
) else (
    start "PROMINER Server" /D "%~dp0backend" cmd /k "node server.js"
)

REM 7) Abrir navegador
timeout /t 4 >nul
start "" "http://localhost:3000"

echo.
echo ============================================
echo    PROMINER INICIANDOSE
echo ============================================
echo.
echo La ventana "PROMINER Server" muestra los logs del servidor.
echo Para DETENER: ejecute detener.bat o cierre esa ventana.
echo.
exit /b 0