/**
 * 拖放上传模块
 * 处理图片拖放事件
 */

import { processImage } from './image-processor.js';
import { watermarkState, updateState, applyFirstImageSettings, saveFirstImageSettings, saveCurrentImageSettings, applyImageSettings } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';
import { showError, showMessage, showStatus } from '../ui/messages.js';

// 引入显示多选提示函数
import { showMultiSelectionTip } from '../handlers/event-listeners.js';

/**
 * 初始化拖放功能
 */
function initDragAndDrop() {
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

// 已移除锁超时检测机制

// 已移除检查锁功能

// 已移除强制清除锁功能

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
function displayFileStatistics(extensionCount, totalFiles, originalTotal, errorStats) {
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
function handleImageFiles(files) {
  console.log('处理拖放的图片文件:', files.length);
  
  // 检查是否有文件
  if (!files || files.length === 0) {
    showError('没有选择任何文件');
    return Promise.resolve([]);
  }
  
  // 更新状态
  updateState({ 
    files: [], // 先清空
    currentIndex: 0,
    processed: {}
  });
  
  // 清空现有的缩略图
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
    thumbnailsContainer.style.display = 'none'; // 先隐藏，等有内容再显示
  }
  
  // 记录开始时间
  const startTime = Date.now();
  
  // 过滤出图片文件
  const imageFiles = Array.from(files).filter(file => 
    file.type.startsWith('image/') || 
    file.name.toLowerCase().match(/\.(jpe?g|png|gif|bmp|webp|svg|ico)$/i)
  );
  
  // 如果有文件被过滤掉，显示提示
  if (imageFiles.length < files.length) {
    showMessage(`已过滤 ${files.length - imageFiles.length} 个非图片文件`);
  }
  
  if (imageFiles.length === 0) {
    showError('没有可用的图片文件');
    return Promise.resolve([]);
  }
  
  // 文件扩展名统计
  const extensionCount = {};
  const errorStats = { 
    total: 0, 
    types: {} // 记录不同类型的错误
  };
  
  // 更新状态
  updateState({ 
    files: imageFiles,
    currentIndex: 0,
    processed: {}
  });
  
  // 统计文件扩展名
  imageFiles.forEach(file => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    extensionCount[ext] = extensionCount[ext] ? extensionCount[ext] + 1 : 1;
  });
  
  // 显示文件统计
  displayFileStatistics(extensionCount, imageFiles.length, files.length, errorStats);
  
  // 创建和处理缩略图
  return new Promise((resolve, reject) => {
    try {
      // 显示缩略图容器
      if (thumbnailsContainer) {
        thumbnailsContainer.style.display = 'flex';
      }
      
      // 如果是多张图片，显示正在批量处理的消息
      if (imageFiles.length > 1) {
        showStatus(`正在处理 ${imageFiles.length} 张图片...`, true);
      }
      
      // 处理第一个图片
      setTimeout(() => {
        // 处理第一个图片
        createThumbnail(imageFiles[0], 0)
          .then(result => {
            console.log('第一张缩略图创建完成');
            
            if (thumbnailsContainer) {
              // 添加第一个缩略图
              thumbnailsContainer.appendChild(result.thumbnail);
              
              // 选中第一个缩略图
              result.thumbnail.classList.add('selected');
            }
            
            // 保存第一张图片的设置
            if (imageFiles.length > 1) {
              saveFirstImageSettings();
            }
            
            // 处理剩余的图片
            if (imageFiles.length > 1) {
              processThumbnails(1);
            } else {
              // 如果只有一张图片，显示处理完成
              const endTime = Date.now();
              const processingTime = (endTime - startTime) / 1000;
              showStatus(`图片处理完成，耗时 ${processingTime.toFixed(1)} 秒`, true);
              resolve(imageFiles);
            }
          })
          .catch(error => {
            console.error('创建第一个缩略图时出错:', error);
            showError('处理图片时出错: ' + error.message);
            errorStats.total++;
            
            // 记录错误类型
            const errorType = error.name || '未知错误';
            errorStats.types[errorType] = errorStats.types[errorType] ? errorStats.types[errorType] + 1 : 1;
            
            // 尝试处理下一个图片
            if (imageFiles.length > 1) {
              processThumbnails(1);
            } else {
              reject(error);
            }
          });
      }, 100);
      
      // 处理剩余缩略图的函数
      const processThumbnails = (startIndex) => {
        console.log(`开始处理从索引 ${startIndex} 开始的剩余图片...`);
        
        // 批量处理剩余的图片
        const promises = [];
        
        for (let i = startIndex; i < imageFiles.length; i++) {
          promises.push(
            createThumbnail(imageFiles[i], i)
              .then(result => {
                if (thumbnailsContainer) {
                  thumbnailsContainer.appendChild(result.thumbnail);
                }
                return result;
              })
              .catch(error => {
                console.error(`处理索引 ${i} 的图片时出错:`, error);
                errorStats.total++;
                
                // 记录错误类型
                const errorType = error.name || '未知错误';
                errorStats.types[errorType] = errorStats.types[errorType] ? errorStats.types[errorType] + 1 : 1;
                
                return null; // 错误时返回null，不中断整个Promise.all
              })
          );
        }
        
        // 等待所有图片处理完成
        Promise.all(promises)
          .then(results => {
            // 过滤出成功的结果
            const successResults = results.filter(result => result !== null);
            
            // 计算处理时间
            const endTime = Date.now();
            const processingTime = (endTime - startTime) / 1000;
            
            console.log(`所有图片处理完成，共 ${successResults.length} 张成功，${errorStats.total} 张失败，耗时 ${processingTime.toFixed(1)} 秒`);
            
            // 更新文件统计
            displayFileStatistics(extensionCount, imageFiles.length, files.length, errorStats);
            
            // 显示处理完成消息
            const message = errorStats.total > 0
              ? `图片处理完成，共 ${successResults.length} 张成功，${errorStats.total} 张失败，耗时 ${processingTime.toFixed(1)} 秒`
              : `${imageFiles.length} 张图片处理完成，耗时 ${processingTime.toFixed(1)} 秒`;
              
            showStatus(message, errorStats.total === 0);
            
            // 显示多选提示
            showMultiSelectionTip();
            
            // 完成Promise
            resolve(imageFiles);
          })
          .catch(error => {
            console.error('处理缩略图时出错:', error);
            showError('批量处理图片时出错: ' + error.message);
            reject(error);
          });
      };
    } catch (error) {
      console.error('创建缩略图容器时出错:', error);
      showError('处理图片时出错: ' + error.message);
      reject(error);
    }
  });
}

