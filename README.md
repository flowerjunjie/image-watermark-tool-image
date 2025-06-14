## 图片水印工具

图片水印工具是一个开源项目，可以让用户在本地设备上为图片（如证件照、驾照、护照等）添加水印，无需网络连接。同时具备一键部署网站的功能。

👉 [在线体验](https://watermark.aicompasspro.com)

[English](https://github.com/unilei/image-watermark-tool/blob/master/README.EN.md) | 简体中文

### 最新功能

- **顶部菜单栏**：添加了文件、编辑、查看和帮助菜单，方便快速访问常用功能
- **详细帮助文档**：通过帮助菜单或右上角问号按钮可访问完整的使用说明
- **图片背景色切换**：支持多种护眼背景色，避免纯白背景对眼睛的刺激
- **批量处理优化**：改进了批量处理的性能和稳定性，批量处理时显示"处理中"进度提示
- **界面优化**：更紧凑的布局，更好的视觉体验
- **默认水印大小优化**：调整默认水印文字大小为36px，更加清晰可见
- **原格式保留**：批量下载时保留图片原始格式，不进行格式转换

### 快速开始

### 在Vercel上部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unilei/image-watermark-tool.git&project-name=image-watermark-tool&repository-name=image-watermark-tool)

### 手动在Vercel上部署
```
1. Fork本项目
2. 在[Vercel]网站上，点击[New Project]
3. 点击[Import Git Repository]并选择你fork的项目，然后点击[import]
4. 点击[Deploy]，等待部署完成
```

### 1. 克隆项目

```bash
git clone https://github.com/unilei/image-watermark-tool.git
```

### 2. 安装依赖
```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install
```

### 3. 在浏览器中运行

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev
```

### 4. 在浏览器中打开 [http://localhost:3001](http://localhost:3001)
![success_deploy.jpg](https://www.aicompasspro.com/api/imghosting/file/b9e193a2375d8122c95af.png)

## 独立版本打包指南

图片水印工具提供了独立版本（standalone-app.html），该版本集成了所有功能且不依赖于外部资源，是构建桌面应用的首选版本。

### 打包步骤

1. **准备环境**

   确保已安装所有依赖：
   ```bash
   npm install
   ```

2. **构建应用**

   使用以下命令打包应用：
   ```bash
   npm run electron:build
   ```

3. **修复资源路径**

   打包完成后，运行修复脚本以确保资源正确加载：
   ```bash
   # 完整修复（推荐）
   fix-app.bat

   # 或使用快速修复
   quick-fix.bat
   ```

4. **启动应用**

   打包和修复完成后，可以在以下位置找到应用：
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### 主要功能

1. **多种水印类型**
   - 文字水印：自定义文本、字体大小、颜色和透明度
   - 平铺水印：文字以平铺方式覆盖整个图片
   - 图片水印：上传自定义图片作为水印

2. **灵活的水印设置**
   - 自由拖拽调整水印位置
   - 调整水印透明度
   - 设置水印旋转角度
   - 自定义水印颜色

3. **批量处理功能**
   - 支持批量上传和处理多张图片
   - 保留文件夹结构
   - 批量导出为ZIP压缩包

4. **护眼模式**
   - 多种背景色选择
   - 减少对眼睛的刺激
   - 适合长时间使用

5. **本地处理**
   - 所有处理在本地完成
   - 不上传图片到服务器
   - 保护用户隐私

### 避坑指南

1. **资源路径问题**

   - **问题**: 打包后的应用可能找不到资源文件，导致界面空白或功能失效
   - **解决**: 始终在打包后运行`fix-app.bat`脚本，该脚本会自动复制所需的资源文件

2. **打包后应用界面空白**

   - **问题**: 打包后启动应用发现界面空白，没有任何内容
   - **解决**: 
     - 确保`standalone-app.html`文件已正确复制到应用目录
     - 检查主进程是否正确加载了独立版本的HTML文件
     - 使用`fix-app.bat`脚本修复资源路径

3. **依赖问题**

   - **问题**: 某些依赖可能在打包过程中丢失或不兼容
   - **解决**: 确保`package.json`中的依赖版本正确，必要时可以手动复制`node_modules`中的关键依赖

4. **文件缺失**

   - **问题**: 打包后缺少关键文件如`electron/main.js`
   - **解决**: 运行`fix-app.bat`脚本，它会自动复制所有必要的文件

### 推荐的打包流程

为确保打包成功并避免常见问题，建议按照以下流程操作：

1. 清理旧的构建文件：
   ```bash
   rd /s /q dist_electron
   ```

2. 执行构建命令：
   ```bash
   npm run electron:build
   ```

3. 运行修复脚本：
   ```bash
   fix-app.bat
   ```

4. 测试应用是否正常运行：
   ```
   dist_electron\Image Watermark Tool-win32-x64\Image Watermark Tool.exe
   ```

### 独立版本使用指南

独立版本（standalone-app.html）提供了完整的水印功能，包括：

1. **上传图片**：点击"选择图片"按钮或拖放图片到预览区域

2. **添加水印**：
   - 文本水印：输入水印文本，设置字体大小、颜色和透明度
   - 位置调整：可通过拖拽直接调整水印位置，或使用滑块控制水平和垂直偏移
   - 旋转角度：调整水印旋转角度

3. **导出图片**：
   - 在桌面版中，点击"保存图片"按钮将图片保存到本地
   - 水印处理在本地完成，不会上传图片到任何服务器

4. **其他功能**：
   - 支持调整水印透明度
   - 支持设置水印文本颜色
   - 支持设置水印大小和角度

### 常见问题解答

1. **独立版本与网页版的区别？**
   - 独立版本（standalone-app.html）集成了所有资源，不依赖网络连接
   - 网页版需要加载外部资源，但功能相同

2. **如何修改默认水印文本？**
   - 打开`standalone-app.html`文件，找到默认水印文本设置部分进行修改

3. **打包后的应用体积较大，如何优化？**
   - 可以使用`electron-builder`的配置选项减小打包体积
   - 删除不必要的依赖和资源文件

4. **如何更新已打包的应用？**
   - 修改源代码后重新执行打包流程
   - 记得更新版本号（在`package.json`中）

## 联系与支持

- **作者邮箱**：[flowerjunjienew@gmail.com](mailto:flowerjunjienew@gmail.com)
- **GitHub仓库**：[https://github.com/flowerjunjie/image-watermark-tool-image](https://github.com/flowerjunjie/image-watermark-tool-image)

## 贡献

欢迎提交Pull Request或提出Issues。

## 许可

本项目采用MIT许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。
