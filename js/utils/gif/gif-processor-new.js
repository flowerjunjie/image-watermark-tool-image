/**
 * GIF处理工具 - 重定向到gifwrap版本
 * 用于处理GIF动图，添加水印等
 */

import { isGif as isGifWrapped, processGif as processGifWrapped, initGifProcessor as initGifWrapped } from '../gifwrap/gif-processor.js';

/**
 * 判断文件是否为GIF
 * @param {File|Blob|string} file - 文件或URL
 * @returns {boolean} - 是否为GIF
 */
export function isGif(file) {
  console.log('调用重定向的isGif函数，使用gifwrap实现');
  return isGifWrapped(file);
}

/**
 * 处理GIF，添加水印等
 * @param {Blob|File|string} gifSource - GIF文件对象或URL
 * @param {Object} watermarkOptions - 水印选项
 * @returns {Promise<Blob>} - 处理后的GIF文件
 */
export function processGif(gifSource, watermarkOptions = {}) {
  console.log('调用重定向的processGif函数，使用gifwrap实现');
  
  try {
    return processGifWrapped(gifSource, watermarkOptions);
  } catch (error) {
    console.error('GIF处理失败，尝试返回原始GIF:', error);
    
    // 显示错误提示
    const errorMessage = document.createElement('div');
    errorMessage.style.position = 'fixed';
    errorMessage.style.top = '10px';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translateX(-50%)';
    errorMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorMessage.style.color = 'white';
    errorMessage.style.padding = '10px';
    errorMessage.style.borderRadius = '5px';
    errorMessage.style.zIndex = '999999';
    errorMessage.textContent = 'GIF处理失败，已返回原始GIF。请刷新页面(Ctrl+F5)后重试。';
    document.body.appendChild(errorMessage);
    
    // 3秒后移除错误提示
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 3000);
    
    // 返回原始GIF
    return Promise.resolve({
      blob: gifSource,
      blobUrl: URL.createObjectURL(gifSource),
      isGif: true,
      watermarkApplied: false
    });
  }
}

/**
 * 初始化GIF处理器
 */
export function initGifProcessor() {
  console.log('调用重定向的initGifProcessor函数，使用gifwrap实现');
  return initGifWrapped();
} 