/**
 * 创建缩略图
 * @param {File} file - 图片文件
 * @param {number} index - 图片索引
 * @returns {Promise<{thumbnail: HTMLElement}>} - 返回缩略图元素的Promise
 */
function createThumbnail(file, index) {
  return new Promise((resolve, reject) => {
    // 创建缩略图容器
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.setAttribute('data-index', index);
    
    // 创建加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'thumbnail-loading';
    loadingIndicator.innerHTML = '<div class="spinner"></div>';
    thumbnail.appendChild(loadingIndicator);
    
    // 创建文件名标签
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    thumbnail.appendChild(fileName);
    
    // 添加类型标识 (GIF, PNG, JPG等)
    const fileType = file.type || '';
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (fileExt === '.gif' || fileType === 'image/gif') {
      const gifBadge = document.createElement('div');
      gifBadge.className = 'thumbnail-gif-badge';
      gifBadge.textContent = 'GIF';
      thumbnail.appendChild(gifBadge);
    } else if (fileExt === '.png' || fileType === 'image/png') {
      const pngBadge = document.createElement('div');
      pngBadge.className = 'thumbnail-png-badge';
      pngBadge.textContent = 'PNG';
      thumbnail.appendChild(pngBadge);
    } else if (fileExt === '.jpg' || fileExt === '.jpeg' || fileType === 'image/jpeg') {
      const jpgBadge = document.createElement('div');
      jpgBadge.className = 'thumbnail-jpg-badge';
      jpgBadge.textContent = 'JPG';
      thumbnail.appendChild(jpgBadge);
    }
    
    // 添加点击事件
    thumbnail.addEventListener('click', function(event) {
      handleThumbnailClick(event, thumbnail, index, file);
    });
    
    // 创建文件读取器
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // 创建图片元素
      const img = document.createElement('img');
      
      // 图片加载完成时
      img.onload = function() {
        // 移除加载指示器
        if (loadingIndicator.parentNode === thumbnail) {
          thumbnail.removeChild(loadingIndicator);
        }
        
        // 添加图片到缩略图
        thumbnail.insertBefore(img, fileName);
        
        // 解析Promise
        resolve({ thumbnail });
      };
      
      // 图片加载失败时
      img.onerror = function() {
        console.error('无法加载图片:', file.name);
        if (loadingIndicator.parentNode === thumbnail) {
          loadingIndicator.innerHTML = '<div class="error-icon">!</div>';
        }
        
        // 拒绝Promise
        reject(new Error(`无法加载图片: ${file.name}`));
      };
      
      // 设置图片源
      img.src = e.target.result;
    };
    
    reader.onerror = function() {
      console.error('无法读取文件:', file.name);
      if (loadingIndicator.parentNode === thumbnail) {
        loadingIndicator.innerHTML = '<div class="error-icon">!</div>';
      }
      
      // 拒绝Promise
      reject(new Error(`无法读取文件: ${file.name}`));
    };
    
    // 开始读取文件
    reader.readAsDataURL(file);
  });
}

