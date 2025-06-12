@echo off
chcp 65001 > nul
echo 图片水印工具 - 应用修复工具
echo ==========================
echo.

REM 设置应用路径
set APP_DIR=dist_electron\Image Watermark Tool-win32-x64\resources\app
set ELECTRON_DIR=%APP_DIR%\electron

REM 确保目录存在
if not exist "%APP_DIR%" (
  echo 错误: 找不到应用目录 %APP_DIR%
  echo 请先运行打包命令: npm run electron:package
  pause
  exit /b 1
)

REM 确保electron目录存在
if not exist "%ELECTRON_DIR%" (
  echo 创建electron目录...
  mkdir "%ELECTRON_DIR%"
)

echo 开始修复应用程序...
echo.

echo 1. 复制主程序文件...
copy "electron\main.js" "%ELECTRON_DIR%\" /Y
if %errorlevel% neq 0 (
  echo 错误: 复制main.js失败
  pause
  exit /b 1
)

copy "electron\preload.js" "%ELECTRON_DIR%\" /Y
if %errorlevel% neq 0 (
  echo 错误: 复制preload.js失败
  pause
  exit /b 1
)

echo 2. 复制HTML文件...
copy "standalone-app.html" "%APP_DIR%\" /Y
if %errorlevel% neq 0 (
  echo 错误: 复制standalone-app.html失败
  pause
  exit /b 1
)

copy "app.html" "%APP_DIR%\" /Y
if %errorlevel% neq 0 (
  echo 错误: 复制app.html失败
  pause
  exit /b 1
)

copy "direct-app.html" "%APP_DIR%\" /Y
if %errorlevel% neq 0 (
  echo 错误: 复制direct-app.html失败
  pause
  exit /b 1
)

echo 3. 清理缓存...
if exist "%APP_DIR%\.cache" (
  echo 删除缓存目录...
  rd /s /q "%APP_DIR%\.cache"
)

echo.
echo 修复完成！可以启动应用了。
echo.
echo 启动应用: dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
echo.

REM 询问是否立即启动应用
set /p START_APP=是否立即启动应用? (Y/N): 
if /i "%START_APP%"=="Y" (
  echo 启动应用程序...
  start "" "dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe"
) else (
  echo 您可以稍后手动启动应用程序。
)

pause 