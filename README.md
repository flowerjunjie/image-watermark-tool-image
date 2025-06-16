# 图片水印工具

这是一款简单易用的图片水印工具，支持文字水印、图片水印和平铺水印，支持批量处理和GIF动图。通过Electron打包为跨平台桌面应用。

## 功能特点

- 支持添加文字水印，可设置字体、大小、颜色、透明度等
- 支持添加图片水印，可设置透明度、大小等
- 支持批量处理多张图片
- 支持处理GIF动图
- 支持导出为各种格式：JPG、PNG、GIF等
- 跨平台支持：Windows、macOS、Linux

## 安装方法

### 方法1：下载安装包

1. 前往[Releases页面](https://github.com/flowerjunjie/image-watermark-tool-image/releases)下载对应平台的安装包
2. 双击安装包进行安装
3. 安装完成后运行应用

### 方法2：从源码构建

1. 克隆项目代码
   ```bash
   git clone https://github.com/flowerjunjie/image-watermark-tool-image.git
   cd image-watermark-tool
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 运行开发版本
   ```bash
   npm start
   ```

4. 构建生产版本
   ```bash
   # Windows
   npm run build
   
   # macOS
   npm run build:mac
   
   # Linux
   npm run build:linux
   
   # 构建体积优化版本
   npm run build-small
   ```

## 使用方法

1. 打开应用
2. 点击"打开文件"或拖拽图片到应用中
3. 选择水印类型（文字/图片）
4. 设置水印参数
5. 点击"添加水印"
6. 点击"保存"导出结果

## 构建优化说明

为了减小安装包大小，我们采取了以下优化措施：

1. **依赖优化**：
   - 将`canvas`库移至开发依赖
   - 清理不必要的依赖文件

2. **构建配置优化**：
   - 使用`compression: maximum`最大压缩
   - 启用ASAR打包
   - 排除不必要的文件

3. **特殊构建命令**：
   - `npm run build-small`：生成体积更小的安装包
   - `node optimize-deps.js`：清理依赖中不必要的文件

## 技术栈

- Electron：跨平台桌面应用框架
- Node.js：后端运行环境
- HTML/CSS/JavaScript：前端界面
- Canvas：图片处理

## 许可证

MIT

## 联系方式

项目维护者：Image Watermark Tool Team
