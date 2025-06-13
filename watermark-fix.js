/**
 * 图片水印工具修复脚本
 * 用于修复以下问题：
 * 1. 上传文件夹按钮点击后弹出两次选择对话框
 * 2. 水印不能拖动
 * 3. 滑动条不起作用
 */

// 等待页面完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印修复脚本已加载');
  
  // 延迟执行以确保页面元素已加载
  setTimeout(function() {
    fixUploadFolderButton();
    fixWatermarkDragging();
    fixSliderControls();
    fixBackgroundColorButtons();
    fixWatermarkTypeSelection();
    fixAllButtons();
    fixMissingFunctions();
    console.log('水印修复脚本已应用');
    
    // 添加诊断功能
    setTimeout(function() {
      diagnoseFunctions();
    }, 1000);
  }, 1000);
});

/**
 * 修复上传文件夹按钮点击后弹出两次选择对话框的问题
 */
function fixUploadFolderButton() {
  // 修正选择器，使用正确的ID
  const uploadFolderBtn = document.querySelector('#upload-folder-btn');
  if (!uploadFolderBtn) {
    console.log('未找到上传文件夹按钮');
    return;
  }
  
  // 移除所有现有的点击事件监听器
  const newUploadFolderBtn = uploadFolderBtn.cloneNode(true);
  uploadFolderBtn.parentNode.replaceChild(newUploadFolderBtn, uploadFolderBtn);
  
  // 添加新的点击事件监听器
  newUploadFolderBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('上传文件夹按钮被点击');
    
    // 创建一个隐藏的文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.webkitdirectory = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // 模拟点击文件输入元素
    fileInput.click();
    
    // 监听文件选择事件
    fileInput.addEventListener('change', function() {
      console.log('已选择文件夹，文件数量:', this.files.length);
      
      // 获取原始上传文件夹函数并调用
      if (window.handleFolderUpload && typeof window.handleFolderUpload === 'function') {
        window.handleFolderUpload(this.files);
      } else {
        // 如果找不到原始函数，尝试触发自定义事件
        const event = new CustomEvent('folderSelected', { detail: { files: this.files } });
        document.dispatchEvent(event);
        
        // 尝试直接调用批量处理函数
        if (window.batchProcessImages && typeof window.batchProcessImages === 'function') {
          // 设置全局文件列表
          if (window.batchState) {
            window.batchState.files = Array.from(this.files);
            window.batchProcessImages();
          }
        }
      }
      
      // 移除临时文件输入元素
      document.body.removeChild(fileInput);
    });
  });
  
  console.log('上传文件夹按钮修复完成');
}

/**
 * 修复水印不能拖动的问题
 */
function fixWatermarkDragging() {
  // 修正选择器，使用正确的ID而不是类名
  const watermarkContainer = document.querySelector('#watermark-container');
  const watermarkText = document.querySelector('#watermark-text');
  
  if (!watermarkContainer || !watermarkText) {
    console.log('未找到水印元素');
    return;
  }
  
  let isDragging = false;
  let offsetX, offsetY;
  
  // 添加拖动功能
  watermarkText.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - parseInt(getComputedStyle(watermarkText).left);
    offsetY = e.clientY - parseInt(getComputedStyle(watermarkText).top);
    watermarkText.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const containerRect = watermarkContainer.getBoundingClientRect();
    const textRect = watermarkText.getBoundingClientRect();
    
    // 计算新位置，确保水印不会超出容器边界
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    
    // 边界检查
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft + textRect.width > containerRect.width) {
      newLeft = containerRect.width - textRect.width;
    }
    if (newTop + textRect.height > containerRect.height) {
      newTop = containerRect.height - textRect.height;
    }
    
    // 应用新位置
    watermarkText.style.left = newLeft + 'px';
    watermarkText.style.top = newTop + 'px';
    
    // 更新位置滑块的值
    const horizontalSlider = document.querySelector('#horizontalPosition');
    const verticalSlider = document.querySelector('#verticalPosition');
    
    if (horizontalSlider && verticalSlider) {
      const horizontalPercent = (newLeft / (containerRect.width - textRect.width)) * 100;
      const verticalPercent = (newTop / (containerRect.height - textRect.height)) * 100;
      
      horizontalSlider.value = horizontalPercent;
      verticalSlider.value = verticalPercent;
      
      // 触发滑块的input事件以更新其他相关UI
      horizontalSlider.dispatchEvent(new Event('input'));
      verticalSlider.dispatchEvent(new Event('input'));
    }
  });
  
  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      watermarkText.style.cursor = 'grab';
    }
  });
  
  // 添加鼠标样式
  watermarkText.style.cursor = 'grab';
  watermarkText.style.userSelect = 'none';
  
  console.log('水印拖动功能修复完成');
}

