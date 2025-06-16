const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对window对象的全局引用，防止JavaScript GC时窗口关闭
let mainWindow = null;

// 定义创建窗口的函数
function createWindow() {
  // 创建浏览器窗口，优化配置以减少内存使用
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // 先不显示，等加载完成再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: process.env.NODE_ENV === 'development',
      backgroundThrottling: false, // 即使窗口在后台也保持完整性能
      spellcheck: false, // 关闭拼写检查以节省内存
    }
  });

  // 优化：一次性加载完再显示，减少白屏时间
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 加载应用的主页面
  mainWindow.loadFile('standalone-app-new.html');

  // 创建菜单 - 使用const缓存模板减少重复计算
  const menuTemplate = getMenuTemplate();
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // 监听来自preload.js的通信
  setupIpcHandlers();

  // 当window被关闭时，释放对象引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 菜单模板 - 抽取为独立函数以提高代码可读性
function getMenuTemplate() {
  return [
    {
      label: '文件',
      submenu: [
        {
          label: '打开图片',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            const { canceled, filePaths } = await dialog.showOpenDialog({
              properties: ['openFile', 'multiSelections'],
              filters: [
                { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
              ]
            });
            if (!canceled) {
              mainWindow.webContents.send('open-files', filePaths);
            }
          }
        },
        {
          label: '打开文件夹',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            if (!mainWindow) return;
            const { canceled, filePaths } = await dialog.showOpenDialog({
              properties: ['openDirectory']
            });
            if (!canceled) {
              mainWindow.webContents.send('open-directory', filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(process.env.NODE_ENV === 'development' ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              title: '图片水印工具',
              message: '图片水印工具 V1.0.0',
              detail: '一个简单易用的图片水印添加工具\n支持文字水印、图片水印和平铺水印\n支持批量处理和GIF动图',
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];
}

// IPC处理函数 - 抽取为独立函数以提高代码可读性
function setupIpcHandlers() {
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    });
    return canceled ? [] : filePaths;
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return canceled ? '' : filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (event, options) => {
    const { canceled, filePath } = await dialog.showSaveDialog(options);
    return canceled ? '' : filePath;
  });
}

// 当Electron完成初始化时创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，
    // 重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // 监听第二个实例启动的事件，防止多开，提示并激活已有窗口
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
});

// 在所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上保持应用和菜单栏活跃，直到用户按下Cmd + Q明确退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 定义安全警告设置
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

// 释放不必要的资源
app.on('quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners();
  }
}); 