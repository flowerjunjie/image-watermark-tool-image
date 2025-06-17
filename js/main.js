/**
 * 图片水印工具主脚本
 * 负责初始化应用程序和设置基本功能
 */

// 初始化状态标志
window.watermarkInitialized = false;
window.watermarkState = {
  files: [],
  currentIndex: 0,
  watermarked: false,
  watermarkPosition: { x: 50, y: 50 },
  watermarkScale: 1
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，初始化应用...');
  
  // 初始化全局状态对象
  window.watermarkState = {
    files: [],
    currentIndex: -1,
    watermarkPosition: { x: 50, y: 50 }, // 水印位置（百分比）
    watermarkScale: 1.0, // 水印缩放比例
    history: [], // 操作历史
    historyIndex: -1 // 当前历史位置
  };
  
  // 初始化GIF水印处理
  initGifWatermarkProcessor();
  
  // 初始化上传区域
  initUploadArea();
  
  // 初始化水印类型切换
  initWatermarkTypeSwitch();
  
  // 初始化滑块控件
  initSliders();
  
  // 初始化按钮事件
  initButtons();
  
  // 初始化背景色切换
  initBackgroundColorSwitch();
  
  // 加载帮助内容
  loadHelpContent();
  
  console.log('应用初始化完成');
});

/**
 * 初始化GIF水印处理器
 */
function initGifWatermarkProcessor() {
  console.log('初始化GIF水印处理器');
  
  // 检查GifWatermarkUI是否已经初始化
  if (window.GifWatermarkUI) {
    console.log('GifWatermarkUI已存在，调用init方法');
    if (typeof window.GifWatermarkUI.init === 'function') {
      window.GifWatermarkUI.init();
    }
  } else {
    console.log('GifWatermarkUI不存在，等待脚本加载');
    // 设置一个定时器，检查GifWatermarkUI是否已加载
    const checkInterval = setInterval(() => {
      if (window.GifWatermarkUI) {
        console.log('GifWatermarkUI已加载，调用init方法');
        if (typeof window.GifWatermarkUI.init === 'function') {
          window.GifWatermarkUI.init();
        }
        clearInterval(checkInterval);
      }
    }, 500);
    
    // 超时后停止检查
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('GifWatermarkUI加载超时');
    }, 10000);
  }
  
  // 设置全局初始化标志
  window.watermarkInitialized = true;
}

/**
 * 强制刷新水印
 */
function forceRefreshWatermark() {
  console.log('强制刷新水印...');
  
  // 清除水印容器
  const watermarkContainer = document.getElementById('watermark-container');
  if (watermarkContainer) {
    watermarkContainer.innerHTML = '';
    watermarkContainer.style.display = 'flex';
    
    // 确保容器可见
    watermarkContainer.style.visibility = 'visible';
    watermarkContainer.style.opacity = '1';
  }
  
  // 应用水印
  updateWatermark();
  
  // 检查GIF标记是否显示
  const currentFile = getCurrentFile();
  if (currentFile && currentFile.type === 'image/gif') {
    const gifBadge = document.getElementById('gif-badge');
    if (gifBadge) gifBadge.style.display = 'block';
  }
}

/**
 * 初始化上传区域
 */
function initUploadArea() {
  // 使用let而不是const，这样可以重新赋值
  let uploadArea = document.getElementById('upload-area');
  let fileInput = document.getElementById('file-input');
  let folderInput = document.getElementById('folder-input');
  let uploadFilesBtn = document.getElementById('upload-files-btn');
  let uploadFolderBtn = document.getElementById('upload-folder-btn');
  
  if (uploadArea && fileInput) {
    // 清除可能存在的旧事件处理器
    const newUploadArea = uploadArea.cloneNode(true);
    uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
    uploadArea = newUploadArea;
    
    // 清除文件输入框旧事件处理器
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    fileInput = newFileInput;
    
    // 拖放处理
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      handleFiles(files);
    });
    
    uploadArea.addEventListener('click', function() {
      fileInput.click();
    });
    
    // 文件选择处理
    fileInput.addEventListener('change', function() {
      handleFiles(this.files);
    });
    
    // 上传文件按钮
    if (uploadFilesBtn) {
      // 清除旧事件处理器
      const newUploadFilesBtn = uploadFilesBtn.cloneNode(true);
      uploadFilesBtn.parentNode.replaceChild(newUploadFilesBtn, uploadFilesBtn);
      uploadFilesBtn = newUploadFilesBtn;
      
      uploadFilesBtn.addEventListener('click', function(e) {
        e.preventDefault(); // 防止事件传播
        fileInput.click();
      });
    }
    
    // 上传文件夹按钮
    if (uploadFolderBtn && folderInput) {
      // 清除旧事件处理器
      const newUploadFolderBtn = uploadFolderBtn.cloneNode(true);
      uploadFolderBtn.parentNode.replaceChild(newUploadFolderBtn, uploadFolderBtn);
      uploadFolderBtn = newUploadFolderBtn;
      
      // 清除文件夹输入框旧事件处理器
      const newFolderInput = folderInput.cloneNode(true);
      folderInput.parentNode.replaceChild(newFolderInput, folderInput);
      folderInput = newFolderInput;
      
      uploadFolderBtn.addEventListener('click', function(e) {
        e.preventDefault(); // 防止事件传播
        folderInput.click();
      });
      
      folderInput.addEventListener('change', function() {
        handleFiles(this.files);
      });
    }
  }
}

/**
 * 处理上传的文件
 */
function handleFiles(files) {
  if (!files || files.length === 0) return;
  
  console.log('处理上传文件:', files.length, '个文件');
  window.watermarkState.files = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (window.watermarkState.files.length > 0) {
    window.watermarkState.currentIndex = 0;
    showImage(0);
    updateThumbnails();
    
    // 检查是否为GIF，如果是，显示GIF标记
    const currentFile = window.watermarkState.files[0];
    if (currentFile && currentFile.type === 'image/gif') {
      const gifBadge = document.getElementById('gif-badge');
      if (gifBadge) gifBadge.style.display = 'block';
    }
  }
}

/**
 * 显示选定的图像
 */
function showImage(index) {
  if (!window.watermarkState.files || index < 0 || index >= window.watermarkState.files.length) return;
  
  const file = window.watermarkState.files[index];
  window.watermarkState.currentIndex = index;
  
  const previewImage = document.getElementById('preview-image');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  
  if (previewImage && noImageMessage) {
    const fileUrl = URL.createObjectURL(file);
    previewImage.src = fileUrl;
    previewImage.style.display = 'block';
    noImageMessage.style.display = 'none';
    
    // 检查是否为GIF
    if (file.type === 'image/gif') {
      if (gifBadge) gifBadge.style.display = 'block';
    } else {
      if (gifBadge) gifBadge.style.display = 'none';
    }
    
    // 不再重置水印位置，保持当前位置
    // resetWatermark(); // 注释掉这行，不再重置水印位置
    
    // 触发图像加载事件
    previewImage.onload = function() {
      // 加载完成后立即应用水印
      // 触发自定义事件，通知其他组件图像已加载
      const event = new CustomEvent('imageLoaded', { 
        detail: { 
          file: file, 
          url: fileUrl,
          index: index,
          width: this.naturalWidth,
          height: this.naturalHeight
        } 
      });
      document.dispatchEvent(event);
      
      // 确保在图像加载完成后应用水印
      setTimeout(function() {
        updateWatermark();
        
        // 调整所有水印元素的边界
        const watermarkContainer = document.getElementById('watermark-container');
        if (watermarkContainer) {
          const watermarks = watermarkContainer.querySelectorAll('.watermark');
          watermarks.forEach(function(watermark) {
            adjustWatermarkBounds(watermark, watermarkContainer);
          });
        }
      }, 200);
    };
  }
}

/**
 * 更新缩略图
 */
function updateThumbnails() {
  const thumbnailsContainer = document.getElementById('thumbnails-container');
  if (!thumbnailsContainer) return;
  
  thumbnailsContainer.innerHTML = '';
  thumbnailsContainer.style.display = 'flex';
  
  if (!window.watermarkState.files || window.watermarkState.files.length === 0) {
    thumbnailsContainer.style.display = 'none';
    return;
  }
  
  window.watermarkState.files.forEach((file, index) => {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    if (index === window.watermarkState.currentIndex) {
      thumbnail.classList.add('active');
    }
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = `Thumbnail ${index + 1}`;
    
    thumbnail.appendChild(img);
    thumbnail.addEventListener('click', () => {
      // 在切换图片前保存当前水印位置
      const watermarkElement = document.querySelector('#watermark-container .watermark');
      if (watermarkElement) {
        saveCurrentWatermarkPosition(watermarkElement);
      }
      
      // 显示新图片
      showImage(index);
      document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove('active'));
      thumbnail.classList.add('active');
    });
    
    thumbnailsContainer.appendChild(thumbnail);
  });
}

/**
 * 初始化水印类型切换
 */
