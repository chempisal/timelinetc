@echo off
chcp 65001 > nul
title កម្មវិធីបែងចែក និងគ្រប់គ្រងកាលវិភាគបង្រៀនគ្រូ
cd /d "%~dp0"

echo =========================================================================
echo    កម្មវិធីបែងចែក និងគ្រប់គ្រងកាលវិភាគបង្រៀនគ្រូ (Timetable Management)
echo    ឆ្នាំសិក្សា ២០២៦ - ២០២៧
echo =========================================================================
echo.
echo  [1/2] កំពុងពិនិត្យដំណើរការ Python...
python --version > nul 2>&1
if errorlevel 1 (
    echo [!] សូមដំឡើង Python ជាមុនសិន!
    pause
    exit /b 1
)

echo  [2/2] កំពុងបើកកម្មវិធី Web Server នៅ http://localhost:5000 ...
start "" http://localhost:5000
python app.py

pause

