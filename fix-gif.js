/**
 * GIF处理功能修复脚本
 * 用于将模块导出的函数绑定到全局作用域，解决"isGif is not a function"错误
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log('正在初始化GIF处理修复...');
  
  // 创建全局函数
  if (!window.isGif) {
    window.isGif = function(file) {
      if (!file) return false;
      
      // 检查MIME类型
      const isGifType = file.type === 'image/gif';
      
      // 检查文件名扩展
      const isGifExt = file.name && file.name.toLowerCase().endsWith('.gif');
      
      return isGifType || isGifExt;
    };
    console.log('已创建isGif全局函数');
  }
  
  // 验证库加载并尝试修复
  const checkLibraries = setInterval(function() {
    if (window.gifwrap && window.omggif) {
      console.log('检测到GIF处理库已加载，应用修复...');
      
      // 确保gif-processor.js中的函数可在全局使用
      import('./js/utils/gifwrap/gif-processor.js')
        .then(module => {
          // 绑定函数到全局
          if (module.isGif && typeof module.isGif === 'function') {
            window.isGif = module.isGif;
          }
          
          if (module.processGif && typeof module.processGif === 'function') {
            window.processGif = module.processGif;
          }
          
          if (module.initGifProcessor && typeof module.initGifProcessor === 'function') {
            window.initGifProcessor = module.initGifProcessor;
          }
          
          console.log('已成功绑定GIF处理函数到全局');
        })
        .catch(error => {
          console.error('导入GIF处理器模块时出错:', error);
          
          // 应用备份修复
          applyBackupFix();
        });
      
      clearInterval(checkLibraries);
    }
  }, 500);
  
  // 5秒后如果仍未检测到库，则应用备份修复
  setTimeout(function() {
    if (checkLibraries) {
      clearInterval(checkLibraries);
      console.warn('5秒后仍未检测到GIF处理库，应用备份修复...');
      applyBackupFix();
    }
  }, 5000);
});

// 应用备份修复
function applyBackupFix() {
  console.log('应用GIF处理备份修复...');
  
  // 创建基本的GIF处理函数
  window.isGif = function(file) {
    if (!file) return false;
    return file.type === 'image/gif' || (file.name && file.name.toLowerCase().endsWith('.gif'));
  };
  
  window.processGif = function(gifFile, options) {
    console.log('使用备份GIF处理函数');
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(gifFile);
      
      resolve({
        blob: gifFile,
        blobUrl: objectUrl,
        isGif: true,
        watermarkApplied: false,
        isStaticPreview: true
      });
    });
  };
}

// 执行自检测
console.log('GIF处理修复脚本已加载'); 