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

// 当文档加载完成时初始化
document.addEventListener('DOMContentLoaded', function() {
  // 防止重复初始化
  if (window.watermarkInitialized) {
    console.log('水印应用已经初始化，跳过');
    return;
  }
  
  console.log('初始化水印应用...');
  
  // 初始化上传区域
  initUploadArea();
  
  // 初始化水印类型切换
  initWatermarkTypeSwitch();
  
  // 初始化控制滑块
  initSliders();
  
  // 初始化按钮事件
  initButtons();
  
  // 初始化背景色切换
  initBackgroundColorSwitch();
  
  // 确保水印初始化
  setTimeout(function() {
    if (window.watermarkState.files && window.watermarkState.files.length > 0) {
      forceRefreshWatermark();
    }
  }, 500);
  
  console.log('水印应用初始化完成');
  window.watermarkInitialized = true;
});

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
        index: index
      } 
    });
    document.dispatchEvent(event);
    
    // 确保在图像加载完成后应用水印
    setTimeout(updateWatermark, 100);
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
      saveCurrentWatermarkPosition();
      
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
  console.log('更新水印...');
  
  // 获取当前参数
  const watermarkType = document.getElementById('watermark-type').value;
  const fontSize = document.getElementById('font-size').value;
  const opacity = document.getElementById('opacity').value / 100; // 转换为0-1范围
  const rotation = document.getElementById('rotation').value;
  const color = document.getElementById('color').value;
  
  const watermarkContainer = document.getElementById('watermark-container');
  if (!watermarkContainer) {
    console.error('水印容器未找到');
    return;
  }
  
  // 确保水印容器可见
  watermarkContainer.style.display = 'flex';
  watermarkContainer.innerHTML = ''; // 清除之前的水印
  
  // 根据水印类型处理
  switch (watermarkType) {
    case 'text':
      const text = document.getElementById('watermark-text').value;
      console.log(`文字水印: "${text}", 字体: ${fontSize}px, 颜色: ${color}, 透明度: ${opacity}, 旋转: ${rotation}°`);
      createTextWatermark(text, fontSize, color, opacity, rotation, watermarkContainer);
      break;
      
    case 'tiled':
      const text2 = document.getElementById('watermark-text').value;
      const spacing = document.getElementById('tile-spacing').value;
      console.log(`平铺水印: "${text2}", 间距: ${spacing}px, 字体: ${fontSize}px, 颜色: ${color}, 透明度: ${opacity}, 旋转: ${rotation}°`);
      createTiledWatermark(text2, fontSize, color, opacity, rotation, spacing, watermarkContainer);
      break;
      
    case 'image':
      const watermarkImageThumbnail = document.getElementById('watermark-image-thumbnail');
      const imageSize = document.getElementById('watermark-image-size').value;
      if (watermarkImageThumbnail && watermarkImageThumbnail.src) {
        console.log(`图片水印: ${watermarkImageThumbnail.src}, 大小: ${imageSize}%, 透明度: ${opacity}, 旋转: ${rotation}°`);
        createImageWatermark(watermarkImageThumbnail.src, imageSize, opacity, rotation, watermarkContainer);
      }
      break;
  }
  
  // 触发水印更新事件
  const event = new CustomEvent('watermarkUpdate', { 
    detail: { 
      type: watermarkType,
      text: document.getElementById('watermark-text').value,
      fontSize: fontSize,
      opacity: opacity,
      rotation: rotation,
      color: color,
      tileSpacing: document.getElementById('tile-spacing').value,
      imageSize: document.getElementById('watermark-image-size').value,
      watermarkImage: document.getElementById('watermark-image-thumbnail').src || null
    } 
  });
  document.dispatchEvent(event);
}

/**
 * 创建文字水印
 */
function createTextWatermark(text, fontSize, color, opacity, rotation, container) {
  const watermark = document.createElement('div');
  watermark.className = 'watermark text-watermark';
  watermark.textContent = text;
  watermark.style.fontSize = `${fontSize}px`;
  watermark.style.color = color;
  watermark.style.opacity = opacity;
  
  // 获取保存的位置或使用默认位置
  const position = window.watermarkState.watermarkPosition || { x: 50, y: 50 };
  
  // 设置位置（百分比）
  watermark.style.position = 'absolute';
  watermark.style.left = `${position.x}%`;
  watermark.style.top = `${position.y}%`;
  watermark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  watermark.style.pointerEvents = 'auto';
  watermark.style.cursor = 'move';
  
  console.log('应用水印位置:', position);
  
  // 使水印可拖动
  makeDraggable(watermark);
  
  container.appendChild(watermark);
}

/**
 * 创建平铺水印
 */
function createTiledWatermark(text, fontSize, color, opacity, rotation, spacing, container) {
  // 创建平铺水印的实现...
  const tiledContainer = document.createElement('div');
  tiledContainer.className = 'watermark tiled-watermark-container';
  tiledContainer.style.position = 'absolute';
  tiledContainer.style.width = '100%';
  tiledContainer.style.height = '100%';
  tiledContainer.style.opacity = opacity;
  
  // 获取保存的位置或使用默认位置
  const position = window.watermarkState.watermarkPosition || { x: 0, y: 0 };
  const offsetX = position.x - 50; // 将50%作为中心点
  const offsetY = position.y - 50;
  
  console.log('应用平铺水印位置偏移:', offsetX, offsetY);
  
  // 创建一个3x3的网格作为示例
  const spacingPx = parseInt(spacing);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const watermark = document.createElement('div');
      watermark.className = 'watermark tiled-watermark-item';
      watermark.textContent = text;
      watermark.style.fontSize = `${fontSize}px`;
      watermark.style.color = color;
      watermark.style.position = 'absolute';
      
      // 应用位置偏移
      const baseX = col * spacingPx + spacingPx/2;
      const baseY = row * spacingPx + spacingPx/2;
      const offsetPxX = (offsetX / 100) * container.clientWidth;
      const offsetPxY = (offsetY / 100) * container.clientHeight;
      
      watermark.style.left = `${baseX + offsetPxX}px`;
      watermark.style.top = `${baseY + offsetPxY}px`;
      watermark.style.transform = `rotate(${rotation}deg)`;
      tiledContainer.appendChild(watermark);
    }
  }
  
  // 使整个平铺容器可拖动
  tiledContainer.style.pointerEvents = 'auto';
  tiledContainer.style.cursor = 'move';
  makeDraggable(tiledContainer);
  
  container.appendChild(tiledContainer);
}

