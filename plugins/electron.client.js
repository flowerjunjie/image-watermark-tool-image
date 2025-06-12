// 检测当前环境是否为Electron
export default defineNuxtPlugin((nuxtApp) => {
  const isElectron = window.electronAPI !== undefined;
  console.log('Electron环境检测:', isElectron ? '是Electron应用' : '不是Electron应用');
  
  // 提供应用接口
  return {
    provide: {
      isElectron,
      electron: isElectron ? window.electronAPI : {
        // 如果不是Electron环境，提供空方法
        openDirectoryDialog: () => Promise.resolve(null),
        readDirectoryImages: () => Promise.resolve([]),
        saveImage: () => Promise.resolve({ success: false, message: '不支持的操作' }),
        getSystemInfo: () => ({
          platform: 'web',
          isElectron: false
        }),
        debugInfo: {
          isElectron: false,
          environment: 'web-browser'
        }
      }
    }
  };
});