function initWatermarkTypeSwitch() {
  const watermarkType = document.getElementById('watermark-type');
  const textOptions = document.getElementById('text-options');
  const tiledOptions = document.getElementById('tiled-options');
  const imageOptions = document.getElementById('image-options');
  
  if (watermarkType && textOptions && tiledOptions && imageOptions) {
    watermarkType.addEventListener('change', function() {
      const value = this.value;
      
      // 隐藏所有选项
      textOptions.style.display = 'none';
      tiledOptions.style.display = 'none';
      imageOptions.style.display = 'none';
      
      // 显示选中的选项
      switch (value) {
        case 'text':
          textOptions.style.display = 'block';
          break;
        case 'tiled':
          tiledOptions.style.display = 'block';
          textOptions.style.display = 'block'; // 平铺水印依然需要文字
          break;
        case 'image':
          imageOptions.style.display = 'block';
          break;
      }
      
      // 更新水印
      updateWatermark();
    });
    
    // 初始化水印图片上传区域
    const watermarkImageArea = document.getElementById('watermark-image-area');
    const watermarkImageInput = document.getElementById('watermark-image-input');
    const watermarkImagePreview = document.getElementById('watermark-image-preview');
    const watermarkImageThumbnail = document.getElementById('watermark-image-thumbnail');
    const removeWatermarkImage = document.getElementById('remove-watermark-image');
    
    if (watermarkImageArea && watermarkImageInput && watermarkImagePreview && watermarkImageThumbnail && removeWatermarkImage) {
      // 拖放处理
      watermarkImageArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
      });
      
      watermarkImageArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
      });
      
      watermarkImageArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          handleWatermarkImage(files[0]);
        }
      });
      
      watermarkImageArea.addEventListener('click', function() {
        watermarkImageInput.click();
      });
      
      // 文件选择处理
      watermarkImageInput.addEventListener('change', function() {
        if (this.files.length > 0) {
          handleWatermarkImage(this.files[0]);
        }
      });
      
      // 移除水印图片
      removeWatermarkImage.addEventListener('click', function() {
        watermarkImagePreview.style.display = 'none';
        watermarkImageThumbnail.src = '';
        watermarkImageArea.style.display = 'block';
        updateWatermark();
      });
      
      // 处理水印图片
      function handleWatermarkImage(file) {
        const fileUrl = URL.createObjectURL(file);
        watermarkImageThumbnail.src = fileUrl;
        watermarkImagePreview.style.display = 'block';
        watermarkImageArea.style.display = 'none';
        
        // 图片加载完成后更新水印
        watermarkImageThumbnail.onload = function() {
          console.log('水印图片加载完成，更新水印');
          updateWatermark();
        };
        
        // 额外的保险措施，确保水印更新
        setTimeout(function() {
          updateWatermark();
        }, 200);
      }
    }
  }
}

/**
 * 初始化滑块控制
 */
function initSliders() {
  // 字体大小滑块
  initSlider('font-size', 'font-size-value', '', value => {
    document.getElementById('font-size-input').value = value;
    updateWatermark();
  });
  
  // 不透明度滑块
  initSlider('opacity', 'opacity-value', '%', value => {
    document.getElementById('opacity-input').value = value;
    updateWatermark();
  });
  
  // 旋转角度滑块
  initSlider('rotation', 'rotation-value', '°', value => {
    document.getElementById('rotation-input').value = value;
    updateWatermark();
  });
  
  // 平铺间距滑块
  initSlider('tile-spacing', 'tile-spacing-value', 'px', updateWatermark);
  
  // 图片质量滑块
  initSlider('image-quality', 'image-quality-value', '%');
  
  // 水印图片大小滑块
  initSlider('watermark-image-size', 'watermark-image-size-value', '%', updateWatermark);
  
  // GIF质量滑块
  initSlider('gif-quality', 'gif-quality-value', '');
  
  // 初始化数值输入框
  initNumberInput('font-size');
  initNumberInput('opacity');
  initNumberInput('rotation');
}

/**
 * 初始化单个滑块
 */
function initSlider(sliderId, valueId, unit, callback) {
  const slider = document.getElementById(sliderId);
  const valueDisplay = document.getElementById(valueId);
  
  if (slider && valueDisplay) {
    slider.addEventListener('input', function() {
      valueDisplay.textContent = this.value + unit;
      if (typeof callback === 'function') {
        callback(this.value);
      }
    });
  }
}

/**
 * 初始化数值输入框
 */
function initNumberInput(baseName) {
  const slider = document.getElementById(baseName);
  const input = document.getElementById(baseName + '-input');
  const decrease = document.getElementById(baseName + '-decrease');
  const increase = document.getElementById(baseName + '-increase');
  
  if (slider && input && decrease && increase) {
    // 输入框变化同步到滑块
    input.addEventListener('change', function() {
      let value = parseInt(this.value);
      const min = parseInt(this.min);
      const max = parseInt(this.max);
      
      if (isNaN(value)) value = parseInt(slider.value);
      if (value < min) value = min;
      if (value > max) value = max;
      
      this.value = value;
      slider.value = value;
      const event = new Event('input');
      slider.dispatchEvent(event);
    });
    
    // 减少按钮
    decrease.addEventListener('click', function() {
      let value = parseInt(input.value) - 1;
      const min = parseInt(input.min);
      if (value < min) value = min;
      
      input.value = value;
      slider.value = value;
      const event = new Event('input');
      slider.dispatchEvent(event);
    });
    
    // 增加按钮
    increase.addEventListener('click', function() {
      let value = parseInt(input.value) + 1;
      const max = parseInt(input.max);
      if (value > max) value = max;
      
      input.value = value;
      slider.value = value;
      const event = new Event('input');
      slider.dispatchEvent(event);
    });
  }
}

/**
 * 初始化按钮事件
 */
function initButtons() {
  // 下载单张图片按钮
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadImage);
  }
  
  // 批量下载按钮
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  if (batchDownloadBtn) {
    batchDownloadBtn.addEventListener('click', batchDownload);
  }
  
  // 应用到所有按钮
  const applyToAllBtn = document.getElementById('apply-to-all-btn');
  if (applyToAllBtn) {
    // 移除可能存在的旧事件监听器
    const newApplyToAllBtn = applyToAllBtn.cloneNode(true);
    applyToAllBtn.parentNode.replaceChild(newApplyToAllBtn, applyToAllBtn);
    
    // 添加新的事件监听器
    newApplyToAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 先保存当前水印位置
      saveCurrentWatermarkPosition();
      
      // 然后应用到所有
      applyWatermarkToAll();
    });
  }
  
  // 帮助按钮
  const helpButton = document.getElementById('help-button');
  const helpModal = document.getElementById('help-modal');
  const closeButton = helpModal ? helpModal.querySelector('.close-button') : null;
  
  if (helpButton && helpModal && closeButton) {
    helpButton.addEventListener('click', () => {
      // 动态加载帮助内容
      loadHelpContent();
      helpModal.style.display = 'flex';
    });
    
    closeButton.addEventListener('click', () => {
      helpModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.style.display = 'none';
      }
    });
  }
}

/**
 * 更新水印
 */
function updateWatermark() {
  console.log('更新水印');
  // 获取水印容器
  const watermarkContainer = document.getElementById('watermark-container');
  
  if (!watermarkContainer) {
    console.error('找不到水印容器');
    return;
  }
  
  // 清空水印容器
  watermarkContainer.innerHTML = '';
  
  // 获取水印类型
  const watermarkType = document.getElementById('watermark-type').value;
  console.log('水印类型:', watermarkType);
  
  // 获取水印参数
  const text = document.getElementById('watermark-text').value;
  const fontSize = parseInt(document.getElementById('font-size').value);
  const opacity = parseInt(document.getElementById('opacity').value) / 100;
  const rotation = parseInt(document.getElementById('rotation').value);
  const color = document.getElementById('color').value;
  
  // 获取水印缩放模式
  const scaleMode = document.querySelector('input[name="scale-mode"]:checked').value;
  let scale = 1;
  
  // 如果是相对模式，获取比例
  if (scaleMode === 'relative') {
    scale = parseInt(document.getElementById('scale-ratio-value').value) / 100;
  }
  
  // 创建水印元素
  let watermarkElement;
  
  console.log('应用水印参数:',
    '类型:', watermarkType,
    '文本:', text,
    '字体大小:', fontSize,
    '透明度:', opacity,
    '旋转:', rotation,
    '颜色:', color,
    '缩放模式:', scaleMode,
    '缩放比例:', scale
  );
  
  switch (watermarkType) {
    case 'text':
      // 创建文字水印
      watermarkElement = createTextWatermark(text, fontSize, color, opacity, rotation, watermarkContainer);
      break;
    case 'tiled':
      // 获取平铺间距
      const tileSpacing = document.getElementById('tile-spacing').value;
      
      // 创建平铺水印
      watermarkElement = createTiledWatermark(text, fontSize, color, opacity, rotation, tileSpacing, watermarkContainer);
      break;
    case 'image':
      // 获取水印图片
      const watermarkImage = document.getElementById('watermark-image-thumbnail');
      
      // 获取图片大小
      const imageSize = document.getElementById('watermark-image-size').value;
      
      // 检查是否有水印图片
      if (watermarkImage && watermarkImage.src) {
        // 创建图片水印
        watermarkElement = createImageWatermark(watermarkImage.src, imageSize, opacity, rotation, watermarkContainer);
      }
      break;
  }
  
  // 如果创建了水印元素，使其可拖动
  if (watermarkElement) {
    console.log('水印元素已创建，应用交互功能');
    // 使水印可拖动
    makeDraggable(watermarkElement);
    
    // 使水印可缩放（鼠标滚轮）
    addWheelScaling(watermarkElement);
    
    // 恢复之前保存的位置
    const savedPosition = window.watermarkState.watermarkPosition;
    if (savedPosition) {
      console.log('恢复水印位置:', savedPosition);
      // 计算像素位置
      const container = watermarkElement.parentElement;
      const left = (savedPosition.x / 100) * container.offsetWidth;
      const top = (savedPosition.y / 100) * container.offsetHeight;
      
      // 应用位置
      watermarkElement.style.left = left + 'px';
      watermarkElement.style.top = top + 'px';
    }
    
    // 应用缩放
    watermarkElement.dataset.scale = scaleMode === 'relative' ? scale : 1.0;
    
    // 添加debug-id属性以便于调试
    watermarkElement.dataset.debugId = 'watermark-' + Date.now();
    console.log('水印元素ID:', watermarkElement.dataset.debugId);
    
    // 记录水印创建成功
    window.watermarkUpdateSuccess = true;
  } else {
    console.warn('未能创建水印元素');
    window.watermarkUpdateSuccess = false;
  }
  
  // 触发水印更新事件
  const updateEvent = new CustomEvent('watermarkUpdated', { 
    detail: { 
      type: watermarkType,
      success: !!watermarkElement 
    } 
  });
  document.dispatchEvent(updateEvent);
  
  return watermarkElement;
}

