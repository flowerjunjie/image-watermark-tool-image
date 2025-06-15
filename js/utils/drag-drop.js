/**
 * 拖放上传模块
 * 处理图片拖放事件
 */

import { processImage } from './image-processor.js';
import { watermarkState, updateState, applyFirstImageSettings, saveFirstImageSettings, saveCurrentImageSettings, applyImageSettings } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';
import { showError, showMessage, showStatus } from '../ui/messages.js';

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
 * 显示文件统计信息
 * @param {Object} extensionCount - 文件扩展名计数对象
 * @param {number} totalFiles - 总文件数
 * @param {number} originalTotal - 原始总文件数，如果与totalFiles不同则显示过滤率
 * @param {Object} errorStats - 错误统计信息 {total: 数量, types: {错误类型: 数量}}
 */
export function displayFileStatistics(extensionCount, totalFiles, originalTotal, errorStats) {
  // 创建或获取文件统计信息区域
  let fileStatsContainer = document.getElementById('file-stats-container');
  
  if (!fileStatsContainer) {
    // 创建文件统计容器
    fileStatsContainer = document.createElement('div');
    fileStatsContainer.id = 'file-stats-container';
    fileStatsContainer.className = 'file-stats-container';
    fileStatsContainer.style.padding = '10px';
    fileStatsContainer.style.margin = '10px 0';
    fileStatsContainer.style.backgroundColor = '#f0f8ff';
    fileStatsContainer.style.borderRadius = '5px';
    fileStatsContainer.style.fontSize = '14px';
    
    // 添加到适当位置
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea && uploadArea.parentNode) {
      uploadArea.parentNode.insertBefore(fileStatsContainer, uploadArea.nextSibling);
    } else {
      // 如果找不到上传区域，添加到缩略图容器前面
      const thumbnailsContainer = document.getElementById('thumbnails-container');
      if (thumbnailsContainer && thumbnailsContainer.parentNode) {
        thumbnailsContainer.parentNode.insertBefore(fileStatsContainer, thumbnailsContainer);
      }
    }
  }
  
  // 计算处理成功的文件数
  const successFiles = totalFiles - (errorStats?.total || 0);
  const successRate = totalFiles > 0 ? ((successFiles / totalFiles) * 100).toFixed(1) : "0.0";
  
  // 生成统计信息HTML
  let statsHTML = '<div style="font-weight: bold; margin-bottom: 5px;">';
  
  // 如果有原始文件总数且与处理的文件数不同，显示过滤信息
  if (originalTotal && originalTotal !== totalFiles) {
    const filteredPercentage = ((totalFiles / originalTotal) * 100).toFixed(1);
    const filteredOutCount = originalTotal - totalFiles;
    
    statsHTML += `文件统计信息 (共 ${totalFiles}/${originalTotal} 个文件，已过滤 ${filteredOutCount} 个非图片文件)`;
    
    // 添加过滤比例指示器
    statsHTML += `
      <div style="margin-top: 5px; height: 6px; background-color: #eee; border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${filteredPercentage}%; background-color: #4caf50;"></div>
      </div>
      <div style="font-size: 12px; color: #666; text-align: right; margin-top: 2px;">
        处理率: ${filteredPercentage}%
      </div>
    `;
    
    // 添加更详细的文件类型提示
    statsHTML += `
      <div style="margin-top: 5px; font-size: 12px; color: #666;">
        <span style="color: #4caf50;">✓</span> 系统将自动识别和处理以下格式的图片文件: JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, ICO
      </div>
    `;
  } else {
    statsHTML += `文件统计信息 (共 ${totalFiles} 个文件)`;
  }
  
  // 如果有错误统计，显示处理成功率
  if (errorStats && errorStats.total > 0) {
    statsHTML += `
      <div style="margin-top: 8px; font-size: 13px;">
        <span style="color: ${successRate > 90 ? '#4caf50' : (successRate > 70 ? '#ff9800' : '#f44336')};">
          处理成功: ${successFiles}/${totalFiles} 文件 (${successRate}%)
        </span>
        <span style="color: #f44336; margin-left: 10px;">
          处理失败: ${errorStats.total} 文件
        </span>
      </div>
      <div style="margin-top: 5px; height: 6px; background-color: #eee; border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${successRate}%; background-color: ${
          successRate > 90 ? '#4caf50' : (successRate > 70 ? '#ff9800' : '#f44336')
        };"></div>
      </div>
    `;
    
    // 显示错误类型统计
    if (errorStats.types && Object.keys(errorStats.types).length > 0) {
      statsHTML += `<div style="margin-top: 5px; font-size: 12px; color: #666;">错误类型统计: `;
      
      for (const [errorType, count] of Object.entries(errorStats.types)) {
        statsHTML += `<span style="color: #f44336;">${errorType}: ${count}个文件</span>; `;
      }
      
      statsHTML = statsHTML.slice(0, -2) + '</div>';
    }
  }
  
  statsHTML += '</div>';
  statsHTML += '<div style="display: flex; flex-wrap: wrap;">';
  
  // 为每种扩展名创建一个项目
  for (const [ext, count] of Object.entries(extensionCount)) {
    const percentage = ((count / totalFiles) * 100).toFixed(1);
    
    // 根据文件类型使用不同颜色
    let extColor = '#1976d2'; // 默认蓝色
    
    if (ext.toLowerCase() === '.gif') {
      extColor = '#9c27b0'; // GIF紫色
    } else if (['.jpg', '.jpeg'].includes(ext.toLowerCase())) {
      extColor = '#2e7d32'; // JPG绿色
    } else if (ext.toLowerCase() === '.png') {
      extColor = '#ed6c02'; // PNG橙色
    } else if (ext.toLowerCase() === '.webp') {
      extColor = '#0288d1'; // WEBP蓝色
    }
    
    statsHTML += `
      <div style="margin-right: 15px; margin-bottom: 5px; display: flex; align-items: center;">
        <span style="font-weight: bold; color: ${extColor};">${ext}</span>: 
        <span>${count}张</span> 
        <span style="color: #666; margin-left: 3px;">(${percentage}%)</span>
      </div>
    `;
  }
  
  statsHTML += '</div>';
  
  // 更新容器内容
  fileStatsContainer.innerHTML = statsHTML;
  
  // 显示容器
  fileStatsContainer.style.display = 'block';
}

// 将函数添加到全局作用域，以便其他模块可以使用
if (typeof window !== 'undefined') {
  window.displayFileStatistics = displayFileStatistics;
}

/**
 * 处理上传的图片文件
 * @param {FileList} files - 上传的文件列表
 * @returns {Promise} - 返回一个Promise，在处理完成时resolve
 */
