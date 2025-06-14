/**
 * 图片水印工具主应用
 * 初始化和协调各组件
 */

import { initState } from './core/state.js';
import { initGifWorker } from './utils/gif/gif-worker-manager.js';
import { initUpload, onUploadComplete, onUploadError } from './components/upload.js';
import { initPreview, showCurrentImage, applyWatermarkToCurrentImage } from './components/preview.js';
import { initWatermarkOptions, onOptionsChanged } from './components/watermark-options.js';
import { loadSettings, saveSettings } from './services/storage-service.js';
import { canUndo, canRedo, undo, redo } from './services/undo-redo-service.js';
import { batchExport, exportCurrentImage } from './services/export-service.js';

// 应用状态
const appState = {
  isInitialized: false,
  isProcessing: false,
  isDarkMode: false
};

/**
 * 初始化应用
 */
export async function initApp() {
  try {
    console.log('初始化图片水印工具...');
    
    // 初始化应用状态
    initState();
    
    // 初始化GIF Worker
    await initGifWorker();
    
    // 初始化组件
    initComponents();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 加载设置
    loadAppSettings();
    
    // 标记为已初始化
    appState.isInitialized = true;
    
    console.log('图片水印工具初始化完成');
  } catch (error) {
    console.error('应用初始化失败:', error);
    showError('应用初始化失败: ' + error.message);
  }
}

/**
 * 初始化组件
 */
function initComponents() {
  // 初始化上传组件
  initUpload();
  
  // 初始化预览组件
  initPreview();
  
  // 初始化水印选项组件
  initWatermarkOptions();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 文件上传完成
  onUploadComplete((result) => {
    // 显示当前图片
    showCurrentImage();
    
    // 显示成功消息
    showSuccess(`成功上传 ${result.files.length} 个文件`);
  });
  
  // 文件上传错误
  onUploadError((error) => {
    showError('上传失败: ' + error.message);
  });
  
  // 水印选项变化
  onOptionsChanged(() => {
    // 如果已有图片，应用水印
    if (document.getElementById('preview-image').src) {
      applyWatermarkToCurrentImage();
    }
  });
  
  // 应用水印按钮
  const applyWatermarkBtn = document.getElementById('apply-watermark-btn');
  if (applyWatermarkBtn) {
    applyWatermarkBtn.addEventListener('click', () => {
      applyWatermarkToCurrentImage();
    });
  }
  
  // 导出当前图片按钮
  const exportCurrentBtn = document.getElementById('export-current-btn');
  if (exportCurrentBtn) {
    exportCurrentBtn.addEventListener('click', () => {
      exportCurrentImage();
    });
  }
  
  // 批量导出按钮
  const batchExportBtn = document.getElementById('batch-export-btn');
  if (batchExportBtn) {
    batchExportBtn.addEventListener('click', () => {
      batchExport();
    });
  }
  
  // 撤销按钮
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (canUndo()) {
        undo();
      }
    });
  }
  
  // 重做按钮
  const redoBtn = document.getElementById('redo-btn');
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      if (canRedo()) {
        redo();
      }
    });
  }
  
  // 暗色模式切换
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      toggleDarkMode(darkModeToggle.checked);
    });
  }
}

/**
 * 加载应用设置
 */
function loadAppSettings() {
  // 从本地存储加载设置
  const settings = loadSettings();
  
  if (settings) {
    // 应用设置
    if (settings.darkMode !== undefined) {
      toggleDarkMode(settings.darkMode);
      
      // 更新暗色模式切换按钮
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      if (darkModeToggle) {
        darkModeToggle.checked = settings.darkMode;
      }
    }
  }
}

/**
 * 切换暗色模式
 * @param {boolean} isDark 是否暗色模式
 */
function toggleDarkMode(isDark) {
  // 更新状态
  appState.isDarkMode = isDark;
  
  // 应用暗色模式
  document.body.classList.toggle('dark-mode', isDark);
  
  // 保存设置
  saveSettings({ darkMode: isDark });
}

/**
 * 显示成功消息
 * @param {string} message 消息内容
 */
function showSuccess(message) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('error');
    statusMessage.classList.add('success');
    statusMessage.style.display = 'block';
    
    // 3秒后隐藏
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}

/**
 * 显示错误消息
 * @param {string} message 消息内容
 */
function showError(message) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('success');
    statusMessage.classList.add('error');
    statusMessage.style.display = 'block';
    
    // 3秒后隐藏
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
