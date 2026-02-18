```bat
   @echo off
   set REPO_DIR=C:\Users\%USERNAME%\Desktop\bonsai-tracker-react
   set BASH_EXE=C:\Program Files\Git\bin\bash.exe

   start "Bonsai Tracker" "%BASH_EXE%" -lc "cd \"%REPO_DIR%\" && ./start_project.sh"
   timeout /t 6 /nobreak >nul
   start "" http://localhost:5173
   ```