/**
 * 处理缩略图点击事件
 * @param {Event} event - 事件对象
 * @param {HTMLElement} thumbnail - 缩略图元素
 * @param {number} index - 图片索引
 * @param {File} file - 图片文件
 */
function handleThumbnailClick(event, thumbnail, index, file) {
  console.log('缩略图点击事件:', {index: index, filename: file.name});
  
  // 检查是否按下Ctrl键或Command键（Mac）
  const isMultipleSelection = event.ctrlKey || event.metaKey;
  
  // 如果使用多选模式且该缩略图已经选中，则取消选中并返回
  if (isMultipleSelection && thumbnail.classList.contains('selected')) {
    thumbnail.classList.remove('selected');
    console.log('取消选中缩略图:', index, file.name);
    return;
  }
  
  try {
    // 获取预览区域元素
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkContainer = document.getElementById('watermark-container');
    const noImageMessage = document.getElementById('no-image-message');
    const gifBadge = document.getElementById('gif-badge');
    
    // 如果没有预览元素，直接返回
    if (!previewImage && !previewCanvas) {
      console.error('预览元素不存在');
      return;
    }
    
    // 多选模式下，保持其他缩略图的选中状态，只添加当前缩略图的选中状态
    if (isMultipleSelection) {
      thumbnail.classList.add('selected');
      console.log('添加选中缩略图（多选模式）:', index, file.name);
      // 多选模式下不更改预览，只更新选中状态
      return;
    }
    
    // 单选模式：清除所有已选中的缩略图
    const selectedThumbnails = document.querySelectorAll('.thumbnail.selected');
    if (selectedThumbnails) {
      selectedThumbnails.forEach(thumb => {
        thumb.classList.remove('selected');
      });
    }
    
    // 选中当前缩略图
    thumbnail.classList.add('selected');
    
    // 隐藏无图片消息
    if (noImageMessage) {
      noImageMessage.style.display = 'none';
    }
    
    // 保存当前水印相对位置
    const savedRelativePosition = { ...watermarkState.relativePosition };
    
    // 保存当前图片尺寸
    const currentImageWidth = watermarkState.imageWidth || 0;
    const currentImageHeight = watermarkState.imageHeight || 0;
    
    // 保存当前水印类型和其他设置
    const currentWatermarkType = watermarkState.type || 'text';
    const currentWatermarkImage = watermarkState.watermarkImage;
    
    console.log('保存当前水印设置:', {
      type: currentWatermarkType,
      relativePosition: savedRelativePosition,
      currentImageSize: { width: currentImageWidth, height: currentImageHeight },
      hasWatermarkImage: !!currentWatermarkImage
    });
    
    // 清理旧图像
    if (previewImage) {
      previewImage.onload = null;
      previewImage.onerror = null;
      previewImage.style.display = 'none';
      if (previewImage.src) {
        try {
          URL.revokeObjectURL(previewImage.src);
        } catch (e) {}
        previewImage.src = '';
      }
    }
    
    if (previewCanvas) {
      previewCanvas.style.display = 'none';
      const ctx = previewCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
    
    // 暂时隐藏水印容器，但不清除内容
    if (watermarkContainer) {
      watermarkContainer.style.display = 'none';
    }
    
    // 更新当前索引
    updateState({
      currentIndex: index,
      originalImage: null,
      // 重置水印位置相关状态，但保留相对位置
      sizeAdjusted: false,
      isDragging: false,
      isProcessing: false
    });
    
    // 手动保存相对位置和水印类型，确保不被updateState覆盖
    watermarkState.relativePosition = savedRelativePosition;
    watermarkState.type = currentWatermarkType;
    watermarkState.watermarkImage = currentWatermarkImage;
    
    // 更新全局变量
    window.currentFile = file;
    
    // 判断是否为GIF
    const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
    updateState({ isGif: isGif });
    
    // 再次确保相对位置和水印设置被保留
    watermarkState.relativePosition = savedRelativePosition;
    watermarkState.type = currentWatermarkType;
    watermarkState.watermarkImage = currentWatermarkImage;
    
    // 显示GIF标识
    if (gifBadge) {
      gifBadge.style.display = isGif ? 'block' : 'none';
    }
    
    // 创建一个保存的本地状态
    const localSavedState = {
      relativePosition: savedRelativePosition,
      type: currentWatermarkType,
      watermarkImage: currentWatermarkImage
    };
    
    // 处理GIF文件
    if (isGif) {
      // 使用GIF处理函数
      processGif(file, localSavedState);
    } else {
      // 创建图片URL
      const objectUrl = URL.createObjectURL(file);
      
      // 显示预览图片
      displayPreviewImage(objectUrl, false, {
        onLoad: function(img) {
          // 图片加载完成后，更新水印
          console.log('图片加载完成，更新水印:', img.naturalWidth, img.naturalHeight);
          
          // 更新图像尺寸到状态
          updateState({
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            originalImageWidth: img.naturalWidth,
            originalImageHeight: img.naturalHeight
          });
          
          // 确保水印容器可见
          if (watermarkContainer) {
            watermarkContainer.style.display = 'flex';
            watermarkContainer.style.width = `${img.offsetWidth}px`;
            watermarkContainer.style.height = `${img.offsetHeight}px`;
          }
          
          // 确保相对位置在有效范围内，考虑图片尺寸变化
          if (watermarkState.relativePosition) {
            // 允许水印完全覆盖图片区域
            watermarkState.relativePosition.x = Math.max(-150, Math.min(250, watermarkState.relativePosition.x));
            watermarkState.relativePosition.y = Math.max(-150, Math.min(250, watermarkState.relativePosition.y));
          }
          
          // 延迟一下再更新水印，确保DOM已更新
          setTimeout(() => {
            // 最后一次确保相对位置和水印类型正确
            restoreWatermarkState(localSavedState);
            updateWatermark();
          }, 100);
        },
        onError: function(error) {
          console.error('图片加载失败:', error);
          showError('图片加载失败: ' + error);
        }
      });
    }
  } catch (error) {
    console.error('缩略图点击处理错误:', error);
    showError('处理图片时出错: ' + error.message);
  }
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
  
  // 强制释放任何现有锁，确保处理可以继续
  window.thumbnailClickLock = false;
  window.currentlySwitchingImage = false;
  
  // 获取当前文件基本信息
  const file = window.currentFile;
  const fileName = file.name;
  
  console.log(`处理当前图片: ${fileName} (${file.type})`);
  
  // 获取相关元素
  const previewCanvas = document.getElementById('preview-canvas');
  const previewImage = document.getElementById('preview-image');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  const watermarkContainer = document.getElementById('watermark-container');
  
  // 显示加载中状态
  if (noImageMessage) {
    noImageMessage.textContent = '正在处理图片...';
    noImageMessage.style.display = 'block';
  }
  
  // 清理UI元素
  if (previewCanvas) {
    const ctx = previewCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCanvas.style.display = 'none';
  }
    
  if (previewImage) {
    // 清除事件处理器
    previewImage.onload = null;
    previewImage.onerror = null;
    
    // 隐藏图像
    previewImage.style.display = 'none';
    
    // 清除旧的URL
    if (previewImage.src) {
      try {
        URL.revokeObjectURL(previewImage.src);
      } catch (e) {
        console.warn('清除旧图像URL时出错:', e);
      }
      previewImage.src = '';
    }
  }
    
  // 检查是否是GIF动画 - 使用文件名和MIME类型双重检查
  const isAnimated = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  
  // 更新状态 - 先清除原始图像以确保完全重新加载
  updateState({
    isGif: isAnimated,
    originalImage: null
  });
    
  // 更新GIF标记
  if (gifBadge) {
    gifBadge.style.display = isAnimated ? 'block' : 'none';
  }
  
  // 强制清除缓存 - 确保每次都重新处理
  if (watermarkState.processed && watermarkState.processed[fileName]) {
    console.log('强制清除图片缓存以确保正确处理');
    delete watermarkState.processed[fileName];
  }
  
  // 直接显示图片 - 简化处理流程
  const fileUrl = URL.createObjectURL(file);
  
  // 创建新图像对象
  const img = new Image();
  
  img.onload = function() {
    // 更新状态
    updateState({
      originalImage: img,
      originalImageWidth: img.width,
      originalImageHeight: img.height,
      isGif: isAnimated
    });
    
    // 显示图像
    if (previewImage) {
      previewImage.onload = function() {
        // 隐藏加载消息
        if (noImageMessage) {
          noImageMessage.style.display = 'none';
        }
        
        // 设置GIF类
        if (isAnimated) {
          previewImage.classList.add('gif-image');
        } else {
          previewImage.classList.remove('gif-image');
        }
        
        // 显示图像
        previewImage.style.display = 'block';
        
        // 应用设置
        if (watermarkState.processedSettings && watermarkState.processedSettings[fileName]) {
          applyImageSettings(fileName);
        } else if (watermarkState.firstImageSettings) {
          applyFirstImageSettings();
        }
        
        // 更新水印
        setTimeout(() => {
          // 确保水印容器可见
          if (watermarkContainer) {
            watermarkContainer.style.display = 'flex';
            watermarkContainer.style.zIndex = '999999';
            watermarkContainer.style.pointerEvents = 'auto';
          }
          
          updateWatermark();
        }, 100);
      };
      
      previewImage.onerror = function() {
        console.error('加载预览图像失败');
        if (noImageMessage) {
          noImageMessage.textContent = '加载图片失败';
          noImageMessage.style.display = 'block';
        }
      };
      
      // 设置图像源
      previewImage.src = fileUrl;
    } else {
      // 如果没有预览图像元素
      if (noImageMessage) {
        noImageMessage.textContent = '预览元素不存在';
        noImageMessage.style.display = 'block';
      }
    }
  };
  
  img.onerror = function() {
    console.error('加载图片失败:', fileName);
    if (noImageMessage) {
      noImageMessage.textContent = '加载图片失败';
      noImageMessage.style.display = 'block';
    }
  };
  
  // 开始加载图片
  img.src = fileUrl;
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
      console.log('水印图片加载成功:', {
        width: img.width,
        height: img.height,
        src: img.src.substring(0, 50) + '...' // 只记录前50个字符以避免日志过长
      });
      
      // 更新状态 - 保存图片对象和URL
      const imageUrl = e.target.result;
      updateState({
        watermarkImage: imageUrl, // 保存为URL字符串而不是Image对象
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
        watermarkImageThumbnail.src = imageUrl;
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
      console.error('加载水印图片失败:', file.name);
      showError('加载水印图片失败');
    };
    
    img.src = e.target.result;
  };
  
  reader.onerror = function() {
    console.error('读取水印图片文件失败:', file.name);
    showError('读取水印图片文件失败');
  };
  
  reader.readAsDataURL(file);
}

/**
 * 处理文件拖放
 * @param {Event} event - 拖放事件
 */
function handleFileDrop(event) {
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
function processFiles(files) {
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
    
    // 确保水印容器可见
    const watermarkContainer = document.getElementById('watermark-container');
        if (watermarkContainer) {
      watermarkContainer.style.display = 'flex';
      watermarkContainer.style.zIndex = '999999';
      watermarkContainer.style.pointerEvents = 'auto';
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
      
    // 强制再次更新水印
      setTimeout(() => {
        updateWatermark();
      
      // 再次确保水印容器可见
      if (watermarkContainer) {
        watermarkContainer.style.display = 'flex';
        watermarkContainer.style.zIndex = '999999';
        watermarkContainer.style.pointerEvents = 'auto';
      }
    }, 100);
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
    }, 150);
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
    // 确保释放锁
    window.thumbnailClickLock = false;
    return;
  }
  
  console.log(`显示预览图像: ${file.name} (${file.type}), 大小: ${Math.round(file.size / 1024)}KB`);
  
  // 检查是否为GIF
  const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  const watermarkContainer = document.getElementById('watermark-container');
  
  try {
    // 创建直接的文件URL
    const fileUrl = URL.createObjectURL(file);
    
    // 直接显示图片
    const previewImage = document.getElementById('preview-image');
    const noImageMessage = document.getElementById('no-image-message');
    const gifBadge = document.getElementById('gif-badge');
    
    if (previewImage) {
      previewImage.onload = () => {
        console.log('预览图片加载完成');
        
        // 隐藏加载消息
        if (noImageMessage) noImageMessage.style.display = 'none';
        
        // 显示图片
        previewImage.style.display = 'block';
        
        // 显示GIF标记
        if (isGif && gifBadge) {
          gifBadge.style.display = 'block';
        }
        
        // 确保水印容器可见并正确定位
        if (watermarkContainer) {
          watermarkContainer.style.display = 'flex';
          watermarkContainer.style.width = `${previewImage.offsetWidth}px`;
          watermarkContainer.style.height = `${previewImage.offsetHeight}px`;
        }
        
        // 应用图像设置
        if (watermarkState.processedSettings && watermarkState.processedSettings[file.name]) {
          applyImageSettings(file.name);
        } else if (watermarkState.firstImageSettings) {
          applyFirstImageSettings();
        }
        
        setTimeout(() => {
          updateWatermark();
          // 释放锁，允许下一次点击
          window.thumbnailClickLock = false;
          console.log('预览图片显示成功，锁已释放');
        }, 100);
      };
      
      previewImage.onerror = (error) => {
        console.error('预览图片加载失败:', error);
        showError('加载图片时出错');
        // 确保释放锁
        window.thumbnailClickLock = false;
      };
      
      // 设置图片源
      previewImage.src = fileUrl;
    } else {
      console.error('找不到预览图片元素');
      showError('找不到预览图片元素');
      // 确保释放锁
      window.thumbnailClickLock = false;
    }
  } catch (error) {
    console.error('显示预览图像时出错:', error);
    showError('加载图片时出错: ' + error.message);
    // 确保释放锁
    window.thumbnailClickLock = false;
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
  const localSavedState = savedWatermarkState ? { ...savedWatermarkState } : { 
    relativePosition: { ...watermarkState.relativePosition },
    type: watermarkState.type,
    watermarkImage: watermarkState.watermarkImage
  };
  
  // 确保水印容器可见
  const watermarkContainer = document.getElementById('watermark-container');
  if (watermarkContainer) {
    watermarkContainer.style.display = 'flex';
    watermarkContainer.style.zIndex = '99999';
    watermarkContainer.style.pointerEvents = 'auto';
  }
  
  // 导入GIF处理模块并直接处理
  try {
    // 动态导入GIF处理模块
    import('./gifwrap/gif-processor.js')
      .then(module => {
        if (module && module.processGif) {
          // 将processGif函数暴露到全局作用域，以便于其他地方使用
          window.processGif = module.processGif;
          console.log('GIF处理模块已加载');
          
          // 继续执行GIF处理
          processGifWithModule(gifFile, module, localSavedState);
        } else {
          console.error('无法获取processGif函数');
          displaySimplePreview(gifFile);
          // 释放锁
          window.thumbnailClickLock = false;
        }
      })
      .catch(error => {
        console.error('加载GIF处理模块失败:', error);
        displaySimplePreview(gifFile);
        // 释放锁
        window.thumbnailClickLock = false;
      });
  } catch (error) {
    console.error('尝试加载GIF处理模块时出错:', error);
    displaySimplePreview(gifFile);
    // 释放锁
    window.thumbnailClickLock = false;
  }
}

/**
 * 用加载好的模块处理GIF
 * @param {File} gifFile - GIF文件
 * @param {Object} module - 已加载的GIF处理模块
 * @param {Object} savedState - 保存的水印状态
 */
function processGifWithModule(gifFile, module, savedState) {
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
        currentFile: gifFile,
        onLoad: () => {
          // 恢复保存的水印状态
          setTimeout(() => {
            if (savedState) {
              restoreWatermarkState(savedState);
            }
            updateWatermark();
            console.log('GIF处理后恢复水印状态并更新显示');
            
            // 释放锁
            window.thumbnailClickLock = false;
          }, 50);
        },
        onError: () => {
          // 释放锁
          window.thumbnailClickLock = false;
        }
      });
    })
    .catch(error => {
      console.error('处理GIF出错:', error);
      
      // 回退到简单预览
      displaySimplePreview(gifFile);
      
      // 恢复保存的水印状态
      setTimeout(() => {
        if (savedState) {
          restoreWatermarkState(savedState);
        }
        updateWatermark();
        
        // 释放锁
        window.thumbnailClickLock = false;
      }, 100);
    });
}