/**
 * 创建文字水印
 */
function createTextWatermark(text, fontSize, color, opacity, rotation, container) {
  const watermark = document.createElement('div');
  watermark.className = 'watermark text-watermark';
  watermark.textContent = text;
  
  // 获取当前预览图片和容器尺寸
  const previewImage = document.getElementById('preview-image');
  const containerRect = container.getBoundingClientRect();
  
  // 计算图片实际显示尺寸
  let imgWidth = containerRect.width;
  let imgHeight = containerRect.height;
  let imgLeft = 0;
  let imgTop = 0;
  
  if (previewImage && previewImage.complete) {
    // 获取图片实际显示尺寸
    const imgRect = previewImage.getBoundingClientRect();
    imgWidth = imgRect.width;
    imgHeight = imgRect.height;
    imgLeft = imgRect.left - containerRect.left;
    imgTop = imgRect.top - containerRect.top;
    
    // 计算缩放比例
    const scaleRatio = Math.min(
      imgWidth / previewImage.naturalWidth,
      imgHeight / previewImage.naturalHeight
    );
    
    // 获取用户设置的缩放比例（如果有）
    const userScale = window.watermarkState.watermarkScale || 1.0;
    
    // 根据图片缩放比例和用户缩放调整字体大小
    const scaledFontSize = Math.max(12, Math.round(fontSize * scaleRatio * userScale));
    watermark.style.fontSize = `${scaledFontSize}px`;
    
    // 保存原始字体大小和缩放比例，用于后续调整
    watermark.dataset.originalFontSize = fontSize;
    watermark.dataset.scaleRatio = scaleRatio;
    watermark.dataset.scale = userScale;
  } else {
    watermark.style.fontSize = `${fontSize}px`;
    watermark.dataset.originalFontSize = fontSize;
    watermark.dataset.scale = '1.0';
  }
  
  watermark.style.color = color;
  watermark.style.opacity = opacity;
  
  // 获取保存的位置或使用默认位置（相对于图片的百分比）
  const position = window.watermarkState.watermarkPosition || { x: 50, y: 50 };
  
  // 转换为相对于图片的实际像素位置
  const pixelX = imgLeft + (position.x / 100) * imgWidth;
  const pixelY = imgTop + (position.y / 100) * imgHeight;
  
  // 转换为相对于容器的百分比位置
  const containerX = (pixelX / containerRect.width) * 100;
  const containerY = (pixelY / containerRect.height) * 100;
  
  // 设置位置（百分比）
  watermark.style.position = 'absolute';
  watermark.style.left = `${containerX}%`;
  watermark.style.top = `${containerY}%`;
  watermark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  watermark.style.pointerEvents = 'auto';
  watermark.style.cursor = 'move';
  
  // 确保水印不超出边界
  watermark.style.maxWidth = '80%';
  watermark.style.maxHeight = '80%';
  watermark.style.overflow = 'visible';
  watermark.style.whiteSpace = 'nowrap';
  
  console.log('应用水印位置:', position, '转换为容器位置:', { x: containerX, y: containerY });
  
  // 使水印可拖动
  makeDraggable(watermark);
  
  // 添加鼠标滚轮缩放功能
  addWheelScaling(watermark);
  
  container.appendChild(watermark);
  
  // 确保水印在图片边界内
  setTimeout(() => {
    adjustWatermarkBounds(watermark, container);
  }, 50);
}

/**
 * 创建平铺水印
 */
function createTiledWatermark(text, fontSize, color, opacity, rotation, spacing, container) {
  // 创建平铺水印的实现...
  const tiledContainer = document.createElement('div');
  tiledContainer.className = 'watermark tiled-watermark-container';
  tiledContainer.style.position = 'absolute';
  tiledContainer.style.opacity = opacity;
  
  // 获取当前预览图片和容器尺寸
  const previewImage = document.getElementById('preview-image');
  const containerRect = container.getBoundingClientRect();
  
  // 计算图片实际显示尺寸和缩放比例
  let scaleRatio = 1;
  let imgWidth = containerRect.width;
  let imgHeight = containerRect.height;
  let imgLeft = 0;
  let imgTop = 0;
  
  if (previewImage && previewImage.complete) {
    // 获取图片实际显示尺寸
    const imgRect = previewImage.getBoundingClientRect();
    imgWidth = imgRect.width;
    imgHeight = imgRect.height;
    imgLeft = imgRect.left - containerRect.left;
    imgTop = imgRect.top - containerRect.top;
    
    // 计算缩放比例
    scaleRatio = Math.min(
      imgWidth / previewImage.naturalWidth,
      imgHeight / previewImage.naturalHeight
    );
    
    // 获取用户设置的缩放比例（如果有）
    const userScale = window.watermarkState.watermarkScale || 1.0;
    
    // 根据图片缩放比例和用户缩放调整字体大小和间距
    fontSize = Math.max(12, Math.round(fontSize * scaleRatio * userScale));
    spacing = Math.max(50, Math.round(parseInt(spacing) * scaleRatio * userScale));
    
    // 调整容器大小为图片大小
    tiledContainer.style.width = `${imgWidth}px`;
    tiledContainer.style.height = `${imgHeight}px`;
    tiledContainer.style.left = `${imgLeft}px`;
    tiledContainer.style.top = `${imgTop}px`;
    
    // 保存用户缩放
    tiledContainer.dataset.scale = userScale;
  } else {
    tiledContainer.style.width = '100%';
    tiledContainer.style.height = '100%';
    tiledContainer.style.left = '0';
    tiledContainer.style.top = '0';
    tiledContainer.dataset.scale = '1.0';
  }
  
  // 保存缩放比例，用于后续调整
  tiledContainer.dataset.scaleRatio = scaleRatio;
  tiledContainer.dataset.originalFontSize = fontSize;
  tiledContainer.dataset.originalSpacing = spacing;
  
  // 获取保存的位置或使用默认位置
  const position = window.watermarkState.watermarkPosition || { x: 50, y: 50 };
  
  console.log('应用平铺水印位置:', position, '缩放比例:', scaleRatio);
  
  // 计算网格大小和偏移
  const gridSize = Math.max(3, Math.ceil(Math.max(imgWidth, imgHeight) / spacing) + 1);
  const offsetX = (position.x / 100) * imgWidth - imgWidth / 2;
  const offsetY = (position.y / 100) * imgHeight - imgHeight / 2;
  
  // 创建水印网格
  const halfGrid = Math.floor(gridSize / 2);
  for (let row = -halfGrid; row <= halfGrid; row++) {
    for (let col = -halfGrid; col <= halfGrid; col++) {
      const watermark = document.createElement('div');
      watermark.className = 'watermark tiled-watermark-item';
      watermark.textContent = text;
      watermark.style.fontSize = `${fontSize}px`;
      watermark.style.color = color;
      watermark.style.position = 'absolute';
      
      // 计算基础位置（相对于容器中心）
      const baseX = col * spacing;
      const baseY = row * spacing;
      
      // 应用位置偏移（相对于图片中心）
      const finalX = imgWidth / 2 + baseX + offsetX;
      const finalY = imgHeight / 2 + baseY + offsetY;
      
      // 设置位置
      watermark.style.left = `${finalX}px`;
      watermark.style.top = `${finalY}px`;
      watermark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      
      // 只添加在图片范围内的水印
      if (finalX >= 0 && finalX <= imgWidth && finalY >= 0 && finalY <= imgHeight) {
        tiledContainer.appendChild(watermark);
      }
    }
  }
  
  // 使整个平铺容器可拖动
  tiledContainer.style.pointerEvents = 'auto';
  tiledContainer.style.cursor = 'move';
  makeDraggable(tiledContainer);
  
  // 添加鼠标滚轮缩放功能
  addWheelScaling(tiledContainer);
  
  container.appendChild(tiledContainer);
  
  // 确保水印在图片边界内
  setTimeout(() => {
    adjustWatermarkBounds(tiledContainer, container);
  }, 50);
}

/**
 * 创建图片水印
 */
