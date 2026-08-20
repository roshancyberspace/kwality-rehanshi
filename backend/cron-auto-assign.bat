@echo off
cd /d "%~dp0"
if exist "C:\xampp\php\php.exe" (
  "C:\xampp\php\php.exe" artisan bookings:auto-assign
) else (
  php artisan bookings:auto-assign
)
