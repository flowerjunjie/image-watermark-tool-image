@echo off
echo 正在终止现有的应用程序实例...
taskkill /F /IM "Image Watermark Tool.exe" 2>nul || echo "应用未运行"

echo 正在复制最新代码...
copy standalone-app.html "dist_electron\Image Watermark Tool-win32-x64\resources\app\standalone-app.html"

echo 正在启动应用程序...
start "" "dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe"

echo 应用程序已启动！ 