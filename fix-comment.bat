off
echo
修复注释错误...
powershell
-Command
(Get-Content 'dist_electron\Image Watermark Tool-win32-x64\resources\app\standalone-app.html') -replace '      \*/\r\n    \*/\r\n    \r\n    // 处理单张图片', '      */\r\n    // 处理单张图片' | Set-Content 'dist_electron\Image Watermark Tool-win32-x64\resources\app\standalone-app.html'
echo
修复完成！
