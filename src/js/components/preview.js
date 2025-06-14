/**
 * 预览组件
 * 处理图片预览和水印效果展示
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { getCurrentFile, getWatermarkOptions, getCurrentFileIndex, getFiles } from '../core/state.js';
import { applyWatermark } from '../core/watermark-core.js';
import { isGif } from '../utils/gif/gif-processor.js';
import { processGifWithWorker } from '../utils/gif/gif-worker-manager.js';
import { readImageFile } from '../utils/file-handler.js';

// 创建事件发射器
const previewEvents = new EventEmitter();

// 预览状态
const previewState = {
  isLoading: false,
  isProcessing: false,
  currentPreview: null,
  previewMode: 'original', // 'original' 或 'watermarked'
  zoomLevel: 1,
  isDraggingWatermark: false,
  watermarkPosition: { x: 0, y: 0 }
};

/**
 * 初始化预览组件
 * @param {Object} options 配置选项
 */
export function initPreview(options = {}) {
  // 默认选项
  const defaultOptions = {
    previewContainerId: 'preview-container',
    previewImageId: 'preview-image',
    previewCanvasId: 'preview-canvas',
    watermarkContainerId: 'watermark-container',
    noImageMessageId: 'no-image-message',
    gifBadgeId: 'gif-badge',
    thumbnailsContainerId: 'thumbnails-container',
    progressBarId: 'gif-progress-bar',
    progressContainerId: 'gif-progress-container',
    bgColorControlsClass: 'bg-color-button'
  };
  
  // 合并选项
  const config = { ...defaultOptions, ...options };
  
  // 获取DOM元素
  const previewContainer = document.getElementById(config.previewContainerId);
  const previewImage = document.getElementById(config.previewImageId);
  const previewCanvas = document.getElementById(config.previewCanvasId);
  const watermarkContainer = document.getElementById(config.watermarkContainerId);
  const noImageMessage = document.getElementById(config.noImageMessageId);
  const gifBadge = document.getElementById(config.gifBadgeId);
  const thumbnailsContainer = document.getElementById(config.thumbnailsContainerId);
  
  // 检查元素是否存在
  if (!previewContainer || !previewImage || !previewCanvas) {
    console.error('预览组件初始化失败：找不到必要的DOM元素');
    return;
  }
  
  // 设置背景色切换
  setupBackgroundColorControls(config.bgColorControlsClass, previewContainer);
  
  // 设置缩放和平移
  setupZoomAndPan(previewContainer, previewImage, previewCanvas);
  
  // 设置水印拖拽
  if (watermarkContainer) {
    setupWatermarkDrag(watermarkContainer);
  }
  
  // 设置缩略图点击事件
  if (thumbnailsContainer) {
    thumbnailsContainer.addEventListener('click', (event) => {
      const thumbnail = event.target.closest('.thumbnail');
      if (thumbnail) {
        const index = parseInt(thumbnail.dataset.index, 10);
        if (!isNaN(index)) {
          showImageByIndex(index);
        }
      }
    });
  }
  
  console.log('预览组件初始化完成');
}

/**
 * 设置背景色切换
 * @param {string} controlsClass 控件CSS类名
 * @param {HTMLElement} previewContainer 预览容器
 */
