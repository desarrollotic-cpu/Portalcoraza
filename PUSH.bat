@echo off
title Publicando Portal Coraza a GitHub y Render
echo =========================================================
echo   ENVIANDO CAMBIOS A GITHUB Y RENDER (PRODUCCION)...
echo =========================================================
echo.
cd /d "C:\Users\gdocumental\Documents\APP CORAZA 2027"
git push origin main
echo.
echo =========================================================
echo   PUBLICADO CON EXITO A GITHUB Y RENDER!
echo =========================================================
timeout /t 3