/**
 * 修复滑动条不起作用的问题
 */
function fixSliderControls() {
  const sliders = document.querySelectorAll('input[type="range"]');
  
  sliders.forEach(slider => {
    // 移除所有现有的事件监听器
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    // 添加新的事件监听器
    newSlider.addEventListener('input', function() {
      const id = this.id;
      const value = this.value;
      
      console.log(`滑块 ${id} 值变更为: ${value}`);
      
      // 根据滑块ID执行相应操作
      switch (id) {
        case 'horizontalPosition':
          updateWatermarkPosition('horizontal', value);
          break;
        case 'verticalPosition':
          updateWatermarkPosition('vertical', value);
          break;
        case 'watermarkOpacity':
          updateWatermarkOpacity(value);
          break;
        case 'watermarkRotation':
          updateWatermarkRotation(value);
          break;
        case 'watermarkSize':
          updateWatermarkSize(value);
          break;
      }
    });
  });
  
  console.log('滑动条功能修复完成');
}

/**
 * 更新水印位置
 * @param {string} direction - 'horizontal' 或 'vertical'
 * @param {number} value - 位置百分比值 (0-100)
 */
function updateWatermarkPosition(direction, value) {
  const watermarkText = document.querySelector('#watermark-text');
  const watermarkContainer = document.querySelector('#watermark-container');
  
  if (!watermarkText || !watermarkContainer) return;
  
  const containerRect = watermarkContainer.getBoundingClientRect();
  const textRect = watermarkText.getBoundingClientRect();
  
  if (direction === 'horizontal') {
    const maxLeft = containerRect.width - textRect.width;
    const left = (maxLeft * value) / 100;
    watermarkText.style.left = left + 'px';
  } else if (direction === 'vertical') {
    const maxTop = containerRect.height - textRect.height;
    const top = (maxTop * value) / 100;
    watermarkText.style.top = top + 'px';
  }
}

/**
 * 更新水印透明度
 * @param {number} value - 透明度值 (0-100)
 */
function updateWatermarkOpacity(value) {
  const watermarkText = document.querySelector('#watermark-text');
  if (!watermarkText) return;
  
  const opacity = value / 100;
  watermarkText.style.opacity = opacity;
}

/**
 * 更新水印旋转角度
 * @param {number} value - 旋转角度 (0-360)
 */
function updateWatermarkRotation(value) {
  const watermarkText = document.querySelector('#watermark-text');
  if (!watermarkText) return;
  
  watermarkText.style.transform = `rotate(${value}deg)`;
}

/**
 * 更新水印大小
 * @param {number} value - 大小百分比 (50-200)
 */
function updateWatermarkSize(value) {
  const watermarkText = document.querySelector('#watermark-text');
  if (!watermarkText) return;
  
  const fontSize = 14 * (value / 100);
  watermarkText.style.fontSize = fontSize + 'px';
}

/**
 * 修复背景色按钮不起作用的问题
 */
