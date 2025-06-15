/**
 * 水印工具主入口文件
 * 负责导入和初始化各个模块
 */

import { updateWatermark } from './core/watermark.js';
import { initEventListeners } from './handlers/event-listeners.js';
import { initInputHandlers, initWatermarkControls } from './handlers/input-handlers.js';
import { initDragAndDrop } from './utils/drag-drop.js';
import { initWheelZoom } from './utils/wheel-zoom.js';
import { watermarkState, updateState } from './core/state.js';
import { initGifProcessor } from './utils/gifwrap/gif-processor.js';

// 初始化标志
let initialized = false;

// 显示初始化状态
function updateInitStatus(module, status, error = null) {
  console.log(`模块 ${module} 初始化状态: ${status}`);
  if (error) {
    console.error(`模块 ${module} 初始化错误:`, error);
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML += `<p>模块 ${module} 初始化失败: ${error.message || error}</p>`;
      errorContainer.classList.add('show');
    }
  }
}

// 检查依赖库
function checkDependencies() {
  const dependencies = [
    { name: 'gifwrap', global: 'gifwrap' },
    { name: 'omggif', global: 'omggif' },
    { name: 'image-q', global: 'imageQ' },
    { name: 'JSZip', global: 'JSZip' }
  ];
  
  const missing = dependencies.filter(dep => !window[dep.global]);
  
  if (missing.length > 0) {
    const missingNames = missing.map(dep => dep.name).join(', ');
    console.warn(`缺少依赖库: ${missingNames}`);
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML += `<p>缺少依赖库: ${missingNames}。某些功能可能无法正常工作。</p>`;
      errorContainer.classList.add('show');
    }
  }
  
  return missing.length === 0;
}

// DOMContentLoaded事件监听器
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印工具正在初始化...');
  
  // 防止重复初始化
  if (initialized) {
    console.log('水印工具已初始化，跳过重复初始化');
    return;
  }
  
  try {
    // 检查依赖库
    checkDependencies();
    
    // 设置水印的初始位置和缩放
    updateState({
      relativePosition: { x: 50, y: 50 },
      scale: 1.0,
      sizeAdjusted: false
    });
    console.log('已设置初始水印位置和缩放');
    
    // 初始化各个模块
    try {
      console.log('初始化事件监听器');
      initEventListeners();
      updateInitStatus('事件监听器', '成功');
    } catch (error) {
      updateInitStatus('事件监听器', '失败', error);
    }
    
    try {
      console.log('初始化输入处理器');
      initInputHandlers();
      updateInitStatus('输入处理器', '成功');
    } catch (error) {
      updateInitStatus('输入处理器', '失败', error);
    }
    
    try {
      console.log('初始化拖放功能');
      initDragAndDrop();
      updateInitStatus('拖放功能', '成功');
    } catch (error) {
      updateInitStatus('拖放功能', '失败', error);
    }
    
    try {
      console.log('初始化滚轮缩放');
      initWheelZoom();
      updateInitStatus('滚轮缩放', '成功');
    } catch (error) {
      updateInitStatus('滚轮缩放', '失败', error);
    }
    
    // 初始化水印
    try {
      console.log('初始化水印');
      updateWatermark();
      updateInitStatus('水印', '成功');
    } catch (error) {
      updateInitStatus('水印', '失败', error);
    }
    
    // 初始化GIF处理器
    try {
      console.log('初始化GIF处理器');
      // 确保GIF处理相关库可用
      const gifLibsAvailable = window.gifwrap && 
                               window.omggif && 
                               window.imageQ;
                               
      if (!gifLibsAvailable) {
        console.warn('GIF处理相关库未全部加载，等待库加载...');
        
        // 等待库加载
        setTimeout(() => {
          if (window.gifwrap && window.omggif && window.imageQ) {
            console.log('GIF处理相关库已加载，初始化GIF处理器...');
            
            // 初始化GIF处理器
            const initResult = initGifProcessor();
            
            // 将GIF处理函数暴露到全局作用域
            import('./utils/gifwrap/gif-processor.js')
              .then(module => {
                if (module && module.processGif) {
                  window.processGif = module.processGif;
                  console.log('GIF处理函数已暴露到全局');
                }
              })
              .catch(err => {
                console.error('无法加载GIF处理模块:', err);
              });
              
            console.log('GIF处理器初始化结果:', initResult);
            updateInitStatus('GIF处理器', initResult ? '成功' : '部分成功');
          } else {
            console.error('GIF处理相关库加载超时');
            updateInitStatus('GIF处理器', '部分失败', new Error('库加载超时'));
          }
        }, 1000);
      } else {
        // 直接初始化
        const initResult = initGifProcessor();
        
        // 将GIF处理函数暴露到全局作用域
        import('./utils/gifwrap/gif-processor.js')
          .then(module => {
            if (module && module.processGif) {
              window.processGif = module.processGif;
              console.log('GIF处理函数已暴露到全局');
            }
          })
          .catch(err => {
            console.error('无法加载GIF处理模块:', err);
          });
          
        console.log('GIF处理器初始化结果:', initResult);
        updateInitStatus('GIF处理器', '成功');
      }
    } catch (error) {
      updateInitStatus('GIF处理器', '失败', error);
    }
    
    // 初始化水印控制
    try {
      console.log('初始化水印控制');
      initWatermarkControls();
      updateInitStatus('水印控制', '成功');
      
      // 初始化完成
      console.log('水印工具初始化完成');
      window.watermarkInitialized = true;
      
      // 添加全局的水印保护机制
      initWatermarkProtection();
    } catch (error) {
      updateInitStatus('水印控制', '失败', error);
    }
    
    // 隐藏错误容器（如果没有错误）
    const errorContainer = document.getElementById('error-container');
    if (errorContainer && errorContainer.innerHTML === '') {
      errorContainer.classList.remove('show');
    }
  } catch (error) {
    console.error('初始化时出错:', error);
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML += `<p>初始化失败: ${error.message || error}</p>`;
      errorContainer.classList.add('show');
    }
  }
});

