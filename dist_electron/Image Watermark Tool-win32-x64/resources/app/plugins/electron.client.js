/**
 * Electron 客户端插件
 * 提供统一的Electron API访问接口
 */

export default defineNuxtPlugin((nuxtApp) => {
  // 检测是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && 
    window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
  
  console.log('Electron 插件初始化', isElectron ? '在Electron环境中' : '在浏览器环境中');
  
  // 创建统一的API接口
  const electronAPI = {
    // 是否在Electron环境中
    isElectron,
    
    // 选择目录
    async selectDirectory() {
      if (!isElectron || !window.electronAPI) {
        console.warn('无法选择目录：不在Electron环境中');
        return null;
      }
      return await window.electronAPI.openDirectoryDialog();
    },
    
    // 读取目录中的图片
    async readDirectoryImages(directoryPath) {
      if (!isElectron || !window.electronAPI) {
        console.warn('无法读取目录：不在Electron环境中');
        return [];
      }
      return await window.electronAPI.readDirectoryImages(directoryPath);
    },
    
    // 保存图片
    async saveImage(dataURL, fileName = 'watermarked-image.png') {
      if (!isElectron || !window.electronAPI) {
        console.warn('无法保存图片：不在Electron环境中');
        // 在浏览器环境中提供下载功能
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataURL;
        link.click();
        return { success: true, filePath: fileName };
      }
      
      return await window.electronAPI.saveImage({ dataURL, fileName });
    },
    
    // 获取调试信息
    getDebugInfo() {
      if (!isElectron || !window.electronAPI) {
        return {
          isElectron: false,
          environment: 'browser',
          userAgent: navigator.userAgent
        };
      }
      
      return {
        isElectron: true,
        environment: 'electron',
        ...window.electronAPI.debugInfo
      };
    }
  };
  
  // 提供给Nuxt应用
  nuxtApp.provide('electron', electronAPI);
  
  // 全局访问
  if (typeof window !== 'undefined') {
    window.$electron = electronAPI;
  }
  
  return {
    provide: {
      electron: electronAPI
    }
  };
});