function setupBackgroundColorControls(controlsClass, previewContainer) {
  // 获取所有背景色按钮
  const bgColorButtons = document.querySelectorAll(`.${controlsClass}`);
  
  // 设置点击事件
  bgColorButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 获取颜色值
      const color = button.dataset.color;
      
      // 应用背景色
      if (color && previewContainer) {
        previewContainer.style.backgroundColor = color;
      }
      
      // 更新活动状态
      bgColorButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

/**
 * 设置缩放和平移
 * @param {HTMLElement} container 容器元素
 * @param {HTMLImageElement} image 图片元素
 * @param {HTMLCanvasElement} canvas 画布元素
 */
function setupZoomAndPan(container, image, canvas) {
  // 缩放状态
  let isPanning = false;
  let startX, startY;
  let translateX = 0;
  let translateY = 0;
  
  // 鼠标滚轮缩放
  container.addEventListener('wheel', (event) => {
    event.preventDefault();
    
    // 计算缩放方向和大小
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(5, previewState.zoomLevel + delta));
    
    // 应用缩放
    applyZoom(image, canvas, newZoom);
  });
  
  // 鼠标按下开始平移
  container.addEventListener('mousedown', (event) => {
    // 只有在已缩放的情况下才允许平移
    if (previewState.zoomLevel > 1) {
      isPanning = true;
      startX = event.clientX - translateX;
      startY = event.clientY - translateY;
      container.style.cursor = 'grabbing';
    }
  });
  
  // 鼠标移动平移
  container.addEventListener('mousemove', (event) => {
    if (isPanning) {
      translateX = event.clientX - startX;
      translateY = event.clientY - startY;
      
      // 应用平移
      applyTransform(image, canvas);
    }
  });
  
  // 鼠标松开结束平移
  container.addEventListener('mouseup', () => {
    isPanning = false;
    container.style.cursor = 'default';
  });
  
  // 鼠标离开结束平移
  container.addEventListener('mouseleave', () => {
    isPanning = false;
    container.style.cursor = 'default';
  });
  
  // 双击重置缩放
  container.addEventListener('dblclick', () => {
    resetZoom(image, canvas);
  });
  
  // 应用缩放
  function applyZoom(image, canvas, zoom) {
    previewState.zoomLevel = zoom;
    applyTransform(image, canvas);
    
    // 触发缩放事件
    previewEvents.emit('zoomChanged', zoom);
  }
  
  // 应用变换
  function applyTransform(image, canvas) {
    const transform = `translate(${translateX}px, ${translateY}px) scale(${previewState.zoomLevel})`;
    
    if (image && image.style.display !== 'none') {
      image.style.transform = transform;
    }
    
    if (canvas && canvas.style.display !== 'none') {
      canvas.style.transform = transform;
    }
  }
  
  // 重置缩放
  function resetZoom(image, canvas) {
    previewState.zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    applyTransform(image, canvas);
    
    // 触发缩放事件
    previewEvents.emit('zoomReset');
  }
}

/**
 * 设置水印拖拽
 * @param {HTMLElement} watermarkContainer 水印容器
 */
function setupWatermarkDrag(watermarkContainer) {
  let isDragging = false;
  let startX, startY;
  let originalX, originalY;
  
  // 鼠标按下开始拖拽
  watermarkContainer.addEventListener('mousedown', (event) => {
    // 只有在自定义位置模式下才允许拖拽
    const options = getWatermarkOptions();
    if (options.position === 'custom') {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originalX = previewState.watermarkPosition.x;
      originalY = previewState.watermarkPosition.y;
      watermarkContainer.style.cursor = 'grabbing';
      
      // 触发拖拽开始事件
      previewEvents.emit('watermarkDragStart', previewState.watermarkPosition);
    }
  });
  
  // 鼠标移动拖拽
  document.addEventListener('mousemove', (event) => {
    if (isDragging) {
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      
      // 更新水印位置
      previewState.watermarkPosition = {
        x: originalX + deltaX,
        y: originalY + deltaY
      };
      
      // 应用位置
      applyWatermarkPosition();
      
      // 触发拖拽事件
      previewEvents.emit('watermarkDrag', previewState.watermarkPosition);
    }
  });
  
  // 鼠标松开结束拖拽
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      watermarkContainer.style.cursor = 'grab';
      
      // 触发拖拽结束事件
      previewEvents.emit('watermarkDragEnd', previewState.watermarkPosition);
    }
  });
  
  // 应用水印位置
  function applyWatermarkPosition() {
    const watermark = watermarkContainer.querySelector('.watermark');
    if (watermark) {
      watermark.style.transform = `translate(${previewState.watermarkPosition.x}px, ${previewState.watermarkPosition.y}px)`;
    }
  }
}

/**
 * 显示当前图片
 * @returns {Promise<void>}
 */
export async function showCurrentImage() {
  const currentFile = getCurrentFile();
  
  if (!currentFile) {
    showNoImageMessage();
    return;
  }
  
  try {
    // 显示加载中状态
    showLoadingState(true);
    
    // 检查是否为GIF
    const isGifImage = isGif(currentFile);
    
    // 获取DOM元素
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const gifBadge = document.getElementById('gif-badge');
    const noImageMessage = document.getElementById('no-image-message');
    
    // 隐藏无图片消息
    if (noImageMessage) {
      noImageMessage.style.display = 'none';
    }
    
    // 显示/隐藏GIF标记
    if (gifBadge) {
      gifBadge.style.display = isGifImage ? 'block' : 'none';
    }
    
    if (isGifImage) {
      // 处理GIF
      await showGifPreview(currentFile);
    } else {
      // 处理普通图片
      await showImagePreview(currentFile);
    }
    
    // 更新缩略图
    updateThumbnails();
    
    // 触发预览更新事件
    previewEvents.emit('previewUpdate', { file: currentFile, isGif: isGifImage });
  } catch (error) {
    console.error('显示图片失败:', error);
    showErrorMessage('显示图片失败: ' + error.message);
  } finally {
    // 隐藏加载中状态
    showLoadingState(false);
  }
}

