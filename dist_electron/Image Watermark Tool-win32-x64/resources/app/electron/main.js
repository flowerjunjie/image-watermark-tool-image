const { app, BrowserWindow, ipcMain, dialog, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { promisify } = require('util');

// 保持对窗口对象的全局引用，否则窗口会在JavaScript对象被垃圾回收时自动关闭
let mainWindow;

// 检查是否是开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log('运行环境:', isDev ? '开发模式' : '生产模式');

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
      nodeIntegration: true,
      contextIsolation: false,
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

  // 强制使用direct-app.html
  const directAppPath = path.join(appPath, 'direct-app.html');
  console.log('检查direct-app.html路径:', directAppPath);
  
  let contentUrl = null;
  
  if (fs.existsSync(directAppPath)) {
    console.log('发现direct-app.html文件:', directAppPath);
    contentUrl = `file://${directAppPath}`;
    console.log('使用direct-app.html作为入口');
  } else {
    console.log('未找到direct-app.html，使用备用方案');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('开发模式，使用localhost');
      contentUrl = 'http://localhost:3000';
    } else {
      console.log('生产模式，创建应急HTML');
      const emergencyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>图片水印工具 - 应急模式</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          h1 { color: #1976d2; }
          .error { color: red; margin: 20px 0; }
          button { padding: 10px 20px; background: #1976d2; color: white; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>图片水印工具 - 应急模式</h1>
        <p>应用加载失败，请尝试修复应用</p>
        <div class="error">
          <p>错误原因: 找不到必要的应用文件</p>
          <p>应用路径: ${appPath}</p>
        </div>
        <button onclick="window.close()">关闭应用</button>
      </body>
      </html>
      `;
      const tempHtml = path.join(app.getPath('temp'), 'watermark-emergency.html');
      fs.writeFileSync(tempHtml, emergencyHtml);
      contentUrl = `file://${tempHtml}`;
    }
  }

  // 加载内容
  console.log('加载内容:', contentUrl);
  
  if (contentUrl.startsWith('file://')) {
    // 从URL中提取文件路径
    let filePath;
    if (process.platform === 'win32') {
      // Windows路径处理 (移除 'file:///')
      filePath = contentUrl.replace('file:///', '');
    } else {
      // Mac/Linux路径处理 (移除 'file://')
      filePath = contentUrl.replace('file://', '');
    }
    console.log('加载文件路径:', filePath);
    mainWindow.loadFile(filePath);
  } else {
    mainWindow.loadURL(contentUrl);
  }

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
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
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!canceled) {
    return filePaths[0];
  }
  return null;
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