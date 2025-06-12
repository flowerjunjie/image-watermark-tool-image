const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing...');

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
  
  // 调试信息
  debugInfo: {
    isElectron: true,
    preloadVersion: '1.0.2',
    timestamp: new Date().toISOString()
  },
  
  // 菜单事件处理
  onMenuEvent: (callback) => {
    // 监听菜单事件
    const menuEvents = [
      'menu-open-file',
      'menu-open-folder',
      'menu-save',
      'menu-save-batch',
      'menu-reset-position',
      'menu-reset-settings',
      'menu-toggle-thumbnails',
      'menu-help',
      'menu-about'
    ];
    
    // 为每个菜单事件添加监听器
    menuEvents.forEach(eventName => {
      ipcRenderer.on(eventName, () => {
        console.log(`接收到菜单事件: ${eventName}`);
        callback(eventName);
      });
    });
  }
});

// 添加事件监听器
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容已加载，开始渲染页面');
});

// 添加全局变量以便调试
console.log('Preload script completed, APIs exposed');