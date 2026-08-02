@echo off
title Dairy Management System
echo ==============================================
echo   Dairy Management System Launcher
echo ==============================================
echo.

rem Check if node_modules exists in root
if not exist node_modules (
    echo [INFO] node_modules not found. Installing project dependencies...
    echo This may take a few minutes. Please wait...
    call npm install
    call npm run install-deps
) else (
    echo [INFO] Project dependencies are already installed.
)

rem Check if backend node_modules exists
if not exist backend\node_modules (
    echo [INFO] Installing backend dependencies...
    call npm install --workspace=backend
)

rem Check if frontend node_modules exists
if not exist frontend\node_modules (
    echo [INFO] Installing frontend dependencies...
    call npm install --workspace=frontend
)

rem Supabase database is hosted remotely; no local database initialization required.
echo Make sure you have set up your Supabase project credentials in frontend/.env

echo.
echo Starting frontend application...
echo The browser will open automatically at http://localhost:3000
echo.
echo Press Ctrl+C to stop.
echo.

call npm run dev:frontend
pause


