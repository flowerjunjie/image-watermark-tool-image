const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');

console.log('Preload script executing...');
console.log('操作系统:', os.platform(), os.release());
console.log('Electron 预加载环境初始化');

// 检查文件系统访问
try {
  const tempDir = os.tmpdir();
  console.log('临时目录:', tempDir);
  const files = fs.readdirSync(tempDir).slice(0, 5);
  console.log('临时目录文件示例:', files);
} catch (err) {
  console.error('文件系统访问错误:', err);
}

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择目录
  openDirectoryDialog: () => {
    console.log('Calling open directory dialog from preload');
    return ipcRenderer.invoke('open-directory-dialog');
  },
  
  // 读取目录中的图片
  readDirectoryImages: (directoryPath) => {
    console.log('Calling read directory images from preload:', directoryPath);
    return ipcRenderer.invoke('read-directory-images', directoryPath);
  },
  
  // 保存图片
  saveImage: (options) => {
    console.log('Calling save image from preload');
    return ipcRenderer.invoke('save-image', options);
  },
  
  // 获取系统信息
  getSystemInfo: () => {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
      hostname: os.hostname()
    };
  },
  
  // 调试信息
  debugInfo: {
    isElectron: true,
    preloadVersion: '1.0.1',
    timestamp: new Date().toISOString()
  }
});

// 添加事件监听器
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容已加载，开始渲染页面');
});

// 添加全局变量以便调试
console.log('Preload script completed, APIs exposed');