export function handleImageFiles(files) {
  return new Promise((resolve, reject) => {
    try {
      // 常见图片文件扩展名列表
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif', '.ico', '.heic', '.heif', '.raw', '.psd', '.cr2', '.nef', '.arw'];
      
      // 检查是否为文件夹上传
      let hasFolderStructure = false;
      for (let i = 0; i < files.length; i++) {
        if (files[i].webkitRelativePath) {
          hasFolderStructure = true;
          break;
        }
      }
      
      if (hasFolderStructure) {
        console.log('检测到文件夹上传，保留目录结构');
      }
      
      // 过滤出图片文件 - 同时检查MIME类型和文件扩展名
      const imageFiles = Array.from(files).filter(file => {
        // 通过MIME类型判断
        const isImageMime = file.type.startsWith('image/');
        
        // 通过文件扩展名判断
        const fileName = file.name.toLowerCase();
        const hasImageExtension = validImageExtensions.some(ext => fileName.endsWith(ext));
        
        // 统计所有尝试处理的文件
        console.log(`文件: ${fileName}, MIME类型: ${file.type}, 是否为图片(MIME): ${isImageMime}, 是否有图片扩展名: ${hasImageExtension}`);
        
        // 满足任一条件即认为是图片
        return isImageMime || hasImageExtension;
      });
      
      // 记录被过滤掉的文件
      const filteredOutFiles = Array.from(files).filter(file => {
        const isImageMime = file.type.startsWith('image/');
        const fileName = file.name.toLowerCase();
        const hasImageExtension = validImageExtensions.some(ext => fileName.endsWith(ext));
        return !(isImageMime || hasImageExtension);
      });
      
      // 显示被过滤掉的文件信息
      if (filteredOutFiles.length > 0) {
        console.warn(`已过滤掉 ${filteredOutFiles.length} 个非图片文件:`, filteredOutFiles.map(f => f.name).join(', '));
      }
      
      // 显示总体过滤统计
      console.log(`总文件数: ${files.length}, 图片文件: ${imageFiles.length}, 非图片文件: ${filteredOutFiles.length}`);
      
      if (imageFiles.length === 0) {
        showError('未找到有效的图片文件');
        
        // 隐藏进度模态框（如果已显示）
        const processingModal = document.getElementById('processing-modal');
        if (processingModal && processingModal.style.display === 'flex') {
          processingModal.style.display = 'none';
        }
        
        reject(new Error('未找到有效的图片文件'));
        return;
      }
      
      // 显示图片数量
      console.log(`加载了 ${imageFiles.length} 张图片`);
      
      // 统计文件扩展名
      const extensionCount = {};
      imageFiles.forEach(file => {
        // 获取文件名和扩展名
        const fileName = file.name;
        const fileExt = fileName.lastIndexOf('.') > 0 ? 
          fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : 
          '无扩展名';
        
        // 计数
        extensionCount[fileExt] = (extensionCount[fileExt] || 0) + 1;
      });
      
      // 显示扩展名统计信息
      console.log('文件扩展名统计:', extensionCount);
      let extensionSummary = '文件类型统计: ';
      for (const [ext, count] of Object.entries(extensionCount)) {
        extensionSummary += `${ext}: ${count}张, `;
      }
      extensionSummary = extensionSummary.slice(0, -2); // 移除末尾的逗号和空格
      
      // 获取处理状态元素
      const processingStatus = document.getElementById('processing-status');
      const processingModal = document.getElementById('processing-modal');
      const modalProgressBar = document.getElementById('modal-progress-bar');
      
      // 显示扩展名统计信息
      if (processingStatus) {
        processingStatus.textContent = `${extensionSummary}`;
        // 2秒后更新回正常状态
        setTimeout(() => {
          processingStatus.textContent = `正在加载 0/${imageFiles.length} 图片文件...`;
        }, 2000);
      }
      
      // 在UI中显示文件统计信息
      displayFileStatistics(extensionCount, imageFiles.length, files.length, { total: 0, types: {} });
      
      // 如果图片数量较多或存在文件夹结构，显示处理模态框
      const totalFiles = imageFiles.length;
      if (totalFiles > 10 || hasFolderStructure) {
        if (processingModal) {
          const modalTitle = processingModal.querySelector('.modal-title');
          if (modalTitle) {
            modalTitle.textContent = hasFolderStructure ? 
              '处理文件夹中...' : '处理中...';
          }
          if (processingStatus) {
            processingStatus.textContent = hasFolderStructure ?
              `正在处理文件夹内容... 0/${totalFiles}` : 
              `正在加载 0/${totalFiles} 图片文件...`;
          }
          
          // 重置进度条
          if (modalProgressBar) {
            modalProgressBar.style.width = '0%';
            modalProgressBar.textContent = '0%';
          }
          
          // 确保模态框显示
          processingModal.style.display = 'flex';
        }
      }
      
      // 检查是否是首次加载图片
      const isFirstLoad = !watermarkState.files || watermarkState.files.length === 0;
      
      // 更新状态
      updateState({
        files: imageFiles,
        currentIndex: 0,
        initialSettingsApplied: isFirstLoad ? false : watermarkState.initialSettingsApplied
      });
      
      // 如果是首次加载图片，重置处理过的设置
      if (isFirstLoad) {
        watermarkState.processedSettings = {};
        watermarkState.firstImageSettings = null;
      }
      
      // 显示缩略图容器
      const thumbnailsContainer = document.getElementById('thumbnails-container');
      if (thumbnailsContainer) {
        thumbnailsContainer.style.display = 'flex';
        thumbnailsContainer.innerHTML = '';
      }
      
      // 生成缩略图，并显示进度
      let processedCount = 0;
      
      const processThumbnails = (startIndex) => {
        const batchSize = 5; // 每批处理的图片数
        const endIndex = Math.min(startIndex + batchSize, imageFiles.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          createThumbnail(imageFiles[i], i);
          processedCount++;
          
          // 更新进度
          if ((totalFiles > 10 || hasFolderStructure) && processingModal && modalProgressBar && processingStatus) {
            const progress = Math.round((processedCount / totalFiles) * 100);
            modalProgressBar.style.width = `${progress}%`;
            modalProgressBar.textContent = `${progress}%`;
            processingStatus.textContent = hasFolderStructure ?
              `正在处理文件夹内容... ${processedCount}/${totalFiles}` :
              `正在加载 ${processedCount}/${totalFiles} 图片文件...`;
          }
        }
        
        // 如果还有未处理的图片，继续处理下一批
        if (endIndex < imageFiles.length) {
          setTimeout(() => processThumbnails(endIndex), 10);
        } else {
          // 所有图片都已处理完成
          if ((totalFiles > 10 || hasFolderStructure) && processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 处理当前选中的图片
          processCurrentImage();
          
          // 完成处理，解析Promise
          resolve();
        }
      };
      
      // 开始处理第一批图片
      processThumbnails(0);
    } catch (error) {
      console.error('处理图片文件时出错:', error);
      
      // 确保关闭处理模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal && processingModal.style.display === 'flex') {
        processingModal.style.display = 'none';
      }
      
      // 显示错误消息
      showError(`处理图片文件时出错: ${error.message}`);
      
      // 拒绝Promise
      reject(error);
    }
  });
}

/**
 * 创建缩略图
 * @param {File} file - 图片文件
 * @param {number} index - 图片索引
 */