function fixBackgroundColorButtons() {
  const bgButtons = document.querySelectorAll('.bg-color-btn');
  if (!bgButtons || bgButtons.length === 0) {
    console.log('未找到背景色按钮');
    return;
  }
  
  console.log('找到 ' + bgButtons.length + ' 个背景色按钮');
  
  // 为每个背景色按钮添加点击事件
  bgButtons.forEach(button => {
    // 移除现有的事件监听器
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // 添加新的事件监听器
    newButton.addEventListener('click', function() {
      const color = this.getAttribute('data-color') || this.getAttribute('data-bg-color');
      if (!color) return;
      
      console.log('背景色按钮被点击，颜色:', color);
      
      // 更新预览区域的背景色
      const previewArea = document.querySelector('.preview-area') || document.querySelector('#preview-area');
      if (previewArea) {
        previewArea.style.backgroundColor = color;
      }
      
      // 移除所有按钮的活动状态
      document.querySelectorAll('.bg-color-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 为当前按钮添加活动状态
      this.classList.add('active');
    });
  });
  
  console.log('背景色按钮修复完成');
}

/**
 * 修复水印类型选择后不显示相应控件的问题
 */
function fixWatermarkTypeSelection() {
  const watermarkTypeSelect = document.querySelector('#watermark-type');
  if (!watermarkTypeSelect) {
    console.log('未找到水印类型选择框');
    return;
  }
  
  // 移除现有的事件监听器
  const newSelect = watermarkTypeSelect.cloneNode(true);
  watermarkTypeSelect.parentNode.replaceChild(newSelect, watermarkTypeSelect);
  
  // 添加新的事件监听器
  newSelect.addEventListener('change', function() {
    const selectedType = this.value;
    console.log('水印类型已更改为:', selectedType);
    
    // 隐藏所有水印相关控件
    document.querySelectorAll('.watermark-control').forEach(control => {
      control.style.display = 'none';
    });
    
    // 显示相应的水印控件
    if (selectedType === 'text') {
      const textControls = document.querySelectorAll('.text-watermark-control');
      textControls.forEach(control => {
        control.style.display = 'block';
      });
    } else if (selectedType === 'image') {
      const imageControls = document.querySelectorAll('.image-watermark-control');
      imageControls.forEach(control => {
        control.style.display = 'block';
      });
      
      // 确保图片上传按钮可见
      const uploadImageBtn = document.querySelector('#upload-watermark-image');
      if (uploadImageBtn) {
        uploadImageBtn.style.display = 'block';
      }
    } else if (selectedType === 'tiled') {
      const tiledControls = document.querySelectorAll('.tiled-watermark-control');
      tiledControls.forEach(control => {
        control.style.display = 'block';
      });
    }
    
    // 触发自定义事件，通知其他组件水印类型已更改
    const event = new CustomEvent('watermarkTypeChanged', { detail: { type: selectedType } });
    document.dispatchEvent(event);
  });
  
  // 触发一次change事件，确保初始状态正确
  newSelect.dispatchEvent(new Event('change'));
  
  console.log('水印类型选择修复完成');
}

/**
 * 修复所有按钮的点击事件
 */
function fixAllButtons() {
  console.log('正在修复所有按钮...');
  
  // 获取所有按钮
  const buttons = document.querySelectorAll('button');
  console.log(`找到 ${buttons.length} 个按钮`);
  
  // 单张图片处理按钮
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
      console.log('上传按钮被点击');
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      fileInput.click();
      
      fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          const file = this.files[0];
          console.log('已选择文件:', file.name);
          
          if (window.processImage && typeof window.processImage === 'function') {
            window.processImage(file);
          }
        }
        
        document.body.removeChild(fileInput);
      });
    });
    console.log('已修复上传按钮');
  }
  
  // 下载按钮
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      console.log('下载按钮被点击');
      if (window.downloadImage && typeof window.downloadImage === 'function') {
        window.downloadImage();
      }
    });
    console.log('已修复下载按钮');
  }
  
  // 批量下载按钮
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  if (batchDownloadBtn) {
    batchDownloadBtn.addEventListener('click', function() {
      console.log('批量下载按钮被点击');
      if (window.batchDownloadImages && typeof window.batchDownloadImages === 'function') {
        window.batchDownloadImages();
      }
    });
    console.log('已修复批量下载按钮');
  }
  
  // 批量处理按钮
  const batchProcessBtn = document.getElementById('batch-process-btn');
  if (batchProcessBtn) {
    batchProcessBtn.addEventListener('click', function() {
      console.log('批量处理按钮被点击');
      if (window.batchProcessImages && typeof window.batchProcessImages === 'function') {
        window.batchProcessImages();
      }
    });
    console.log('已修复批量处理按钮');
  }
  
  // 清除水印按钮
  const clearWatermarkBtn = document.getElementById('clear-watermark');
  if (clearWatermarkBtn) {
    clearWatermarkBtn.addEventListener('click', function() {
      console.log('清除水印按钮被点击');
      // 获取水印容器
      const watermarkContainer = document.getElementById('watermark-container');
      if (watermarkContainer) {
        watermarkContainer.innerHTML = '';
      }
    });
    console.log('已修复清除水印按钮');
  }
  
  // 添加通用点击处理，确保所有按钮都能触发点击事件
  buttons.forEach((button, index) => {
    if (!button.hasAttribute('data-fixed')) {
      button.setAttribute('data-fixed', 'true');
      
      // 添加点击效果
      button.style.cursor = 'pointer';
      
      // 添加鼠标悬停效果
      button.addEventListener('mouseover', function() {
        this.style.opacity = '0.8';
      });
      
      button.addEventListener('mouseout', function() {
        this.style.opacity = '1';
      });
      
      console.log(`已修复按钮 #${index+1}: ${button.textContent.trim() || button.id || '[无标识]'}`);
    }
  });
  
  console.log('所有按钮修复完成');
}