/**
 * 初始化水印拖拽功能
 */
function initWatermarkDragging() {
  const watermarkContainer = document.getElementById('watermark-container');
  if (!watermarkContainer) return;
  
  // 监听水印容器中的元素
  watermarkContainer.addEventListener('mousedown', function(e) {
    const watermarkElement = e.target.closest('#watermark-element') || e.target;
    
    // 如果点击的不是水印元素或其子元素，直接返回
    if (!watermarkElement || !watermarkContainer.contains(watermarkElement)) {
      return;
    }
    
    // 标记水印正在拖动
    watermarkElement.classList.add('dragging');
    updateState({ isDragging: true });
    
    // 获取预览图像尺寸
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    
    let previewWidth, previewHeight;
    
    // 首先尝试从状态获取图像尺寸（这是最准确的，因为它是原始图像的尺寸）
    if (watermarkState.imageWidth > 0 && watermarkState.imageHeight > 0) {
      previewWidth = watermarkState.imageWidth;
      previewHeight = watermarkState.imageHeight;
      console.log('使用状态中的图像尺寸:', previewWidth, previewHeight);
    }
    // 如果状态中没有尺寸，则从DOM元素获取
    else if (previewImage && previewImage.style.display !== 'none') {
      previewWidth = previewImage.naturalWidth || previewImage.offsetWidth;
      previewHeight = previewImage.naturalHeight || previewImage.offsetHeight;
      console.log('使用预览图像的尺寸:', previewWidth, previewHeight);
    } else if (previewCanvas && previewCanvas.style.display !== 'none') {
      previewWidth = previewCanvas.width || previewCanvas.offsetWidth;
      previewHeight = previewCanvas.height || previewCanvas.offsetHeight;
      console.log('使用预览画布的尺寸:', previewWidth, previewHeight);
    } else {
      console.warn('无法获取预览区域尺寸，使用容器尺寸');
      previewWidth = watermarkContainer.offsetWidth;
      previewHeight = watermarkContainer.offsetHeight;
    }
    
    // 确保尺寸有效
    if (previewWidth <= 0) previewWidth = watermarkContainer.offsetWidth;
    if (previewHeight <= 0) previewHeight = watermarkContainer.offsetHeight;
    
    // 更新状态中的图像尺寸（如果之前没有设置）
    if (watermarkState.imageWidth <= 0 || watermarkState.imageHeight <= 0) {
      watermarkState.imageWidth = previewWidth;
      watermarkState.imageHeight = previewHeight;
    }
    
    // 记录初始位置
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = watermarkElement.offsetLeft;
    const startTop = watermarkElement.offsetTop;
    
    // 记录初始相对位置
    const startRelativeX = watermarkState.relativePosition ? watermarkState.relativePosition.x : 50;
    const startRelativeY = watermarkState.relativePosition ? watermarkState.relativePosition.y : 50;
    
    // 计算容器的边界
    const containerRect = watermarkContainer.getBoundingClientRect();
    
    console.log('开始拖动水印:', {
      startPosition: { x: startLeft, y: startTop },
      relativePosition: { x: startRelativeX, y: startRelativeY },
      imageSize: { width: previewWidth, height: previewHeight },
      containerSize: { width: containerRect.width, height: containerRect.height }
    });
    
    // 鼠标移动处理函数
    function handleMouseMove(e) {
      // 计算鼠标移动的距离
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // 获取水印元素的尺寸
      const watermarkWidth = watermarkElement.offsetWidth || 100;
      const watermarkHeight = watermarkElement.offsetHeight || 50;
      
      // 考虑水印尺寸的一半（因为使用了transform: translate(-50%, -50%)）
      const halfWidth = watermarkWidth / 2;
      const halfHeight = watermarkHeight / 2;
      
      // 计算新位置
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      
      // 获取当前缩放比例
      let currentScale = 1.0;
      const currentTransform = watermarkElement.style.transform || '';
      if (currentTransform.includes('scale')) {
        const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
        if (scaleMatch && scaleMatch[1]) {
          currentScale = parseFloat(scaleMatch[1]) || 1.0;
        }
      }
      
      // 考虑缩放后的实际尺寸
      const scaledHalfWidth = halfWidth * currentScale;
      const scaledHalfHeight = halfHeight * currentScale;
      
      // 使用更准确的边界值 - 使用实际图片尺寸而不是容器尺寸
      // 确保使用正确的参考尺寸 - 使用图片的实际显示尺寸
      const displayedWidth = previewImage ? previewImage.offsetWidth : previewWidth;
      const displayedHeight = previewImage ? previewImage.offsetHeight : previewHeight;
      
      // 大幅扩展可拖动边界，尤其是右侧和底部
      // 允许水印可以完全移到图像任何位置，包括右边界和底部边界
      // 左上角允许移动到-1.5倍水印尺寸，右下角允许移动到图像尺寸+1.5倍水印尺寸
      const leftBoundary = -scaledHalfWidth * 3;
      const topBoundary = -scaledHalfHeight * 3;
      const rightBoundary = displayedWidth + scaledHalfWidth * 3;
      const bottomBoundary = displayedHeight + scaledHalfHeight * 3;
      
      newLeft = Math.max(leftBoundary, Math.min(newLeft, rightBoundary));
      newTop = Math.max(topBoundary, Math.min(newTop, bottomBoundary));
      
      // 更新位置
      watermarkElement.style.left = `${newLeft}px`;
      watermarkElement.style.top = `${newTop}px`;
      
      // 计算并更新相对位置（百分比）- 使用更稳定的计算方法
      // 这里使用图像的实际尺寸而不是容器尺寸
      const relativeX = (newLeft / displayedWidth) * 100;
      const relativeY = (newTop / displayedHeight) * 100;
      
      // 扩展相对位置范围，允许水印超出更大范围
      // 允许相对位置范围更大，使水印可以完全移到任何位置
      const boundedRelativeX = Math.max(-150, Math.min(250, relativeX)); // 允许超出范围更大
      const boundedRelativeY = Math.max(-150, Math.min(250, relativeY)); // 允许超出范围更大
      
      // 更新状态 - 使用深拷贝确保引用更新
      // 只更新相对位置，不更新缩放比例
      watermarkState.relativePosition = {
        x: boundedRelativeX,
        y: boundedRelativeY
      };
      
      // 记录拖动状态
      console.log('水印拖动中:', {
        dx, dy,
        newLeft, newTop,
        relativeX: boundedRelativeX, 
        relativeY: boundedRelativeY,
        imageSize: { width: previewWidth, height: previewHeight },
        displaySize: { width: displayedWidth, height: displayedHeight },
        watermarkSize: { width: watermarkWidth, height: watermarkHeight, scale: currentScale },
        transform: currentTransform,
        boundaries: { left: leftBoundary, top: topBoundary, right: rightBoundary, bottom: bottomBoundary }
      });
      
      // 防止选中文本
      e.preventDefault();
    }
    
    // 鼠标释放处理函数
    function handleMouseUp() {
      // 移除拖动标记
      watermarkElement.classList.remove('dragging');
      
      // 确保相对位置在扩展的有效范围内
      if (watermarkState.relativePosition) {
        watermarkState.relativePosition.x = Math.max(-150, Math.min(250, watermarkState.relativePosition.x));
        watermarkState.relativePosition.y = Math.max(-150, Math.min(250, watermarkState.relativePosition.y));
      } else {
        watermarkState.relativePosition = { x: 50, y: 50 };
      }
      
      // 保存当前的transform，以便保留缩放值
      const currentTransform = watermarkElement.style.transform || '';
      let currentScale = watermarkState.scale;
      
      // 如果当前transform中有缩放，提取它
      if (currentTransform.includes('scale')) {
        const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
        if (scaleMatch && scaleMatch[1]) {
          currentScale = parseFloat(scaleMatch[1]) || currentScale;
        }
      }
      
      // 更新状态
      updateState({ 
        isDragging: false,
        relativePosition: { ...watermarkState.relativePosition },
        scale: currentScale // 确保保留当前的缩放值
      });
      
      // 移除事件监听
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 保存当前设置
      saveCurrentImageSettings();
      
      console.log('水印拖拽结束，新位置:', {
        relativePosition: watermarkState.relativePosition,
        imageSize: { width: previewWidth, height: previewHeight },
        scale: currentScale
      });
    }
    
    // 添加事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 防止事件冒泡
    e.stopPropagation();
    e.preventDefault();
  });
}

