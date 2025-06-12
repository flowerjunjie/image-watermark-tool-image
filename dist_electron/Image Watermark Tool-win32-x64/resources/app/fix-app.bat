@echo off
echo 开始修复图片水印工具应用...

if not exist "dist_electron\Image Watermark Tool-win32-x64" (
  echo 错误: 找不到打包的应用目录，请先运行打包命令
  exit /b 1
)

echo 复制资源文件...

rem 复制static-app.html到应用根目录
copy /Y "static-app.html" "dist_electron\Image Watermark Tool-win32-x64\resources\app\"
if errorlevel 1 (
  echo 错误: 复制static-app.html失败
  exit /b 1
)

rem 复制direct-app.html到应用根目录
copy /Y "direct-app.html" "dist_electron\Image Watermark Tool-win32-x64\resources\app\"
if errorlevel 1 (
  echo 错误: 复制direct-app.html失败
  exit /b 1
)

rem 复制app.html到应用根目录
copy /Y "app.html" "dist_electron\Image Watermark Tool-win32-x64\resources\app\"
if errorlevel 1 (
  echo 错误: 复制app.html失败
  exit /b 1
)

rem 复制.output目录到应用根目录
xcopy /E /I /Y ".output" "dist_electron\Image Watermark Tool-win32-x64\resources\app\.output"
if errorlevel 1 (
  echo 错误: 复制.output目录失败
  exit /b 1
)

echo 修复完成！应用已经准备好了
echo 应用路径: %CD%\dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe

pause 