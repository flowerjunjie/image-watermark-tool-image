@echo off
echo 图片水印工具 - 快速修复脚本
echo ==========================
echo.

REM 设置应用路径
set APP_DIR=dist_electron\Image Watermark Tool-win32-x64\resources\app
set ELECTRON_DIR=%APP_DIR%\electron

REM 确保目录存在
if not exist "%APP_DIR%" (
  echo 错误: 找不到应用目录 %APP_DIR%
  echo 请先运行打包命令: npm run electron:build
  pause
  exit /b 1
)

REM 确保electron目录存在
if not exist "%ELECTRON_DIR%" mkdir "%ELECTRON_DIR%"

echo 正在复制文件...

echo 复制electron主程序文件...
copy "electron\main.js" "%ELECTRON_DIR%\" /Y
copy "electron\preload.js" "%ELECTRON_DIR%\" /Y

echo 复制独立版文件...
copy "standalone-app.html" "%APP_DIR%\" /Y

echo 修复完成！可以启动应用了。
echo.
echo 启动应用: dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
echo.
pause 