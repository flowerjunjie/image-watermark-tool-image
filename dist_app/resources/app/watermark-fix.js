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
    console.log('水印修复脚本已应用');
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