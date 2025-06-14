/**
 * 水印核心功能模块
 * 处理水印的渲染和更新
 */

import { watermarkState, updateState, WatermarkPosition, WatermarkScaleMode } from './state.js';

/**
 * 更新水印显示
 */
export function updateWatermark() {
  console.log('执行updateWatermark函数');
  
  try {
    // 获取DOM元素
    const watermarkContainer = document.getElementById('watermark-container');
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkTextInput = document.getElementById('watermark-text');
    
    // 修改条件判断，支持Canvas模式
    if (!previewCanvas && (!previewImage || !previewImage.src || previewImage.style.display === 'none')) {
      if (!watermarkState.originalImage) {
        console.log('无法更新水印：缺少必要元素或图片未加载');
        return;
      }
    }
    
    // 确保预览容器是可见的且背景透明
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) {
      previewContainer.style.backgroundColor = 'transparent';
    }
    
    // 彻底清除所有水印元素
    const existingWatermark = document.getElementById('watermark-element');
    if (existingWatermark) {
      console.log('删除已存在的水印元素');
      existingWatermark.remove();
    }
    
    // 清除现有水印容器内容
    if (watermarkContainer) {
      console.log('清除现有水印容器内容');
      watermarkContainer.innerHTML = '';
    }
    
    // 获取最新输入的水印文本
    if (watermarkTextInput) {
      watermarkState.text = watermarkTextInput.value || '仅供验证使用';
    }
    
    // 获取当前图片尺寸
    let currentImageWidth = 0;
    let currentImageHeight = 0;
    
    if (watermarkState.originalImage) {
      currentImageWidth = watermarkState.originalImage.width;
      currentImageHeight = watermarkState.originalImage.height;
    } else if (previewImage && previewImage.complete) {
      currentImageWidth = previewImage.naturalWidth;
      currentImageHeight = previewImage.naturalHeight;
    }
    
    // 更新状态中的图片尺寸
    if (currentImageWidth > 0 && currentImageHeight > 0) {
      updateState({
        imageWidth: currentImageWidth,
        imageHeight: currentImageHeight
      });
      console.log(`更新图片尺寸: ${currentImageWidth}x${currentImageHeight}`);
    }
    
    // 检测是否为小图片，调整相应参数
    const isSmallImage = currentImageWidth < 300 || currentImageHeight < 300;
    
    // 根据图片大小调整水印大小
    if (isSmallImage && !watermarkState.sizeAdjusted) {
      // 调整水印缩放比例，但不再限制字体大小
      const adjustedScale = Math.max(0.5, Math.min(watermarkState.scale || 1.0, 0.8));
      
      updateState({
        scale: adjustedScale,
        sizeAdjusted: true
      });
      console.log('小图片自动调整: 缩放比例=', adjustedScale);
    } else if (!isSmallImage && !watermarkState.sizeAdjusted) {
      // 对于正常大小的图片，不再限制最小字体大小
      updateState({
        sizeAdjusted: true
      });
      console.log('正常图片设置: 字体大小=', watermarkState.fontSize);
    }
    
    // 显示Canvas，隐藏图片
    if (previewCanvas && watermarkState.originalImage) {
      // 确保Canvas上下文存在
      if (!watermarkState.previewCtx) {
        updateState({
          previewCtx: previewCanvas.getContext('2d')
        });
      }
      
      // 获取原始图片
      const originalImage = watermarkState.originalImage;
      
      // 设置Canvas尺寸与原始图片一致
      const width = originalImage.width;
      const height = originalImage.height;
      
      // 调整Canvas大小
      previewCanvas.width = width;
      previewCanvas.height = height;
      
      // 获取上下文
      const ctx = watermarkState.previewCtx;
      
      // 清除之前的内容
      ctx.clearRect(0, 0, width, height);
      
      // 绘制原始图片
      ctx.drawImage(originalImage, 0, 0);
      
      // 在Canvas上渲染水印
      renderWatermarkOnCanvas(previewCanvas, ctx);
      
      // 显示Canvas，隐藏图片
      previewCanvas.style.display = 'block';
      if (previewImage) previewImage.style.display = 'none';
    } else if (previewImage) {
      // 传统模式 - 显示图片
      previewImage.style.display = 'block';
      if (previewCanvas) previewCanvas.style.display = 'none';
    }
    
    // 创建拖动控制元素
    if (watermarkContainer) {
      watermarkContainer.style.display = 'block';
      watermarkContainer.style.pointerEvents = 'auto';
      // 提高水印容器的z-index优先级，确保水印显示在最上层
      watermarkContainer.style.zIndex = '9999';
      
      // 创建一个拖动控制元素
      const dragHandle = document.createElement('div');
      dragHandle.id = 'watermark-element';
      dragHandle.className = 'watermark-drag-handle';
      dragHandle.style.position = 'absolute';
      dragHandle.style.left = `${watermarkState.relativePosition.x}%`;
      dragHandle.style.top = `${watermarkState.relativePosition.y}%`;
      dragHandle.style.width = '100px';
      dragHandle.style.height = '50px';
      dragHandle.style.transform = 'translate(-50%, -50%)';
      dragHandle.style.cursor = 'move';
      dragHandle.style.background = 'transparent';
      dragHandle.style.border = '2px dashed rgba(0, 0, 255, 0.4)';
      // 提高水印元素的z-index，确保它显示在最上层
      dragHandle.style.zIndex = '10000';
      
      watermarkContainer.appendChild(dragHandle);
      
      // 使拖动元素可拖动
      makeDraggable(dragHandle);
      console.log('创建了拖动控制元素');
    }
  } catch (error) {
    console.error('更新水印时出错:', error);
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
 * @param {HTMLElement} element - 要设置为可拖动的元素
 */
export function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.onmousedown = dragMouseDown;
  element.ontouchstart = dragTouchStart;
  
  // 记录元素位置的函数
  function recordElementPosition() {
    // 获取父容器尺寸
    const container = element.parentElement;
    const rect = container.getBoundingClientRect();
    
    // 计算元素的中心位置
    const elementRect = element.getBoundingClientRect();
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;
    
    // 计算相对位置（百分比）
    const relX = ((centerX - rect.left) / rect.width) * 100;
    const relY = ((centerY - rect.top) / rect.height) * 100;
    
    // 更新状态
    updateState({
      relativePosition: {
        x: relX,
        y: relY
      }
    });
    
    console.log(`水印位置已更新: ${relX.toFixed(2)}%, ${relY.toFixed(2)}%`);
    
    // 更新水印
    updateWatermark();
  }
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    
    // 获取鼠标初始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 添加鼠标事件监听器
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function dragTouchStart(e) {
    e = e || window.event;
    e.preventDefault();
    
    const touch = e.touches[0];
    
    // 获取触摸初始位置
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    
    // 添加触摸事件监听器
    document.ontouchend = closeTouchElement;
    document.ontouchcancel = closeTouchElement;
    document.ontouchmove = touchElementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    // 计算鼠标位置偏移量
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 设置元素的新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function touchElementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    const touch = e.touches[0];
    
    // 计算触摸位置偏移量
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    
    // 设置元素的新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
    
    // 记录最终位置
    recordElementPosition();
  }
  
  function closeTouchElement() {
    // 停止移动
    document.ontouchend = null;
    document.ontouchcancel = null;
    document.ontouchmove = null;
    
    // 记录最终位置
    recordElementPosition();
  }
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
  // 默认使用自定义位置
  let x = options.positionX;
  let y = options.positionY;

  // 根据定位方式计算位置
  switch (options.position) {
    case WatermarkPosition.TOP_LEFT:
      x = watermarkWidth / 2 + options.marginX;
      y = watermarkHeight / 2 + options.marginY;
      break;
    case WatermarkPosition.TOP_RIGHT:
      x = canvasWidth - watermarkWidth / 2 - options.marginX;
      y = watermarkHeight / 2 + options.marginY;
      break;
    case WatermarkPosition.BOTTOM_LEFT:
      x = watermarkWidth / 2 + options.marginX;
      y = canvasHeight - watermarkHeight / 2 - options.marginY;
      break;
    case WatermarkPosition.BOTTOM_RIGHT:
      x = canvasWidth - watermarkWidth / 2 - options.marginX;
      y = canvasHeight - watermarkHeight / 2 - options.marginY;
      break;
    case WatermarkPosition.CENTER:
      x = canvasWidth / 2;
      y = canvasHeight / 2;
      break;
    case WatermarkPosition.CUSTOM:
    default:
      // 使用传入的自定义位置
      break;
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

// 导出水印位置和缩放模式枚举
export { WatermarkPosition, WatermarkScaleMode }; 