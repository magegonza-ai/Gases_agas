@echo off
title GasAgas v2.0 - Sistema de Control de Envases
color 0A

echo ============================================
echo    GASAGAS v2.0 - Control de Envases
echo ============================================
echo.

echo [1/4] Verificando PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo      PostgreSQL no esta corriendo. Iniciando...
    net start postgresql-x64-18
    timeout /t 3 >nul
) else (
    echo      PostgreSQL OK
)
echo.

echo [2/4] Verificando conexion a base de datos...
set PGPASSWORD=admin
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -d control_envases -c "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo      ERROR: No se pudo conectar a la base de datos
    echo      Verifique que PostgreSQL este corriendo en puerto 5432
    pause
    exit /b 1
)
echo      Base de datos OK
echo.

echo [3/4] Iniciando Backend (puerto 3000)...
start "GasAgas Backend" cmd /c "cd /d C:\proyectos\Gases_agas\backend && node server.js"
timeout /t 3 >nul
echo      Backend iniciado
echo.

echo [4/4] Iniciando Frontend (puerto 5173)...
start "GasAgas Frontend" cmd /c "cd /d C:\proyectos\Gases_agas\frontend && npm run dev"
timeout /t 5 >nul
echo      Frontend iniciado
echo.

echo ============================================
echo    SISTEMA LISTO
echo ============================================
echo.
echo    Backend:  http://localhost:3000
echo    Frontend: http://localhost:5173
echo.
echo    Abriendo navegador...
timeout /t 2 >nul
start http://localhost:5173
echo.
echo    Para DETENER el sistema, cierre las ventanas
echo    de Backend y Frontend, o ejecute: detener.bat
echo.
pause