// 初始化拖拽功能
initDragAndDrop();

// 初始化水印拖拽功能
initWatermarkDragging();

/**
 * 创建并添加缩略图到缩略图容器
 * @param {File|Object} file - 文件对象
 * @param {number} index - 文件索引
 */
function createAndAddThumbnail(file, index) {
  if (!file || typeof index !== 'number') {
    console.error('创建缩略图失败: 无效的文件或索引', file, index);
    return;
  }

  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (!thumbnailsContainer) {
    console.error('未找到缩略图容器');
    return;
  }

  const thumbnailDiv = document.createElement('div');
  thumbnailDiv.classList.add('thumbnail');
  thumbnailDiv.setAttribute('data-index', index);
  thumbnailDiv.setAttribute('title', file.name || `图片 ${index + 1}`);
  thumbnailDiv.tabIndex = 0; // 使其可聚焦，便于键盘操作

  // 设置当前索引的缩略图为"active"
  if (index === watermarkState.currentIndex) {
    thumbnailDiv.classList.add('active');
  }

  // 缩略图点击事件
  thumbnailDiv.addEventListener('click', (event) => {
    // 移除所有缩略图的"active"类
    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });

    // 将当前缩略图设为"active"
    thumbnailDiv.classList.add('active');

    // 更新当前索引
    watermarkState.currentIndex = index;
    
    // 加载图片
    loadImage(watermarkState.files[index]);
    
    // 更新文件信息
    updateFileInfo(watermarkState.files[index]);
    
    // 记录选择的图片
    logAction('选择图片', { index: index, filename: file.name || `图片 ${index + 1}` });
  });

  // 创建图像元素
  const img = document.createElement('img');
  img.classList.add('thumbnail-img');
  img.alt = file.name || `图片 ${index + 1}`;
  thumbnailDiv.appendChild(img);

  // 创建文件名标签
  const fileNameLabel = document.createElement('div');
  fileNameLabel.classList.add('thumbnail-filename');
  fileNameLabel.title = file.name || `图片 ${index + 1}`;
  fileNameLabel.textContent = file.name || `图片 ${index + 1}`;
  thumbnailDiv.appendChild(fileNameLabel);

  // 添加到容器
  thumbnailsContainer.appendChild(thumbnailDiv);

  // 如果文件已经有了blobUrl，直接设置
  if (file.blobUrl) {
    img.src = file.blobUrl;
  } else if (file instanceof File) {
    // 为文件创建缩略图
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      
      // 缓存blobUrl到文件对象
      if (!file.blobUrl) {
        file.blobUrl = e.target.result;
      }
    };
    reader.onerror = (error) => {
      console.error('读取文件失败:', error);
      img.src = 'assets/file-icon.svg';
      thumbnailDiv.classList.add('thumbnail-error');
    };
    reader.readAsDataURL(file);
  } else {
    console.error('无法创建缩略图:', file);
    img.src = 'assets/file-icon.svg';
    thumbnailDiv.classList.add('thumbnail-error');
  }

  return thumbnailDiv;
}

// 导出函数
export { 
  initDragAndDrop,
  displayFileStatistics,
  handleImageFiles,
  handleImageFiles as handleDrop,
  handleFileDrop,
  processFiles,
  createThumbnail, 
  processCurrentImage 
};