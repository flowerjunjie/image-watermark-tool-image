/**
 * 水印核心功能模块
 * 处理水印的渲染和更新
 */

import { watermarkState, updateState, saveCurrentImageSettings, WatermarkPosition, WatermarkScaleMode } from './state.js';

/**
 * 更新水印
 */
export function updateWatermark() {
  try {
    // 获取预览图像和水印容器
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkContainer = document.getElementById('watermark-container');
    
    // 如果没有水印容器，直接返回
    if (!watermarkContainer) {
      console.error('水印容器不存在');
      return;
    }
    
    // 确保水印容器可见并设置正确的z-index
    watermarkContainer.style.display = 'flex';
    watermarkContainer.style.zIndex = '999999'; // 更新为最高层级
    watermarkContainer.style.pointerEvents = 'auto';
    
    // 检查预览图像是否存在并可见
    const previewImageAvailable = previewImage && 
      (previewImage.style.display !== 'none') && 
      previewImage.complete;

    // 检查预览画布是否存在并可见
    const previewCanvasAvailable = previewCanvas && 
      (previewCanvas.style.display !== 'none') && 
      previewCanvas.width > 0 && previewCanvas.height > 0;
    
    // 如果没有预览图像和画布，不要清空水印容器，保持当前水印显示
    if (!previewImageAvailable && !previewCanvasAvailable) {
      console.warn('预览图像和画布都不可用，保持当前水印');
      return;
    }
    
    console.log('更新水印，预览图像状态:', {
      previewImageAvailable: previewImageAvailable,
      previewCanvasAvailable: previewCanvasAvailable,
      imageDisplay: previewImage ? previewImage.style.display : 'element不存在',
      imageComplete: previewImage ? previewImage.complete : 'element不存在',
      imageWidth: previewImage ? previewImage.width : 0,
      imageHeight: previewImage ? previewImage.height : 0,
      watermarkType: watermarkState.type,
      hasWatermarkImage: !!watermarkState.watermarkImage
    });
    
    // 设置水印容器尺寸与预览区域一致
    if (previewImageAvailable) {
      watermarkContainer.style.width = `${previewImage.offsetWidth}px`;
      watermarkContainer.style.height = `${previewImage.offsetHeight}px`;
    } else if (previewCanvasAvailable) {
      watermarkContainer.style.width = `${previewCanvas.offsetWidth}px`;
      watermarkContainer.style.height = `${previewCanvas.offsetHeight}px`;
    }
    
    // 清空水印容器
    watermarkContainer.innerHTML = '';
    
    // 创建水印元素
    const watermarkElement = createWatermarkElement();
    
    if (!watermarkElement) {
      console.error('无法创建水印元素');
      return;
    }
    
    // 给水印元素添加ID以便于查找
    watermarkElement.id = 'watermark-element';
    
    // 确保水印元素可见
    watermarkElement.style.display = 'block';
    watermarkElement.style.zIndex = '999999';
    watermarkElement.style.position = 'absolute';
    
    // 调整水印元素大小
    updateWatermarkSize(watermarkElement);
    
    // 将水印元素添加到水印容器
    watermarkContainer.appendChild(watermarkElement);
    
    // 调整水印位置
    updateWatermarkPosition();
    
    // 额外确保水印容器显示在最顶层
    setTimeout(() => {
      if (watermarkContainer) {
        watermarkContainer.style.display = 'flex';
        watermarkContainer.style.zIndex = '999999';
        watermarkContainer.style.pointerEvents = 'auto';
      }
      
      // 同样确保水印元素在最顶层
      const watermarkElem = document.getElementById('watermark-element');
      if (watermarkElem) {
        watermarkElem.style.zIndex = '999999';
        watermarkElem.style.display = 'block';
        
        // 如果是图片水印，确保图片元素也可见
        if (watermarkState.type === 'image') {
          const imgElement = watermarkElem.querySelector('img');
          if (imgElement) {
            imgElement.style.display = 'block';
            imgElement.style.zIndex = '999999';
            imgElement.style.maxWidth = '100%';
            imgElement.style.maxHeight = '100%';
          }
        }
      }
    }, 50);
    
    // 保存当前水印设置到当前图片
    saveCurrentImageSettings();
  } catch (error) {
    console.error('更新水印时出错:', error);
    
    // 错误恢复：尝试重置水印容器
    try {
      const watermarkContainer = document.getElementById('watermark-container');
      if (watermarkContainer) {
        watermarkContainer.innerHTML = '';
        watermarkContainer.style.display = 'flex';
      }
    } catch (e) {
      console.error('尝试恢复水印容器失败:', e);
    }
  }
}

/**
 * 更新水印位置
 */
