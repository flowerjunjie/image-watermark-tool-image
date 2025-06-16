/**
 * GIF水印UI集成
 * 负责将GifWatermarker类与界面元素集成
 */

// 全局变量
let gifWatermarker = null;
let currentGifFile = null;

/**
 * 初始化GIF水印处理UI
 */
function initGifWatermarkingUI() {
  console.log('初始化GIF水印UI功能');
  
  // 检查依赖
  if (typeof fabric === 'undefined') {
    loadFabricJS().then(() => {
      setupWatermarker();
      setupEventListeners();
    }).catch(err => {
      console.error('加载Fabric.js失败:', err);
      showError('加载Fabric.js库失败，无法使用GIF水印功能');
    });
  } else {
    setupWatermarker();
    setupEventListeners();
  }
}

/**
 * 加载Fabric.js库
 */
function loadFabricJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'public/libs/fabric.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Fabric.js加载成功');
      resolve();
    };
    
    script.onerror = () => {
      console.error('从本地路径加载Fabric.js失败，尝试CDN...');
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      cdnScript.async = true;
      
      cdnScript.onload = () => {
        console.log('从CDN加载Fabric.js成功');
        resolve();
      };
      
      cdnScript.onerror = (err) => {
        reject(new Error('从CDN加载Fabric.js失败'));
      };
      
      document.head.appendChild(cdnScript);
    };
    
    document.head.appendChild(script);
  });
}

/**
 * 设置水印处理器
 */
function setupWatermarker() {
  if (!window.GifWatermarker) {
    console.error('GifWatermarker类未加载');
    return;
  }
  
  gifWatermarker = new GifWatermarker({
    canvasId: 'watermark-container',
    quality: parseInt(document.getElementById('gif-quality').value || 10, 10),
    workers: 2,
    onProgress: updateProgress,
    onFinished: handleProcessingComplete,
    onError: handleProcessingError
  });
  
  console.log('GIF水印处理器初始化完成');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 检测GIF图像上传
  document.addEventListener('imageLoaded', function(e) {
    if (e.detail && e.detail.file && e.detail.file.type === 'image/gif') {
      currentGifFile = e.detail.file;
      const gifBadge = document.getElementById('gif-badge');
      if (gifBadge) gifBadge.style.display = 'block';
    }
  });
  
  // 监听水印类型变化
  const watermarkType = document.getElementById('watermark-type');
  if (watermarkType) {
    watermarkType.addEventListener('change', function(e) {
      if (e.target.value === 'image') {
        // 当选择图片水印时，确保GIF水印功能已初始化
        if (!gifWatermarker && typeof fabric !== 'undefined' && typeof window.GifWatermarker !== 'undefined') {
          setupWatermarker();
        }
      }
    });
  }
  
  // 注意：应用到所有按钮的事件处理已移至 js/main.js 中的 applyWatermarkToAll 函数
  // 这里不再单独绑定事件，避免重复处理
  
  // GIF质量滑块
  const gifQualitySlider = document.getElementById('gif-quality');
  const gifQualityValue = document.getElementById('gif-quality-value');
  if (gifQualitySlider && gifQualityValue) {
    gifQualitySlider.addEventListener('input', function() {
      gifQualityValue.textContent = this.value;
    });
  }
  
  // 监听GIF处理完成事件
  document.addEventListener('gifProcessed', function(event) {
    if (event.detail && event.detail.result) {
      const result = event.detail.result;
      console.log('GIF处理完成，更新预览');
      
      // 更新预览图像
      const previewImage = document.getElementById('preview-image');
      if (previewImage) {
        previewImage.src = result.url;
        previewImage.style.display = 'block';
      }
      
      // 显示GIF标记
      const gifBadge = document.getElementById('gif-badge');
      if (gifBadge) {
        gifBadge.style.display = 'block';
      }
      
      // 隐藏"无图像"消息
      const noImageMessage = document.getElementById('no-image-message');
      if (noImageMessage) {
        noImageMessage.style.display = 'none';
      }
    }
  });
}