function createImageWatermark(src, size, opacity, rotation, container) {
  const watermark = document.createElement('img');
  watermark.className = 'watermark image-watermark';
  watermark.src = src;
  
  // 获取当前预览图片和容器尺寸
  const previewImage = document.getElementById('preview-image');
  const containerRect = container.getBoundingClientRect();
  
  // 计算图片实际显示尺寸和缩放比例
  let scaleRatio = 1;
  let imgWidth = containerRect.width;
  let imgHeight = containerRect.height;
  let imgLeft = 0;
  let imgTop = 0;
  
  if (previewImage && previewImage.complete) {
    // 获取图片实际显示尺寸
    const imgRect = previewImage.getBoundingClientRect();
    imgWidth = imgRect.width;
    imgHeight = imgRect.height;
    imgLeft = imgRect.left - containerRect.left;
    imgTop = imgRect.top - containerRect.top;
    
    // 计算缩放比例
    scaleRatio = Math.min(
      imgWidth / previewImage.naturalWidth,
      imgHeight / previewImage.naturalHeight
    );
    
    // 保存缩放比例，用于后续调整
    watermark.dataset.scaleRatio = scaleRatio;
  }
  
  // 获取用户设置的缩放比例（如果有）
  const userScale = window.watermarkState.watermarkScale || 1.0;
  const scaledSize = size * userScale;
  
  // 设置水印大小，考虑图片缩放比例和用户缩放
  watermark.style.maxWidth = `${scaledSize}%`;
  watermark.style.maxHeight = `${scaledSize}%`;
  watermark.style.opacity = opacity;
  
  // 保存原始尺寸和用户缩放，用于后续调整
  watermark.dataset.originalSize = size;
  watermark.dataset.scale = userScale;
  
  // 获取保存的位置或使用默认位置（相对于图片的百分比）
  const position = window.watermarkState.watermarkPosition || { x: 50, y: 50 };
  
  // 转换为相对于图片的实际像素位置
  const pixelX = imgLeft + (position.x / 100) * imgWidth;
  const pixelY = imgTop + (position.y / 100) * imgHeight;
  
  // 转换为相对于容器的百分比位置
  const containerX = (pixelX / containerRect.width) * 100;
  const containerY = (pixelY / containerRect.height) * 100;
  
  // 设置位置（百分比）
  watermark.style.position = 'absolute';
  watermark.style.left = `${containerX}%`;
  watermark.style.top = `${containerY}%`;
  watermark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  watermark.style.pointerEvents = 'auto';
  watermark.style.cursor = 'move';
  watermark.draggable = false; // 禁用默认拖动行为
  
  // 确保水印不超出边界
  watermark.style.maxWidth = `${Math.min(80, scaledSize)}%`;
  watermark.style.maxHeight = `${Math.min(80, scaledSize)}%`;
  
  console.log('应用图片水印位置:', position, '转换为容器位置:', { x: containerX, y: containerY }, '缩放比例:', scaleRatio, '用户缩放:', userScale);
  
  // 使水印可拖动
  makeDraggable(watermark);
  
  // 添加鼠标滚轮缩放功能
  addWheelScaling(watermark);
  
  container.appendChild(watermark);
  
  // 水印图片加载完成后，根据实际尺寸调整
  watermark.onload = function() {
    adjustWatermarkBounds(watermark, container);
  };
}

/**
 * 使元素可拖动
 */
function makeDraggable(element) {
  let offsetX, offsetY, isDragging = false;
  
  element.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isDragging = true;
    
    // 获取鼠标在元素内的相对位置
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // 添加鼠标移动和释放事件监听器
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', releaseHandler);
  });
  
  function moveHandler(e) {
    if (isDragging) {
      // 计算新位置
      const container = element.parentElement;
      const containerRect = container.getBoundingClientRect();
      
      // 获取预览图片
      const previewImage = document.getElementById('preview-image');
      const imgRect = previewImage && previewImage.complete ? previewImage.getBoundingClientRect() : containerRect;
      
      // 计算图片边界（相对于容器）
      const imgBounds = {
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        right: imgRect.right - containerRect.left,
        bottom: imgRect.bottom - containerRect.top,
        width: imgRect.width,
        height: imgRect.height
      };
      
      // 获取水印元素尺寸
      const elementRect = element.getBoundingClientRect();
      const elementWidth = elementRect.width;
      const elementHeight = elementRect.height;
      
      // 计算鼠标位置（相对于容器）
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // 计算元素中心位置
      let centerX = mouseX - offsetX + elementWidth / 2;
      let centerY = mouseY - offsetY + elementHeight / 2;
      
      // 将位置约束在图片边界内
      if (previewImage && previewImage.complete) {
        // 计算边界限制
        const minX = imgBounds.left + elementWidth / 2;
        const maxX = imgBounds.right - elementWidth / 2;
        const minY = imgBounds.top + elementHeight / 2;
        const maxY = imgBounds.bottom - elementHeight / 2;
        
        // 应用边界限制
        centerX = Math.max(minX, Math.min(maxX, centerX));
        centerY = Math.max(minY, Math.min(maxY, centerY));
      }
      
      // 转换为百分比位置
      const relativeX = (centerX / containerRect.width) * 100;
      const relativeY = (centerY / containerRect.height) * 100;
      
      // 设置元素位置（百分比）
      element.style.left = `${relativeX}%`;
      element.style.top = `${relativeY}%`;
      element.style.transform = `translate(-50%, -50%) rotate(${document.getElementById('rotation').value}deg)`;
      
      // 实时更新全局状态
      window.watermarkState.watermarkPosition = {
        x: Math.max(0, Math.min(100, relativeX)),
        y: Math.max(0, Math.min(100, relativeY))
      };
    }
  }
  
  function releaseHandler() {
    isDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', releaseHandler);
    
    // 调整水印边界，确保不超出图片
    const container = element.parentElement;
    if (container) {
      // 应用边界调整
      adjustWatermarkBounds(element, container);
      
      // 保存当前水印位置到全局状态
      saveCurrentWatermarkPosition(element);
      
      // 获取最终位置
      const position = window.watermarkState.watermarkPosition;
      console.log('最终水印位置:', position);
    }
  }
}

/**
 * 重置水印位置
 */
function resetWatermark() {
  window.watermarkState.watermarkPosition = { x: 50, y: 50 };
  window.watermarkState.watermarkScale = 1;
  console.log('重置水印位置');
}

/**
 * 初始化背景色切换
 */
function initBackgroundColorSwitch() {
  const bgColorButtons = document.querySelectorAll('.bg-color-button');
  const previewContainer = document.getElementById('preview-container');
  
  if (bgColorButtons && previewContainer) {
    bgColorButtons.forEach(button => {
      button.addEventListener('click', function() {
        // 移除所有激活状态
        bgColorButtons.forEach(btn => btn.classList.remove('active'));
        // 添加当前按钮激活状态
        this.classList.add('active');
        // 更改预览区背景色
        const color = this.getAttribute('data-color');
        if (color) {
          previewContainer.style.backgroundColor = color;
        }
      });
    });
  }
}

/**
 * 下载单张图片
 */
