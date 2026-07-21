@echo off
REM Lanzador de un clic para Portal Coraza (Windows).
REM Abre dos ventanas: API (NestJS) y Web (Angular). No usa la terminal de Cursor.

cd /d "%~dp0"

echo ==========================================================
echo   Iniciando Portal Coraza...
echo   - API  : http://localhost:3000/api/v1
echo   - Web  : http://localhost:4200
echo ==========================================================
echo.

start "Coraza API" cmd /k "cd /d "%~dp0" && npm run api:dev"
start "Coraza WEB" cmd /k "cd /d "%~dp0" && npm run web:dev"

echo Se abrieron dos ventanas (API y WEB).
echo Espera a que la API diga: System Coraza API: http://localhost:3000/api/v1
echo Luego abre en el navegador: http://localhost:4200
echo.
echo Usuario:    admin@coraza.local
echo Contrasena: Coraza2026!
echo.
pause