/**
 * 应用水印到当前GIF
 */
function applyWatermarkToCurrentGif() {
  // 获取当前选择的GIF文件
  const currentFile = getCurrentGifFile();
  
  // 获取水印图片
  const watermarkImage = getWatermarkImage();
  
  if (!currentFile) {
    showError('请先选择一个GIF文件');
    return;
  }
  
  if (!watermarkImage) {
    showError('请先选择水印图片');
    return;
  }
  
  // 检查是否为GIF
  if (currentFile.type !== 'image/gif') {
    showStatusMessage('当前文件不是GIF，请选择GIF文件');
    return;
  }
  
  // 检查水印类型
  if (document.getElementById('watermark-type').value !== 'image') {
    showStatusMessage('GIF水印仅支持图片类型水印，请选择"图片水印"');
    return;
  }
  
  // 获取水印选项
  const options = {
    opacity: parseInt(document.getElementById('opacity').value || 50, 10) / 100,
    rotation: parseInt(document.getElementById('rotation').value || 0, 10),
    scale: parseInt(document.getElementById('watermark-image-size').value || 40, 10) / 100
  };
  
  // 处理GIF
  processGifWithWatermark(currentFile, watermarkImage, options);
}

/**
 * 处理GIF水印
 */
function processGifWithWatermark(gifFile, watermarkImage, options = {}) {
  if (!gifWatermarker) {
    if (typeof window.GifWatermarker !== 'undefined' && typeof fabric !== 'undefined') {
      setupWatermarker();
    } else {
      showError('GIF水印处理器未初始化');
      return;
    }
  }
  
  // 显示处理模态框
  const processingModal = document.getElementById('processing-modal');
  if (processingModal) processingModal.style.display = 'flex';
  
  // 更新处理状态
  updateProcessingStatus('正在解析GIF帧...');
  
  // 重置进度
  updateProgress(0);
  
  // 处理GIF
  gifWatermarker.loadGif(gifFile)
    .then(metadata => {
      console.log('GIF已成功加载:', metadata);
      updateProcessingStatus(`GIF已加载: ${metadata.width}x${metadata.height}, ${metadata.frameCount}帧`);
      
      // 如果是URL字符串，直接使用
      const watermarkSrc = typeof watermarkImage === 'string' 
        ? watermarkImage 
        : watermarkImage instanceof HTMLImageElement 
          ? watermarkImage
          : URL.createObjectURL(watermarkImage);
      
      // 获取水印位置 - 优先使用传入的位置，其次使用全局状态，最后使用默认值
      const position = (options && options.position) || 
                      (window.watermarkState && window.watermarkState.watermarkPosition) || 
                      { x: 50, y: 50 };
      
      // 转换为fabric.js坐标系统
      const fabricX = (position.x / 100) * metadata.width;
      const fabricY = (position.y / 100) * metadata.height;
      
      console.log('应用GIF水印位置:', position, '转换为坐标:', fabricX, fabricY);
      
      return gifWatermarker.setWatermark(watermarkSrc, {
        opacity: options.opacity || 0.5,
        angle: options.rotation || 0,
        left: fabricX,
        top: fabricY
      })
      .then(watermark => {
        // 如果创建了对象URL，需要释放
        if (typeof watermarkImage !== 'string' && !(watermarkImage instanceof HTMLImageElement)) {
          URL.revokeObjectURL(watermarkSrc);
        }
        
        // 应用缩放（如果提供）
        if (options.scale) {
          watermark.scale(options.scale).setCoords();
          gifWatermarker.fabricCanvas.renderAll();
        }
        
        updateProcessingStatus('正在应用水印到GIF帧...');
        
        // 从输入设置GIF质量
        const gifQuality = parseInt(document.getElementById('gif-quality').value || 10, 10);
        
        return gifWatermarker.applyWatermarkAndGenerate({
          quality: gifQuality
        });
      });
    })
    .then(blob => {
      console.log('GIF处理完成，大小:', Math.round(blob.size / 1024), 'KB');
      
      // 创建对象URL用于预览和下载
      const resultUrl = URL.createObjectURL(blob);
      
      // 更新结果
      const result = {
        blob: blob,
        url: resultUrl,
        watermarked: true,
        isGif: true,
        originalFile: gifFile,
        previewUrl: resultUrl
      };
      
      // 如果存在全局处理函数，调用它
      if (typeof window.handleProcessedImage === 'function') {
        window.handleProcessedImage(result);
      }
      
      // 触发事件用于UI更新
      const event = new CustomEvent('gifProcessed', { detail: { result } });
      document.dispatchEvent(event);
      
      // 延迟隐藏处理模态框
      setTimeout(() => {
        const processingModal = document.getElementById('processing-modal');
        if (processingModal) processingModal.style.display = 'none';
      }, 500);
      
      // 显示成功消息
      showStatusMessage('GIF水印处理完成！');
    })
    .catch(error => {
      console.error('处理GIF时出错:', error);
      handleProcessingError(error);
    });
}

