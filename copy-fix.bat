@echo off
echo ===== 图片水印工具简易修复脚本 =====
echo 正在复制修复文件...

rem 创建必要的目录
mkdir "dist_electron\win-unpacked\" 2>nul
mkdir "dist_app\" 2>nul

rem 复制文件到多个位置
copy /Y "standalone-app.html" "dist_electron\win-unpacked\"
copy /Y "watermark-fix.js" "dist_electron\win-unpacked\"
copy /Y "standalone-app.html" "dist_app\"
copy /Y "watermark-fix.js" "dist_app\"

echo ===== 复制完成 =====
echo 请尝试运行应用程序

pause 