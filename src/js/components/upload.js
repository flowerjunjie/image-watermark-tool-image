/**
 * 上传组件
 * 处理文件上传和拖放功能
 */

import { handleFileUpload } from '../utils/file-handler.js';
import { EventEmitter } from '../utils/event-emitter.js';

// 创建事件发射器
const uploadEvents = new EventEmitter();

/**
 * 初始化上传组件
 * @param {Object} options 配置选项
 */
export function initUpload(options = {}) {
  // 默认选项
  const defaultOptions = {
    uploadAreaId: 'upload-area',
    fileInputId: 'file-input',
    folderInputId: 'folder-input',
    uploadFilesButtonId: 'upload-files-btn',
    uploadFolderButtonId: 'upload-folder-btn',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    preserveFolderStructure: true
  };
  
  // 合并选项
  const config = { ...defaultOptions, ...options };
  
  // 获取DOM元素
  const uploadArea = document.getElementById(config.uploadAreaId);
  const fileInput = document.getElementById(config.fileInputId);
  const folderInput = document.getElementById(config.folderInputId);
  const uploadFilesButton = document.getElementById(config.uploadFilesButtonId);
  const uploadFolderButton = document.getElementById(config.uploadFolderButtonId);
  
  // 检查元素是否存在
  if (!uploadArea || !fileInput) {
    console.error('上传组件初始化失败：找不到必要的DOM元素');
    return;
  }
  
  // 设置拖放事件
  setupDragAndDrop(uploadArea, config);
  
  // 设置文件输入事件
  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      if (event.target.files && event.target.files.length > 0) {
        try {
          // 显示加载中状态
          uploadEvents.emit('uploadStart');
          
          // 处理文件上传
          const result = await handleFileUpload(event.target.files, config.preserveFolderStructure);
          
          // 触发上传完成事件
          uploadEvents.emit('uploadComplete', result);
          
          // 清空文件输入，允许重复上传相同文件
          event.target.value = '';
        } catch (error) {
          console.error('文件上传失败:', error);
          uploadEvents.emit('uploadError', error);
          
          // 清空文件输入
          event.target.value = '';
        }
      }
    });
  }
  
  // 设置文件夹输入事件
  if (folderInput) {
    folderInput.addEventListener('change', async (event) => {
      if (event.target.files && event.target.files.length > 0) {
        try {
          // 显示加载中状态
          uploadEvents.emit('uploadStart');
          
          // 处理文件夹上传
          const result = await handleFileUpload(event.target.files, config.preserveFolderStructure);
          
          // 触发上传完成事件
          uploadEvents.emit('uploadComplete', result);
          
          // 清空文件输入，允许重复上传相同文件夹
          event.target.value = '';
        } catch (error) {
          console.error('文件夹上传失败:', error);
          uploadEvents.emit('uploadError', error);
          
          // 清空文件输入
          event.target.value = '';
        }
      }
    });
  }
  
  // 设置上传文件按钮点击事件
  if (uploadFilesButton) {
    uploadFilesButton.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  // 设置上传文件夹按钮点击事件
  if (uploadFolderButton && folderInput) {
    uploadFolderButton.addEventListener('click', () => {
      folderInput.click();
    });
  }
}

/**
 * 设置拖放事件
 * @param {HTMLElement} dropArea 拖放区域
 * @param {Object} config 配置选项
 */
function setupDragAndDrop(dropArea, config) {
  // 阻止默认拖放行为
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // 高亮显示拖放区域
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('highlight');
    }, false);
  });
  
  // 取消高亮显示
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('highlight');
    }, false);
  });
  
  // 处理拖放文件
  dropArea.addEventListener('drop', async (event) => {
    try {
      // 显示加载中状态
      uploadEvents.emit('uploadStart');
      
      // 获取文件
      const files = event.dataTransfer.files;
      
      if (files.length === 0) {
        uploadEvents.emit('uploadError', new Error('未拖放任何文件'));
        return;
      }
      
      // 处理文件上传
      const result = await handleFileUpload(files, config.preserveFolderStructure);
      
      // 触发上传完成事件
      uploadEvents.emit('uploadComplete', result);
    } catch (error) {
      console.error('拖放上传失败:', error);
      uploadEvents.emit('uploadError', error);
    }
  }, false);
}

/**
 * 阻止默认事件行为
 * @param {Event} event 事件对象
 */
function preventDefaults(event) {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * 订阅上传开始事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onUploadStart(callback) {
  return uploadEvents.on('uploadStart', callback);
}

/**
 * 订阅上传完成事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onUploadComplete(callback) {
  return uploadEvents.on('uploadComplete', callback);
}

/**
 * 订阅上传错误事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onUploadError(callback) {
  return uploadEvents.on('uploadError', callback);
}

/**
 * 以编程方式触发文件上传
 * @param {string} inputId 文件输入元素ID
 */
export function triggerFileUpload(inputId = 'file-input') {
  const fileInput = document.getElementById(inputId);
  if (fileInput) {
    fileInput.click();
  } else {
    console.error(`找不到ID为 ${inputId} 的文件输入元素`);
  }
}

/**
 * 以编程方式触发文件夹上传
 * @param {string} inputId 文件夹输入元素ID
 */
export function triggerFolderUpload(inputId = 'folder-input') {
  const folderInput = document.getElementById(inputId);
  if (folderInput) {
    folderInput.click();
  } else {
    console.error(`找不到ID为 ${inputId} 的文件夹输入元素`);
  }
} 