function downloadImage() {
  console.log('下载单张图片');
  const currentFile = getCurrentFile();
  if (!currentFile) {
    showStatusMessage('请先上传图片');
    return;
  }
  
  // 检查是否为GIF文件
  const isGif = currentFile.type === 'image/gif' || 
                currentFile.name.toLowerCase().endsWith('.gif');
  
  // 显示处理中状态
  showStatusMessage('处理中...');
  
  // 显示处理模态框
  const processingModal = document.getElementById('processing-modal');
  const modalProgressBar = document.getElementById('modal-progress-bar');
  const processingStatus = document.getElementById('processing-status');
  
  if (processingModal && modalProgressBar) {
    processingModal.style.display = 'flex';
    modalProgressBar.style.width = '0%';
    modalProgressBar.textContent = '0%';
    processingStatus.textContent = isGif ? '正在处理GIF动图...' : '正在处理图片...';
  }
  
  // 如果是GIF文件，使用专门的GIF处理方法
  if (isGif) {
    // 检查水印类型是否为图片水印
    if (document.getElementById('watermark-type').value !== 'image') {
      showStatusMessage('GIF水印仅支持图片类型水印，请选择"图片水印"');
      
      // 隐藏处理模态框
      if (processingModal) {
        processingModal.style.display = 'none';
      }
      
      return;
    }
    
    // 检查是否有水印图片
    const watermarkImage = document.getElementById('watermark-image-thumbnail');
    if (!watermarkImage || !watermarkImage.src || watermarkImage.src === '') {
      showStatusMessage('请先选择水印图片');
    
      // 隐藏处理模态框
      if (processingModal) {
        processingModal.style.display = 'none';
      }
      
      return;
      }
    
    // 使用GifWatermarkUI模块处理GIF水印
    if (window.GifWatermarkUI && typeof window.GifWatermarkUI.processGif === 'function') {
      // 获取水印选项
      const watermarkOptions = {
        opacity: parseInt(document.getElementById('opacity').value || 50, 10) / 100,
        rotation: parseInt(document.getElementById('rotation').value || 0, 10),
        scale: parseInt(document.getElementById('watermark-image-size').value || 40, 10) / 100,
        position: window.watermarkState.watermarkPosition || { x: 50, y: 50 },
        imageElement: watermarkImage
      };
        
      // 处理GIF，使用Promise API
      window.GifWatermarkUI.processGif(currentFile, watermarkOptions)
        .then(result => {
          if (!result || !result.file) {
            throw new Error('GIF处理失败');
          }
          
          console.log('GIF处理成功:', result);
        
        // 隐藏处理模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
        // 创建下载链接
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(result.file);
          downloadLink.download = result.file.name;
        
        // 触发下载
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        
          // 更新图片预览，显示第一帧
          if (result.previewUrl && previewImage) {
            previewImage.src = result.previewUrl;
          }
          
          // 修改GIF标记的显示
          const gifBadge = document.getElementById('gif-badge');
          if (gifBadge) {
            gifBadge.style.display = 'block';
          }
          
          showStatusMessage('GIF下载成功');
      })
      .catch(error => {
          console.error('GIF处理失败:', error);
        
        // 隐藏处理模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
          showStatusMessage('GIF处理失败: ' + error.message);
      });
    } else {
      showStatusMessage('GIF水印处理模块未加载');
      
      // 隐藏处理模态框
      if (processingModal) {
        processingModal.style.display = 'none';
      }
    }
    
    return;
  }
  
  // 非GIF文件使用原来的方法
  // 获取预览图片元素
  const previewImage = document.getElementById('preview-image');
  if (!previewImage || !previewImage.complete) {
    showStatusMessage('图片尚未加载完成，请稍后再试');
    return;
  }
  
  // 创建一个画布来绘制带水印的图片
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 设置画布尺寸为原始图片尺寸
  canvas.width = previewImage.naturalWidth;
  canvas.height = previewImage.naturalHeight;
  
  // 绘制图片
  ctx.drawImage(previewImage, 0, 0, canvas.width, canvas.height);
  
  // 获取水印容器
  const watermarkContainer = document.getElementById('watermark-container');
  
  // 如果水印容器存在，获取其中的水印元素
  if (watermarkContainer && watermarkContainer.children.length > 0) {
    // 获取当前水印类型
    const watermarkType = document.getElementById('watermark-type').value;
    
    // 获取水印选项
    const watermarkOptions = {
      type: watermarkType,
      text: document.getElementById('watermark-text').value,
      fontSize: document.getElementById('font-size').value,
      opacity: document.getElementById('opacity').value / 100,
      rotation: document.getElementById('rotation').value,
      color: document.getElementById('color').value,
      tileSpacing: document.getElementById('tile-spacing').value,
      imageSize: document.getElementById('watermark-image-size').value,
      watermarkImage: document.getElementById('watermark-image-thumbnail').src || null,
      position: window.watermarkState.watermarkPosition || { x: 50, y: 50 },
      scale: window.watermarkState.watermarkScale || 1
    };
    
      // 创建与预览完全一致的水印选项副本
  const previewWatermarkOptions = JSON.parse(JSON.stringify(watermarkOptions));
  
  // 应用水印到画布，确保与预览一致
  applyWatermarkToCanvas(ctx, canvas.width, canvas.height, previewWatermarkOptions);
  }
  
  // 隐藏处理模态框
  if (processingModal) {
    processingModal.style.display = 'none';
  }
  
  // 创建下载链接
  try {
    // 确定文件类型和扩展名
    let mimeType = 'image/jpeg';
    let fileExtension = '.jpg';
    
    if (currentFile.type === 'image/png') {
      mimeType = 'image/png';
      fileExtension = '.png';
    } else if (currentFile.type === 'image/webp') {
      mimeType = 'image/webp';
      fileExtension = '.webp';
    }
    
    // 获取图片质量设置
    const imageQuality = parseFloat(document.getElementById('image-quality').value) / 100;
    
    // 转换为数据URL
    const dataURL = canvas.toDataURL(mimeType, imageQuality);
    
    // 创建下载链接
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    
    // 生成文件名
    const originalName = currentFile.name;
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    downloadLink.download = `${baseName}_watermarked${fileExtension}`;
    
    // 触发下载
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showStatusMessage('图片下载成功');
  } catch (error) {
    console.error('下载图片失败:', error);
    showStatusMessage('下载失败: ' + error.message);
  }
}

/**
 * 批量下载图片
 */
function batchDownload() {
  console.log('开始批量下载...');
  
  // 检查是否有图片
  if (!window.watermarkState.files || window.watermarkState.files.length === 0) {
    showStatusMessage('请先上传图片');
    return;
  }
  
  // 创建一个新的JSZip实例
  const zip = new JSZip();
  
  // 获取水印设置
  const watermarkSettings = getWatermarkSettings();
  if (!watermarkSettings) {
    showStatusMessage('无法获取水印设置');
    return;
  }
  
  // 保存当前水印位置和缩放比例
  const watermarkElement = document.querySelector('#watermark-container .watermark');
  if (watermarkElement) {
    saveCurrentWatermarkPosition(watermarkElement);
  }
  
  // 显示处理模态框
  const processingModal = document.getElementById('processing-modal');
  if (processingModal) {
    processingModal.style.display = 'flex';
  }
  
  // 获取进度条和状态元素
  const modalProgressBar = document.getElementById('modal-progress-bar');
  const processingStatus = document.getElementById('processing-status');
  
  // 创建用于存储处理后文件和错误文件的数组
  const processedFiles = [];
  const errorFiles = [];
  
  // 获取图片质量
  const imageQuality = parseInt(document.getElementById('image-quality').value) / 100;
  
  // 跟踪处理进度
  let processedCount = 0;
  let totalCount = window.watermarkState.files.length;
  
  // 更新进度条的函数
  const updateProgress = () => {
    processedCount++;
    
    const percent = Math.round((processedCount / totalCount) * 100);
    console.log(`处理进度: ${percent}% (${processedCount}/${totalCount})`);
    
    // 更新模态框进度条
    if (modalProgressBar) {
      modalProgressBar.style.width = `${percent}%`;
      modalProgressBar.textContent = `${percent}%`;
    }
    
    // 更新处理状态
    if (processingStatus) {
      processingStatus.textContent = `处理中... (${processedCount}/${totalCount})`;
    }
    
    // 如果所有图片都已处理，生成并下载zip文件
    if (processedCount >= totalCount) {
      console.log('所有图片处理完成，准备打包下载');
      
      try {
        // 检查是否有处理成功的文件
        if (processedFiles.length === 0) {
          console.warn('没有成功处理的文件');
          showStatusMessage('没有可下载的文件');
          
          // 隐藏处理模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          return;
        }
        
        // 添加所有处理后的文件到ZIP
        processedFiles.forEach(file => {
          try {
            // 从原始文件中获取文件路径和名称
            const originalFile = file.originalFile;
            const directory = originalFile && originalFile.webkitRelativePath 
              ? originalFile.webkitRelativePath.split('/').slice(0, -1).join('/') 
              : '';
            
            // 构建完整路径，保留原始目录结构
            const fileName = file.name;
            const filePath = directory ? `${directory}/${fileName}` : fileName;
            
            console.log('添加文件到ZIP:', filePath);
            zip.file(filePath, file);
          } catch (error) {
            console.error('添加文件到ZIP失败:', error);
          }
        });
        
        // 生成ZIP文件
        zip.generateAsync({type: 'blob'})
          .then(function(content) {
            try {
              // 生成下载链接
              const downloadLink = document.createElement('a');
              downloadLink.href = URL.createObjectURL(content);
              downloadLink.download = 'watermarked_images.zip';
              
              // 触发下载
              downloadLink.click();
              
              // 释放URL对象
              setTimeout(() => {
                URL.revokeObjectURL(downloadLink.href);
              }, 1000);
              
              console.log('ZIP文件下载开始');
              showStatusMessage('批量下载完成');
              
              // 隐藏处理模态框
              if (processingModal) {
                processingModal.style.display = 'none';
              }
              
              // 如果有错误文件，显示错误信息
              if (errorFiles && errorFiles.length > 0) {
                console.warn(`有${errorFiles.length}个文件处理失败`);
                showStatusMessage(`${processedFiles.length}个文件处理成功，${errorFiles.length}个文件处理失败`);
              }
            } catch (error) {
              console.error('下载处理失败:', error);
              showStatusMessage('生成下载链接失败');
              
              // 隐藏处理模态框
              if (processingModal) {
                processingModal.style.display = 'none';
              }
            }
          })
          .catch(function(error) {
            console.error('生成ZIP文件失败:', error);
            showStatusMessage('生成ZIP文件失败');
            
            // 隐藏处理模态框
            if (processingModal) {
              processingModal.style.display = 'none';
            }
          });
      } catch (error) {
        console.error('处理ZIP文件时出错:', error);
        showStatusMessage('批量处理失败');
        
        // 隐藏处理模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
      }
    }
  };
  
  // 创建一个Promise数组来跟踪所有的处理任务
  const promises = [];
  
  // 处理每个图片
  window.watermarkState.files.forEach((file, index) => {
    // 检查是否为GIF文件
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
            
    // 创建处理单个文件的Promise
    const promise = new Promise((resolve, reject) => {
      // 更新处理状态
      if (processingStatus) {
        processingStatus.textContent = `处理: ${file.name} (${index + 1}/${totalCount})`;
      }
      
      if (isGif) {
        try {
          // 检查水印类型是否为图片水印
          if (watermarkSettings.type !== 'image') {
            console.warn('GIF水印仅支持图片类型，跳过处理:', file.name);
            updateProgress();
            resolve();
            return;
          }
            
          // 检查是否有水印图片
          const watermarkImage = document.getElementById('watermark-image-thumbnail');
          if (!watermarkImage || !watermarkImage.src || watermarkImage.src === '') {
            console.warn('未设置水印图片，跳过处理GIF:', file.name);
            updateProgress();
            resolve();
            return;
          }
          
          // 构造GIF水印选项
          const gifWatermarkOptions = {
            opacity: watermarkSettings.opacity,
            rotation: watermarkSettings.rotation,
            imageSize: parseInt(document.getElementById('watermark-image-size').value || 40, 10),
            imageUrl: watermarkImage.src,
            position: window.watermarkState.watermarkPosition || { x: 50, y: 50 },
            scale: window.watermarkState.watermarkScale || 1.0
          };
          
          console.log('批量处理GIF:', file.name, '水印选项:', gifWatermarkOptions);
          
          // 使用GifWatermarkUI处理GIF
          if (window.GifWatermarkUI && typeof window.GifWatermarkUI.processGif === 'function') {
            window.GifWatermarkUI.processGif(file, gifWatermarkOptions)
              .then(result => {
                try {
                  if (result && result.file) {
                    processedFiles.push(result.file);
                    console.log('GIF处理成功:', file.name);
                  }
                  updateProgress();
                  resolve();
                } catch (pushError) {
                  console.error('保存GIF处理结果失败:', pushError);
                  updateProgress();
                  resolve();
                }
          })
          .catch(error => {
                try {
                  console.error('GIF处理失败:', file.name, error);
                  errorFiles.push({
                    file: file,
                    error: error.message || '处理失败'
                  });
                } catch (pushError) {
                  console.error('记录GIF错误失败:', pushError);
            }
            updateProgress();
                resolve(); // 即使出错也继续处理下一个
          });
      } else {
            console.warn('GIF处理模块未加载，跳过:', file.name);
            try {
              errorFiles.push({
                file: file,
                error: 'GIF处理模块未加载'
              });
            } catch (pushError) {
              console.error('记录模块错误失败:', pushError);
            }
            updateProgress();
            resolve();
          }
        } catch (gifError) {
          console.error('GIF处理出现未预期错误:', gifError);
          updateProgress();
          resolve(); // 继续处理其他图片
        }
      } else {
        // 处理普通图片
        createCanvas(file)
          .then(canvas => {
            // 获取Canvas上下文
            const ctx = canvas.getContext('2d');
            
            // 获取与预览完全一致的水印设置
            const previewWatermarkSettings = JSON.parse(JSON.stringify(watermarkSettings));
            
            // 在Canvas上应用水印，使用与预览完全一致的设置
            applyWatermarkToCanvas(ctx, canvas.width, canvas.height, previewWatermarkSettings);
            
            // 转换Canvas为Blob
            return new Promise(resolveBlob => {
              canvas.toBlob(blob => {
                resolveBlob(blob);
              }, file.type, imageQuality);
            });
          })
          .then(blob => {
              // 生成文件名
              const originalName = file.name;
              const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const extension = file.type.replace('image/', '.');
            const fileName = `${baseName}_watermarked${extension}`;
              
            // 创建处理后的文件
            const processedFile = new File([blob], fileName, { type: file.type });
            
            // 为处理后的文件添加原始文件引用，用于保留目录结构
            processedFile.originalFile = file;
              
            // 添加到处理文件列表
            processedFiles.push(processedFile);
              
            console.log('普通图片处理成功:', file.name);
            updateProgress();
              resolve();
          })
          .catch(error => {
            console.error('处理图片失败:', file.name, error);
            errorFiles.push({
              file: file,
              error: error.message || '处理失败'
            });
            updateProgress();
            resolve(); // 即使出错也继续处理下一个
          });
      }
    });
    
    // 添加到Promise数组
    promises.push(promise);
  });
  
  // 初始化进度显示
  if (modalProgressBar) {
    modalProgressBar.style.width = '0%';
    modalProgressBar.textContent = '0%';
  }
  
  if (processingStatus) {
    processingStatus.textContent = `开始处理 ${totalCount} 张图片...`;
  }
}

