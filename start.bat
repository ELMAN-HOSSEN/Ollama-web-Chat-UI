@echo off

echo Installing required packages...
pip install -r requirements.txt

echo Starting server...
start "Local AI Chat Server" cmd /c "python main.py"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Opening application in browser...
start http://localhost:8000

exit