/**
 * 初始化水印可见性保护机制
 * 定期检查水印容器是否可见，如果不可见则重新显示
 */
function initWatermarkProtection() {
  console.log('初始化水印保护机制');
  
  // 创建一个检查水印容器的函数
  function checkWatermarkVisibility() {
    const watermarkContainer = document.getElementById('watermark-container');
    
    if (watermarkContainer) {
      // 检查水印容器是否存在且样式是否正确
      const displayStyle = window.getComputedStyle(watermarkContainer).display;
      const zIndexStyle = parseInt(window.getComputedStyle(watermarkContainer).zIndex) || 0;
      
      console.log('检查水印可见性:', {
        display: displayStyle,
        zIndex: zIndexStyle
      });
      
      // 如果水印容器不可见或z-index过低，强制设置正确的样式
      if (displayStyle === 'none' || zIndexStyle < 9999) {
        console.log('水印可能不可见，强制更新样式');
        watermarkContainer.style.display = 'flex';
        watermarkContainer.style.zIndex = '99999';
        watermarkContainer.style.pointerEvents = 'auto';
        
        // 尝试更新水印
        if (typeof updateWatermark === 'function') {
          console.log('强制重新应用水印');
          updateWatermark();
        }
      }
    } else {
      console.warn('水印容器不存在');
    }
  }
  
  // 定期检查水印容器状态
  const checkInterval = setInterval(checkWatermarkVisibility, 1000);
  
  // 在页面关闭时清除定时器
  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval);
  });
  
  // 监听DOM变化，以便在节点被移除或修改时立即恢复水印
  const observer = new MutationObserver((mutations) => {
    // 检查变化是否涉及水印容器
    const shouldCheckWatermark = mutations.some(mutation => {
      // 检查是否有节点被移除
      if (mutation.removedNodes.length > 0) {
        for (const node of mutation.removedNodes) {
          if (node.id === 'watermark-container' || 
              (node.querySelector && node.querySelector('#watermark-container'))) {
            return true;
          }
        }
      }
      
      // 检查水印容器的属性是否被修改
      if (mutation.target.id === 'watermark-container') {
        return true;
      }
      
      return false;
    });
    
    // 如果涉及水印容器，立即检查
    if (shouldCheckWatermark) {
      checkWatermarkVisibility();
    }
  });
  
  // 开始监听整个文档的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  // 立即执行一次检查
  checkWatermarkVisibility();
}

// 动态加载JSZip库
export function loadJSZip() {
  return new Promise((resolve, reject) => {
    console.log('正在加载JSZip库...');
    
    // 检查是否已经加载
    if (window.JSZip) {
      console.log('JSZip库已加载');
      resolve(window.JSZip);
      return;
    }
    
    // 尝试从本地加载
    const script = document.createElement('script');
    script.src = 'libs/jszip.min.js';
    script.async = true;
    
    // 监听加载完成事件
    script.onload = function() {
      console.log('JSZip库加载成功');
      resolve(window.JSZip);
    };
    
    // 监听加载失败事件
    script.onerror = function() {
      console.error('本地JSZip库加载失败，尝试从CDN加载');
      
      // 尝试从CDN加载
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      cdnScript.async = true;
      
      cdnScript.onload = function() {
        console.log('从CDN加载JSZip库成功');
        resolve(window.JSZip);
      };
      
      cdnScript.onerror = function() {
        console.error('JSZip库加载失败');
        const error = new Error('无法加载JSZip库，请检查网络连接');
        reject(error);
      };
      
      document.body.appendChild(cdnScript);
    };
    
    // 添加到文档中
    document.body.appendChild(script);
  });
}

// 检测JSZip并加载
loadJSZip()
  .catch(error => {
    // 显示错误
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML += `<p>${error.message}</p>`;
      errorContainer.classList.add('show');
    }
  });