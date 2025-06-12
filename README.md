# Image Watermark Tool
Image Watermark Tool 是一个开源项目，用户可以在本地设备上给自己的图片（如身份证、驾照、护照等）添加水印，无需任何网络连接，并具有轻松的一键网站部署功能。
👉 [Image Watermark Tool](https://watermark.aicompasspro.com)

[English](https://github.com/unilei/image-watermark-tool/blob/master/README.EN.md) | 简体中文

## 快速开始

### 在 Vercel 上部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unilei/image-watermark-tool.git&project-name=image-watermark-tool&repository-name=image-watermark-tool)

### 在 Vercel 上手动部署 操作方法

```
1. fork 本项目
2. 在 [Vercel] 官网点击 [New Project]
3. 点击 [Import Git Repository] 并选择你 fork 的此项目并点击 [import]
4. 然后直接点 [Deploy] 接着等部署完成即可
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
### 3. 运行到浏览器

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev
```

### 4. 在浏览器打开 [http://localhost:3001](http://localhost:3001)
![success_deploy.jpg](https://www.aicompasspro.com/api/imghosting/file/fddc13c78a10d7f841ac1.png)

#### 如何部署到自己服务器？ NUXT.JS 打包部署文档
[部署文档](https://nuxt.com/docs/getting-started/deployment)

### 如何通过 Docker 部署

### 1. 方式一
```bash
docker pull ghcr.io/chung1912/image-watermark-tool:master
```

```bash
docker run -it --name image-watermark-tool \
-p 3000:3000 \
--restart always \
ghcr.io/chung1912/image-watermark-tool:master
```

### 2. 方式二
```bash
docker pull ghcr.io/chung1912/image-watermark-tool-nginx:master
```

```bash
docker run -it --name image-watermark-tool-nginx \
-p 8080:80 \
-p 8443:443 \
-v /path/to/private.pem:/etc/nginx/private.pem  \
-v /path/to/private.key:/etc/nginx/private.key \
--restart always \
ghcr.io/chung1912/image-watermark-tool-nginx:master
```

## 功能特点

- 添加文字水印
- 支持调整水印的透明度、大小、角度和颜色
- 支持单张图片和批量处理
- 支持平铺水印和单个水印模式
- 完全本地处理，不需要联网

## 安装使用

1. 下载最新的安装包
2. 解压后直接运行 `Image Watermark Tool.exe`

## 开发指南

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 打包应用
npm run electron:build
```

### 应用结构

- `app/` - 主应用组件
- `electron/` - Electron主进程代码
- `components/` - 可复用的Vue组件
- `pages/` - 应用页面
- `plugins/` - Nuxt插件
- `assets/` - 静态资源文件

## 常见问题解决

### 应用加载失败 (ERR_FILE_NOT_FOUND)

如果应用显示"页面加载失败: -6 ERR_FILE_NOT_FOUND"错误，可以尝试以下方法：

1. 运行应用根目录下的`fix-app.bat`脚本
2. 或者运行`quick-fix.bat`脚本（更轻量级的修复）

这些脚本会修复应用加载路径问题，重新生成必要的HTML文件。

### 页面资源加载失败

如果应用能够打开，但显示资源加载错误，可能是由于以下原因：

1. Nuxt资源路径问题 - 在Electron环境中，资源路径需要使用相对路径而非绝对路径
2. 应用资源未正确打包 - 确保`.output`目录的内容被正确复制到应用资源目录

运行`fix-app.bat`脚本通常可以解决这些问题。

## 开发笔记

### Electron与Nuxt集成

本应用使用了三种HTML入口文件作为加载策略：

1. `app.html` - 主应用入口，包含完整的应用UI
2. `static-app.html` - 静态加载器，负责加载Nuxt应用
3. `direct-app.html` - 重定向页面，直接跳转到app.html

### 路径处理策略

为了解决Electron中的路径问题，应用使用了以下策略：

1. 使用`url.format()`正确处理file://协议URL
2. 将绝对路径(`/`)转换为相对路径(`./`)
3. 为动态加载的资源实现拦截器和修复

### 构建注意事项

在构建过程中：

1. 确保electron目录被正确复制到资源目录
2. 确保所有HTML入口文件存在
3. 修复.output/public/index.html中的资源路径

## 许可证

MIT
