@echo off
echo ===== 图片水印工具修复脚本 =====
echo 正在修复应用程序...

REM 复制关键文件到多个位置
echo 正在复制关键文件...
copy /Y "standalone-app.html" "dist_electron\win-unpacked\" 
copy /Y "watermark-fix.js" "dist_electron\win-unpacked\" 

REM 创建必要的目录
mkdir "dist_electron\win-unpacked\resources\app" 2>nul

REM 解压app.asar
echo 正在解压app.asar...
npx asar extract "dist_electron\win-unpacked\resources\app.asar" "dist_electron\win-unpacked\resources\app"

REM 复制修复后的文件到app目录
echo 正在复制修复文件...
copy /Y "watermark-fix.js" "dist_electron\win-unpacked\resources\app\"
copy /Y "standalone-app.html" "dist_electron\win-unpacked\resources\app\"

REM 创建简单的直接HTML文件
echo 正在创建备用HTML文件...
echo ^<!DOCTYPE html^> > "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<html lang="zh-CN"^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<head^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<meta charset="UTF-8"^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<title^>图片水印工具 - 独立版^</title^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<style^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #333; } >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo .container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); } >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo h1 { color: #1976d2; text-align: center; } >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo .btn { display: inline-block; background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px; } >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo .center { text-align: center; } >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^</style^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^</head^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<body^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<div class="container"^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<h1^>图片水印工具 - 独立版^</h1^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<p^>正在加载应用程序...^</p^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^<div class="center"^>^<a href="standalone-app.html" class="btn"^>点击此处手动加载^</a^>^</div^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^</div^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^</body^> >> "dist_electron\win-unpacked\direct-standalone-app.html"
echo ^</html^> >> "dist_electron\win-unpacked\direct-standalone-app.html"

REM 重新打包app.asar
echo 正在重新打包app.asar...
npx asar pack "dist_electron\win-unpacked\resources\app" "dist_electron\win-unpacked\resources\app.asar"

echo ===== 修复完成 =====
echo 请尝试运行应用程序
echo 如果仍然有问题，请联系技术支持

pause