/**
 * 更新水印位置和显示
 * @param {Object} options - 更新选项
 */
export function updateWatermark(options = {}) {
  try {
    // 检查预览图像和画布是否可用
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const superGifContainer = document.getElementById('super-gif-container');
    
    // 检查预览状态
    const previewImageAvailable = previewImage && previewImage.style.display !== 'none' && previewImage.complete;
    const previewCanvasAvailable = previewCanvas && previewCanvas.style.display !== 'none';
    const superGifAvailable = superGifContainer && superGifContainer.style.display !== 'none' && 
      superGifContainer.querySelector('canvas');
    
    // 打印预览状态
    console.log('更新水印，预览图像状态:', {
      previewImageAvailable,
      previewCanvasAvailable,
      superGifAvailable,
      imageDisplay: previewImage ? previewImage.style.display : 'not-available',
      imageComplete: previewImage ? previewImage.complete : false,
      imageWidth: previewImage ? previewImage.naturalWidth : 0,
      canvasDisplay: previewCanvas ? previewCanvas.style.display : 'not-available',
      canvasWidth: previewCanvas ? previewCanvas.width : 0,
      superGifDisplay: superGifContainer ? superGifContainer.style.display : 'not-available'
    });
    
    // 如果没有预览元素，不做任何操作
    if (!previewImageAvailable && !previewCanvasAvailable && !superGifAvailable) {
      console.warn('预览图像和画布都不可用，保持当前水印');
      return;
    }
    
    // 获取水印容器和水印元素
    const watermarkContainer = document.getElementById('watermark-container');
    const watermarkElement = document.getElementById('watermark-element');
    
    // 如果没有水印容器或水印元素，不做任何操作
    if (!watermarkContainer || !watermarkElement) {
      console.warn('水印容器或水印元素不可用');
      return;
    }
    
    // 显示水印容器
    watermarkContainer.style.display = 'flex';
    
    // 获取预览元素
    let previewElement;
    let previewWidth, previewHeight;
    
    // 获取当前活跃的预览元素和尺寸
    if (superGifAvailable) {
      // 使用SuperGif的canvas
      previewElement = superGifContainer.querySelector('canvas');
      previewWidth = previewElement.width;
      previewHeight = previewElement.height;
    } else if (previewImageAvailable) {
      // 使用图像预览
      previewElement = previewImage;
      previewWidth = previewImage.naturalWidth || previewImage.offsetWidth;
      previewHeight = previewImage.naturalHeight || previewImage.offsetHeight;
    } else {
      // 使用canvas预览
      previewElement = previewCanvas;
      previewWidth = previewCanvas.width || previewCanvas.offsetWidth;
      previewHeight = previewCanvas.height || previewCanvas.offsetHeight;
    }
    
    // 如果水印状态中有保存的图像尺寸，优先使用它们
    if (window.watermarkState && window.watermarkState.imageWidth > 0) {
      previewWidth = window.watermarkState.imageWidth;
      previewHeight = window.watermarkState.imageHeight;
    }
    
    // 获取相对位置
    const relativePosition = window.watermarkState && window.watermarkState.relativePosition 
      ? { ...window.watermarkState.relativePosition }
      : { x: 50, y: 50 };
    
    console.log('水印相对位置:', relativePosition);

    // 根据预览元素更新水印容器位置和大小
    if (superGifAvailable) {
      // 对于SuperGif，我们需要特殊处理水印容器位置
      const gifCanvas = superGifContainer.querySelector('canvas');
      const gifCanvasRect = gifCanvas.getBoundingClientRect();
      const previewContainerRect = document.getElementById('preview-container')?.getBoundingClientRect() || 
        { top: 0, left: 0, width: 0, height: 0 };
      
      // 设置水印容器的尺寸和位置，使其覆盖GIF画布
      watermarkContainer.style.position = 'absolute';
      watermarkContainer.style.top = `${gifCanvasRect.top - previewContainerRect.top}px`;
      watermarkContainer.style.left = `${gifCanvasRect.left - previewContainerRect.left}px`;
      watermarkContainer.style.width = `${gifCanvas.width}px`;
      watermarkContainer.style.height = `${gifCanvas.height}px`;
      watermarkContainer.style.pointerEvents = 'auto'; // 确保可以交互
      
      console.log('水印容器已与GIF画布对齐:', {
        top: watermarkContainer.style.top,
        left: watermarkContainer.style.left,
        width: watermarkContainer.style.width,
        height: watermarkContainer.style.height
      });
    } else {
      // 对于普通图像和Canvas，使用常规方法定位水印容器
      const previewRect = previewElement.getBoundingClientRect();
      const containerRect = watermarkContainer.parentElement?.getBoundingClientRect() || 
        { top: 0, left: 0, width: 0, height: 0 };
      
      // 调整水印容器大小和位置
      watermarkContainer.style.position = 'absolute';
      watermarkContainer.style.top = `${previewRect.top - containerRect.top}px`;
      watermarkContainer.style.left = `${previewRect.left - containerRect.left}px`;
      watermarkContainer.style.width = `${previewWidth}px`;
      watermarkContainer.style.height = `${previewHeight}px`;
      
      console.log('水印容器已与图片对齐:', {
        top: watermarkContainer.style.top,
        left: watermarkContainer.style.left,
        width: watermarkContainer.style.width,
        height: watermarkContainer.style.height
      });
    }
    
    // 使用精确的图像尺寸计算水印大小和位置
    console.log('使用状态中的图像尺寸进行水印大小计算:', previewWidth, previewHeight);
    
    // 获取水印类型和相关设置
    const watermarkType = window.watermarkState?.type || 'text';
    const watermarkText = window.watermarkState?.text || '仅供验证使用';
    const watermarkFontSize = window.watermarkState?.fontSize || 24;
    const watermarkOpacity = window.watermarkState?.opacity || 50;
    const watermarkRotation = window.watermarkState?.rotation || 0;
    const watermarkColor = window.watermarkState?.color || '#ff0000';
    
    // 根据相对位置计算水印的绝对位置
    const absoluteX = (previewWidth * relativePosition.x) / 100;
    const absoluteY = (previewHeight * relativePosition.y) / 100;
    
    // 设置水印大小和外观
    if (watermarkType === 'text') {
      // 文本水印
      watermarkElement.innerHTML = watermarkText;
      watermarkElement.style.fontSize = `${watermarkFontSize}px`;
      watermarkElement.style.color = watermarkColor;
      watermarkElement.style.opacity = watermarkOpacity / 100;
    } else if (watermarkType === 'image' && window.watermarkState?.watermarkImage) {
      // 图像水印
      watermarkElement.innerHTML = '';
      const img = document.createElement('img');
      img.src = window.watermarkState.watermarkImage;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.opacity = watermarkOpacity / 100;
      watermarkElement.appendChild(img);
    }
    
    // 设置水印元素的位置
    watermarkElement.style.position = 'absolute';
    watermarkElement.style.left = `${absoluteX}px`;
    watermarkElement.style.top = `${absoluteY}px`;
    watermarkElement.style.transform = `translate(-50%, -50%) rotate(${watermarkRotation}deg)`;
    
    console.log('水印元素位置已设置:', {
      x: absoluteX,
      y: absoluteY,
      transform: watermarkElement.style.transform,
      previousTransform: watermarkElement.style.transform,
      relativePosition: relativePosition,
      watermarkType: watermarkType
    });
  } catch (error) {
    console.error('更新水印时发生错误:', error);
  }
} 