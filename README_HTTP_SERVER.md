# 图片水印工具 - 本地运行说明

## CORS 错误解决方案

当您直接双击打开 HTML 文件（使用 `file://` 协议）时，可能会遇到以下错误：

```
Access to script at 'file:///path/to/js/main.js' from origin 'null' has been blocked by CORS policy
```

这是因为现代浏览器的安全策略限制了通过 `file://` 协议加载 ES 模块。

## 解决方法

### 方法 1：使用 HTTP 服务器（推荐）

1. 确保已安装 Node.js（https://nodejs.org/）
2. 打开命令行终端（PowerShell 或 CMD）
3. 进入项目目录：`cd 项目路径`
4. 运行以下命令启动本地服务器：
   ```
   # 基本命令
   npx http-server
   
   # 指定端口并自动打开独立版本（推荐）
   npx http-server . -p 8080 -o standalone-app-new.html
   
   # 选项说明：
   # -p 8080: 指定端口为8080
   # -o standalone-app-new.html: 自动在浏览器中打开指定文件
   ```
5. 在浏览器中访问：http://localhost:8080/standalone-app-new.html（如果没有使用 `-o` 选项）

### 方法 2：使用 Visual Studio Code Live Server 插件

1. 在 VS Code 中安装 "Live Server" 插件
2. 右键点击 HTML 文件
3. 选择 "Open with Live Server"

### 方法 3：使用 Python 内置的 HTTP 服务器

1. 安装 Python（https://www.python.org/）
2. 打开命令行终端
3. 进入项目目录：`cd 项目路径`
4. 运行以下命令：
   - Python 3.x: `python -m http.server`
   - Python 2.x: `python -m SimpleHTTPServer`
5. 在浏览器中访问：http://localhost:8000/standalone-app-new.html

## 为什么需要 HTTP 服务器

ES 模块（使用 `<script type="module">` 加载的脚本）需要通过 HTTP/HTTPS 协议加载，这是浏览器的安全限制。使用本地 HTTP 服务器可以确保所有模块能够正确加载，同时保持代码的模块化结构。

## 注意事项

- 本应用程序已添加自动检测模块加载失败的功能，并会显示相应的错误消息和解决方案建议。
- 无需对源代码进行任何修改，只需通过 HTTP 服务器访问即可。 