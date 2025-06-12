@echo off
echo Quick fix for Image Watermark Tool...

set APP_DIR=dist_electron\Image Watermark Tool-win32-x64\resources\app
set ELECTRON_DIR=%APP_DIR%\electron

REM Copy direct-app.html to root directory
echo Copying direct-app.html to root directory...
copy direct-app.html "%APP_DIR%\"

REM Create a simple launcher that directly loads direct-app.html
echo Creating direct launcher...
echo const { app, BrowserWindow } = require('electron'); > "%APP_DIR%\direct-launcher.js"
echo const path = require('path'); >> "%APP_DIR%\direct-launcher.js"
echo const fs = require('fs'); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo // Keep a global reference of the window object >> "%APP_DIR%\direct-launcher.js"
echo let mainWindow; >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo function createWindow() { >> "%APP_DIR%\direct-launcher.js"
echo   mainWindow = new BrowserWindow({ >> "%APP_DIR%\direct-launcher.js"
echo     width: 1200, >> "%APP_DIR%\direct-launcher.js"
echo     height: 800, >> "%APP_DIR%\direct-launcher.js"
echo     webPreferences: { >> "%APP_DIR%\direct-launcher.js"
echo       nodeIntegration: true, >> "%APP_DIR%\direct-launcher.js"
echo       contextIsolation: false, >> "%APP_DIR%\direct-launcher.js"
echo       webSecurity: false >> "%APP_DIR%\direct-launcher.js"
echo     } >> "%APP_DIR%\direct-launcher.js"
echo   }); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo   const appPath = app.getAppPath(); >> "%APP_DIR%\direct-launcher.js"
echo   console.log('App path:', appPath); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo   const directAppPath = path.join(appPath, 'direct-app.html'); >> "%APP_DIR%\direct-launcher.js"
echo   console.log('Loading:', directAppPath); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo   mainWindow.loadFile(directAppPath); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo   mainWindow.on('closed', function () { >> "%APP_DIR%\direct-launcher.js"
echo     mainWindow = null; >> "%APP_DIR%\direct-launcher.js"
echo   }); >> "%APP_DIR%\direct-launcher.js"
echo } >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo app.on('ready', createWindow); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo app.on('window-all-closed', function () { >> "%APP_DIR%\direct-launcher.js"
echo   if (process.platform !== 'darwin') { >> "%APP_DIR%\direct-launcher.js"
echo     app.quit(); >> "%APP_DIR%\direct-launcher.js"
echo   } >> "%APP_DIR%\direct-launcher.js"
echo }); >> "%APP_DIR%\direct-launcher.js"
echo. >> "%APP_DIR%\direct-launcher.js"
echo app.on('activate', function () { >> "%APP_DIR%\direct-launcher.js"
echo   if (mainWindow === null) { >> "%APP_DIR%\direct-launcher.js"
echo     createWindow(); >> "%APP_DIR%\direct-launcher.js"
echo   } >> "%APP_DIR%\direct-launcher.js"
echo }); >> "%APP_DIR%\direct-launcher.js"

REM Modify package.json to use our direct launcher
echo Updating package.json...
echo { > "%APP_DIR%\package.json"
echo   "name": "image-watermark-tool", >> "%APP_DIR%\package.json"
echo   "version": "1.0.0", >> "%APP_DIR%\package.json"
echo   "main": "direct-launcher.js" >> "%APP_DIR%\package.json"
echo } >> "%APP_DIR%\package.json"

echo Fix completed. Please restart the application.
pause 