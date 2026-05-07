@echo off
title Vibeid Dev Server

echo ===================================
echo Starting Vibeid Development Server
echo ===================================
echo.

cd /d "%~dp0"

echo Node.js version:
node --version

echo npm version:
npm --version

echo.
echo Starting Next.js dev server...
echo.

npm run dev

pause
