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
    console.log('Calling save image from preload', options);
    return ipcRenderer.invoke('save-image', options);
  },
  
  // 调试信息
  debugInfo: {
    isElectron: true,
    preloadVersion: '1.0.2',
    timestamp: new Date().toISOString()
  }
}); 