/**
 * 创建图片水印
 */
function createImageWatermark(src, size, opacity, rotation, container) {
  const watermark = document.createElement('img');
  watermark.className = 'watermark image-watermark';
  watermark.src = src;
  watermark.style.maxWidth = `${size}%`;
  watermark.style.maxHeight = `${size}%`;
  watermark.style.opacity = opacity;
  
  // 获取保存的位置或使用默认位置
  const position = window.watermarkState.watermarkPosition || { x: 50, y: 50 };
  
  // 设置位置（百分比）
  watermark.style.position = 'absolute';
  watermark.style.left = `${position.x}%`;
  watermark.style.top = `${position.y}%`;
  watermark.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  watermark.style.pointerEvents = 'auto';
  watermark.style.cursor = 'move';
  watermark.draggable = false; // 禁用默认拖动行为
  
  console.log('应用图片水印位置:', position);
  
  // 使水印可拖动
  makeDraggable(watermark);
  
  container.appendChild(watermark);
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
      
      // 限制在容器内
      let left = e.clientX - containerRect.left - offsetX;
      let top = e.clientY - containerRect.top - offsetY;
      
      // 设置元素位置
      element.style.left = left + 'px';
      element.style.top = top + 'px';
      element.style.transform = `translate(-50%, -50%) rotate(${document.getElementById('rotation').value}deg)`;
    }
  }
  
  function releaseHandler() {
    isDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', releaseHandler);
    
    // 计算并保存水印的相对位置（百分比）
    const container = element.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // 计算元素中心点相对于容器的位置（百分比）
      const centerX = (elementRect.left + elementRect.width/2) - containerRect.left;
      const centerY = (elementRect.top + elementRect.height/2) - containerRect.top;
      
      const relativeX = (centerX / containerRect.width) * 100;
      const relativeY = (centerY / containerRect.height) * 100;
      
      // 更新全局状态
      window.watermarkState.watermarkPosition = {
        x: Math.max(0, Math.min(100, relativeX)), // 确保在0-100范围内
        y: Math.max(0, Math.min(100, relativeY))
      };
      
      console.log('更新水印位置:', window.watermarkState.watermarkPosition);
      
      // 更新元素样式为百分比位置
      element.style.left = `${window.watermarkState.watermarkPosition.x}%`;
      element.style.top = `${window.watermarkState.watermarkPosition.y}%`;
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
  // 在实际应用中，这里会下载当前处理后的图片
  console.log('下载单张图片');
  const currentFile = getCurrentFile();
  if (currentFile) {
    // TODO: 实际处理逻辑
    alert('下载图片: ' + currentFile.name);
  } else {
    alert('请先上传图片');
  }
}

/**
 * 批量下载图片
 */
function batchDownload() {
  // 在实际应用中，这里会批量处理并打包下载所有图片
  console.log('批量下载图片');
  if (window.watermarkState.files && window.watermarkState.files.length > 0) {
    // TODO: 实际处理逻辑
    alert(`批量下载 ${window.watermarkState.files.length} 张图片`);
  } else {
    alert('请先上传图片');
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
  
  // 确保已经保存了水印位置
  if (!window.watermarkState.watermarkPosition) {
    saveCurrentWatermarkPosition();
  }
  
  console.log('使用保存的水印位置:', window.watermarkState.watermarkPosition);
  
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
        scale: parseInt(document.getElementById('watermark-image-size').value || 40, 10) / 100,
        // 使用保存的位置
        position: window.watermarkState.watermarkPosition || { x: 50, y: 50 }
      };
      
      // 处理GIF
      window.GifWatermarkUI.processGif(currentFile, watermarkImage, options);
    } else {
      showStatusMessage('GIF水印处理模块未加载');
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
 * 保存当前水印位置
 */
function saveCurrentWatermarkPosition() {
  const watermarkContainer = document.getElementById('watermark-container');
  if (watermarkContainer) {
    const watermarkElement = watermarkContainer.querySelector('.watermark');
    if (watermarkElement) {
      // 获取水印元素的位置
      const rect = watermarkElement.getBoundingClientRect();
      const containerRect = watermarkContainer.getBoundingClientRect();
      
      // 计算水印在容器中的相对位置（百分比）
      const relativeX = ((rect.left + rect.width/2) - containerRect.left) / containerRect.width * 100;
      const relativeY = ((rect.top + rect.height/2) - containerRect.top) / containerRect.height * 100;
      
      window.watermarkState.watermarkPosition = {
        x: Math.max(0, Math.min(100, relativeX)), // 确保在0-100范围内
        y: Math.max(0, Math.min(100, relativeY))
      };
      
      console.log('保存当前水印位置:', window.watermarkState.watermarkPosition);
    }
  }
}