/**
 * 获取当前GIF文件
 */
function getCurrentGifFile() {
  // 从应用程序状态获取当前文件
  if (window.watermarkState && window.watermarkState.files) {
    const currentIndex = window.watermarkState.currentIndex || 0;
    const currentFile = window.watermarkState.files[currentIndex];
    
    if (currentFile && currentFile.type === 'image/gif') {
      return currentFile;
    }
  }
  
  // 如果在应用状态中找不到，尝试使用保存的文件
  return currentGifFile;
}

/**
 * 获取水印图像
 */
function getWatermarkImage() {
  // 如果有水印预览图像，使用它
  const watermarkThumbnail = document.getElementById('watermark-image-thumbnail');
  if (watermarkThumbnail && watermarkThumbnail.src && watermarkThumbnail.complete) {
    return watermarkThumbnail;
  }
  
  // 否则尝试从输入中获取
  const watermarkInput = document.getElementById('watermark-image-input');
  if (watermarkInput && watermarkInput.files && watermarkInput.files.length > 0) {
    return watermarkInput.files[0];
  }
  
  return null;
}

/**
 * 更新进度指示器
 */
function updateProgress(progress) {
  const progressBar = document.getElementById('modal-progress-bar');
  const percentage = Math.round(progress * 100);
  
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage}%`;
  }
  
  // 更新GIF特定进度条
  const gifProgressBar = document.getElementById('gif-progress-bar');
  const gifProgressContainer = document.getElementById('gif-progress-container');
  
  if (gifProgressBar && gifProgressContainer) {
    gifProgressContainer.style.display = 'block';
    gifProgressBar.style.width = `${percentage}%`;
  }
}

/**
 * 更新处理状态消息
 */
function updateProcessingStatus(message) {
  const statusElement = document.getElementById('processing-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * 处理成功完成
 */
function handleProcessingComplete(blob) {
  console.log('GIF处理成功完成');
  updateProcessingStatus('处理完成！');
  
  // 隐藏GIF进度条
  const gifProgressContainer = document.getElementById('gif-progress-container');
  if (gifProgressContainer) {
    gifProgressContainer.style.display = 'none';
  }
}

/**
 * 处理错误
 */
function handleProcessingError(error) {
  console.error('GIF处理错误:', error);
  updateProcessingStatus(`处理出错: ${error.message}`);
  
  // 显示错误消息
  showError(`GIF处理错误: ${error.message}`);
  
  // 延迟隐藏处理模态框
  setTimeout(() => {
    const processingModal = document.getElementById('processing-modal');
    if (processingModal) processingModal.style.display = 'none';
  }, 2000);
}

/**
 * 显示错误消息
 */
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.innerHTML += `<p>${message}</p>`;
    errorContainer.classList.add('show');
  }
  
  showStatusMessage(message);
}

/**
 * 显示状态消息
 */
function showStatusMessage(message) {
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}

// 导出函数
window.GifWatermarkUI = {
  init: initGifWatermarkingUI,
  processGif: processGifWithWatermark,
  applyWatermarkToCurrentGif: applyWatermarkToCurrentGif
}; 