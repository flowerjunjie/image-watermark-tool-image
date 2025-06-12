// 检测当前环境是否为Electron
export default defineNuxtPlugin(() => {
  const isElectron = window.electronAPI !== undefined;
  
  // 创建一个默认的API对象，当不在Electron环境中时使用
  const defaultAPI = {
    isElectron: false,
    openDirectoryDialog: () => Promise.resolve(null),
    readDirectoryImages: () => Promise.resolve([]),
    saveImage: () => Promise.resolve({ success: false, message: '非桌面应用环境' })
  };
  
  // 使用实际的Electron API或默认API
  const electronAPI = isElectron ? window.electronAPI : defaultAPI;
  
  console.log('Electron 插件初始化', isElectron ? '在Electron环境中' : '在浏览器环境中');
  
  return {
    provide: {
      electron: {
        ...electronAPI,
        isElectron
      }
    }
  };
});