export function updateWatermarkPosition() {
  try {
    // 获取预览图像和水印容器
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkContainer = document.getElementById('watermark-container');
    
    // 如果没有水印容器，直接返回
    if (!watermarkContainer) {
      console.error('水印容器不存在');
      return;
    }
    
    // 获取水印类型
    const watermarkType = watermarkState.type || 'text';
    
    // 检查是否是GIF
    const isGif = watermarkState.isGif || false;
    
    // 获取预览区域尺寸
    let previewWidth = 0;
    let previewHeight = 0;
    
    if (previewImage && previewImage.style.display !== 'none') {
      // 使用图片的实际尺寸，而不是容器尺寸
      previewWidth = previewImage.naturalWidth || previewImage.offsetWidth;
      previewHeight = previewImage.naturalHeight || previewImage.offsetHeight;
      
      // 更新状态中的图像尺寸
      watermarkState.imageWidth = previewWidth;
      watermarkState.imageHeight = previewHeight;
    } else if (previewCanvas && previewCanvas.style.display !== 'none') {
      previewWidth = previewCanvas.width || previewCanvas.offsetWidth;
      previewHeight = previewCanvas.height || previewCanvas.offsetHeight;
      
      // 更新状态中的图像尺寸
      watermarkState.imageWidth = previewWidth;
      watermarkState.imageHeight = previewHeight;
    } else {
      console.warn('无法获取预览区域尺寸');
      return;
    }
    
    // 确保尺寸有效
    if (previewWidth <= 0 || previewHeight <= 0) {
      console.warn('预览区域尺寸无效:', { width: previewWidth, height: previewHeight });
      return;
    }
    
    // 设置水印容器尺寸与预览区域一致
    watermarkContainer.style.width = `${previewWidth}px`;
    watermarkContainer.style.height = `${previewHeight}px`;
    
    // 确保水印容器与图片精确对齐
    if (previewImage && previewImage.style.display !== 'none') {
      // 获取图片的实际显示尺寸和位置
      const imgRect = previewImage.getBoundingClientRect();
      const containerRect = watermarkContainer.parentElement.getBoundingClientRect();
      
      // 计算相对位置
      const relativeTop = imgRect.top - containerRect.top;
      const relativeLeft = imgRect.left - containerRect.left;
      
      // 设置水印容器位置
      watermarkContainer.style.position = 'absolute';
      watermarkContainer.style.top = `${relativeTop}px`;
      watermarkContainer.style.left = `${relativeLeft}px`;
      watermarkContainer.style.width = `${imgRect.width}px`;
      watermarkContainer.style.height = `${imgRect.height}px`;
      
      console.log('水印容器已与图片对齐:', {
        top: relativeTop,
        left: relativeLeft,
        width: imgRect.width,
        height: imgRect.height
      });
    }
    
    if (watermarkType === 'tile') {
      // 平铺水印，填充整个容器
      watermarkContainer.innerHTML = ''; // 先清空
      watermarkContainer.appendChild(createTiledWatermark());
      return;
    }
    
    // 获取水印元素 (可能是刚创建的)
    const currentWatermarkElement = watermarkContainer.querySelector('#watermark-element') || watermarkContainer.firstChild;
    if (!currentWatermarkElement) {
      console.error('无法获取水印元素');
      return;
    }
    
    // 获取水印元素尺寸
    const watermarkWidth = currentWatermarkElement.offsetWidth || 100;
    const watermarkHeight = currentWatermarkElement.offsetHeight || 50;
    
    // 获取位置选择
    const positionChoice = document.querySelector('input[name="position"]:checked')?.value || 'custom';
    
    // 如果是GIF，特别处理水印元素，确保它在GIF上仍然可见
    if (isGif) {
      currentWatermarkElement.style.position = 'absolute';
      currentWatermarkElement.style.zIndex = '999999';
      if (currentWatermarkElement.style.backgroundColor === '' || 
          currentWatermarkElement.style.backgroundColor === 'transparent') {
        // 可选：为文本水印添加半透明背景，使其在GIF上更易读
        if (watermarkType === 'text') {
          currentWatermarkElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          currentWatermarkElement.style.padding = '2px 5px';
          currentWatermarkElement.style.borderRadius = '3px';
        }
      }
    }
    
    // 根据选择的位置设置水印坐标
    let x, y;
    
    // 如果水印正在被拖动，不要改变它的位置，否则会导致跳跃
    if (currentWatermarkElement.classList.contains('dragging') || watermarkState.isDragging) {
      console.log('水印正在拖动中，保持当前位置');
      return;
    }
    
    // 设置水印位置 - 使用绝对定位
    currentWatermarkElement.style.position = 'absolute';
    
    // 确保relativePosition存在且有效
    if (!watermarkState.relativePosition || 
        typeof watermarkState.relativePosition.x !== 'number' || 
        typeof watermarkState.relativePosition.y !== 'number') {
      console.warn('水印相对位置无效，重置为默认值');
      watermarkState.relativePosition = { x: 50, y: 50 };
    }
    
    // 确保相对位置在有效范围内 (0-100)
    watermarkState.relativePosition.x = Math.max(0, Math.min(100, watermarkState.relativePosition.x));
    watermarkState.relativePosition.y = Math.max(0, Math.min(100, watermarkState.relativePosition.y));
    
    switch (positionChoice) {
      case 'top-left':
        x = watermarkWidth / 2 + (watermarkState.marginX || 20);
        y = watermarkHeight / 2 + (watermarkState.marginY || 20);
        // 保存相对位置
        watermarkState.relativePosition = {
          x: (x / previewWidth) * 100,
          y: (y / previewHeight) * 100
        };
        break;
        
      case 'top-right':
        x = previewWidth - watermarkWidth / 2 - (watermarkState.marginX || 20);
        y = watermarkHeight / 2 + (watermarkState.marginY || 20);
        // 保存相对位置
        watermarkState.relativePosition = {
          x: (x / previewWidth) * 100,
          y: (y / previewHeight) * 100
        };
        break;
        
      case 'bottom-left':
        x = watermarkWidth / 2 + (watermarkState.marginX || 20);
        y = previewHeight - watermarkHeight / 2 - (watermarkState.marginY || 20);
        // 保存相对位置
        watermarkState.relativePosition = {
          x: (x / previewWidth) * 100,
          y: (y / previewHeight) * 100
        };
        break;
        
      case 'bottom-right':
        x = previewWidth - watermarkWidth / 2 - (watermarkState.marginX || 20);
        y = previewHeight - watermarkHeight / 2 - (watermarkState.marginY || 20);
        // 保存相对位置
        watermarkState.relativePosition = {
          x: (x / previewWidth) * 100,
          y: (y / previewHeight) * 100
        };
        break;
        
      case 'center':
        x = previewWidth / 2;
        y = previewHeight / 2;
        // 保存相对位置
        watermarkState.relativePosition = {
          x: 50,
          y: 50
        };
        break;
        
      case 'custom':
      default:
        // 使用相对位置
        if (watermarkState.relativePosition) {
          // 计算基于图片尺寸的绝对位置
          x = (watermarkState.relativePosition.x / 100) * previewWidth;
          y = (watermarkState.relativePosition.y / 100) * previewHeight;
        } else {
          // 默认使用中心位置
          x = previewWidth / 2;
          y = previewHeight / 2;
          
          // 更新状态
          watermarkState.relativePosition = { x: 50, y: 50 };
        }
        break;
    }
    
    // 保存当前的transform，以便提取旋转部分
    const currentTransform = currentWatermarkElement.style.transform || '';
    
    // 设置新位置
    currentWatermarkElement.style.top = `${y}px`;
    currentWatermarkElement.style.left = `${x}px`;
    
    // 基本变换
    let transform = 'translate(-50%, -50%)';
    
    // 如果有旋转，应用旋转
    if (watermarkState.rotation) {
      transform += ` rotate(${watermarkState.rotation}deg)`;
    } 
    // 如果当前transform中已有旋转，保留它
    else if (currentTransform.includes('rotate')) {
      const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
      if (rotateMatch) {
        transform += ` ${rotateMatch[0]}`;
      }
    }
    
    // 应用缩放
    if (watermarkState.scale && watermarkState.scale !== 1.0) {
      transform += ` scale(${watermarkState.scale})`;
    }
    
    currentWatermarkElement.style.transform = transform;
    
    console.log('水印元素位置已设置:', { 
      x, 
      y, 
      transform,
      previousTransform: currentTransform,
      relativePosition: watermarkState.relativePosition,
      imageSize: { width: previewWidth, height: previewHeight }
    });
    
    // 确保水印容器可见
    watermarkContainer.style.display = 'flex';
    watermarkContainer.style.zIndex = '999999';
    watermarkContainer.style.pointerEvents = 'auto';
    
    // 确保水印元素可见
    currentWatermarkElement.style.display = 'block';
    currentWatermarkElement.style.zIndex = '999999';
    
  } catch (error) {
    console.error('更新水印位置时出错:', error);
    
    // 错误恢复：确保水印容器可见
    try {
      const watermarkContainer = document.getElementById('watermark-container');
      if (watermarkContainer) {
        watermarkContainer.style.display = 'flex';
        watermarkContainer.style.zIndex = '999999';
      }
    } catch (e) {
      console.error('尝试恢复水印容器失败:', e);
    }
  }
}

