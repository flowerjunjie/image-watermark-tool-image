const { app, BrowserWindow, ipcMain, dialog, protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { promisify } = require('util');

// 保持对窗口对象的全局引用，否则窗口会在JavaScript对象被垃圾回收时自动关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // 允许加载本地资源
    }
  });

  // 获取应用路径
  const appPath = app.getAppPath();
  console.log('应用路径:', appPath);

  // 禁用webFrame的自动刷新
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      if (window.__VUE_HMR_RUNTIME__) {
        window.__VUE_HMR_RUNTIME__.reload = function() { 
          console.log('热更新已禁用');
          return false; 
        };
      }
    `).catch(err => console.error('执行脚本出错:', err));
  });

  // 加载静态HTML文件而不是开发服务器
  const indexPath = path.join(appPath, '.output', 'public', 'index.html');
  
  // 检查文件是否存在
  if (fs.existsSync(indexPath)) {
    console.log('加载静态文件:', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    // 如果静态文件不存在，则加载开发服务器
    console.log('静态文件不存在，使用开发服务器:', indexPath);
    mainWindow.loadURL('http://localhost:3004');
  }

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 记录加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    
    // 如果加载失败，尝试使用file协议
    if (fs.existsSync(indexPath)) {
      console.log('尝试使用file协议加载');
      mainWindow.loadURL(`file://${indexPath}`);
    }
  });

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