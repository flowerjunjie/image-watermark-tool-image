// 水印工具修复脚本
console.log('水印工具修复脚本加载中...');

// 在页面完全加载后执行
document.addEventListener('DOMContentLoaded', function() {
  console.log('开始应用修复...');
  
  // 1. 修复上传文件夹双对话框问题
  const uploadFolderBtn = document.getElementById('upload-folder-btn');
  const folderInput = document.getElementById('folder-input');
  
  if (uploadFolderBtn && folderInput) {
    // 移除所有现有的点击事件处理器
    const oldElement = uploadFolderBtn.cloneNode(true);
    uploadFolderBtn.parentNode.replaceChild(oldElement, uploadFolderBtn);
    
    // 重新添加唯一的点击事件
    oldElement.addEventListener('click', function(e) {
      console.log('上传文件夹按钮被点击(修复后)');
      e.preventDefault();
      e.stopPropagation();
      folderInput.click();
    });
    console.log('上传文件夹按钮事件已修复');
  }
  
  // 2. 修复水印拖拽问题
  function fixDraggableWatermark() {
    const watermarks = document.querySelectorAll('.draggable-watermark');
    
    watermarks.forEach(watermark => {
      if (!watermark.dataset.draggableFixed) {
        // 标记已修复，避免重复绑定
        watermark.dataset.draggableFixed = 'true';
        
        let isDragging = false;
        let offsetX, offsetY;
        
        watermark.addEventListener('mousedown', function(e) {
          isDragging = true;
          
          // 计算鼠标相对于元素的偏移
          const rect = watermark.getBoundingClientRect();
          offsetX = e.clientX - rect.left;
          offsetY = e.clientY - rect.top;
          
          // 防止文本选择
          e.preventDefault();
          console.log('水印拖拽开始(修复后)');
        });
        
        document.addEventListener('mousemove', function(e) {
          if (!isDragging) return;
          
          // 获取父容器
          const container = watermark.parentElement;
          const containerRect = container.getBoundingClientRect();
          
          // 计算新位置
          const x = e.clientX - containerRect.left - offsetX;
          const y = e.clientY - containerRect.top - offsetY;
          
          // 计算百分比位置
          const percentX = (x / containerRect.width) * 100;
          const percentY = (y / containerRect.height) * 100;
          
          // 限制在容器内
          const boundedX = Math.max(0, Math.min(100, percentX));
          const boundedY = Math.max(0, Math.min(100, percentY));
          
          // 更新元素位置
          watermark.style.left = `${boundedX}%`;
          watermark.style.top = `${boundedY}%`;
          
          // 更新全局水印状态
          if (window.watermarkState) {
            window.watermarkState.x = boundedX;
            window.watermarkState.y = boundedY;
          }
        });
        
        document.addEventListener('mouseup', function() {
          isDragging = false;
        });
        
        console.log('水印拖拽功能已修复');
      }
    });
  }
  
  // 3. 修复滑动条不起作用问题
  function fixSliders() {
    // 获取滑块元素
    const fontSize = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    const rotation = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotation-value');
    const watermarkImageSize = document.getElementById('watermark-image-size');
    const watermarkImageSizeValue = document.getElementById('watermark-image-size-value');
    
    // 确保滑块正确更新水印
    if (fontSize && fontSizeValue) {
      fontSize.addEventListener('input', function() {
        if (window.watermarkState) {
          window.watermarkState.fontSize = fontSize.value;
          fontSizeValue.textContent = fontSize.value;
          console.log(`字体大小更新为: ${fontSize.value} (修复后)`);
          
          // 直接调用更新水印函数
          if (typeof window.updateWatermark === 'function') {
            window.updateWatermark();
          }
        }
      });
    }
    
    // 透明度
    if (opacity && opacityValue) {
      opacity.addEventListener('input', function() {
        if (window.watermarkState) {
          window.watermarkState.opacity = opacity.value;
          opacityValue.textContent = `${opacity.value}%`;
          console.log(`透明度更新为: ${opacity.value}% (修复后)`);
          
          // 直接调用更新水印函数
          if (typeof window.updateWatermark === 'function') {
            window.updateWatermark();
          }
        }
      });
    }
    
    // 旋转角度
    if (rotation && rotationValue) {
      rotation.addEventListener('input', function() {
        if (window.watermarkState) {
          window.watermarkState.rotation = rotation.value;
          rotationValue.textContent = `${rotation.value}°`;
          console.log(`旋转角度更新为: ${rotation.value}° (修复后)`);
          
          // 直接调用更新水印函数
          if (typeof window.updateWatermark === 'function') {
            window.updateWatermark();
          }
        }
      });
    }
    
    // 水印图片大小
    if (watermarkImageSize && watermarkImageSizeValue) {
      watermarkImageSize.addEventListener('input', function() {
        if (window.watermarkState) {
          window.watermarkState.watermarkImageSize = watermarkImageSize.value;
          watermarkImageSizeValue.textContent = `${watermarkImageSize.value}%`;
          console.log(`水印图片大小更新为: ${watermarkImageSize.value}% (修复后)`);
          
          // 直接调用更新水印函数
          if (typeof window.updateWatermark === 'function') {
            window.updateWatermark();
          }
        }
      });
    }
    
    console.log('滑动条功能已修复');
  }
  
  // 设置MutationObserver监视DOM变化，及时修复新添加的水印元素
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        // 查找新添加的水印元素
        const watermarks = document.querySelectorAll('.draggable-watermark:not([data-draggable-fixed])');
        if (watermarks.length > 0) {
          console.log('检测到新水印元素，应用修复');
          fixDraggableWatermark();
        }
      }
    });
  });
  
  // 启动观察器
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 执行修复
  setTimeout(function() {
    fixDraggableWatermark();
    fixSliders();
    console.log('修复脚本应用完成!');
  }, 1000);
});