/**
 * 在画布上应用水印
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {Object} settings - 水印设置
 */
function applyWatermarkToCanvas(ctx, width, height, settings) {
  // 根据水印类型应用不同的水印
  switch (settings.type) {
    case 'text':
      // 应用文字水印
      applyTextWatermarkToCanvas(ctx, width, height, settings);
      break;
    case 'tiled':
      // 应用平铺水印
      applyTiledWatermarkToCanvas(ctx, width, height, settings);
      break;
    case 'image':
      // 应用图片水印
      applyImageWatermarkToCanvas(ctx, width, height, settings);
      break;
  }
}

/**
 * 在画布上应用文字水印
 */
function applyTextWatermarkToCanvas(ctx, width, height, settings) {
  // 设置文字样式
  const fontSize = Math.max(12, Math.round(settings.fontSize * settings.scale));
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = settings.color;
  ctx.globalAlpha = settings.opacity;
  
  // 计算位置（相对于图片的百分比）
  const x = (settings.position.x / 100) * width;
  const y = (settings.position.y / 100) * height;
  
  // 应用旋转
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(settings.rotation * Math.PI / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(settings.text, 0, 0);
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
}

/**
 * 在画布上应用平铺水印
 */
function applyTiledWatermarkToCanvas(ctx, width, height, settings) {
  // 设置文字样式
  const fontSize = Math.max(12, Math.round(settings.fontSize * settings.scale));
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = settings.color;
  ctx.globalAlpha = settings.opacity;
  
  // 计算平铺间距
  const spacing = Math.max(50, Math.round(parseInt(settings.tileSpacing) * settings.scale));
  
  // 计算网格大小
  const gridSize = Math.max(3, Math.ceil(Math.max(width, height) / spacing) + 1);
  
  // 计算偏移（相对于图片中心）
  const centerX = width / 2;
  const centerY = height / 2;
  const offsetX = ((settings.position.x / 100) * width) - centerX;
  const offsetY = ((settings.position.y / 100) * height) - centerY;
  
  // 创建水印网格
  const halfGrid = Math.floor(gridSize / 2);
  for (let row = -halfGrid; row <= halfGrid; row++) {
    for (let col = -halfGrid; col <= halfGrid; col++) {
      // 计算基础位置（相对于容器中心）
      const baseX = col * spacing;
      const baseY = row * spacing;
      
      // 应用位置偏移（相对于图片中心）
      const finalX = centerX + baseX + offsetX;
      const finalY = centerY + baseY + offsetY;
      
      // 只添加在图片范围内的水印
      if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height) {
        // 应用旋转
        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.rotate(settings.rotation * Math.PI / 180);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(settings.text, 0, 0);
        ctx.restore();
      }
    }
  }
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
}

/**
 * 在画布上应用图片水印
 */
function applyImageWatermarkToCanvas(ctx, width, height, settings) {
  // 检查是否有水印图片
  if (!settings.watermarkImage) {
    console.error('未设置水印图片');
    return;
  }
  
  try {
    // 获取水印图片元素 - 优先使用已加载的DOM元素
    const watermarkImgElement = document.getElementById('watermark-image-thumbnail');
    if (watermarkImgElement && watermarkImgElement.complete && watermarkImgElement.naturalWidth > 0) {
      // 使用已加载的图片元素
      applyLoadedImageWatermark(ctx, width, height, settings, watermarkImgElement);
      return;
    }
  
    // 如果没有找到已加载的元素，创建一个新的Image对象
  const watermarkImg = new Image();
    watermarkImg.crossOrigin = 'Anonymous'; // 处理跨域图片
    
    // 确保同步处理
    let imageLoaded = false;
    let imageError = false;
  
    // 使用同步加载方式
  watermarkImg.onload = function() {
      imageLoaded = true;
      applyLoadedImageWatermark(ctx, width, height, settings, watermarkImg);
    };
    
    watermarkImg.onerror = function(e) {
      console.error('水印图片加载失败:', e);
      imageError = true;
    };
    
    // 立即加载图片
    watermarkImg.src = settings.watermarkImage;
    
    // 如果图片已经在缓存中，onload可能不会触发，所以检查complete属性
    if (watermarkImg.complete && watermarkImg.naturalWidth > 0) {
      watermarkImg.onload();
    } else {
      // 对于未缓存的图片，设置一个最长等待时间
      console.log('等待水印图片加载...');
      
      // 在处理过程中显示提示
      let startTime = Date.now();
      let waitInterval = setInterval(() => {
        // 如果图片已加载或发生错误，停止等待
        if (imageLoaded || imageError || (Date.now() - startTime > 2000)) {
          clearInterval(waitInterval);
          
          if (!imageLoaded && !imageError) {
            console.warn('水印图片加载超时');
          }
        }
      }, 50);
    }
  } catch (error) {
    console.error('应用图片水印时出错:', error);
  }
}

/**
 * 应用已加载的图片水印到画布
 * @private
 */
function applyLoadedImageWatermark(ctx, width, height, settings, watermarkImg) {
  try {
    // 计算水印大小
    const scale = settings.scale || 0.4; // 默认使用40%缩放
    const sizePercent = parseInt(settings.imageSize || 40) / 100;
    const watermarkWidth = width * scale * sizePercent;
    const watermarkHeight = (watermarkImg.naturalHeight / watermarkImg.naturalWidth) * watermarkWidth;
    
    // 计算位置（相对于图片的百分比）
    const x = (settings.position.x / 100) * width;
    const y = (settings.position.y / 100) * height;
    
    // 应用透明度
    ctx.save();
    ctx.globalAlpha = settings.opacity;
    
    // 应用旋转和绘制水印
    ctx.translate(x, y);
    ctx.rotate(settings.rotation * Math.PI / 180);
    
    // 绘制水印，确保居中
    ctx.drawImage(
      watermarkImg, 
      -watermarkWidth/2, 
      -watermarkHeight/2, 
      watermarkWidth, 
      watermarkHeight
    );
    
    console.log('水印应用成功 - 宽度:', watermarkWidth, '高度:', watermarkHeight, 
               '位置:', x, y, '透明度:', settings.opacity);
  } catch (e) {
    console.error('绘制水印失败:', e);
  } finally {
    // 恢复画布状态
    ctx.restore();
  }
}

