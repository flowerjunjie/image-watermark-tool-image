@echo off
echo ===== 图片水印工具按钮修复脚本 =====
echo 正在创建目录...

mkdir "dist_electron\win-unpacked\" 2>nul
mkdir "dist_app\" 2>nul

echo 正在复制修复文件...

copy /Y "watermark-fix.js" "dist_electron\win-unpacked\"
copy /Y "standalone-app.html" "dist_electron\win-unpacked\"
copy /Y "watermark-fix.js" "dist_app\"
copy /Y "standalone-app.html" "dist_app\"

echo ===== 修复完成 =====
echo 请重新运行应用程序

pause