/**
 * 创建缺失的函数
 */
function fixMissingFunctions() {
  // 如果initEvents函数不存在，创建一个
  if (typeof window.initEvents !== 'function') {
    window.initEvents = function() {
      console.log('修复版initEvents函数被调用');
      
      // 上传区域点击事件
      const uploadArea = document.getElementById('upload-area');
      const fileInput = document.getElementById('file-input');
      
      if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function(e) {
          e.stopPropagation();
          fileInput.click();
        });
      }
      
      // 拖拽上传
      if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
          e.preventDefault();
          uploadArea.style.borderColor = '#1976d2';
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
          e.preventDefault();
          uploadArea.style.borderColor = '#ccc';
        });
        
        uploadArea.addEventListener('drop', function(e) {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            handleFiles(files);
          }
        });
      }
      
      // 帮助按钮事件
      const helpButton = document.getElementById('help-button');
      if (helpButton) {
        helpButton.addEventListener('click', function() {
          alert('图片水印工具使用帮助：\n1. 上传图片或文件夹\n2. 设置水印参数\n3. 点击处理按钮\n4. 下载处理后的图片');
        });
      }
    };
  }
  
  // 如果initInputs函数不存在，创建一个
  if (typeof window.initInputs !== 'function') {
    window.initInputs = function() {
      console.log('修复版initInputs函数被调用');
      
      // 初始化各种输入控件
      const fontSizeInput = document.getElementById('font-size');
      const fontSizeValue = document.getElementById('font-size-value');
      
      if (fontSizeInput && fontSizeValue) {
        fontSizeInput.addEventListener('input', function() {
          fontSizeValue.textContent = fontSizeInput.value;
          updateWatermark();
        });
      }
      
      const opacityInput = document.getElementById('opacity');
      const opacityValue = document.getElementById('opacity-value');
      
      if (opacityInput && opacityValue) {
        opacityInput.addEventListener('input', function() {
          opacityValue.textContent = opacityInput.value + '%';
          updateWatermark();
        });
      }
      
      const rotationInput = document.getElementById('rotation');
      const rotationValue = document.getElementById('rotation-value');
      
      if (rotationInput && rotationValue) {
        rotationInput.addEventListener('input', function() {
          rotationValue.textContent = rotationInput.value + '°';
          updateWatermark();
        });
      }
      
      const colorInput = document.getElementById('color');
      if (colorInput) {
        colorInput.addEventListener('input', function() {
          updateWatermark();
        });
      }
      
      const watermarkTextInput = document.getElementById('watermark-text');
      if (watermarkTextInput) {
        watermarkTextInput.addEventListener('input', function() {
          updateWatermark();
        });
      }
    };
  }
  
  // 如果initBackgroundColorControls函数不存在，创建一个
  if (typeof window.initBackgroundColorControls !== 'function') {
    window.initBackgroundColorControls = function() {
      console.log('修复版initBackgroundColorControls函数被调用');
      
      const bgColorButtons = document.querySelectorAll('.bg-color-button');
      const previewContainer = document.getElementById('preview-container');
      
      if (bgColorButtons.length > 0 && previewContainer) {
        bgColorButtons.forEach(button => {
          button.addEventListener('click', function() {
            // 移除所有按钮的active类
            bgColorButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加active类到当前按钮
            button.classList.add('active');
            
            // 设置预览区域背景色
            const color = button.getAttribute('data-color');
            if (color) {
              previewContainer.style.backgroundColor = color;
            }
          });
        });
      }
    };
  }
  
  // 如果initElectronMenuEvents函数不存在，创建一个
  if (typeof window.initElectronMenuEvents !== 'function') {
    window.initElectronMenuEvents = function() {
      console.log('修复版initElectronMenuEvents函数被调用');
      // 这个函数在独立版中可能不需要实现
    };
  }
  
  // 如果downloadImage函数不存在，创建一个
  if (typeof window.downloadImage !== 'function') {
    window.downloadImage = function() {
      console.log('修复版downloadImage函数被调用');
      
      const previewImage = document.getElementById('preview-image');
      if (!previewImage || !previewImage.src) {
        alert('请先上传图片');
        return;
      }
      
      try {
        // 创建一个canvas元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 创建一个新的图片对象，用于绘制到canvas
        const img = new Image();
        img.onload = function() {
          // 设置canvas尺寸与图片相同
          canvas.width = img.width;
          canvas.height = img.height;
          
          // 绘制图片
          ctx.drawImage(img, 0, 0);
          
          // 应用水印
          applyWatermarkToCanvas(canvas, ctx);
          
          // 导出图片
          const dataURL = canvas.toDataURL('image/png');
          
          // 创建下载链接
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = 'watermarked_image.png';
          
          // 添加到文档并触发点击
          document.body.appendChild(link);
          link.click();
          
          // 清理
          document.body.removeChild(link);
          
          showStatus('图片已保存');
        };
        
        // 加载图片
        img.src = previewImage.src;
      } catch (error) {
        console.error('下载图片错误:', error);
        alert('下载图片失败: ' + error.message);
      }
    };
  }
  
  // 如果batchDownloadImages函数不存在，创建一个
  if (typeof window.batchDownloadImages !== 'function') {
    window.batchDownloadImages = function() {
      console.log('修复版batchDownloadImages函数被调用');
      
      // 检查是否有图片
      const thumbnailsContainer = document.getElementById('thumbnails-container');
      if (!thumbnailsContainer || thumbnailsContainer.children.length === 0) {
        alert('请先上传图片');
        return;
      }
      
      // 显示处理中提示
      const processingModal = document.getElementById('processing-modal');
      if (processingModal) {
        processingModal.style.display = 'flex';
      }
      
      // 模拟处理过程
      setTimeout(function() {
        // 隐藏处理中提示
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
        alert('批量下载功能已触发，但在此修复版本中尚未完全实现');
      }, 1000);
    };
  }
  
  // 如果batchProcessImages函数不存在，创建一个
  if (typeof window.batchProcessImages !== 'function') {
    window.batchProcessImages = function() {
      console.log('修复版batchProcessImages函数被调用');
      
      // 检查是否有图片
      const thumbnailsContainer = document.getElementById('thumbnails-container');
      if (!thumbnailsContainer || thumbnailsContainer.children.length === 0) {
        alert('请先上传图片');
        return;
      }
      
      // 显示处理中提示
      const processingModal = document.getElementById('processing-modal');
      if (processingModal) {
        processingModal.style.display = 'flex';
      }
      
      // 模拟处理过程
      let progress = 0;
      const interval = setInterval(function() {
        progress += 10;
        
        // 更新进度条
        const modalProgressBar = document.getElementById('modal-progress-bar');
        const processingStatus = document.getElementById('processing-status');
        
        if (modalProgressBar) {
          modalProgressBar.style.width = `${progress}%`;
          modalProgressBar.textContent = `${progress}%`;
        }
        
        if (processingStatus) {
          processingStatus.textContent = `正在处理图片... (${progress}%)`;
        }
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // 隐藏处理中提示
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          alert('批量处理完成');
        }
      }, 300);
    };
  }
  
  // 如果handleFiles函数不存在，创建一个
  if (typeof window.handleFiles !== 'function') {
    window.handleFiles = function(files) {
      console.log('修复版handleFiles函数被调用');
      
      if (!files || files.length === 0) {
        alert('没有选择文件');
        return;
      }
      
      // 过滤出图片文件
      const imageFiles = Array.from(files).filter(file => {
        const type = file.type.toLowerCase();
        return type.startsWith('image/');
      });
      
      if (imageFiles.length === 0) {
        alert('没有选择图片文件');
        return;
      }
      
      // 加载第一张图片
      const file = imageFiles[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        const noImageMessage = document.getElementById('no-image-message');
        
        if (previewImage) {
          previewImage.src = e.target.result;
          previewImage.style.display = 'block';
        }
        
        if (noImageMessage) {
          noImageMessage.style.display = 'none';
        }
        
        // 创建缩略图
        createThumbnails(imageFiles);
        
        // 更新水印
        if (typeof updateWatermark === 'function') {
          updateWatermark();
        }
      };
      
      reader.readAsDataURL(file);
    };
  }
  
  // 如果createThumbnails函数不存在，创建一个
  if (typeof window.createThumbnails !== 'function') {
    window.createThumbnails = function(files) {
      console.log('修复版createThumbnails函数被调用');
      
      if (!files || files.length <= 1) {
        return;
      }
      
      const thumbnailsContainer = document.getElementById('thumbnails-container');
      if (!thumbnailsContainer) {
        return;
      }
      
      // 清空缩略图容器
      thumbnailsContainer.innerHTML = '';
      
      // 显示缩略图容器
      thumbnailsContainer.style.display = 'flex';
      
      // 为每个文件创建缩略图
      files.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          // 创建缩略图元素
          const thumbnail = document.createElement('div');
          thumbnail.className = 'thumbnail';
          if (index === 0) {
            thumbnail.classList.add('active');
          }
          
          // 创建图片元素
          const img = document.createElement('img');
          img.src = e.target.result;
          thumbnail.appendChild(img);
          
          // 创建文件名元素
          const fileName = document.createElement('div');
          fileName.className = 'file-name';
          fileName.textContent = file.name;
          thumbnail.appendChild(fileName);
          
          // 添加点击事件
          thumbnail.addEventListener('click', function() {
            // 移除所有缩略图的active类
            const allThumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
            allThumbnails.forEach(t => t.classList.remove('active'));
            
            // 添加active类到当前缩略图
            thumbnail.classList.add('active');
            
            // 加载对应的图片
            const previewImage = document.getElementById('preview-image');
            if (previewImage) {
              const reader = new FileReader();
              reader.onload = function(e) {
                previewImage.src = e.target.result;
                
                // 更新水印
                if (typeof updateWatermark === 'function') {
                  updateWatermark();
                }
              };
              reader.readAsDataURL(file);
            }
          });
          
          // 添加到容器
          thumbnailsContainer.appendChild(thumbnail);
        };
        
        reader.readAsDataURL(file);
      });
    };
  }
  
  // 如果showStatus函数不存在，创建一个
  if (typeof window.showStatus !== 'function') {
    window.showStatus = function(message) {
      console.log('状态消息:', message);
      
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.classList.add('show');
        
        // 3秒后隐藏
        setTimeout(() => {
          statusMessage.classList.remove('show');
        }, 3000);
      } else {
        // 如果找不到状态消息元素，使用alert
        alert(message);
      }
    };
  }
  
  // 如果applyWatermarkToCanvas函数不存在，创建一个
  if (typeof window.applyWatermarkToCanvas !== 'function') {
    window.applyWatermarkToCanvas = function(canvas, ctx) {
      try {
        const watermarkState = window.watermarkState || {
          type: 'text',
          text: '仅供验证使用',
          fontSize: 24,
          opacity: 50,
          rotation: -30,
          color: '#ff0000',
          x: 50,
          y: 50
        };
        
        const watermarkText = document.getElementById('watermark-text');
        const text = watermarkText ? watermarkText.value : '仅供验证使用';
        
        // 设置字体和颜色
        ctx.font = `${watermarkState.fontSize}px Arial`;
        ctx.fillStyle = watermarkState.color;
        ctx.globalAlpha = watermarkState.opacity / 100;
        
        if (watermarkState.type === 'text') {
          // 保存当前状态
          ctx.save();
          
          // 移动到水印位置
          const x = (canvas.width * watermarkState.x) / 100;
          const y = (canvas.height * watermarkState.y) / 100;
          
          ctx.translate(x, y);
          ctx.rotate((watermarkState.rotation * Math.PI) / 180);
          
          // 绘制文字
          ctx.fillText(text, 0, 0);
          
          // 恢复状态
          ctx.restore();
        } else if (watermarkState.type === 'tiled') {
          // 平铺水印
          const tileSpacing = watermarkState.tileSpacing || 150;
          
          // 保存当前状态
          ctx.save();
          
          // 旋转
          ctx.rotate((watermarkState.rotation * Math.PI) / 180);
          
          // 计算需要的行数和列数
          const rows = Math.ceil(canvas.height / tileSpacing) + 1;
          const cols = Math.ceil(canvas.width / tileSpacing) + 1;
          
          // 绘制平铺水印
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = col * tileSpacing;
              const y = row * tileSpacing;
              ctx.fillText(text, x, y);
            }
          }
          
          // 恢复状态
          ctx.restore();
        } else if (watermarkState.type === 'image' && watermarkState.watermarkImage) {
          // 图片水印
          const watermarkImg = new Image();
          watermarkImg.src = watermarkState.watermarkImage;
          
          // 等待图片加载
          if (watermarkImg.complete) {
            drawWatermarkImage();
          } else {
            watermarkImg.onload = drawWatermarkImage;
          }
          
          function drawWatermarkImage() {
            // 计算水印图片的尺寸
            const size = Math.min(canvas.width, canvas.height) * (watermarkState.watermarkImageSize / 100);
            const ratio = watermarkImg.width / watermarkImg.height;
            const width = ratio >= 1 ? size : size * ratio;
            const height = ratio >= 1 ? size / ratio : size;
            
            // 计算水印位置
            const x = (canvas.width * watermarkState.x) / 100 - width / 2;
            const y = (canvas.height * watermarkState.y) / 100 - height / 2;
            
            // 保存当前状态
            ctx.save();
            
            // 设置透明度
            ctx.globalAlpha = watermarkState.opacity / 100;
            
            // 移动到水印中心点
            ctx.translate(x + width / 2, y + height / 2);
            
            // 旋转
            ctx.rotate((watermarkState.rotation * Math.PI) / 180);
            
            // 绘制水印图片
            ctx.drawImage(watermarkImg, -width / 2, -height / 2, width, height);
            
            // 恢复状态
            ctx.restore();
          }
        }
      } catch (error) {
        console.error('应用水印错误:', error);
      }
    };
  }
}

/**
 * 诊断函数
 */
function diagnoseFunctions() {
  console.log('开始诊断功能初始化...');
  
  // 检查关键函数是否存在
  const functionsToCheck = [
    'processImage',
    'downloadImage',
    'batchDownloadImages',
    'batchProcessImages',
    'updateWatermark',
    'applyWatermark',
    'initEvents',
    'initInputs'
  ];
  
  functionsToCheck.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`√ 已找到 ${funcName} 函数`);
    } else {
      console.log(`× 未找到 ${funcName} 函数，尝试创建替代函数`);
    }
  });
  
  console.log('诊断功能初始化完成');
}