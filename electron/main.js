const { app, BrowserWindow, ipcMain, dialog, protocol, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { promisify } = require('util');

// 保持对窗口对象的全局引用，否则窗口会在JavaScript对象被垃圾回收时自动关闭
let mainWindow;

// 检查是否是开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log('运行环境:', isDev ? '开发模式' : '生产模式');

// 生成重定向HTML文件
function generateRedirectHtml(targetPath, destination) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${destination}">
  <title>图片水印工具 - 重定向中</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    h1 {
      margin-top: 40px;
      color: #1976d2;
    }
    p {
      margin: 20px 0;
      font-size: 16px;
    }
    .loader {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #1976d2;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .link {
      display: inline-block;
      margin-top: 30px;
      padding: 10px 20px;
      background-color: #1976d2;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.location.href = '${destination}';
      }, 1000);
    };
  </script>
</head>
<body>
  <h1>图片水印工具</h1>
  <p>正在加载应用，请稍候...</p>
  <div class="loader"></div>
  <p>如果页面没有自动跳转，请点击下方按钮</p>
  <a href="${destination}" class="link">手动跳转到应用</a>
</body>
</html>`;

  fs.writeFileSync(targetPath, html);
  console.log(`已生成重定向HTML文件: ${targetPath}`);
}

// 获取额外资源目录
function getResourcePath() {
  // 在开发环境中返回项目根目录
  if (isDev) {
    return path.join(app.getAppPath());
  }
  
  // 在打包环境中返回resources/app.asar或resources/.output
  const resourcesPath = path.join(process.resourcesPath);
  console.log('资源目录路径:', resourcesPath);
  
  // 检查是否有app/.output目录（由xcopy复制的）
  const appOutputPath = path.join(app.getAppPath(), '.output');
  if (fs.existsSync(appOutputPath)) {
    console.log('找到app/.output目录:', appOutputPath);
    return appOutputPath;
  }
  
  // 检查是否有.output目录（由electron-packager --extra-resource添加）
  const outputPath = path.join(resourcesPath, '.output');
  if (fs.existsSync(outputPath)) {
    console.log('找到resources/.output目录:', outputPath);
    return outputPath;
  }
  
  return app.getAppPath();
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 禁用同源策略，允许加载本地资源
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon/icon.png')
  });

  // 获取应用路径
  const appPath = path.join(app.getAppPath());
  console.log('应用路径:', appPath);
  
  // 获取资源目录
  const resourcesPath = process.resourcesPath;
  console.log('资源目录路径:', resourcesPath);

  let contentUrl = null;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('运行环境: 开发模式');
    // 开发模式下使用localhost
    contentUrl = 'http://localhost:3000';
  } else {
    console.log('运行环境: 生产模式');
    
    // 优先加载standalone-app.html作为独立版本
    const standaloneAppPath = path.join(appPath, 'standalone-app.html');
    if (fs.existsSync(standaloneAppPath)) {
      console.log('发现独立版界面文件:', standaloneAppPath);
      contentUrl = url.format({
        pathname: standaloneAppPath,
        protocol: 'file:',
        slashes: true
      });
    }
    // 然后尝试加载app.html
    else if (fs.existsSync(path.join(appPath, 'app.html'))) {
      // 检查app.html是否存在，如果不存在则创建一个基本的app.html
      const appHtmlPath = path.join(appPath, 'app.html');
      console.log('发现app.html文件:', appHtmlPath);
      contentUrl = url.format({
        pathname: appHtmlPath,
        protocol: 'file:',
        slashes: true
      });
    }
    // 然后尝试加载static-app.html
    else {
      const staticAppPath = path.join(appPath, 'static-app.html');
      if (!fs.existsSync(staticAppPath)) {
        console.log('未找到static-app.html，正在生成重定向HTML');
        generateRedirectHtml(staticAppPath, 'app.html');
      }
      
      console.log('发现static-app.html文件:', staticAppPath);
      // 使用正确的file://协议格式，避免路径重复
      contentUrl = url.format({
        pathname: staticAppPath,
        protocol: 'file:',
        slashes: true
      });
    }
    
    // 确保direct-app.html也存在作为备份
    const directAppPath = path.join(appPath, 'direct-app.html');
    if (!fs.existsSync(directAppPath)) {
      console.log('未找到direct-app.html，正在生成重定向HTML');
      generateRedirectHtml(directAppPath, 'app.html');
    }
  }

  // 加载内容
  console.log('加载内容:', contentUrl);
  mainWindow.loadURL(contentUrl);

  // 开发模式下自动打开开发者工具，生产模式下禁用自动打开
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 设置快捷键打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12键打开开发者工具
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // 记录加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 如果加载失败，直接尝试加载app.html
    const appHtmlPath = path.join(appPath, 'app.html');
    if (fs.existsSync(appHtmlPath)) {
      console.log('尝试加载备用app.html文件');
      mainWindow.loadFile(appHtmlPath);
      return;
    }
    
    // 如果app.html也不存在，则加载备用HTML
    const backupHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>图片水印工具 - 加载失败</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
        h1 { color: #333; }
        .error { color: red; margin: 20px 0; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>图片水印工具</h1>
      <p class="error">应用加载失败，请尝试重新启动或联系开发者</p>
      <p>错误代码: ${errorCode}</p>
      <p>错误描述: ${errorDescription}</p>
      <button onclick="window.location.reload()">重新加载</button>
      <p>应用路径: ${appPath}</p>
    </body>
    </html>
    `;
    
    // 写入临时HTML文件
    const tempHtmlPath = path.join(app.getPath('temp'), 'backup.html');
    fs.writeFileSync(tempHtmlPath, backupHtml);
    
    // 加载临时HTML
    mainWindow.loadFile(tempHtmlPath);
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开图片',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-file');
            }
          }
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-folder');
            }
          }
        },
        {
          label: '保存图片',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save');
            }
          }
        },
        {
          label: '批量保存',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-batch');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { type: 'separator' },
        {
          label: '重置水印位置',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-reset-position');
            }
          }
        },
        {
          label: '重置所有设置',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-reset-settings');
            }
          }
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
        { type: 'separator' },
        {
          label: '显示/隐藏缩略图',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-toggle-thumbnails');
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用帮助',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-help');
            }
          }
        },
        {
          label: '关于',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-about');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 在应用准备就绪前设置CSP规则
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-web-security');

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  // 设置允许加载本地资源
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({});
  });
  
  // 注册文件协议
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback({ path: pathname });
  });
  
  createWindow();
  createMenu();
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，用户通常希望在明确地退出应用之前保持应用及菜单栏活跃
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用程序中重新创建一个窗口
  if (mainWindow === null) createWindow();
});

// 文件选择处理
ipcMain.handle('open-directory-dialog', async () => {
  console.log('主进程: 打开目录选择对话框');
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择包含图片的文件夹',
      buttonLabel: '选择此文件夹'
    });
    
    console.log('目录选择结果:', result);
    
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('打开目录对话框失败:', error);
    return null;
  }
});

// 读取目录中的图片文件
ipcMain.handle('read-directory-images', async (event, directoryPath) => {
  const readdir = promisify(fs.readdir);
  const stat = promisify(fs.stat);
  
  try {
    const files = await readdir(directoryPath);
    const imageFiles = [];
    
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
          imageFiles.push({
            name: file,
            path: filePath
          });
        }
      }
    }
    
    return imageFiles;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

// 保存图片
ipcMain.handle('save-image', async (event, { dataURL, fileName }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
      ]
    });
    
    if (!canceled && filePath) {
      // 将base64数据转换为Buffer
      const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    }
    
    return { success: false, message: 'User cancelled' };
  } catch (error) {
    console.error('Error saving image:', error);
    return { success: false, message: error.message };
  }
});