/**
 * 在Canvas上渲染水印
 * @param {HTMLCanvasElement} canvas - 目标Canvas元素
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @returns {Promise} - 渲染完成的Promise
 */
export function renderWatermarkOnCanvas(canvas, ctx) {
  return new Promise((resolve) => {
    try {
      console.log('执行renderWatermarkOnCanvas', watermarkState.type);
      
      // 计算实际位置（基于百分比）
      const actualX = (watermarkState.relativePosition.x / 100) * canvas.width;
      const actualY = (watermarkState.relativePosition.y / 100) * canvas.height;
      
      // 设置透明度
      ctx.globalAlpha = watermarkState.opacity / 100;
      
      // 保存当前的变换状态
      ctx.save();
      
      // 根据水印类型渲染
      switch (watermarkState.type) {
        case 'text':
          renderTextWatermark(ctx, actualX, actualY, canvas.width, canvas.height);
          break;
          
        case 'tiled':
          renderTiledWatermark(ctx, canvas.width, canvas.height);
          break;
          
        case 'image':
          if (watermarkState.watermarkImage) {
            renderImageWatermark(ctx, actualX, actualY, canvas.width, canvas.height);
          } else {
            console.warn('未设置水印图片');
          }
          break;
          
        default:
          console.warn('未知的水印类型:', watermarkState.type);
          break;
      }
      
      // 恢复变换状态
      ctx.restore();
      
      // 重置透明度
      ctx.globalAlpha = 1.0;
      
      resolve();
    } catch (error) {
      console.error('渲染水印时出错:', error);
      resolve(); // 即使出错也解析Promise以避免阻塞
    }
  });
}

