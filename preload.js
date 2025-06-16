const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 定义将暴露给渲染进程的API对象 - 最小化API只暴露必要功能
const electronAPI = {
  // 文件和目录对话框
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  
  // 文件操作（优化异步处理）
  readFile: (filePath, options = {}) => {
    // 使用Promise包装文件操作，使其更可靠
    return new Promise((resolve, reject) => {
      try {
        // 检查文件是否存在，防止无效读取
        if (!fs.existsSync(filePath)) {
          return reject(new Error(`文件不存在: ${filePath}`));
        }
        
        fs.readFile(filePath, options, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  writeFile: (filePath, data) => {
    // 使用Promise包装文件操作，使其更可靠
    return new Promise((resolve, reject) => {
      try {
        // 确保目录存在
        const dirname = path.dirname(filePath);
        if (!fs.existsSync(dirname)) {
          fs.mkdirSync(dirname, { recursive: true });
        }
        
        fs.writeFile(filePath, data, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // IPC通信
  onOpenFiles: (callback) => {
    const handler = (event, files) => callback(files);
    ipcRenderer.on('open-files', handler);
    // 返回取消订阅函数，避免内存泄漏
    return () => ipcRenderer.removeListener('open-files', handler);
  },
  
  onOpenDirectory: (callback) => {
    const handler = (event, directory) => callback(directory);
    ipcRenderer.on('open-directory', handler);
    // 返回取消订阅函数，避免内存泄漏
    return () => ipcRenderer.removeListener('open-directory', handler);
  },
  
  // 工具函数
  fileExists: (filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('检查文件存在时出错:', error);
      return false;
    }
  },
  
  getAppPath: () => process.cwd(),
  
  // 环境信息
  getSystemInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    versions: {
      node: process.versions.node,
      electron: process.versions.electron,
      chrome: process.versions.chrome
    }
  })
};

// 暴露API到window对象，使渲染进程可以使用
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// DOM加载完成时初始化版本信息显示
window.addEventListener('DOMContentLoaded', () => {
  // 使用闭包隔离内部函数，防止内存泄漏
  (function() {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector);
      if (element) element.innerText = text;
    };
    
    for (const type of ['chrome', 'node', 'electron']) {
      replaceText(`${type}-version`, process.versions[type] || 'N/A');
    }
  })();
}); 