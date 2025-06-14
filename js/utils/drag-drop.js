/**
 * 拖放上传模块
 * 处理图片拖放事件
 */

import { processImage } from './image-processor.js';
import { watermarkState, updateState } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';

/**
 * 初始化拖放功能
 */
export function initDragAndDrop() {
  console.log('初始化拖放功能');
  
  // 获取拖放区域
  const uploadArea = document.getElementById('upload-area');
  const watermarkImageArea = document.getElementById('watermark-image-area');
  
  // 初始化图片上传区域拖放
  if (uploadArea) {
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleImageDrop);
    uploadArea.addEventListener('click', handleUploadAreaClick);
  }
  
  // 初始化水印图片上传区域拖放
  if (watermarkImageArea) {
    watermarkImageArea.addEventListener('dragover', handleDragOver);
    watermarkImageArea.addEventListener('dragleave', handleDragLeave);
    watermarkImageArea.addEventListener('drop', handleWatermarkImageDrop);
    watermarkImageArea.addEventListener('click', handleWatermarkImageClick);
  }
}

/**
 * 处理拖放经过事件
 * @param {DragEvent} e - 拖放事件对象
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  this.style.borderColor = '#1976d2';
  this.style.backgroundColor = '#f5f8ff';
}

/**
 * 处理拖放离开事件
 * @param {DragEvent} e - 拖放事件对象
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  this.style.borderColor = '#ccc';
  this.style.backgroundColor = '';
}

/**
 * 处理图片拖放事件
 * @param {DragEvent} e - 拖放事件对象
 */
function handleImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // 重置样式
  this.style.borderColor = '#ccc';
  this.style.backgroundColor = '';
  
  // 获取文件
  const files = e.dataTransfer.files;
  
  if (files && files.length > 0) {
    handleImageFiles(files);
  }
}

/**
 * 处理水印图片拖放事件
 * @param {DragEvent} e - 拖放事件对象
 */
function handleWatermarkImageDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // 重置样式
  this.style.borderColor = '#ccc';
  this.style.backgroundColor = '';
  
  // 获取文件
  const files = e.dataTransfer.files;
  
  if (files && files.length > 0) {
    const file = files[0];
    
    // 确保是图片文件
    if (file.type.startsWith('image/')) {
      loadWatermarkImage(file);
    } else {
      showError('请选择有效的图片文件作为水印');
    }
  }
}

/**
 * 处理上传区域点击事件
 */
function handleUploadAreaClick() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

/**
 * 处理水印图片区域点击事件
 */
function handleWatermarkImageClick() {
  const watermarkImageInput = document.getElementById('watermark-image-input');
  if (watermarkImageInput) {
    watermarkImageInput.click();
  }
}

/**
 * 处理图片文件
 * @param {FileList} files - 文件列表
 */
export function handleImageFiles(files) {
  // 过滤出图片文件
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    showError('未找到有效的图片文件');
    
    // 隐藏进度模态框（如果已显示）
    const processingModal = document.getElementById('processing-modal');
    if (processingModal && processingModal.style.display === 'flex') {
      processingModal.style.display = 'none';
    }
    
    return;
  }
  
  // 显示图片数量
  console.log(`加载了 ${imageFiles.length} 张图片`);
  
  // 如果图片数量较多，显示处理模态框
  const totalFiles = imageFiles.length;
  if (totalFiles > 10) {
    const processingModal = document.getElementById('processing-modal');
    const modalProgressBar = document.getElementById('modal-progress-bar');
    const processingStatus = document.getElementById('processing-status');
    
    if (processingModal) {
      const modalTitle = processingModal.querySelector('.modal-title');
      if (modalTitle) modalTitle.textContent = '处理中...';
      if (processingStatus) processingStatus.textContent = `正在加载 0/${totalFiles} 图片文件...`;
      
      // 重置进度条
      if (modalProgressBar) {
        modalProgressBar.style.width = '0%';
        modalProgressBar.textContent = '0%';
      }
      
      // 确保模态框显示
      processingModal.style.display = 'flex';
    }
  }
  
  // 更新状态
  updateState({
    files: imageFiles,
    currentIndex: 0
  });
  
  // 显示缩略图容器
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (thumbnailsContainer) {
    thumbnailsContainer.style.display = 'flex';
    thumbnailsContainer.innerHTML = '';
  }
  
  // 生成缩略图，并显示进度
  let processedCount = 0;
  const processingModal = document.getElementById('processing-modal');
  const modalProgressBar = document.getElementById('modal-progress-bar');
  const processingStatus = document.getElementById('processing-status');
  
  const processThumbnails = (startIndex) => {
    const batchSize = 5; // 每批处理的图片数
    const endIndex = Math.min(startIndex + batchSize, imageFiles.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      createThumbnail(imageFiles[i], i);
      processedCount++;
      
      // 更新进度
      if (totalFiles > 10 && processingModal && modalProgressBar && processingStatus) {
        const progress = Math.round((processedCount / totalFiles) * 100);
        modalProgressBar.style.width = `${progress}%`;
        modalProgressBar.textContent = `${progress}%`;
        processingStatus.textContent = `正在加载 ${processedCount}/${totalFiles} 图片文件...`;
      }
    }
    
    // 如果还有未处理的图片，继续处理下一批
    if (endIndex < imageFiles.length) {
      setTimeout(() => processThumbnails(endIndex), 10);
    } else {
      // 所有图片都已处理完成
      if (totalFiles > 10 && processingModal) {
        processingModal.style.display = 'none';
      }
      
      // 处理当前选中的图片
      processCurrentImage();
    }
  };
  
  // 开始处理第一批图片
  processThumbnails(0);
}