/**
 * 渲染文字水印
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} canvasWidth - Canvas宽度
 * @param {number} canvasHeight - Canvas高度
 */
function renderTextWatermark(ctx, x, y, canvasWidth, canvasHeight) {
  // 设置旋转中心点到水印位置
  ctx.translate(x, y);
  ctx.rotate((watermarkState.rotation * Math.PI) / 180);
  
  // 设置字体和颜色
  // 不再限制最小字体大小，直接使用用户设置的字体大小
  const fontSize = watermarkState.fontSize * watermarkState.scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = watermarkState.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制文字
  ctx.fillText(watermarkState.text, 0, 0);
}

/**
 * 渲染平铺水印
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} canvasWidth - Canvas宽度
 * @param {number} canvasHeight - Canvas高度
 */
function renderTiledWatermark(ctx, canvasWidth, canvasHeight) {
  // 设置字体和颜色
  const fontSize = watermarkState.fontSize * watermarkState.scale;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = watermarkState.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const spacing = watermarkState.tileSpacing;
  
  // 确保覆盖整个画布，留出边距
  for (let x = spacing / 2; x < canvasWidth + spacing; x += spacing) {
    for (let y = spacing / 2; y < canvasHeight + spacing; y += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((watermarkState.rotation * Math.PI) / 180);
      ctx.fillText(watermarkState.text, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * 渲染图片水印
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} canvasWidth - Canvas宽度
 * @param {number} canvasHeight - Canvas高度
 */
function renderImageWatermark(ctx, x, y, canvasWidth, canvasHeight) {
  // 确保水印图片存在
  if (!watermarkState.watermarkImage) return;
  
  // 计算水印图片大小
  const watermarkImageWidth = watermarkState.watermarkImage.width;
  const watermarkImageHeight = watermarkState.watermarkImage.height;
  
  // 计算水印图片的目标尺寸（基于图片的百分比和缩放比例）
  const targetWidth = (canvasWidth * watermarkState.watermarkImageSize / 100) * watermarkState.scale;
  const targetHeight = (targetWidth / watermarkImageWidth) * watermarkImageHeight;
  
  // 设置旋转中心点到水印位置
  ctx.translate(x, y);
  ctx.rotate((watermarkState.rotation * Math.PI) / 180);
  
  // 绘制图片水印，居中对齐
  ctx.drawImage(
    watermarkState.watermarkImage,
    -targetWidth / 2,
    -targetHeight / 2,
    targetWidth,
    targetHeight
  );
}

/**
 * 使元素可拖动
 * @param {HTMLElement} element - 要使可拖动的元素
 */
function makeDraggable(element) {
  if (!element) return;
  
  // 初始位置
  let posX = 0, posY = 0;
  let initialX, initialY;
  let isDragging = false;
  
  // 开始拖动
  function dragStart(e) {
    e.preventDefault();
    
    // 获取当前鼠标/触摸位置
    if (e.type === 'touchstart') {
      initialX = e.touches[0].clientX;
      initialY = e.touches[0].clientY;
    } else {
      initialX = e.clientX;
      initialY = e.clientY;
    }
    
    // 获取水印元素的当前位置（中心点）
    const rect = element.getBoundingClientRect();
    
    // 使用元素的当前位置作为起始点，这样拖动时就不会跳跃
    // 注意：由于元素使用了transform: translate(-50%, -50%)，所以其实际位置是中心点
    posX = parseFloat(element.style.left) || rect.left + rect.width / 2;
    posY = parseFloat(element.style.top) || rect.top + rect.height / 2;
    
    // 保存当前的变换属性
    const currentTransform = element.style.transform || '';
    
    console.log('开始拖动水印:', {
      initialMouse: { x: initialX, y: initialY },
      elementCenter: { x: posX, y: posY },
      elementRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      style: {
        left: element.style.left,
        top: element.style.top,
        transform: currentTransform
      }
    });
    
    // 确保元素已经有正确的transform属性
    if (!currentTransform.includes('translate(-50%, -50%)')) {
      // 提取旋转部分
      let rotation = '';
      if (currentTransform.includes('rotate')) {
        const rotateMatch = currentTransform.match(/rotate\([^)]+\)/);
        rotation = rotateMatch ? rotateMatch[0] : '';
      }
      
      // 设置正确的transform
      if (rotation) {
        element.style.transform = `translate(-50%, -50%) ${rotation}`;
      } else {
        element.style.transform = 'translate(-50%, -50%)';
      }
    }
    
    isDragging = true;
    
    // 添加事件监听器
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
    
    // 添加拖动中的样式
    element.classList.add('dragging');
  }
  
  // 拖动过程
  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    // 获取当前鼠标/触摸位置
    let currentX, currentY;
    if (e.type === 'touchmove') {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }
    
    // 计算移动距离（相对于拖动开始时的鼠标位置）
    const deltaX = currentX - initialX;
    const deltaY = currentY - initialY;
    
    // 更新位置（基于拖动开始时的元素位置）
    const newX = posX + deltaX;
    const newY = posY + deltaY;
    
    // 更新元素位置 - 使用transform来移动元素，这样不会与translate(-50%, -50%)冲突
    // 保留元素的translate(-50%, -50%)变换，这样元素的中心点才会对齐到鼠标位置
    const transform = element.style.transform || '';
    const hasRotation = transform.includes('rotate');
    
    // 提取旋转部分
    let rotation = '';
    if (hasRotation) {
      const rotateMatch = transform.match(/rotate\([^)]+\)/);
      rotation = rotateMatch ? rotateMatch[0] : '';
    }
    
    // 设置新的变换，保留translate(-50%, -50%)和旋转
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
    
    // 确保transform属性保持translate(-50%, -50%)，这样元素中心点才会对齐
    if (rotation) {
      element.style.transform = `translate(-50%, -50%) ${rotation}`;
    } else {
      element.style.transform = 'translate(-50%, -50%)';
    }
    
    console.log('拖动水印 - 新位置:', {
      x: newX,
      y: newY,
      transform: element.style.transform
    });
    
    // 获取预览图像或画布
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const previewContainer = document.getElementById('preview-container');
    
    // 确定参考元素 - 优先使用显示的图像或画布
    let referenceElement = null;
    if (previewImage && previewImage.style.display !== 'none' && 
        previewImage.naturalWidth > 0 && previewImage.naturalHeight > 0) {
      referenceElement = previewImage;
      console.log('使用预览图像作为参考元素');
    } else if (previewCanvas && previewCanvas.style.display !== 'none') {
      referenceElement = previewCanvas;
      console.log('使用预览画布作为参考元素');
    } else if (previewContainer) {
      referenceElement = previewContainer;
      console.log('使用预览容器作为参考元素');
    }
    
    if (referenceElement) {
      // 获取参考元素的边界
      const rect = referenceElement.getBoundingClientRect();
      
      // 计算相对位置（相对于图像/画布的实际尺寸）
      // 确保坐标是相对于图像/画布的内容区域，而不是元素边界
      const relativeX = ((newX - rect.left) / rect.width) * 100;
      const relativeY = ((newY - rect.top) / rect.height) * 100;
      
      console.log('水印拖动 - 相对位置:', {
        x: Math.max(0, Math.min(100, relativeX)).toFixed(2),
        y: Math.max(0, Math.min(100, relativeY)).toFixed(2),
        referenceWidth: rect.width,
        referenceHeight: rect.height
      });
      
      // 更新状态
      updateState({
        relativePosition: {
          x: Math.max(0, Math.min(100, relativeX)),
          y: Math.max(0, Math.min(100, relativeY))
        }
      });
    } else {
      console.warn('无法找到参考元素来计算相对位置');
    }
  }
  
  // 结束拖动
  function dragEnd() {
    isDragging = false;
    
    // 移除事件监听器
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchend', dragEnd);
    
    // 移除拖动中的样式
    element.classList.remove('dragging');
    
    // 获取当前位置
    const rect = element.getBoundingClientRect();
    const elementX = rect.left + rect.width / 2;
    const elementY = rect.top + rect.height / 2;
    
    console.log('拖动结束，水印最终位置:', {
      x: elementX,
      y: elementY
    });
    
    // 保存水印位置到当前图片
    saveCurrentImageSettings();
  }
  
  // 添加事件监听器
  element.addEventListener('mousedown', dragStart);
  element.addEventListener('touchstart', dragStart, { passive: false });
}

