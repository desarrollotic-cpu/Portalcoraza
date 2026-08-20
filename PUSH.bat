@echo off
title Publicando cambios de Portal Coraza
echo =========================================================
echo   PUBLICANDO COLA DE IMPRESION Y DASHBOARD A GITHUB...
echo =========================================================
echo.
cd /d "C:\Users\gdocumental\Documents\APP CORAZA 2027"
git push origin main
echo.
echo =========================================================
echo   PUBLICADO CON EXITO A GITHUB Y RENDER!
echo   Render desplegara los cambios en 1 o 2 minutos.
echo =========================================================
timeout /t 5