function createThumbnail(file, index) {
  // 创建缩略图容器
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail';
  thumbnail.dataset.index = index;
  
  // 设置初始激活状态
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
  
  // 判断是否为GIF
  const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  
  // 添加点击事件 - 改为使用简单的处理方式
  thumbnail.addEventListener('click', (event) => {
    handleThumbnailClick(event, thumbnail, index, file);
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
      
      // 如果是GIF，添加GIF标识
      if (isGif) {
        const gifBadge = document.createElement('div');
        gifBadge.className = 'thumbnail-gif-badge';
        gifBadge.textContent = 'GIF';
        thumbnail.appendChild(gifBadge);
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
 * 处理缩略图点击事件
 * 新设计的缩略图点击处理逻辑，避免竞态条件
 */
function handleThumbnailClick(event, thumbnail, index, file) {
  // 防止事件冒泡
  event.stopPropagation();
  
  // 全局点击锁
  if (window.thumbnailClickLock) {
    console.log('正在处理其他缩略图点击，请稍后再试');
    return;
  }
  
  // 设置全局锁
  window.thumbnailClickLock = true;
  
  console.log(`点击缩略图 ${index}: ${file.name}`);
  
  // 先更新UI状态，给用户即时反馈
  const allThumbnails = document.querySelectorAll('.thumbnail');
  allThumbnails.forEach(t => {
    t.classList.remove('active', 'selected');
  });
  thumbnail.classList.add('active', 'selected');
  
  // 为缩略图添加处理中样式
  thumbnail.classList.add('processing');
  
  // 在切换前保存当前图片设置
  try {
    const currentIndex = watermarkState.currentIndex;
    const currentFile = watermarkState.files[currentIndex];
    if (currentFile) {
      saveCurrentImageSettings();
      console.log('已保存当前图片设置');
    }
  } catch (error) {
    console.error('保存图片设置出错:', error);
  }
  
  // 预先获取和清理相关元素
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  const watermarkContainer = document.getElementById('watermark-container');
  
  // 清除现有图像显示
  if (previewImage) {
    previewImage.style.display = 'none';
    if (previewImage.src) {
      try {
        URL.revokeObjectURL(previewImage.src);
      } catch (e) {}
    }
  }
  
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
    const ctx = previewCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }
  
  // 显示"正在加载"信息
  if (noImageMessage) {
    noImageMessage.textContent = '正在加载图片...';
    noImageMessage.style.display = 'block';
  }
  
  // 更新当前选中索引
  updateState({
    currentIndex: index
  });
  
  // 更新全局currentFile变量
  window.currentFile = file;
  
  // 生成唯一的操作ID
  const operationId = Date.now().toString();
  window.currentOperationId = operationId;
  
  // 判断是否为GIF
  const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  
  // 更新GIF状态和标记
  updateState({ isGif: isGif });
  if (gifBadge) {
    gifBadge.style.display = isGif ? 'block' : 'none';
  }
  
  // 使用Promise和setTimeout确保异步操作完成后释放锁
  new Promise((resolve, reject) => {
    // 包装成setTimeout以避免UI阻塞
    setTimeout(() => {
      try {
        // 检查操作ID是否仍然有效
        if (window.currentOperationId !== operationId) {
          console.log('操作已被更新的请求取代，终止处理');
          reject(new Error('操作已过期'));
          return;
        }
        
        console.log(`开始加载和处理图片: ${file.name} (${isGif ? 'GIF' : '普通图片'})`);
        
        // 优化的图片处理流程
        if (isGif) {
          // 使用简化的GIF处理流程
          simplifiedGifProcess(file, operationId).then(resolve).catch(reject);
        } else {
          // 使用简化的普通图片处理流程
          simplifiedImageProcess(file, operationId).then(resolve).catch(reject);
        }
        
      } catch (error) {
        console.error('处理缩略图点击时出错:', error);
        reject(error);
      }
    }, 10); // 短延迟确保UI更新
  }).then(() => {
    console.log('图片处理完成');
    finalizeThumbnailClick(thumbnail);
  }).catch(error => {
    console.error('图片处理失败:', error);
    showError('加载图片时出错: ' + error.message);
    finalizeThumbnailClick(thumbnail);
  });
}

/**
 * 简化的GIF处理流程
 */
function simplifiedGifProcess(file, operationId) {
  return new Promise((resolve, reject) => {
    try {
      const savedState = { ...watermarkState };
      
      // 显示加载状态
      const noImageMessage = document.getElementById('no-image-message');
      if (noImageMessage) {
        noImageMessage.textContent = '正在处理GIF动画...';
        noImageMessage.style.display = 'block';
      }
      
      // 检查缓存
      const cachedResult = watermarkState.processed && watermarkState.processed[file.name];
      
      if (cachedResult && (cachedResult.blobUrl || cachedResult.dataUrl)) {
        console.log('使用GIF缓存结果');
        const blobUrl = cachedResult.blobUrl || cachedResult.dataUrl;
        
        // 简化的预览显示
        showSimplePreview(blobUrl, file, true).then(() => {
          // 检查操作是否仍然有效
          if (window.currentOperationId !== operationId) {
            reject(new Error('操作已过期'));
            return;
          }
          
          // 恢复水印状态
          restoreWatermarkState(savedState);
          updateWatermark();
          resolve();
        }).catch(reject);
      } else {
        // 需要处理GIF
        console.log('处理新的GIF文件');
        
        import('./gifwrap/gif-processor.js')
          .then(module => {
            // 检查操作是否仍然有效
            if (window.currentOperationId !== operationId) {
              reject(new Error('操作已过期'));
              return;
            }
            
            // 准备GIF处理选项
            const gifOptions = {
              applyWatermark: true,
              isPreview: true,
              quality: 10, // 默认质量
              ...savedState
            };
            
            return module.processGif(file, gifOptions);
          })
          .then(result => {
            // 检查操作是否仍然有效
            if (window.currentOperationId !== operationId) {
              reject(new Error('操作已过期'));
              return;
            }
            
            // 缓存结果
            if (!watermarkState.processed) {
              updateState({ processed: {} });
            }
            watermarkState.processed[file.name] = result;
            
            // 显示处理结果
            return showSimplePreview(result.blobUrl, file, true);
          })
          .then(() => {
            // 恢复水印状态
            restoreWatermarkState(savedState);
            updateWatermark();
            resolve();
          })
          .catch(error => {
            console.error('GIF处理失败:', error);
            
            // 回退到简单预览
            showSimplePreview(URL.createObjectURL(file), file, true)
              .then(() => {
                restoreWatermarkState(savedState);
                updateWatermark();
                resolve();
              })
              .catch(reject);
          });
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 简化的普通图片处理流程
 */
function simplifiedImageProcess(file, operationId) {
  return new Promise((resolve, reject) => {
    try {
      const savedState = { ...watermarkState };
      
      // 直接使用简单预览
      const fileUrl = URL.createObjectURL(file);
      
      // 显示预览
      showSimplePreview(fileUrl, file, false).then(() => {
        // 检查操作是否仍然有效
        if (window.currentOperationId !== operationId) {
          reject(new Error('操作已过期'));
          return;
        }
        
        // 应用设置
        if (watermarkState.processedSettings && watermarkState.processedSettings[file.name]) {
          applyImageSettings(file.name);
        } else if (watermarkState.firstImageSettings) {
          applyFirstImageSettings();
        }
        
        // 恢复水印状态
        restoreWatermarkState(savedState);
        updateWatermark();
        resolve();
      }).catch(reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 简化的预览显示功能
 */
function showSimplePreview(blobUrl, file, isGif) {
  return new Promise((resolve, reject) => {
    try {
      const previewImage = document.getElementById('preview-image');
      const previewCanvas = document.getElementById('preview-canvas');
      const noImageMessage = document.getElementById('no-image-message');
      const gifBadge = document.getElementById('gif-badge');
      const watermarkContainer = document.getElementById('watermark-container');
      
      // 确保水印容器可见
      if (watermarkContainer) {
        watermarkContainer.style.display = 'flex';
        watermarkContainer.style.zIndex = '999999'; // 确保在最顶层
        watermarkContainer.style.pointerEvents = 'auto';
      }
      
      // 确保Canvas隐藏
      if (previewCanvas) {
        previewCanvas.style.display = 'none';
      }
      
      // 清除旧图像
      if (previewImage && previewImage.src) {
        try {
          URL.revokeObjectURL(previewImage.src);
        } catch (e) {}
      }
      
      // 使用图像对象预加载
      const img = new Image();
      
      img.onload = function() {
        // 更新状态
        updateState({
          originalImage: img,
          originalImageWidth: img.width,
          originalImageHeight: img.height,
          isGif: isGif
        });
        
        // 更新预览图像
        if (previewImage) {
          previewImage.src = blobUrl;
          previewImage.style.display = 'block';
          
          // 更新GIF标记
          if (gifBadge) {
            gifBadge.style.display = isGif ? 'block' : 'none';
          }
          
          if (isGif) {
            previewImage.classList.add('gif-image');
          } else {
            previewImage.classList.remove('gif-image');
          }
          
          // 隐藏加载消息
          if (noImageMessage) {
            noImageMessage.style.display = 'none';
          }
        }
        
        // 确保水印容器在图片加载后仍然可见
        if (watermarkContainer) {
          setTimeout(() => {
            watermarkContainer.style.display = 'flex';
            watermarkContainer.style.zIndex = '999999';
            watermarkContainer.style.pointerEvents = 'auto';
          }, 50);
        }
        
        resolve();
      };
      
      img.onerror = function() {
        console.error('加载图片失败:', file.name);
        reject(new Error('加载图片失败'));
      };
      
      img.src = blobUrl;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 结束缩略图点击处理
 */
function finalizeThumbnailClick(thumbnail) {
  // 移除处理中样式
  if (thumbnail) {
    thumbnail.classList.remove('processing');
  }
  
  // 保存当前图片设置
  try {
    saveCurrentImageSettings();
  } catch (e) {
    console.error('保存图片设置失败:', e);
  }
  
  // 释放全局锁
  setTimeout(() => {
    window.thumbnailClickLock = false;
  }, 100);
}

/**
 * 处理当前图像 - 核心图像处理函数
 */
function processCurrentImage() {
  if (!window.currentFile) {
    console.warn('没有选中图像');
    
    // 显示无图像消息
    const noImageMessage = document.getElementById('no-image-message');
    if (noImageMessage) {
      noImageMessage.textContent = '请上传或选择图像';
      noImageMessage.style.display = 'block';
    }
    return;
  }
  
  // 生成唯一的操作ID - 类似缩略图处理中的做法
  const operationId = Date.now().toString();
  window.currentOperationId = operationId;
  
  // 保存当前水印状态用于后续恢复
  const savedWatermarkState = { ...watermarkState };
  
  // 获取当前文件基本信息
  const file = window.currentFile;
  const fileName = file.name;
  
  try {
    console.log(`处理当前图片: ${fileName} (${file.type})`);
    
    // 重置所有状态标志，解决从一种格式切换到另一种时的问题
    window.currentlySwitchingImage = true;
    window.thumbnailClickLock = true;
    
    // 清理UI元素
    const previewCanvas = document.getElementById('preview-canvas');
    const previewImage = document.getElementById('preview-image');
    const noImageMessage = document.getElementById('no-image-message');
    const gifBadge = document.getElementById('gif-badge');
    
    if (previewCanvas) {
      const ctx = previewCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.style.display = 'none';
    }
    
    if (previewImage) {
      if (previewImage.src) {
        try {
          URL.revokeObjectURL(previewImage.src);
        } catch (e) {}
      }
      previewImage.style.display = 'none';
    }
    
    if (noImageMessage) {
      noImageMessage.textContent = '正在处理图片...';
      noImageMessage.style.display = 'block';
    }
    
    // 确保水印容器可见
    const watermarkContainer = document.getElementById('watermark-container');
    if (watermarkContainer) {
      watermarkContainer.style.display = 'flex';
      watermarkContainer.style.zIndex = '99999';
    }
    
    // 检查是否是GIF动画 - 使用文件名和MIME类型双重检查
    const isAnimated = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
    
    // 更新状态
    updateState({
      isGif: isAnimated
    });
    
    // 更新GIF标记
    if (gifBadge) {
      gifBadge.style.display = isAnimated ? 'block' : 'none';
    }
    
    // 使用Promise来处理异步操作
    new Promise((resolve, reject) => {
      try {
        // 使用简化的处理流程
        if (isAnimated) {
          simplifiedGifProcess(file, operationId).then(resolve).catch(reject);
        } else {
          simplifiedImageProcess(file, operationId).then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    })
    .then(() => {
      console.log('图片处理成功完成');
      
      // 恢复水印状态
      restoreWatermarkState(savedWatermarkState);
      updateWatermark();
      
      // 释放锁
      setTimeout(() => {
        window.currentlySwitchingImage = false;
        window.thumbnailClickLock = false;
      }, 100);
    })
    .catch((error) => {
      console.error('处理当前图像时出错:', error);
      
      // 显示错误信息
      if (noImageMessage) {
        noImageMessage.textContent = `图像处理错误: ${error.message || '未知错误'}`;
        noImageMessage.style.display = 'block';
      }
      
      // 仍然尝试恢复水印状态
      restoreWatermarkState(savedWatermarkState);
      
      // 释放锁
      setTimeout(() => {
        window.currentlySwitchingImage = false;
        window.thumbnailClickLock = false;
      }, 100);
    });
  } catch (error) {
    console.error('处理图片主流程错误:', error);
    showError(`处理图片失败: ${error.message || '未知错误'}`);
    
    // 释放锁
    setTimeout(() => {
      window.currentlySwitchingImage = false;
      window.thumbnailClickLock = false;
    }, 100);
  }
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
 * 处理文件拖放
 * @param {Event} event - 拖放事件
 */
export function handleFileDrop(event) {
  // 阻止默认行为
  event.preventDefault();
  event.stopPropagation();
  
  // 获取文件
  const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
  
  // 检查是否有文件
  if (!files || files.length === 0) {
    console.log('没有选择文件');
    return;
  }
  
  // 处理文件
  processFiles(files);
}

/**
 * 处理选择的文件
 * @param {FileList} files - 文件列表
 */
export function processFiles(files) {
  console.log(`处理 ${files.length} 个文件`);
  
  // 显示加载指示器
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  // 清空缩略图容器
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
  }
  
  // 过滤出图片文件
  const imageFiles = Array.from(files).filter(file => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    // 检查MIME类型和文件扩展名
    return type.startsWith('image/') || 
           name.endsWith('.jpg') || 
           name.endsWith('.jpeg') || 
           name.endsWith('.png') || 
           name.endsWith('.gif') || 
           name.endsWith('.webp') || 
           name.endsWith('.svg') || 
           name.endsWith('.bmp') || 
           name.endsWith('.ico');
  });
  
  console.log(`找到 ${imageFiles.length} 个图片文件`);
  
  // 如果没有图片文件，显示提示并返回
  if (imageFiles.length === 0) {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    alert('未找到有效的图片文件，请选择图片文件（JPG, PNG, GIF等）');
    return;
  }
  
  // 统计文件扩展名
  const extensionCount = {};
  const errorStats = { total: 0, types: {} };
  
  // 计数各种扩展名
  imageFiles.forEach(file => {
    const extension = getFileExtension(file.name);
    extensionCount[extension] = (extensionCount[extension] || 0) + 1;
  });
  
  // 在UI中显示文件统计信息
  displayFileStatistics(extensionCount, imageFiles.length, files.length, { total: 0, types: {} });
  
  // 如果图片数量较多，显示处理模态框
  const processModal = document.getElementById('process-modal');
  const processProgress = document.getElementById('process-progress');
  const processCount = document.getElementById('process-count');
  
  let showModal = imageFiles.length > 10;
  
  if (showModal && processModal && processProgress && processCount) {
    processModal.style.display = 'flex';
    processProgress.style.width = '0%';
    processCount.textContent = `0/${imageFiles.length}`;
  }
  
  // 处理每个图片文件
  let processedCount = 0;
  let errorCount = 0;
  const errorFiles = [];
  
  // 创建一个处理队列
  const processQueue = [];
  
  // 添加所有文件到处理队列
  imageFiles.forEach(file => {
    processQueue.push(file);
  });
  
  // 最大并发处理数
  const maxConcurrent = 4;
  let activeProcesses = 0;
  
  // 处理队列函数
  function processNext() {
    // 如果队列为空或已达到最大并发数，返回
    if (processQueue.length === 0 || activeProcesses >= maxConcurrent) {
      return;
    }
    
    // 增加活跃处理数
    activeProcesses++;
    
    // 获取下一个文件
    const file = processQueue.shift();
    
    // 处理文件
    processImageFile(file)
      .then(result => {
        // 增加处理计数
        processedCount++;
        
        // 如果处理失败，记录错误
        if (result.error) {
          errorCount++;
          errorFiles.push({
            name: file.name,
            error: result.error
          });
          
          // 更新错误统计
          errorStats.total = errorCount;
          const errorType = result.error.type || '处理错误';
          errorStats.types[errorType] = (errorStats.types[errorType] || 0) + 1;
        }
        
        // 更新进度
        if (showModal && processProgress && processCount) {
          const percent = Math.round((processedCount / imageFiles.length) * 100);
          processProgress.style.width = `${percent}%`;
          processCount.textContent = `${processedCount}/${imageFiles.length}`;
        }
        
        // 更新文件统计信息（包含错误统计）
        displayFileStatistics(extensionCount, imageFiles.length, files.length, errorStats);
        
        // 减少活跃处理数
        activeProcesses--;
        
        // 继续处理队列
        processNext();
        
        // 如果所有文件都已处理，隐藏加载指示器和模态框
        if (processedCount === imageFiles.length) {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          
          if (showModal && processModal) {
            setTimeout(() => {
              processModal.style.display = 'none';
            }, 500);
          }
          
          // 显示处理结果
          displayProcessResult(imageFiles.length, errorCount, errorFiles);
        }
      })
      .catch(error => {
        console.error('处理图片文件时出错:', error);
        
        // 增加处理计数和错误计数
        processedCount++;
        errorCount++;
        
        errorFiles.push({
          name: file.name,
          error: {
            message: error.message || '未知错误',
            type: '处理错误'
          }
        });
        
        // 更新错误统计
        errorStats.total = errorCount;
        const errorType = '处理错误';
        errorStats.types[errorType] = (errorStats.types[errorType] || 0) + 1;
        
        // 更新进度
        if (showModal && processProgress && processCount) {
          const percent = Math.round((processedCount / imageFiles.length) * 100);
          processProgress.style.width = `${percent}%`;
          processCount.textContent = `${processedCount}/${imageFiles.length}`;
        }
        
        // 更新文件统计信息（包含错误统计）
        displayFileStatistics(extensionCount, imageFiles.length, files.length, errorStats);
        
        // 减少活跃处理数
        activeProcesses--;
        
        // 继续处理队列
        processNext();
        
        // 如果所有文件都已处理，隐藏加载指示器和模态框
        if (processedCount === imageFiles.length) {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
          
          if (showModal && processModal) {
            setTimeout(() => {
              processModal.style.display = 'none';
            }, 500);
          }
          
          // 显示处理结果
          displayProcessResult(imageFiles.length, errorCount, errorFiles);
        }
      });
  }
  
  // 启动初始处理
  for (let i = 0; i < Math.min(maxConcurrent, processQueue.length); i++) {
    processNext();
  }
}

/**
 * 处理单个图片文件
 * @param {File} file - 图片文件
 * @returns {Promise} - 处理结果Promise
 */
async function processImageFile(file) {
  try {
    console.log(`处理图片文件: ${file.name}`);
    
    // 导入图片处理模块
    const { processImage, isGif } = await import('./image-processor.js');
    
    // 处理图片
    const result = await processImage(file, false, { isPreview: true });
    
    // 如果处理失败，返回错误
    if (!result || !result.blobUrl) {
      return {
        error: {
          message: '处理图片失败',
          type: '处理错误'
        }
      };
    }
    
    // 如果处理结果标记为错误，返回错误
    if (result.isError) {
      return {
        error: {
          message: '处理图片失败',
          type: '处理错误'
        }
      };
    }
    
    // 如果是GIF但处理后没有有效的blob或blobUrl，返回错误
    if (isGif(file) && (!result.blob || !result.blobUrl)) {
      return {
        error: {
          message: '无有效的blob或blobUrl',
          type: '数据错误'
        }
      };
    }
    
    // 创建缩略图 - 使用新的缩略图创建函数
    createProcessedThumbnail(file, result);
    
    return { success: true };
  } catch (error) {
    console.error(`处理图片文件 ${file.name} 时出错:`, error);
    
    return {
      error: {
        message: error.message || '加载图片失败',
        type: '处理错误'
      }
    };
  }
}

/**
 * 创建处理后的图片缩略图
 * @param {File} file - 图片文件
 * @param {Object} processResult - 处理结果
 */
function createProcessedThumbnail(file, processResult) {
  // 获取缩略图容器
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (!thumbnailsContainer) return;
  
  // 创建缩略图元素
  const thumbnailDiv = document.createElement('div');
  thumbnailDiv.className = 'thumbnail';
  thumbnailDiv.dataset.filename = file.name;
  
  // 创建图片元素
  const img = document.createElement('img');
  img.src = processResult.blobUrl;
  img.alt = file.name;
  img.title = file.name;
  
  // 如果是GIF，添加GIF标识
  if (processResult.isGif) {
    const gifBadge = document.createElement('span');
    gifBadge.className = 'gif-badge';
    gifBadge.textContent = 'GIF';
    thumbnailDiv.appendChild(gifBadge);
  }
  
  // 创建文件名元素
  const fileNameSpan = document.createElement('span');
  fileNameSpan.className = 'file-name';
  fileNameSpan.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
  fileNameSpan.title = file.name;
  
  // 添加点击事件
  thumbnailDiv.addEventListener('click', function() {
    selectThumbnail(this);
    
    // 显示预览
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    
    if (previewImage) {
      previewImage.src = img.src;
      previewImage.style.display = 'block';
    }
    
    if (previewCanvas) {
      previewCanvas.style.display = 'none';
    }
    
    // 更新当前选中的文件
    window.currentFile = file;
    window.currentProcessResult = processResult;
    
    // 触发预览更新
    const previewUpdateEvent = new CustomEvent('previewUpdate', { detail: { file, processResult } });
    document.dispatchEvent(previewUpdateEvent);
  });
  
  // 组装缩略图
  thumbnailDiv.appendChild(img);
  thumbnailDiv.appendChild(fileNameSpan);
  thumbnailsContainer.appendChild(thumbnailDiv);
}

/**
 * 选择缩略图
 * @param {HTMLElement} thumbnail - 缩略图元素
 */
function selectThumbnail(thumbnail) {
  try {
    // 全局点击锁，与handleThumbnailClick保持一致
    if (window.thumbnailClickLock) {
      console.log('正在处理其他缩略图点击，请稍后再试');
      return;
    }
    
    // 设置全局锁
    window.thumbnailClickLock = true;
    
    // 检查切换状态
    if (window.currentlySwitchingImage) {
      console.log('当前正在切换图片，忽略新的选择请求');
      setTimeout(() => {
        window.thumbnailClickLock = false;
      }, 100);
      return;
    }
    
    // 设置切换状态
    window.currentlySwitchingImage = true;
    
    // 更新UI状态
    const allThumbnails = document.querySelectorAll('.thumbnail');
    allThumbnails.forEach(thumb => {
      thumb.classList.remove('selected', 'active');
    });
    
    // 添加选中状态
    thumbnail.classList.add('selected', 'active');
    thumbnail.classList.add('processing');
    
    // 获取索引和文件
    const index = parseInt(thumbnail.dataset.index, 10);
    if (!isNaN(index) && watermarkState.files && index < watermarkState.files.length) {
      const file = watermarkState.files[index];
      
      // 生成唯一的操作ID
      const operationId = Date.now().toString();
      window.currentOperationId = operationId;
      
      console.log(`选择缩略图 ${index}: ${file.name}`);
      
      // 清理UI元素
      const previewImage = document.getElementById('preview-image');
      const previewCanvas = document.getElementById('preview-canvas');
      const noImageMessage = document.getElementById('no-image-message');
      const gifBadge = document.getElementById('gif-badge');
      
      if (previewImage) {
        previewImage.style.display = 'none';
        if (previewImage.src) {
          try {
            URL.revokeObjectURL(previewImage.src);
          } catch (e) {}
        }
      }
      
      if (previewCanvas) {
        previewCanvas.style.display = 'none';
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
      
      if (noImageMessage) {
        noImageMessage.textContent = '正在加载图片...';
        noImageMessage.style.display = 'block';
      }
      
      // 更新当前索引和当前文件
      updateState({ currentIndex: index });
      window.currentFile = file;
      
      // 判断是否为GIF
      const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
      
      // 更新GIF状态标记
      updateState({ isGif: isGif });
      if (gifBadge) {
        gifBadge.style.display = isGif ? 'block' : 'none';
      }
      
      // 保存水印状态
      const savedWatermarkState = { ...watermarkState };
      
      // 使用Promise处理异步图片加载
      new Promise((resolve, reject) => {
        try {
          // 使用新的流程处理图片
          if (isGif) {
            simplifiedGifProcess(file, operationId).then(resolve).catch(reject);
          } else {
            simplifiedImageProcess(file, operationId).then(resolve).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
      })
      .then(() => {
        console.log('缩略图图片处理成功');
        finalizeThumbnailSelection(thumbnail, savedWatermarkState, file);
      })
      .catch(error => {
        console.error('缩略图图片处理失败:', error);
        showError('加载图片失败: ' + error.message);
        finalizeThumbnailSelection(thumbnail, savedWatermarkState, file);
      });
    } else {
      console.error('无效的缩略图索引:', index);
      window.currentlySwitchingImage = false;
      window.thumbnailClickLock = false;
      thumbnail.classList.remove('processing');
    }
  } catch (error) {
    console.error('选择缩略图时出错:', error);
    window.currentlySwitchingImage = false;
    window.thumbnailClickLock = false;
    thumbnail.classList.remove('processing');
  }
}

/**
 * 完成缩略图选择操作
 */
function finalizeThumbnailSelection(thumbnail, savedWatermarkState, file) {
  try {
    // 恢复水印状态
    if (savedWatermarkState) {
      restoreWatermarkState(savedWatermarkState);
    }
    
    // 应用图片特定设置
    if (file && watermarkState.processedSettings && watermarkState.processedSettings[file.name]) {
      applyImageSettings(file.name);
    } else if (watermarkState.firstImageSettings) {
      applyFirstImageSettings();
    }
    
    // 更新水印
    updateWatermark();
    
    // 保存当前设置
    saveCurrentImageSettings();
  } catch (e) {
    console.error('完成缩略图选择时出错:', e);
  } finally {
    // 移除处理中样式
    if (thumbnail) {
      thumbnail.classList.remove('processing');
    }
    
    // 释放锁
    setTimeout(() => {
      window.currentlySwitchingImage = false;
      window.thumbnailClickLock = false;
    }, 100);
  }
}

/**
 * 获取文件扩展名
 * @param {string} fileName - 文件名
 * @returns {string} - 文件扩展名（包含点）
 */
function getFileExtension(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * 显示处理结果
 * @param {number} totalFiles - 总文件数
 * @param {number} errorCount - 错误数量
 * @param {Array} errorFiles - 错误文件列表
 */
function displayProcessResult(totalFiles, errorCount, errorFiles) {
  if (errorCount === 0) {
    console.log(`所有 ${totalFiles} 个文件处理成功`);
    return;
  }
  
  console.log(`处理完成: ${totalFiles - errorCount}/${totalFiles} 成功, ${errorCount} 失败`);
  
  // 按错误类型分组
  const errorsByType = {};
  errorFiles.forEach(file => {
    const errorType = file.error.type || '未知错误';
    if (!errorsByType[errorType]) {
      errorsByType[errorType] = [];
    }
    errorsByType[errorType].push(file);
  });
  
  // 显示错误信息
  console.warn(`处理警告 (${errorCount})`);
  console.warn('错误类型统计:');
  
  Object.keys(errorsByType).forEach(type => {
    console.warn(`${type}: ${errorsByType[type].length}个文件`);
  });
  
  console.warn('被跳过的文件:');
  
  // 限制显示的错误文件数量
  const maxErrorsToShow = 100;
  const filesToShow = errorFiles.slice(0, maxErrorsToShow);
  
  filesToShow.forEach(file => {
    console.warn(`${file.name} - ${file.error.type}: ${file.error.message}`);
  });
  
  if (errorFiles.length > maxErrorsToShow) {
    console.warn(`...以及其他 ${errorFiles.length - maxErrorsToShow} 个文件`);
  }
}

/**
 * 显示预览图像
 * @param {string} blobUrl - 图像的Blob URL
 * @param {boolean} isGif - 是否为GIF图像
 * @param {Object} options - 额外选项
 */
function displayPreviewImage(blobUrl, isGif = false, options = {}) {
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  const watermarkContainer = document.getElementById('watermark-container');
  
  if (!previewImage) return;
  
  // 确保canvas隐藏，避免与image重叠
  if (previewCanvas) {
    previewCanvas.style.display = 'none';
  }
  
  // 生成唯一的显示ID，防止多次切换图片时的状态混乱
  const displayId = Date.now().toString();
  window.currentPreviewDisplayId = displayId;
  
  // 记录当前是否显示GIF
  console.log(`正在显示${isGif ? 'GIF' : '普通'}图像预览:`, options.fileName || '未知文件');
  
  // 保存当前水印状态以便恢复
  const savedWatermarkState = { ...watermarkState };
  
  // 确保水印容器可见
  if (watermarkContainer) {
    watermarkContainer.style.zIndex = '99999';
    watermarkContainer.style.display = 'flex';
    watermarkContainer.style.pointerEvents = 'auto';
  }
  
  // 清除旧的图片
  if (previewImage.src) {
    try {
      URL.revokeObjectURL(previewImage.src);
    } catch (e) {
      console.warn('撤销旧URL时出错:', e);
    }
  }
  
  // 设置加载状态
  if (noImageMessage) {
    noImageMessage.textContent = '正在加载图片...';
    noImageMessage.style.display = 'block';
  }
  
  // 更新GIF标识状态
  if (gifBadge) {
    gifBadge.style.display = isGif ? 'block' : 'none';
  }
  
  // 清除旧的事件监听器
  const oldImage = previewImage.cloneNode(false);
  if (previewImage.parentNode) {
    previewImage.parentNode.replaceChild(oldImage, previewImage);
  }
  
  // 使用新的图像元素
  const newImage = oldImage;
  
  // 确保图片一开始是隐藏的，等加载完成后再显示
  newImage.style.display = 'none';
  
  // 更新GIF状态
  updateState({
    isGif: isGif
  });
  
  // 设置加载事件
  newImage.onload = function() {
    // 检查这是否是最新的显示请求
    if (window.currentPreviewDisplayId !== displayId) {
      console.log('预览图片加载完成，但不是最新的显示请求，忽略');
      return;
    }
    
    console.log('图片加载完成，显示预览');
    
    // 检查图片是否成功加载并有内容
    if (newImage.naturalWidth > 0 && newImage.naturalHeight > 0) {
      console.log(`预览图片尺寸: ${newImage.naturalWidth}x${newImage.naturalHeight}`);
      newImage.style.display = 'block';
      
      if (noImageMessage) {
        noImageMessage.style.display = 'none';
      }
      
      // 如果是GIF，添加标识
      if (isGif) {
        newImage.classList.add('gif-image');
        if (gifBadge) gifBadge.style.display = 'block';
      } else {
        newImage.classList.remove('gif-image');
        if (gifBadge) gifBadge.style.display = 'none';
      }
      
      // 立即更新水印
      console.log('图片加载完成，立即更新水印');
      
      // 恢复水印状态
      restoreWatermarkState(savedWatermarkState);
      
      // 立即更新水印位置
      updateWatermark();
      
      // 在短暂延迟后再次更新水印，确保DOM完全更新
      setTimeout(() => {
        // 检查这是否是最新的显示请求
        if (window.currentPreviewDisplayId !== displayId) {
          console.log('延迟更新水印时，检测到不是最新的显示请求，忽略');
          return;
        }
        
        console.log('图片加载后延迟更新水印');
        
        // 再次恢复水印状态
        restoreWatermarkState(savedWatermarkState);
        
        // 更新水印位置
        updateWatermark();
        
        // 重置切换状态，允许进行新的切换操作
        window.currentlySwitchingImage = false;
      }, 100);
      
      // 如果有回调函数，调用它
      if (options.onSuccess) {
        options.onSuccess();
      }
      
    } else {
      console.error('预览图片加载完成但尺寸为0，可能是白屏问题');
      // 显示错误信息
      if (noImageMessage) {
        noImageMessage.textContent = 'GIF处理可能出错，尝试重新加载...';
        noImageMessage.style.display = 'block';
      }
      
      // 仍然尝试显示水印
      setTimeout(() => {
        // 恢复水印状态
        restoreWatermarkState(savedWatermarkState);
        
        updateWatermark();
        
        // 重置切换状态，允许进行新的切换操作
        window.currentlySwitchingImage = false;
      }, 100);
      
      // 如果是GIF白屏，尝试使用原始GIF
      if (isGif && options.originalSource) {
        console.log('尝试使用原始GIF作为备用');
        setTimeout(() => {
          const originalUrl = URL.createObjectURL(options.originalSource);
          newImage.src = originalUrl;
        }, 500);
      }
      
      // 显示正在重新处理的消息
      if (noImageMessage) {
        noImageMessage.textContent = '重新处理图片中...';
        noImageMessage.style.display = 'block';
      }
      
      // 重新处理图片
      if (options.reprocess) {
        options.reprocess();
        return;
      }
    }
  };
  
  // 设置错误处理
  newImage.onerror = function(error) {
    console.error('加载预览图片失败:', error);
    
    // 检查这是否是最新的显示请求
    if (window.currentPreviewDisplayId !== displayId) {
      console.log('预览图片加载失败，但不是最新的显示请求，忽略');
      return;
    }
    
    // 如果是缓存的图片加载失败，尝试重新处理
    if (options.isCached && options.fileName && options.currentFile) {
      console.log('缓存的图片加载失败，尝试重新处理:', options.fileName);
      
      // 移除缓存
      if (watermarkState.processed[options.fileName]) {
        delete watermarkState.processed[options.fileName];
      }
      
      // 显示正在重新处理的消息
      if (noImageMessage) {
        noImageMessage.textContent = '重新处理图片中...';
        noImageMessage.style.display = 'block';
      }
      
      // 重新处理图片
      if (options.reprocess) {
        options.reprocess();
        return;
      }
    }
    
    // 创建一个备用静态图像
    try {
      // 创建一个临时Canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 500;
      tempCanvas.height = 500;
      const ctx = tempCanvas.getContext('2d');
      
      // 绘制一个简单的背景
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 绘制错误信息
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('图片加载失败', tempCanvas.width / 2, tempCanvas.height / 2 - 10);
      ctx.fillText(options.fileName || '未知文件', tempCanvas.width / 2, tempCanvas.height / 2 + 20);
      
      // 转换为数据URL并设置为图片源
      const dataUrl = tempCanvas.toDataURL('image/png');
      newImage.src = dataUrl;
      newImage.style.display = 'block';
      
      if (noImageMessage) {
        noImageMessage.style.display = 'none';
      }
      
      // 仍然尝试显示水印
      setTimeout(() => {
        updateWatermark();
        window.currentlySwitchingImage = false;
      }, 100);
      
    } catch (canvasError) {
      console.error('创建备用图像失败:', canvasError);
      if (noImageMessage) {
        noImageMessage.textContent = '加载图片失败';
        noImageMessage.style.display = 'block';
      }
      window.currentlySwitchingImage = false;
    }
  };
  
  // 设置图片源
  newImage.src = blobUrl;
}

/**
 * 显示预览图像 - 简化版
 * @param {File} file - 图像文件
 */
function displaySimplePreview(file) {
  // 验证文件参数
  if (!file || !(file instanceof File)) {
    console.error('displaySimplePreview 调用无效: 缺少有效文件对象', file);
    return;
  }
  
  console.log(`显示预览图像: ${file.name} (${file.type}), 大小: ${Math.round(file.size / 1024)}KB`);
  
  // 检查是否为GIF
  const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  
  try {
    // 创建直接的文件URL
    const fileUrl = URL.createObjectURL(file);
    
    // 使用新的showSimplePreview函数
    showSimplePreview(fileUrl, file, isGif)
      .then(() => {
        console.log('预览图片显示成功');
        // 应用图像设置
        if (watermarkState.processedSettings && watermarkState.processedSettings[file.name]) {
          applyImageSettings(file.name);
        } else if (watermarkState.firstImageSettings) {
          applyFirstImageSettings();
        }
        updateWatermark();
      })
      .catch(error => {
        console.error('预览图片显示失败:', error);
        showError('加载图片时出错: ' + error.message);
      });
  } catch (error) {
    console.error('显示预览图像时出错:', error);
    showError('加载图片时出错: ' + error.message);
  }
}

/**
 * 恢复保存的水印状态
 * @param {Object} savedState - 保存的水印状态
 */
function restoreWatermarkState(savedState) {
  if (!savedState) return;
  
  // 只恢复水印相关的设置
  const watermarkKeys = [
    'type', 'text', 'fontSize', 'opacity', 'rotation', 'color',
    'relativePosition', 'watermarkImage', 'tileSpacing'
  ];
  
  watermarkKeys.forEach(key => {
    if (savedState[key] !== undefined) {
      watermarkState[key] = savedState[key];
    }
  });
}

/**
 * 处理GIF图像
 * @param {File} gifFile - GIF文件
 * @param {Object} savedWatermarkState - 保存的水印状态，用于恢复
 */
function processGif(gifFile, savedWatermarkState = null) {
  console.log('处理GIF文件:', gifFile.name);
  
  // 如果传入了保存的水印状态，先保存一个本地副本
  const localSavedState = savedWatermarkState ? { ...savedWatermarkState } : { ...watermarkState };
  
  // 确保水印容器可见
  const watermarkContainer = document.getElementById('watermark-container');
  if (watermarkContainer) {
    watermarkContainer.style.display = 'flex';
    watermarkContainer.style.zIndex = '99999';
    watermarkContainer.style.pointerEvents = 'auto';
  }
  
  // 获取GIF处理模块
  if (!window.processGif) {
    console.error('GIF处理模块未加载');
    displaySimplePreview(gifFile);
    return;
  }
  
  // 使用水印状态中的选项创建处理选项
  const gifOptions = {
    applyWatermark: true,  // 强制应用水印
    isPreview: true,
    text: watermarkState.text,
    color: watermarkState.color,
    fontSize: watermarkState.fontSize,
    opacity: watermarkState.opacity,
    rotation: watermarkState.rotation,
    position: watermarkState.relativePosition,
    type: watermarkState.type,
    watermarkImage: watermarkState.watermarkImage,
    tileSpacing: watermarkState.tileSpacing,
    isGif: true,
    onProgress: (progress) => {
      // 可选: 在这里更新处理进度UI
      const noImageMessage = document.getElementById('no-image-message');
      if (noImageMessage) {
        noImageMessage.textContent = `处理GIF中... ${Math.round(progress.progress * 100)}%`;
        noImageMessage.style.display = 'block';
      }
    }
  };
  
  // 显示处理状态
  const noImageMessage = document.getElementById('no-image-message');
  if (noImageMessage) {
    noImageMessage.textContent = '正在处理GIF动画...';
    noImageMessage.style.display = 'block';
  }
  
  // 从gifwrap模块导入处理函数
  import('./gifwrap/gif-processor.js')
    .then((module) => {
      // 调用处理函数
      module.processGif(gifFile, gifOptions)
        .then(result => {
          console.log('GIF处理完成');
          
          // 缓存处理结果
          if (!watermarkState.processed) {
            updateState({ processed: {} });
          }
          
          // 保存处理结果到缓存
          watermarkState.processed[gifFile.name] = result;
          
          // 显示处理后的GIF
          displayPreviewImage(result.blobUrl, true, {
            originalSource: gifFile,
            fileName: gifFile.name,
            currentFile: gifFile
          });
          
          // 恢复保存的水印状态
          setTimeout(() => {
            restoreWatermarkState(localSavedState);
            updateWatermark();
            console.log('GIF处理后恢复水印状态并更新显示');
            
            // 确保水印可见
            setTimeout(() => {
              updateWatermark();
            }, 100);
          }, 50);
        })
        .catch(error => {
          console.error('处理GIF出错:', error);
          
          // 回退到简单预览
          displaySimplePreview(gifFile);
          
          // 恢复保存的水印状态
          setTimeout(() => {
            restoreWatermarkState(localSavedState);
            updateWatermark();
          }, 100);
        });
    })
    .catch(error => {
      console.error('加载GIF处理模块失败:', error);
      
      // 回退到简单预览
      displaySimplePreview(gifFile);
      
      // 恢复保存的水印状态
      setTimeout(() => {
        restoreWatermarkState(localSavedState);
        updateWatermark();
      }, 100);
    });
} 