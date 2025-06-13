# 图片水印工具修复脚本
Write-Host "===== 图片水印工具修复脚本 ====="
Write-Host "正在修复应用程序..."

# 检查目录是否存在
if (-not (Test-Path -Path "dist_app")) {
    New-Item -Path "dist_app" -ItemType Directory
}

if (-not (Test-Path -Path "dist_electron\win-unpacked")) {
    New-Item -Path "dist_electron\win-unpacked" -ItemType Directory -Force
}

if (-not (Test-Path -Path "dist_electron\win-unpacked\resources")) {
    New-Item -Path "dist_electron\win-unpacked\resources" -ItemType Directory -Force
}

# 复制关键文件到多个位置
Write-Host "正在复制关键文件..."
Copy-Item -Path "standalone-app.html" -Destination "dist_electron\win-unpacked\" -Force
Copy-Item -Path "watermark-fix.js" -Destination "dist_electron\win-unpacked\" -Force

# 创建必要的目录
if (-not (Test-Path -Path "dist_electron\win-unpacked\resources\app")) {
    New-Item -Path "dist_electron\win-unpacked\resources\app" -ItemType Directory -Force
}

# 解压app.asar (如果存在)
if (Test-Path -Path "dist_electron\win-unpacked\resources\app.asar") {
    Write-Host "正在解压app.asar..."
    npm install -g asar
    asar extract "dist_electron\win-unpacked\resources\app.asar" "dist_electron\win-unpacked\resources\app"
} else {
    Write-Host "app.asar文件不存在，跳过解压步骤"
}

# 复制修复后的文件到app目录
Write-Host "正在复制修复文件..."
Copy-Item -Path "watermark-fix.js" -Destination "dist_electron\win-unpacked\resources\app\" -Force
Copy-Item -Path "standalone-app.html" -Destination "dist_electron\win-unpacked\resources\app\" -Force

# 重新打包app.asar
if (Test-Path -Path "dist_electron\win-unpacked\resources\app") {
    Write-Host "正在重新打包app.asar..."
    asar pack "dist_electron\win-unpacked\resources\app" "dist_electron\win-unpacked\resources\app.asar"
} else {
    Write-Host "app目录不存在，跳过重新打包步骤"
}

Write-Host "===== 修复完成 ====="
Write-Host "请尝试运行应用程序"
Write-Host "如果仍然有问题，请联系技术支持"

Read-Host -Prompt "按任意键继续..."