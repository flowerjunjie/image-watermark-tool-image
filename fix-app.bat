@echo off
echo 图片水印工具 - 应用修复工具
echo ===========================
echo.

REM 设置应用路径
set APP_DIR=dist_electron\Image Watermark Tool-win32-x64\resources\app
set ELECTRON_DIR=%APP_DIR%\electron
set OUTPUT_DIR=%APP_DIR%\.output\public

REM 检查应用目录是否存在
if not exist "%APP_DIR%" (
    echo 错误: 找不到应用目录 %APP_DIR%
    echo 请先运行打包命令: npm run electron:build
    pause
    exit /b 1
)

echo 正在修复应用...
echo.

REM 确保electron目录存在
if not exist "%ELECTRON_DIR%" (
    echo 创建electron目录
    mkdir "%ELECTRON_DIR%"
)

REM 确保.output目录存在
if not exist "%OUTPUT_DIR%" (
    echo 创建输出目录: %OUTPUT_DIR%
    mkdir "%OUTPUT_DIR%"
)

REM 复制electron主要文件
echo 复制electron文件...
copy "electron\main.js" "%ELECTRON_DIR%\" /Y
copy "electron\preload.js" "%ELECTRON_DIR%\" /Y

REM 复制静态文件
echo 复制静态文件...
copy "static-app.html" "%APP_DIR%\" /Y
copy "app.html" "%APP_DIR%\" /Y
copy "direct-app.html" "%APP_DIR%\" /Y
copy "standalone-app.html" "%APP_DIR%\" /Y

REM 检查plugins目录是否存在
if not exist "%APP_DIR%\plugins" (
    echo 创建plugins目录
    mkdir "%APP_DIR%\plugins"
)

REM 确保_nuxt目录存在
if not exist "%OUTPUT_DIR%\_nuxt" (
    echo 创建_nuxt目录
    mkdir "%OUTPUT_DIR%\_nuxt"
)

REM 复制electron插件文件
echo 复制electron插件...
if exist "plugins\electron.client.js" (
    copy "plugins\electron.client.js" "%APP_DIR%\plugins\" /Y
)

REM 复制assets目录
echo 复制资源文件...
if exist "assets" (
    xcopy "assets" "%APP_DIR%\assets\" /E /I /Y
)

REM 复制index.html文件
if exist ".output\public\index.html" (
    echo 复制index.html...
    copy ".output\public\index.html" "%OUTPUT_DIR%\" /Y
)

REM 复制_nuxt目录内容
if exist ".output\public\_nuxt" (
    echo 复制_nuxt目录...
    xcopy ".output\public\_nuxt" "%OUTPUT_DIR%\_nuxt\" /E /I /Y
)

echo.
echo 修复完成!
echo.
echo 请尝试启动应用: dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
echo.
pause 