/**
 * 显示指定索引的图片
 * @param {number} index 图片索引
 * @returns {Promise<void>}
 */
export async function showImageByIndex(index) {
  const files = getFiles();
  
  if (!files || files.length === 0 || index < 0 || index >= files.length) {
    return;
  }
  
  // 更新当前索引
  getCurrentFileIndex(index);
  
  // 显示当前图片
  await showCurrentImage();
  
  // 更新缩略图高亮
  updateThumbnailsHighlight(index);
}

/**
 * 显示GIF预览
 * @param {File} file GIF文件
 * @returns {Promise<void>}
 */
async function showGifPreview(file) {
  // 获取DOM元素
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  
  // 隐藏画布
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
  }
  
  // 显示图片
  if (previewImage) {
    // 加载GIF
    const objectUrl = URL.createObjectURL(file);
    
    // 设置图片源
    previewImage.onload = () => {
      // 显示图片
      previewImage.style.display = 'block';
      
      // 释放URL
      URL.revokeObjectURL(objectUrl);
    };
    
    previewImage.onerror = (error) => {
      console.error('加载GIF失败:', error);
      showErrorMessage('加载GIF失败');
      
      // 释放URL
      URL.revokeObjectURL(objectUrl);
    };
    
    // 设置图片源
    previewImage.src = objectUrl;
  }
}

/**
 * 显示图片预览
 * @param {File} file 图片文件
 * @returns {Promise<void>}
 */
async function showImagePreview(file) {
  // 获取DOM元素
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  
  // 加载图片
  const img = await readImageFile(file);
  
  // 设置预览模式
  if (previewState.previewMode === 'original') {
    // 显示原始图片
    if (previewImage) {
      previewImage.src = img.src;
      previewImage.style.display = 'block';
    }
    
    if (previewCanvas) {
      previewCanvas.style.display = 'none';
    }
  } else {
    // 显示水印预览
    if (previewCanvas) {
      // 应用水印
      const options = getWatermarkOptions();
      await applyWatermark(img, previewCanvas, options);
      
      // 显示画布
      previewCanvas.style.display = 'block';
    }
    
    if (previewImage) {
      previewImage.style.display = 'none';
    }
  }
}

/**
 * 应用水印到当前图片
 * @returns {Promise<void>}
 */
export async function applyWatermarkToCurrentImage() {
  const currentFile = getCurrentFile();
  
  if (!currentFile) {
    return;
  }
  
  try {
    // 显示处理中状态
    showProcessingState(true);
    
    // 获取水印选项
    const options = getWatermarkOptions();
    
    // 检查是否为GIF
    if (isGif(currentFile)) {
      // 处理GIF
      await processGifWithWatermark(currentFile, options);
    } else {
      // 处理普通图片
      await processImageWithWatermark(currentFile, options);
    }
    
    // 设置预览模式为水印
    previewState.previewMode = 'watermarked';
    
    // 触发水印应用事件
    previewEvents.emit('watermarkApplied', { file: currentFile, options });
  } catch (error) {
    console.error('应用水印失败:', error);
    showErrorMessage('应用水印失败: ' + error.message);
  } finally {
    // 隐藏处理中状态
    showProcessingState(false);
  }
}

/**
 * 处理GIF并应用水印
 * @param {File} file GIF文件
 * @param {Object} options 水印选项
 * @returns {Promise<void>}
 */
async function processGifWithWatermark(file, options) {
  // 获取DOM元素
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const progressContainer = document.getElementById('gif-progress-container');
  const progressBar = document.getElementById('gif-progress-bar');
  
  // 显示进度条
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }
  
  // 进度回调
  const onProgress = (progress) => {
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }
    
    // 触发进度事件
    previewEvents.emit('gifProcessProgress', progress);
  };
  
  try {
    // 处理GIF
    const processedGif = await processGifWithWorker(file, options, onProgress);
    
    // 创建URL
    const objectUrl = URL.createObjectURL(processedGif);
    
    // 设置图片源
    if (previewImage) {
      previewImage.onload = () => {
        // 显示图片
        previewImage.style.display = 'block';
        
        // 隐藏画布
        if (previewCanvas) {
          previewCanvas.style.display = 'none';
        }
        
        // 释放URL
        URL.revokeObjectURL(objectUrl);
      };
      
      previewImage.src = objectUrl;
    }
  } finally {
    // 隐藏进度条
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
}

/**
 * 处理图片并应用水印
 * @param {File} file 图片文件
 * @param {Object} options 水印选项
 * @returns {Promise<void>}
 */
