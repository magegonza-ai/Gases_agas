@echo off
title GasAgas - Deteniendo servicios
color 0C

echo Deteniendo Frontend y Backend de GasAgas...
taskkill /FI "WINDOWTITLE eq GasAgas Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GasAgas Frontend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq *node*" /F >nul 2>&1
echo Servicios detenidos.
timeout /t 2 >nul
