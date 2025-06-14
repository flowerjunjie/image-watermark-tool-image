/**
 * 水印工具主入口文件
 * 负责导入和初始化各个模块
 */

import { updateWatermark } from './core/watermark.js';
import { initEventListeners } from './handlers/event-listeners.js';
import { initInputHandlers } from './handlers/input-handlers.js';
import { initDragAndDrop } from './utils/drag-drop.js';
import { initWheelZoom } from './utils/wheel-zoom.js';

// 初始化标志
let initialized = false;

// DOMContentLoaded事件监听器
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印工具正在初始化...');
  
  // 防止重复初始化
  if (initialized) {
    console.log('水印工具已初始化，跳过重复初始化');
    return;
  }
  
  try {
    // 初始化各个模块
    console.log('初始化事件监听器');
    initEventListeners();
    
    console.log('初始化输入处理器');
    initInputHandlers();
    
    console.log('初始化拖放功能');
    initDragAndDrop();
    
    console.log('初始化滚轮缩放');
    initWheelZoom();
    
    // 初始化水印
    console.log('初始化水印');
    updateWatermark();
    
    // 标记为已初始化
    initialized = true;
    // 设置全局标志，用于检测模块是否成功加载
    window.watermarkInitialized = true;
    console.log('水印工具初始化完成');
  } catch (error) {
    console.error('初始化时出错:', error);
  }
});

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
    
    // 创建script元素
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.async = true;
    
    // 监听加载完成事件
    script.onload = function() {
      console.log('JSZip库加载成功');
      resolve(window.JSZip);
    };
    
    // 监听加载失败事件
    script.onerror = function() {
      console.error('JSZip库加载失败');
      const error = new Error('无法加载JSZip库，请检查网络连接');
      reject(error);
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
      errorContainer.textContent = error.message;
      errorContainer.classList.add('show');
    }
  }); 