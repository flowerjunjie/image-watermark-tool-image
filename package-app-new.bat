@echo off
echo ===== 图片水印工具重新打包脚本（新版本）=====
echo 正在复制新版本文件到打包目录...

rem 复制文件到win-unpacked目录
copy /Y "integrated-watermark.js" "dist_electron\win-unpacked\"
copy /Y "standalone-app-new.html" "dist_electron\win-unpacked\standalone-app.html"

rem 复制文件到打包应用程序目录
copy /Y "integrated-watermark.js" "dist_electron\Image Watermark Tool-win32-x64\resources\app\"
copy /Y "standalone-app-new.html" "dist_electron\Image Watermark Tool-win32-x64\resources\app\standalone-app.html"

echo ===== 重新打包完成 =====
echo 现在您可以运行打包后的应用程序了
echo 应用程序位置: dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe

pause 