@echo off
echo Starting repair for Image Watermark Tool...

REM Check if dist_electron directory exists
if not exist "dist_electron\Image Watermark Tool-win32-x64\resources\app" (
  echo Error: Application directory does not exist!
  echo Please run 'npm run electron:build' command first
  pause
  exit /b 1
)

REM Create necessary directories
echo Creating necessary directories...
mkdir "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output" 2>nul
mkdir "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public" 2>nul
mkdir "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt" 2>nul

REM Copy direct-app.html file (standalone version)
echo Copying standalone app page...
copy direct-app.html "dist_electron\Image Watermark Tool-win32-x64\resources\app\"

REM Copy app.html file
echo Copying backup startup page...
copy app.html "dist_electron\Image Watermark Tool-win32-x64\resources\app\"

REM Copy static-app.html file
echo Copying startup page...
copy static-app.html "dist_electron\Image Watermark Tool-win32-x64\resources\app\"

REM Copy .output directory
echo Copying application resource files...
xcopy /E /I /Y ".output" "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output"

REM Create empty files to prevent 404 errors
echo Creating placeholder files to prevent 404 errors...
echo /* Placeholder file */ > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\entry.j9gQarq9.css"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\Cq1aTWkE.js"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\Ax7DErdK.js"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\DlAUqK2U.js"
echo /* Placeholder file */ > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\error-404.DqZyKpgk.css"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\BvOVjyZK.js"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\DMjQw7N5.js"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\CEE8wTJl.js"
echo /* Placeholder file */ > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\error-500.CZqNkBuR.css"
echo // Placeholder file > "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output\public\_nuxt\C4aJ9PsN.js"

echo Repair completed!
echo Please try restarting the application
pause 