/**
 * 应用水印到画布
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Number} width - 画布宽度
 * @param {Number} height - 画布高度
 * @param {Object} options - 水印选项
 */
export function applyWatermarkToCanvas(ctx, width, height, options = {}) {
  // 默认选项
  const defaultOptions = {
    type: 'text',                 // 水印类型：text 或 image
    text: '仅供验证使用',          // 水印文本
    color: '#000000',             // 水印颜色
    fontSize: 24,                 // 字体大小
    opacity: 0.5,                 // 透明度
    rotation: 0,                  // 旋转角度
    position: WatermarkPosition.CUSTOM, // 定位方式
    positionX: width / 2,         // X坐标
    positionY: height / 2,        // Y坐标
    marginX: 20,                  // 水平边距
    marginY: 20,                  // 垂直边距
    scaleMode: WatermarkScaleMode.FIXED, // 缩放模式
    scaleRatio: 0.2,              // 缩放比例（相对于图片大小）
    watermarkImage: null,         // 水印图片对象
    tileSpacing: 150              // 平铺间距
  };

  // 合并选项
  const mergedOptions = { ...defaultOptions, ...options };

  // 保存当前上下文状态
  ctx.save();

  // 设置透明度
  ctx.globalAlpha = mergedOptions.opacity;

  // 根据水印类型应用不同的水印
  if (mergedOptions.type === 'text') {
    applyTextWatermark(ctx, width, height, mergedOptions);
  } else if (mergedOptions.type === 'image' && mergedOptions.watermarkImage) {
    applyImageWatermark(ctx, width, height, mergedOptions);
  }

  // 恢复上下文状态
  ctx.restore();
}