/**
 * 获取当前文件
 */
function getCurrentFile() {
  if (window.watermarkState.files && 
      window.watermarkState.currentIndex >= 0 && 
      window.watermarkState.currentIndex < window.watermarkState.files.length) {
    return window.watermarkState.files[window.watermarkState.currentIndex];
  }
  return null;
}

/**
 * 加载帮助内容
 */
function loadHelpContent() {
  const helpContent = document.getElementById('help-modal-content');
  if (!helpContent) return;
  
  helpContent.innerHTML = `
    <h2>图片水印工具使用帮助</h2>
    <div class="help-section">
      <h3>基本操作</h3>
      <ul>
        <li><strong>上传图片</strong>：点击上传区域或拖放图片到上传区域</li>
        <li><strong>切换图片</strong>：点击底部缩略图切换当前图片</li>
        <li><strong>调整背景</strong>：点击顶部的颜色按钮切换预览区背景色</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>水印类型</h3>
      <ul>
        <li><strong>文字水印</strong>：输入文字内容，调整字体、颜色等</li>
        <li><strong>平铺水印</strong>：文字水印的平铺版本，可调整平铺间距</li>
        <li><strong>图片水印</strong>：上传图片作为水印，调整大小和透明度</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>GIF动图处理</h3>
      <ul>
        <li><strong>上传GIF</strong>：支持处理GIF动态图片</li>
        <li><strong>图片水印</strong>：GIF处理目前仅支持图片水印模式</li>
        <li><strong>质量调整</strong>：可调整GIF质量平衡大小和视觉效果</li>
        <li><strong>处理时间</strong>：GIF处理可能需要一些时间，请耐心等待</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>下载选项</h3>
      <ul>
        <li><strong>单张下载</strong>：下载当前预览的图片</li>
        <li><strong>批量下载</strong>：处理所有图片并打包下载</li>
      </ul>
    </div>
  `;
}

// 全局导出方法
window.showImage = showImage;
window.updateThumbnails = updateThumbnails;
window.updateWatermark = updateWatermark;
window.forceRefreshWatermark = forceRefreshWatermark;
window.applyWatermarkToAll = applyWatermarkToAll;
window.handleProcessedImage = function(result) {
  // 处理GIF或其他图像处理结果
  console.log('接收到处理结果:', result);
  
  if (result && result.url) {
    const previewImage = document.getElementById('preview-image');
    if (previewImage) {
      previewImage.src = result.url;
      previewImage.style.display = 'block';
    }
    
    // 隐藏消息
    const noImageMessage = document.getElementById('no-image-message');
    if (noImageMessage) {
      noImageMessage.style.display = 'none';
    }
    
    // 如果是GIF，显示标记
    if (result.isGif) {
      const gifBadge = document.getElementById('gif-badge');
      if (gifBadge) gifBadge.style.display = 'block';
    }
  }
};

/**
 * 应用水印到所有图片
 */
function applyWatermarkToAll() {
  console.log('应用水印到所有图片...');
  
  // 检查是否有图片
  if (!window.watermarkState.files || window.watermarkState.files.length === 0) {
    showStatusMessage('请先上传图片');
    return;
  }
  
  // 获取当前文件
  const currentFile = getCurrentFile();
  if (!currentFile) {
    showStatusMessage('当前没有选中的图片');
    return;
  }
  
  // 保存当前水印位置和缩放比例
  const watermarkElement = document.querySelector('#watermark-container .watermark');
  if (watermarkElement) {
    saveCurrentWatermarkPosition(watermarkElement);
  } else if (!window.watermarkState.watermarkPosition) {
    window.watermarkState.watermarkPosition = { x: 50, y: 50 };
  }
  
  // 保存当前的缩放比例
  if (watermarkElement && watermarkElement.dataset.scale) {
    window.watermarkState.watermarkScale = parseFloat(watermarkElement.dataset.scale);
  }
  
  console.log('使用保存的水印位置:', window.watermarkState.watermarkPosition, '缩放比例:', window.watermarkState.watermarkScale);
  
  // 根据文件类型决定处理方式
  if (currentFile.type === 'image/gif') {
    // GIF处理
    console.log('检测到GIF文件，使用GIF水印处理...');
    
    // 检查是否使用了图片水印
    if (document.getElementById('watermark-type').value !== 'image') {
      showStatusMessage('GIF水印仅支持图片类型水印，请选择"图片水印"');
      return;
    }
    
    // 检查是否有水印图片
    const watermarkImage = document.getElementById('watermark-image-thumbnail');
    if (!watermarkImage || !watermarkImage.src || watermarkImage.src === '') {
      showStatusMessage('请先选择水印图片');
      return;
    }
    
    // 如果有GifWatermarkUI对象，调用其处理函数
    if (window.GifWatermarkUI && typeof window.GifWatermarkUI.processGif === 'function') {
      // 获取水印选项
      const options = {
        opacity: parseInt(document.getElementById('opacity').value || 50, 10) / 100,
        rotation: parseInt(document.getElementById('rotation').value || 0, 10),
        imageSize: parseInt(document.getElementById('watermark-image-size').value || 40, 10),
        imageUrl: document.getElementById('watermark-image-thumbnail').src,
        position: window.watermarkState.watermarkPosition || { x: 50, y: 50 },
        scale: window.watermarkState.watermarkScale || 1.0
      };
      
      console.log('开始处理GIF水印，选项:', options);
      
      // 显示处理模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal) {
        processingModal.style.display = 'flex';
      }
      
      const modalStatus = document.getElementById('processing-status');
      if (modalStatus) {
        modalStatus.textContent = '处理GIF水印...';
      }
      
      // 更新进度条
      const modalProgressBar = document.getElementById('modal-progress-bar');
      if (modalProgressBar) {
        modalProgressBar.style.width = '10%';
        modalProgressBar.textContent = '10%';
      }
      
      // 处理GIF
      window.GifWatermarkUI.processGif(currentFile, options)
        .then(result => {
          console.log('GIF处理成功:', result);
          
          // 更新当前文件为处理后的文件
          if (window.watermarkState.files[window.watermarkState.currentIndex]) {
            if (result.file) {
              window.watermarkState.files[window.watermarkState.currentIndex] = result.file;
            }
            
            // 如果有预览URL，更新预览
            if (result.previewUrl) {
              const previewImage = document.getElementById('preview-image');
              if (previewImage) {
                previewImage.src = result.previewUrl;
                previewImage.style.display = 'block';
              }
              
              // 显示GIF标记
              const gifBadge = document.getElementById('gif-badge');
              if (gifBadge) {
                gifBadge.style.display = 'block';
              }
            }
          }
          
          // 关闭处理模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示成功消息
          showStatusMessage('GIF水印处理成功');
          
          // 如果是单独应用水印，返回
          return;
        })
        .catch(error => {
          console.error('GIF处理失败:', error);
          
          // 关闭处理模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示错误消息
          showStatusMessage('GIF水印处理失败: ' + (error.message || '未知错误'));
        });
      
      return; // 不继续处理其他图片
    } else {
      console.error('GIF水印UI模块未初始化，无法处理GIF水印');
      showStatusMessage('GIF水印处理模块未初始化，无法处理');
      return;
    }
  } else {
    // 普通图片处理
    console.log('检测到普通图片，使用标准水印处理...');
    
    // 获取当前水印设置，使用全局保存的位置
    const watermarkSettings = {
      type: document.getElementById('watermark-type').value,
      text: document.getElementById('watermark-text').value,
      fontSize: document.getElementById('font-size').value,
      opacity: document.getElementById('opacity').value / 100,
      rotation: document.getElementById('rotation').value,
      color: document.getElementById('color').value,
      tileSpacing: document.getElementById('tile-spacing').value,
      imageSize: document.getElementById('watermark-image-size').value,
      watermarkImage: document.getElementById('watermark-image-thumbnail').src || null,
      position: window.watermarkState.watermarkPosition || { x: 50, y: 50 }, // 使用全局保存的位置
      scale: window.watermarkState.watermarkScale || 1,
      fromApplyToAll: true // 标记为"应用到所有"设置
    };
    
    // 应用到所有图片
    for (let i = 0; i < window.watermarkState.files.length; i++) {
      const file = window.watermarkState.files[i];
      
      // 跳过GIF文件
      if (file.type === 'image/gif') continue;
      
      // 这里可以添加实际的水印应用逻辑
      // 如果有专门的处理函数，调用它
      if (typeof window.applyWatermarkToImage === 'function') {
        window.applyWatermarkToImage(file, watermarkSettings);
      }
    }
    
    // 更新当前图片的水印
    updateWatermark();
    
    // 显示成功消息
    showStatusMessage('已将水印应用到所有普通图片');
  }
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

/**
 * 保存当前水印位置到全局状态
 * @param {HTMLElement} element - 水印元素
 */