/**
 * 创建缩略图
 * @param {File} file - 图片文件
 * @param {number} index - 图片索引
 */
function createThumbnail(file, index) {
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (!thumbnailsContainer) return;
  
  // 创建缩略图元素
  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  thumbnail.dataset.index = index;
  
  if (index === 0) {
    thumbnail.classList.add('active');
  }
  
  // 创建缩略图图片
  const img = document.createElement('img');
  img.alt = file.name;
  
  // 添加加载指示器
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'thumbnail-loading';
  loadingIndicator.innerHTML = '<div class="spinner"></div>';
  thumbnail.appendChild(loadingIndicator);
  
  // 创建文件名标签
  const fileName = document.createElement('div');
  fileName.className = 'file-name';
  fileName.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
  fileName.title = file.name; // 添加完整文件名作为提示
  
  // 添加点击事件
  thumbnail.addEventListener('click', () => {
    // 更新选中状态
    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });
    thumbnail.classList.add('active');
    
    // 更新当前索引
    updateState({
      currentIndex: index
    });
    
    // 处理当前选中的图片
    processCurrentImage();
  });
  
  // 添加到容器
  thumbnail.appendChild(img);
  thumbnail.appendChild(fileName);
  thumbnailsContainer.appendChild(thumbnail);
  
  // 异步加载图片
  const reader = new FileReader();
  reader.onload = function(e) {
    img.src = e.target.result;
    
    // 图片加载完成后移除加载指示器
    img.onload = function() {
      if (loadingIndicator && loadingIndicator.parentNode === thumbnail) {
        thumbnail.removeChild(loadingIndicator);
      }
    };
  };
  
  // 错误处理
  reader.onerror = function() {
    console.error('无法加载图片:', file.name);
    if (loadingIndicator && loadingIndicator.parentNode === thumbnail) {
      loadingIndicator.innerHTML = '<div class="error-icon">!</div>';
    }
  };
  
  // 开始读取文件
  reader.readAsDataURL(file);
}

/**
 * 处理当前选中的图片
 */
function processCurrentImage() {
  const currentFile = watermarkState.files[watermarkState.currentIndex];
  
  if (!currentFile) {
    showError('无法加载选中的图片');
    return;
  }
  
  // 确保预览容器和预览图像元素可见
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const noImageMessage = document.getElementById('no-image-message');
  
  // 显示加载状态
  if (noImageMessage) {
    noImageMessage.textContent = '正在加载图片...';
    noImageMessage.style.display = 'block';
  }
  
  if (previewContainer) {
    previewContainer.style.backgroundColor = 'transparent';
  }
  
  // 重置预览图像和Canvas的显示状态
  if (previewImage) previewImage.style.display = 'none';
  if (previewCanvas) previewCanvas.style.display = 'none';
  
  // 处理并显示图片
  processImage(currentFile, false)
    .then((blobUrl) => {
      // 确保获取到了blobUrl
      if (!blobUrl) {
        showError('处理图片失败，未获取到图片数据');
        return;
      }
      
      // 隐藏加载消息
      if (noImageMessage) {
        noImageMessage.style.display = 'none';
      }
      
      // 显示处理后的图片
      if (previewImage) {
        // 先清除旧的src以避免内存泄漏
        if (previewImage.src && previewImage.src.startsWith('blob:')) {
          URL.revokeObjectURL(previewImage.src);
        }
        
        previewImage.src = blobUrl;
        previewImage.style.display = 'block';
      }
      
      // 等待图片完全加载后更新水印
      setTimeout(() => {
        // 更新水印
        updateWatermark();
        console.log('processCurrentImage: 已调用updateWatermark');
      }, 100);
      
      // 添加控制台日志，帮助调试
      console.log('图片处理完成，已更新预览');
    })
    .catch(error => {
      showError('处理图片时出错: ' + error.message);
    });
}

/**
 * 加载水印图片
 * @param {File} file - 图片文件
 */
function loadWatermarkImage(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const img = new Image();
    
    img.onload = function() {
      // 更新状态
      updateState({
        watermarkImage: img,
        type: 'image'
      });
      
      // 更新类型选择框
      const typeSelector = document.getElementById('watermark-type');
      if (typeSelector) {
        typeSelector.value = 'image';
      }
      
      // 更新水印
      updateWatermark();
      
      // 显示预览
      const watermarkImagePreview = document.getElementById('watermark-image-preview');
      const watermarkImageThumbnail = document.getElementById('watermark-image-thumbnail');
      
      if (watermarkImagePreview && watermarkImageThumbnail) {
        watermarkImageThumbnail.src = e.target.result;
        watermarkImagePreview.style.display = 'block';
      }
      
      // 显示图片选项
      const imageOptions = document.getElementById('image-options');
      const textOptions = document.getElementById('text-options');
      const tiledOptions = document.getElementById('tiled-options');
      
      if (imageOptions) imageOptions.style.display = 'block';
      if (textOptions) textOptions.style.display = 'none';
      if (tiledOptions) tiledOptions.style.display = 'none';
    };
    
    img.onerror = function() {
      showError('加载水印图片失败');
    };
    
    img.src = e.target.result;
  };
  
  reader.onerror = function() {
    showError('读取水印图片文件失败');
  };
  
  reader.readAsDataURL(file);
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
      errorContainer.classList.remove('show');
    }, 3000);
  } else {
    console.error(message);
  }
} 