/**
 * 应用文本水印
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Number} width - 画布宽度
 * @param {Number} height - 画布高度
 * @param {Object} options - 水印选项
 */
function applyTextWatermark(ctx, width, height, options) {
  // 设置文本样式
  ctx.font = `${options.fontSize}px Arial`;
  ctx.fillStyle = options.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 计算文本宽度
  const textWidth = ctx.measureText(options.text).width;
  const textHeight = options.fontSize;

  // 如果是平铺模式
  if (options.position === WatermarkPosition.TILE) {
    applyTiledWatermark(ctx, width, height, options, (x, y) => {
      drawRotatedText(ctx, options.text, x, y, options.rotation);
    });
    return;
  }

  // 计算水印位置
  const position = calculatePosition(width, height, textWidth, textHeight, options);
  
  // 绘制旋转文本
  drawRotatedText(ctx, options.text, position.x, position.y, options.rotation);
}

/**
 * 应用图片水印
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Number} width - 画布宽度
 * @param {Number} height - 画布高度
 * @param {Object} options - 水印选项
 */
function applyImageWatermark(ctx, width, height, options) {
  const watermarkImg = options.watermarkImage;
  
  if (!watermarkImg || !watermarkImg.complete) {
    console.warn('水印图片未加载完成');
    return;
  }

  // 计算水印图片尺寸
  let imgWidth = watermarkImg.width;
  let imgHeight = watermarkImg.height;
  
  // 根据缩放模式调整大小
  if (options.scaleMode === WatermarkScaleMode.RELATIVE) {
    // 相对于图片大小的百分比缩放
    imgWidth = width * options.scaleRatio;
    // 保持图片原始宽高比
    const aspectRatio = watermarkImg.width / watermarkImg.height;
    imgHeight = imgWidth / aspectRatio;
  }

  // 如果是平铺模式
  if (options.position === WatermarkPosition.TILE) {
    applyTiledWatermark(ctx, width, height, options, (x, y) => {
      drawRotatedImage(ctx, watermarkImg, x, y, imgWidth, imgHeight, options.rotation);
    });
    return;
  }

  // 计算水印位置
  const position = calculatePosition(width, height, imgWidth, imgHeight, options);
  
  // 绘制旋转图片
  drawRotatedImage(ctx, watermarkImg, position.x, position.y, imgWidth, imgHeight, options.rotation);
}

/**
 * 计算水印位置
 * @param {Number} canvasWidth - 画布宽度
 * @param {Number} canvasHeight - 画布高度
 * @param {Number} watermarkWidth - 水印宽度
 * @param {Number} watermarkHeight - 水印高度
 * @param {Object} options - 水印选项
 * @returns {Object} - 水印位置坐标
 */
function calculatePosition(canvasWidth, canvasHeight, watermarkWidth, watermarkHeight, options) {
  // 默认使用中心位置
  let x = canvasWidth / 2;
  let y = canvasHeight / 2;

  // 检查position是否为对象
  if (typeof options.position === 'object' && options.position !== null) {
    // 如果position是对象，使用其x和y属性计算位置（百分比）
    x = (options.position.x / 100) * canvasWidth;
    y = (options.position.y / 100) * canvasHeight;
  }
  // 如果是自定义位置且提供了positionX和positionY
  else if (options.position === 'custom' && options.positionX !== undefined && options.positionY !== undefined) {
    // 使用positionX和positionY（百分比）
    x = (options.positionX / 100) * canvasWidth;
    y = (options.positionY / 100) * canvasHeight;
  }
  // 根据预定义位置计算
  else if (typeof options.position === 'string') {
    switch (options.position) {
      case WatermarkPosition.TOP_LEFT:
      case 'top-left':
        x = watermarkWidth / 2 + options.marginX;
        y = watermarkHeight / 2 + options.marginY;
        break;
      case WatermarkPosition.TOP_RIGHT:
      case 'top-right':
        x = canvasWidth - watermarkWidth / 2 - options.marginX;
        y = watermarkHeight / 2 + options.marginY;
        break;
      case WatermarkPosition.BOTTOM_LEFT:
      case 'bottom-left':
        x = watermarkWidth / 2 + options.marginX;
        y = canvasHeight - watermarkHeight / 2 - options.marginY;
        break;
      case WatermarkPosition.BOTTOM_RIGHT:
      case 'bottom-right':
        x = canvasWidth - watermarkWidth / 2 - options.marginX;
        y = canvasHeight - watermarkHeight / 2 - options.marginY;
        break;
      case WatermarkPosition.CENTER:
      case 'center':
        x = canvasWidth / 2;
        y = canvasHeight / 2;
        break;
      default:
        // 默认使用中心位置
        break;
    }
  }

  return { x, y };
}

/**
 * 应用平铺水印
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Number} width - 画布宽度
 * @param {Number} height - 画布高度
 * @param {Object} options - 水印选项
 * @param {Function} drawFunc - 绘制函数
 */
