@echo off
echo ========================================
echo FIXING LOGIN ISSUE - Database Schema
echo ========================================
echo.

REM Get database credentials from .env file
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /B DB_') do (
    if "%%a"=="DB_NAME" set DB_NAME=%%b
    if "%%a"=="DB_USER" set DB_USER=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
)

REM Set defaults if not found
if not defined DB_NAME set DB_NAME=kabini_ai
if not defined DB_USER set DB_USER=postgres

echo Database: %DB_NAME%
echo User: %DB_USER%
echo.

echo Step 1: Updating database schema...
echo Running SQL script to add missing columns and tables...
echo.

REM Set PGPASSWORD for non-interactive mode
if defined DB_PASSWORD set PGPASSWORD=%DB_PASSWORD%

psql -U %DB_USER% -d %DB_NAME% -f fix-database-schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Database schema updated!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Restart your backend server:
    echo    node server.js
    echo.
    echo 2. Look for this message:
    echo    "Default admin user created successfully!"
    echo.
    echo 3. Try logging in again:
    echo    Email: admin@kabini.ai
    echo    Password: Admin@123456
    echo.
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR! Failed to update database
    echo ========================================
    echo.
    echo Please check:
    echo 1. PostgreSQL is running
    echo 2. Database "%DB_NAME%" exists
    echo 3. User "%DB_USER%" has access
    echo 4. Password is correct in .env file
    echo.
    echo To create database manually:
    echo psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"
    echo.
    echo ========================================
)

REM Clear password
set PGPASSWORD=

pause