function saveCurrentWatermarkPosition(element) {
  if (!element) return;
  
  // 获取元素当前位置（百分比）
  const style = window.getComputedStyle(element);
  const left = parseFloat(style.left);
  const top = parseFloat(style.top);
  
  // 获取预览图片和容器
  const container = element.parentElement;
  const previewImage = document.getElementById('preview-image');
  
  if (container && previewImage && previewImage.complete) {
    const containerRect = container.getBoundingClientRect();
    const imgRect = previewImage.getBoundingClientRect();
    
    // 计算图片边界（相对于容器）
    const imgBounds = {
      left: imgRect.left - containerRect.left,
      top: imgRect.top - containerRect.top,
      width: imgRect.width,
      height: imgRect.height
    };
    
    // 计算元素中心位置（相对于容器的像素）
    const elementRect = element.getBoundingClientRect();
    const centerX = elementRect.left - containerRect.left + elementRect.width / 2;
    const centerY = elementRect.top - containerRect.top + elementRect.height / 2;
    
    // 计算相对于图片的百分比位置
    const relativeX = ((centerX - imgBounds.left) / imgBounds.width) * 100;
    const relativeY = ((centerY - imgBounds.top) / imgBounds.height) * 100;
    
    // 保存到全局状态
    window.watermarkState.watermarkPosition = {
      x: Math.max(0, Math.min(100, relativeX)),
      y: Math.max(0, Math.min(100, relativeY))
    };
    
    console.log('保存水印位置:', window.watermarkState.watermarkPosition);
  } else {
    // 如果没有图片或容器，直接使用当前百分比位置
    window.watermarkState.watermarkPosition = {
      x: Math.max(0, Math.min(100, left)),
      y: Math.max(0, Math.min(100, top))
    };
  }
}

/**
 * 调整水印边界，确保水印在图片边界内
 */
function adjustWatermarkBounds(watermark, container) {
  // 获取水印和容器的尺寸
  const watermarkRect = watermark.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  // 获取预览图片
  const previewImage = document.getElementById('preview-image');
  if (!previewImage || !previewImage.complete) return;
  
  // 获取图片实际显示尺寸
  const imgRect = previewImage.getBoundingClientRect();
  
  // 计算图片边界
  const imgBounds = {
    left: imgRect.left - containerRect.left,
    top: imgRect.top - containerRect.top,
    right: imgRect.right - containerRect.left,
    bottom: imgRect.bottom - containerRect.top,
    width: imgRect.width,
    height: imgRect.height
  };
  
  // 计算水印边界
  const watermarkBounds = {
    left: watermarkRect.left - containerRect.left,
    top: watermarkRect.top - containerRect.top,
    right: watermarkRect.right - containerRect.left,
    bottom: watermarkRect.bottom - containerRect.top,
    width: watermarkRect.width,
    height: watermarkRect.height
  };
  
  // 检查水印是否超出图片边界
  let needsAdjustment = false;
  let newLeft = parseFloat(watermark.style.left);
  let newTop = parseFloat(watermark.style.top);
  
  // 计算水印中心点
  const watermarkCenterX = watermarkBounds.left + watermarkBounds.width / 2;
  const watermarkCenterY = watermarkBounds.top + watermarkBounds.height / 2;
  
  // 计算图片中心点
  const imgCenterX = imgBounds.left + imgBounds.width / 2;
  const imgCenterY = imgBounds.top + imgBounds.height / 2;
  
  // 如果水印超出图片边界，调整位置
  if (watermarkBounds.left < imgBounds.left || 
      watermarkBounds.right > imgBounds.right || 
      watermarkBounds.top < imgBounds.top || 
      watermarkBounds.bottom > imgBounds.bottom) {
    
    needsAdjustment = true;
    
    // 计算新位置（相对于容器的百分比）
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // 如果水印宽度超过图片宽度，缩小水印
    if (watermarkBounds.width > imgBounds.width * 0.8) {
      const newSize = Math.floor(parseFloat(watermark.dataset.originalSize || 80) * 0.8);
      watermark.style.maxWidth = `${newSize}%`;
      watermark.style.maxHeight = `${newSize}%`;
    }
    
    // 如果水印高度超过图片高度，缩小水印
    if (watermarkBounds.height > imgBounds.height * 0.8) {
      const newSize = Math.floor(parseFloat(watermark.dataset.originalSize || 80) * 0.8);
      watermark.style.maxWidth = `${newSize}%`;
      watermark.style.maxHeight = `${newSize}%`;
    }
    
    // 计算水印应该在的位置（确保在图片内）
    const minX = imgBounds.left + watermarkBounds.width / 2;
    const maxX = imgBounds.right - watermarkBounds.width / 2;
    const minY = imgBounds.top + watermarkBounds.height / 2;
    const maxY = imgBounds.bottom - watermarkBounds.height / 2;
    
    // 将水印限制在图片边界内
    const constrainedX = Math.max(minX, Math.min(maxX, watermarkCenterX));
    const constrainedY = Math.max(minY, Math.min(maxY, watermarkCenterY));
    
    // 转换为百分比
    newLeft = (constrainedX / containerWidth) * 100;
    newTop = (constrainedY / containerHeight) * 100;
    
    // 应用新位置
    watermark.style.left = `${newLeft}%`;
    watermark.style.top = `${newTop}%`;
    
    // 更新全局状态
    window.watermarkState.watermarkPosition = {
      x: newLeft,
      y: newTop
    };
    
    console.log('调整水印位置以保持在图片边界内:', { x: newLeft, y: newTop });
  }
  
  return needsAdjustment;
}

/**
 * 添加鼠标滚轮缩放水印功能
 * @param {HTMLElement} element - 水印元素
 */
function addWheelScaling(element) {
  element.addEventListener('wheel', function(e) {
    e.preventDefault(); // 阻止页面滚动
    
    // 获取当前缩放比例
    let scale = parseFloat(element.dataset.scale || '1.0');
    
    // 根据滚轮方向调整缩放比例
    if (e.deltaY < 0) {
      // 向上滚动，放大
      scale *= 1.1;
    } else {
      // 向下滚动，缩小
      scale *= 0.9;
    }
    
    // 限制缩放范围
    scale = Math.max(0.2, Math.min(3.0, scale));
    
    // 保存缩放比例
    element.dataset.scale = scale;
    window.watermarkState.watermarkScale = scale;
    
    // 应用缩放
    if (element.classList.contains('text-watermark')) {
      // 文字水印缩放
      const originalFontSize = parseInt(element.dataset.originalFontSize || element.style.fontSize);
      element.style.fontSize = `${originalFontSize * scale}px`;
    } else if (element.classList.contains('image-watermark')) {
      // 图片水印缩放
      const originalSize = parseInt(element.dataset.originalSize || '40');
      element.style.maxWidth = `${originalSize * scale}%`;
      element.style.maxHeight = `${originalSize * scale}%`;
    } else if (element.classList.contains('tiled-watermark-container')) {
      // 平铺水印缩放
      const watermarks = element.querySelectorAll('.tiled-watermark-item');
      const originalFontSize = parseInt(element.dataset.originalFontSize || '36');
      
      watermarks.forEach(watermark => {
        watermark.style.fontSize = `${originalFontSize * scale}px`;
      });
    }
    
    console.log('水印缩放比例:', scale);
  });
}

/**
 * 将图片文件加载到Canvas
 * @param {File} file - 图片文件
 * @returns {Promise<HTMLCanvasElement>} - 包含图片的Canvas元素
 */
function createCanvas(file) {
  return new Promise((resolve, reject) => {
    // 创建一个Image对象来加载图片
    const img = new Image();
    
    img.onload = function() {
      try {
        // 创建画布
        const canvas = document.createElement('canvas');
        
        // 设置画布尺寸为原始图片尺寸
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // 获取画布上下文
        const ctx = canvas.getContext('2d');
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 返回Canvas
        resolve(canvas);
      } catch (error) {
        console.error('创建Canvas失败:', error);
        reject(error);
      } finally {
        // 释放URL对象
        URL.revokeObjectURL(img.src);
      }
    };
    
    img.onerror = function(error) {
      console.error('加载图片失败:', file.name, error);
      URL.revokeObjectURL(img.src);
      reject(new Error('无法加载图片: ' + file.name));
    };
    
    // 加载图片
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 获取当前的水印设置
 * @returns {Object} 水印设置对象
 */
function getWatermarkSettings() {
  try {
    // 从UI收集水印设置
    const settings = {
      type: document.getElementById('watermark-type').value,
      text: document.getElementById('watermark-text') ? document.getElementById('watermark-text').value : '水印文字',
      fontSize: parseInt(document.getElementById('font-size').value, 10),
      opacity: parseInt(document.getElementById('opacity').value, 10) / 100,
      rotation: parseInt(document.getElementById('rotation').value, 10),
      color: document.getElementById('color').value,
      tileSpacing: document.getElementById('tile-spacing') ? document.getElementById('tile-spacing').value : '150',
      imageSize: document.getElementById('watermark-image-size') ? document.getElementById('watermark-image-size').value : '40',
      position: window.watermarkState.watermarkPosition || { x: 50, y: 50 },
      scale: window.watermarkState.watermarkScale || 1.0
    };
    
    // 获取水印图片URL（如果有）
    const watermarkImageEl = document.getElementById('watermark-image-thumbnail');
    if (watermarkImageEl && watermarkImageEl.src && watermarkImageEl.src !== '') {
      settings.watermarkImage = watermarkImageEl.src;
    }
    
    console.log('已获取水印设置:', settings);
    return settings;
  } catch (error) {
    console.error('获取水印设置失败:', error);
    return null;
  }
}