function applyTiledWatermark(ctx, width, height, options, drawFunc) {
  const spacing = options.tileSpacing;
  
  // 计算行列数
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  
  // 平铺绘制水印
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing;
      const y = row * spacing;
      drawFunc(x, y);
    }
  }
}

/**
 * 绘制旋转文本
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {String} text - 文本内容
 * @param {Number} x - X坐标
 * @param {Number} y - Y坐标
 * @param {Number} angle - 旋转角度
 */
function drawRotatedText(ctx, text, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * 绘制旋转图片
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLImageElement} image - 图片对象
 * @param {Number} x - X坐标
 * @param {Number} y - Y坐标
 * @param {Number} width - 图片宽度
 * @param {Number} height - 图片高度
 * @param {Number} angle - 旋转角度
 */
function drawRotatedImage(ctx, image, x, y, width, height, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/**
 * 创建水印元素
 * @returns {HTMLElement} - 水印元素
 */
function createWatermarkElement() {
  // 获取水印类型
  const watermarkType = watermarkState.type || 'text';
  let watermarkElement;
  
  switch (watermarkType) {
    case 'text':
      // 创建文本水印
      const watermarkText = watermarkState.text || '水印文本';
      watermarkElement = document.createElement('div');
      watermarkElement.id = 'watermark-element';
      watermarkElement.className = 'draggable-watermark';
      watermarkElement.textContent = watermarkText;
      watermarkElement.style.color = watermarkState.color || 'rgba(0, 0, 0, 0.5)';
      watermarkElement.style.fontSize = `${watermarkState.fontSize || 24}px`;
      watermarkElement.style.opacity = watermarkState.opacity / 100 || 0.5;
      watermarkElement.style.transform = `translate(-50%, -50%) rotate(${watermarkState.rotation || 0}deg)`;
      watermarkElement.style.zIndex = '999999'; // 确保z-index非常高
      
      // 使其可拖动
      makeDraggable(watermarkElement);
      break;
      
    case 'image':
      // 创建图片水印
      const watermarkImg = watermarkState.watermarkImage;
      if (!watermarkImg) {
        console.error('没有设置水印图片');
        return null;
      }
      
      console.log('创建图片水印，图片对象:', watermarkImg);
      
      watermarkElement = document.createElement('div');
      watermarkElement.id = 'watermark-element';
      watermarkElement.className = 'draggable-watermark';
      watermarkElement.style.opacity = watermarkState.opacity / 100 || 0.5;
      watermarkElement.style.transform = `translate(-50%, -50%) rotate(${watermarkState.rotation || 0}deg)`;
      watermarkElement.style.zIndex = '999999'; // 确保z-index非常高
      watermarkElement.style.position = 'absolute';
      watermarkElement.style.display = 'block';
      
      // 创建图片元素
      const imgElement = document.createElement('img');
      
      // 检查水印图片的类型
      if (typeof watermarkImg === 'string') {
        // 如果是字符串（URL或DataURL），直接设置
        imgElement.src = watermarkImg;
        console.log('使用字符串URL作为水印图片源');
      } else if (watermarkImg instanceof HTMLImageElement) {
        // 如果是Image对象，使用其src
        imgElement.src = watermarkImg.src;
        console.log('使用Image对象的src作为水印图片源');
      } else if (watermarkImg instanceof File) {
        // 如果是File对象，创建一个临时URL
        const tempUrl = URL.createObjectURL(watermarkImg);
        imgElement.src = tempUrl;
        console.log('使用File对象创建临时URL作为水印图片源');
        // 在图片加载完成后释放URL
        imgElement.onload = () => URL.revokeObjectURL(tempUrl);
      } else {
        console.error('不支持的水印图片类型:', typeof watermarkImg);
        return null;
      }
      
      imgElement.style.maxWidth = '100%';
      imgElement.style.maxHeight = '100%';
      imgElement.style.display = 'block';
      imgElement.style.zIndex = '999999'; // 确保图片元素也有高z-index
      
      // 添加到水印容器
      watermarkElement.appendChild(imgElement);
      
      // 使其可拖动
      makeDraggable(watermarkElement);
      break;
      
    case 'tile':
      // 创建平铺水印（将在外部处理）
      watermarkElement = document.createElement('div');
      watermarkElement.id = 'watermark-element';
      watermarkElement.className = 'watermark';
      watermarkElement.style.zIndex = '999999'; // 确保z-index非常高
      break;
      
    default:
      console.error('未知的水印类型:', watermarkType);
      return null;
  }
  
  return watermarkElement;
}

/**
 * 更新水印元素大小
 * @param {HTMLElement} watermarkElement - 水印元素
 */
function updateWatermarkSize(watermarkElement) {
  try {
    if (!watermarkElement) return;
    
    // 获取预览区域大小
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    
    let previewWidth, previewHeight;
    
    // 优先使用状态中存储的图像尺寸
    if (watermarkState.imageWidth > 0 && watermarkState.imageHeight > 0) {
      previewWidth = watermarkState.imageWidth;
      previewHeight = watermarkState.imageHeight;
      console.log('使用状态中的图像尺寸进行水印大小计算:', previewWidth, previewHeight);
    }
    // 如果状态中没有，则从DOM元素获取
    else if (previewImage && previewImage.style.display !== 'none') {
      previewWidth = previewImage.offsetWidth;
      previewHeight = previewImage.offsetHeight;
      console.log('使用DOM中的图像尺寸进行水印大小计算:', previewWidth, previewHeight);
    } else if (previewCanvas && previewCanvas.style.display !== 'none') {
      previewWidth = previewCanvas.offsetWidth;
      previewHeight = previewCanvas.offsetHeight;
      console.log('使用Canvas尺寸进行水印大小计算:', previewWidth, previewHeight);
    } else {
      console.warn('无法获取预览区域尺寸，无法调整水印大小');
      return;
    }
    
    // 确保尺寸有效
    if (previewWidth <= 0 || previewHeight <= 0) {
      console.warn('预览区域尺寸无效，无法调整水印大小');
      return;
    }
    
    // 获取水印类型
    const watermarkType = watermarkState.type || 'text';
    
    if (watermarkType === 'image') {
      // 调整图片水印大小
      const imageSize = watermarkState.watermarkImageSize || 40; // 默认40%
      const maxDimension = Math.min(previewWidth, previewHeight);
      const size = (maxDimension * imageSize) / 100;
      
      console.log('调整图片水印大小:', {
        imageSize: imageSize + '%',
        maxDimension,
        calculatedSize: size
      });
      
      // 查找图片元素
      const imgElement = watermarkElement.querySelector('img');
      if (!imgElement) {
        console.error('找不到水印图片元素');
        return;
      }
      
      // 监听图片加载完成事件，以获取正确的宽高比
      imgElement.onload = function() {
        const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
        console.log('水印图片加载完成，宽高比:', aspectRatio);
        
        // 设置水印元素大小
        if (aspectRatio >= 1) {
          // 宽度大于高度
          watermarkElement.style.width = `${size}px`;
          watermarkElement.style.height = `${size / aspectRatio}px`;
        } else {
          // 高度大于宽度
          watermarkElement.style.width = `${size * aspectRatio}px`;
          watermarkElement.style.height = `${size}px`;
        }
        
        console.log('水印元素大小已设置:', {
          width: watermarkElement.style.width,
          height: watermarkElement.style.height
        });
      };
      
      // 如果图片已经加载完成，立即设置大小
      if (imgElement.complete) {
        const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight || 1;
        console.log('水印图片已加载，直接使用宽高比:', aspectRatio);
        
        // 设置水印元素大小
        if (aspectRatio >= 1) {
          // 宽度大于高度
          watermarkElement.style.width = `${size}px`;
          watermarkElement.style.height = `${size / aspectRatio}px`;
        } else {
          // 高度大于宽度
          watermarkElement.style.width = `${size * aspectRatio}px`;
          watermarkElement.style.height = `${size}px`;
        }
        
        console.log('水印元素大小已设置:', {
          width: watermarkElement.style.width,
          height: watermarkElement.style.height
        });
      }
    }
    // 文本水印不需要调整大小，它由字体大小决定
    
  } catch (error) {
    console.error('更新水印大小时出错:', error);
  }
}

/**
 * 创建平铺水印
 * @returns {HTMLElement} - 平铺水印元素
 */
function createTiledWatermark() {
  try {
    // 获取水印设置
    const text = watermarkState.text || '仅供验证使用';
    const fontSize = watermarkState.fontSize || 36;
    const color = watermarkState.color || 'red';
    const opacity = watermarkState.opacity !== undefined ? watermarkState.opacity / 100 : 0.5;
    const rotation = watermarkState.rotation || 0;
    const spacing = watermarkState.tileSpacing || 150;
    
    // 创建一个容器
    const container = document.createElement('div');
    container.className = 'tiled-watermark-container';
    container.style.position = 'absolute';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.top = '0';
    container.style.left = '0';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    
    // 获取预览区域大小
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    
    let width, height;
    
    if (previewImage && previewImage.style.display !== 'none') {
      width = previewImage.offsetWidth;
      height = previewImage.offsetHeight;
    } else if (previewCanvas && previewCanvas.style.display !== 'none') {
      width = previewCanvas.offsetWidth;
      height = previewCanvas.offsetHeight;
    } else {
      return container;
    }
    
    // 计算需要多少行和列
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    
    // 创建平铺
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const element = document.createElement('div');
        element.textContent = text;
        element.style.position = 'absolute';
        element.style.left = `${col * spacing}px`;
        element.style.top = `${row * spacing}px`;
        element.style.color = color;
        element.style.fontSize = `${fontSize}px`;
        element.style.opacity = opacity;
        element.style.transform = `rotate(${rotation}deg)`;
        element.style.whiteSpace = 'nowrap';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.fontWeight = 'bold';
        element.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
        
        container.appendChild(element);
      }
    }
    
    return container;
  } catch (error) {
    console.error('创建平铺水印时出错:', error);
    return document.createElement('div');
  }
}

// 检查是否为开发模式
const isDevelopMode = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('local');

// 导出水印位置和缩放模式枚举
export { WatermarkPosition, WatermarkScaleMode }; 