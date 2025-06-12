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
  
  // 直接加载watermark-app.html
  const watermarkAppPath = path.join(appPath, 'watermark-app.html');
  console.log('直接加载水印应用页面:', watermarkAppPath);
  
  if (fs.existsSync(watermarkAppPath)) {
    console.log('水印应用页面存在，尝试加载');
    mainWindow.loadFile(watermarkAppPath);
  } else {
    console.log('水印应用页面不存在，加载内置HTML');
    // 创建简单的HTML内容
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>图片水印工具</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background-color: #f0f0f0;
            }
            h1 { color: #2196F3; }
            p { margin: 20px 0; }
            button {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <h1>图片水印工具</h1>
        <p>未能找到应用页面，请检查应用安装是否完整</p>
        <p>应用路径: ${appPath}</p>
        <p>尝试加载路径: ${watermarkAppPath}</p>
        <button onclick="alert('请重新安装应用')">报告问题</button>
    </body>
    </html>
    `;
    
    // 写入临时HTML文件
    const tempHtmlPath = path.join(app.getPath('temp'), 'watermark-simple.html');
    fs.writeFileSync(tempHtmlPath, htmlContent);
    mainWindow.loadFile(tempHtmlPath);
  }

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  
  // 设置协议处理
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6);
    callback({ path: path.normalize(`${__dirname}/${url}`) });
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC 处理程序
// 打开目录选择对话框
ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return { success: true, directoryPath: result.filePaths[0] };
  } else {
    return { success: false };
  }
});

// 读取目录中的图片
ipcMain.handle('read-directory-images', async (event, directoryPath) => {
  try {
    const files = await promisify(fs.readdir)(directoryPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    const imagePaths = imageFiles.map(file => path.join(directoryPath, file));
    
    return { success: true, images: imagePaths };
  } catch (error) {
    console.error('读取目录出错:', error);
    return { success: false, error: error.message };
  }
});

// 保存图片
ipcMain.handle('save-image', async (event, options) => {
  try {
    const { dataURL, fileName } = options;
    
    // 从dataURL中提取base64数据
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 打开保存对话框
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName || 'watermarked-image.jpg',
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, message: '用户取消了保存操作' };
    }
    
    // 写入文件
    await promisify(fs.writeFile)(result.filePath, buffer);
    
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('保存图片出错:', error);
    return { success: false, message: error.message };
  }
}); 