async function processImageWithWatermark(file, options) {
  // 获取DOM元素
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  
  // 加载图片
  const img = await readImageFile(file);
  
  // 应用水印
  if (previewCanvas) {
    await applyWatermark(img, previewCanvas, options);
    
    // 显示画布
    previewCanvas.style.display = 'block';
    
    // 隐藏图片
    if (previewImage) {
      previewImage.style.display = 'none';
    }
  }
}

/**
 * 更新缩略图
 */
export function updateThumbnails() {
  const files = getFiles();
  const currentIndex = getCurrentFileIndex();
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  
  if (!thumbnailsContainer || !files || files.length === 0) {
    return;
  }
  
  // 清空容器
  thumbnailsContainer.innerHTML = '';
  
  // 创建缩略图
  files.forEach((file, index) => {
    // 创建缩略图元素
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.dataset.index = index;
    
    // 高亮当前图片
    if (index === currentIndex) {
      thumbnail.classList.add('active');
    }
    
    // 创建图片元素
    const img = document.createElement('img');
    img.alt = file.name;
    
    // 加载缩略图
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // 添加图片到缩略图
    thumbnail.appendChild(img);
    
    // 添加缩略图到容器
    thumbnailsContainer.appendChild(thumbnail);
  });
  
  // 显示缩略图容器
  thumbnailsContainer.style.display = 'flex';
}

/**
 * 更新缩略图高亮
 * @param {number} activeIndex 活动索引
 */
function updateThumbnailsHighlight(activeIndex) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  
  thumbnails.forEach((thumbnail, index) => {
    if (index === activeIndex) {
      thumbnail.classList.add('active');
    } else {
      thumbnail.classList.remove('active');
    }
  });
}

/**
 * 显示无图片消息
 */
function showNoImageMessage() {
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  
  // 隐藏图片和画布
  if (previewImage) {
    previewImage.style.display = 'none';
  }
  
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
  }
  
  // 隐藏GIF标记
  if (gifBadge) {
    gifBadge.style.display = 'none';
  }
  
  // 隐藏缩略图
  if (thumbnailsContainer) {
    thumbnailsContainer.style.display = 'none';
  }
  
  // 显示无图片消息
  if (noImageMessage) {
    noImageMessage.style.display = 'block';
  }
}

/**
 * 显示错误消息
 * @param {string} message 错误消息
 */
function showErrorMessage(message) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.classList.add('error');
    statusMessage.style.display = 'block';
    
    // 3秒后隐藏
    setTimeout(() => {
      statusMessage.style.display = 'none';
      statusMessage.classList.remove('error');
    }, 3000);
  }
}

/**
 * 显示加载中状态
 * @param {boolean} isLoading 是否加载中
 */
function showLoadingState(isLoading) {
  previewState.isLoading = isLoading;
  
  // 触发加载状态变化事件
  previewEvents.emit('loadingStateChanged', isLoading);
}

/**
 * 显示处理中状态
 * @param {boolean} isProcessing 是否处理中
 */
function showProcessingState(isProcessing) {
  previewState.isProcessing = isProcessing;
  
  // 触发处理状态变化事件
  previewEvents.emit('processingStateChanged', isProcessing);
  
  // 显示处理中模态框
  const processingModal = document.getElementById('processing-modal');
  if (processingModal) {
    processingModal.style.display = isProcessing ? 'flex' : 'none';
  }
}

/**
 * 订阅预览更新事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onPreviewUpdate(callback) {
  return previewEvents.on('previewUpdate', callback);
}

/**
 * 订阅水印应用事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onWatermarkApplied(callback) {
  return previewEvents.on('watermarkApplied', callback);
}

/**
 * 订阅GIF处理进度事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onGifProcessProgress(callback) {
  return previewEvents.on('gifProcessProgress', callback);
}

/**
 * 订阅加载状态变化事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onLoadingStateChanged(callback) {
  return previewEvents.on('loadingStateChanged', callback);
}

/**
 * 订阅处理状态变化事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onProcessingStateChanged(callback) {
  return previewEvents.on('processingStateChanged', callback);
}

/**
 * 订阅水印拖拽开始事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onWatermarkDragStart(callback) {
  return previewEvents.on('watermarkDragStart', callback);
}

/**
 * 订阅水印拖拽事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onWatermarkDrag(callback) {
  return previewEvents.on('watermarkDrag', callback);
}

/**
 * 订阅水印拖拽结束事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onWatermarkDragEnd(callback) {
  return previewEvents.on('watermarkDragEnd', callback);
} 