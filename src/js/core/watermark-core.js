/**
 * 水印核心功能模块
 * 处理水印渲染和应用到图像
 */

import { getWatermarkOptions } from './state.js';

/**
 * 计算水印位置
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 * @param {number} watermarkWidth 水印宽度
 * @param {number} watermarkHeight 水印高度
 * @param {Object} options 水印选项
 * @returns {Object} 水印位置 {x, y}
 */
export function calculateWatermarkPosition(containerWidth, containerHeight, watermarkWidth, watermarkHeight, options) {
  // 获取位置选项
  const { position, positionX, positionY, marginX, marginY } = options;
  
  // 默认位置
  let x = 0;
  let y = 0;
  
  // 根据位置类型计算坐标
  switch (position) {
    case 'top-left':
      x = marginX;
      y = marginY;
      break;
    case 'top-right':
      x = containerWidth - watermarkWidth - marginX;
      y = marginY;
      break;
    case 'bottom-left':
      x = marginX;
      y = containerHeight - watermarkHeight - marginY;
      break;
    case 'bottom-right':
      x = containerWidth - watermarkWidth - marginX;
      y = containerHeight - watermarkHeight - marginY;
      break;
    case 'center':
      x = (containerWidth - watermarkWidth) / 2;
      y = (containerHeight - watermarkHeight) / 2;
      break;
    case 'custom':
    default:
      // 使用百分比位置
      x = (positionX / 100) * containerWidth - (watermarkWidth / 2);
      y = (positionY / 100) * containerHeight - (watermarkHeight / 2);
      break;
  }
  
  // 确保水印不超出边界
  x = Math.max(marginX, Math.min(containerWidth - watermarkWidth - marginX, x));
  y = Math.max(marginY, Math.min(containerHeight - watermarkHeight - marginY, y));
  
  return { x, y };
}

/**
 * 计算水印大小
 * @param {number} containerWidth 容器宽度
 * @param {number} containerHeight 容器高度
 * @param {Object} options 水印选项
 * @returns {Object} 水印大小 {width, height, fontSize}
 */
export function calculateWatermarkSize(containerWidth, containerHeight, options) {
  const { scaleMode, scaleRatio, fontSize, imageSize, type } = options;
  
  // 默认大小
  let width = 0;
  let height = 0;
  let adjustedFontSize = fontSize;
  
  if (type === 'text') {
    // 文本水印大小由字体大小决定
    if (scaleMode === 'relative') {
      // 根据容器大小计算字体大小
      const minDimension = Math.min(containerWidth, containerHeight);
      adjustedFontSize = Math.max(10, Math.round((scaleRatio / 100) * minDimension));
    }
    
    // 文本宽高需要在渲染时计算
    width = adjustedFontSize * 10; // 临时估计值
    height = adjustedFontSize * 1.2;
  } else if (type === 'image' && options.image) {
    // 图片水印大小
    const img = options.image;
    const imgRatio = img.width / img.height;
    
    if (scaleMode === 'relative') {
      // 根据容器大小计算图片大小
      const minDimension = Math.min(containerWidth, containerHeight);
      width = Math.round((scaleRatio / 100) * minDimension);
      height = width / imgRatio;
    } else {
      // 使用固定比例
      width = (imageSize / 100) * img.width;
      height = (imageSize / 100) * img.height;
    }
  } else if (type === 'tiled') {
    // 平铺水印大小固定
    if (scaleMode === 'relative') {
      // 根据容器大小计算字体大小
      const minDimension = Math.min(containerWidth, containerHeight);
      adjustedFontSize = Math.max(10, Math.round((scaleRatio / 100) * minDimension));
    }
    
    width = adjustedFontSize * 10; // 临时估计值
    height = adjustedFontSize * 1.2;
  }
  
  return { width, height, fontSize: adjustedFontSize };
}

/**
 * 在Canvas上渲染水印
 * @param {CanvasRenderingContext2D} ctx Canvas上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
export function renderWatermark(ctx, width, height, options = null) {
  // 如果没有提供选项，使用全局状态
  const opts = options || getWatermarkOptions();
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 获取水印类型
  const { type } = opts;
  
  if (type === 'text') {
    renderTextWatermark(ctx, width, height, opts);
  } else if (type === 'image' && opts.image) {
    renderImageWatermark(ctx, width, height, opts);
  } else if (type === 'tiled') {
    renderTiledWatermark(ctx, width, height, opts);
  }
}

/**
 * 渲染文本水印
 * @param {CanvasRenderingContext2D} ctx Canvas上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
function renderTextWatermark(ctx, width, height, options) {
  const { text, color, opacity, rotation } = options;
  
  // 计算水印大小
  const { fontSize } = calculateWatermarkSize(width, height, options);
  
  // 设置字体
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity / 100;
  
  // 测量文本宽度
  const textWidth = ctx.measureText(text).width;
  const textHeight = fontSize;
  
  // 计算位置
  const position = calculateWatermarkPosition(width, height, textWidth, textHeight, options);
  
  // 保存当前状态
  ctx.save();
  
  // 移动到水印位置
  ctx.translate(position.x + textWidth / 2, position.y + textHeight / 2);
  
  // 应用旋转
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 绘制文本
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  
  // 恢复状态
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1;
}

/**
 * 渲染图片水印
 * @param {CanvasRenderingContext2D} ctx Canvas上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
function renderImageWatermark(ctx, width, height, options) {
  const { image, opacity, rotation } = options;
  
  if (!image) return;
  
  // 计算水印大小
  const { width: imgWidth, height: imgHeight } = calculateWatermarkSize(width, height, options);
  
  // 计算位置
  const position = calculateWatermarkPosition(width, height, imgWidth, imgHeight, options);
  
  // 设置透明度
  ctx.globalAlpha = opacity / 100;
  
  // 保存当前状态
  ctx.save();
  
  // 移动到水印位置
  ctx.translate(position.x + imgWidth / 2, position.y + imgHeight / 2);
  
  // 应用旋转
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 绘制图片
  ctx.drawImage(image, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
  
  // 恢复状态
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1;
}

/**
 * 渲染平铺水印
 * @param {CanvasRenderingContext2D} ctx Canvas上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
function renderTiledWatermark(ctx, width, height, options) {
  const { text, color, opacity, rotation, tileSpacing } = options;
  
  // 计算水印大小
  const { fontSize } = calculateWatermarkSize(width, height, options);
  
  // 设置字体
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity / 100;
  
  // 测量文本宽度
  const textWidth = ctx.measureText(text).width;
  const textHeight = fontSize;
  
  // 计算行列数
  const cols = Math.ceil(width / tileSpacing) + 1;
  const rows = Math.ceil(height / tileSpacing) + 1;
  
  // 计算起始位置（偏移以使水印分布均匀）
  const startX = -tileSpacing / 2;
  const startY = -tileSpacing / 2;
  
  // 绘制平铺水印
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * tileSpacing;
      const y = startY + row * tileSpacing;
      
      // 保存当前状态
      ctx.save();
      
      // 移动到水印位置
      ctx.translate(x + textWidth / 2, y + textHeight / 2);
      
      // 应用旋转
      ctx.rotate((rotation * Math.PI) / 180);
      
      // 绘制文本
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      
      // 恢复状态
      ctx.restore();
    }
  }
  
  // 重置透明度
  ctx.globalAlpha = 1;
}

/**
 * 将水印应用到图像
 * @param {HTMLImageElement|HTMLCanvasElement} image 原始图像或画布
 * @param {Object} options 水印选项
 * @returns {Promise<HTMLCanvasElement>} 应用水印后的画布
 */
export async function applyWatermark(image, options = null) {
  // 使用传入的选项或获取默认选项
  const watermarkOptions = options || getWatermarkOptions();
  
  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = image.width || image.naturalWidth;
  canvas.height = image.height || image.naturalHeight;
  
  // 获取上下文
  const ctx = canvas.getContext('2d');
  
  // 绘制原始图像
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // 根据水印类型应用水印
  if (watermarkOptions.type === 'text') {
    await applyTextWatermark(ctx, canvas.width, canvas.height, watermarkOptions);
  } else if (watermarkOptions.type === 'image') {
    await applyImageWatermark(ctx, canvas.width, canvas.height, watermarkOptions);
  }
  
  return canvas;
}

/**
 * 应用文本水印
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @returns {Promise<void>}
 */
async function applyTextWatermark(ctx, width, height, options) {
  // 保存上下文状态
  ctx.save();
  
  // 设置透明度
  ctx.globalAlpha = options.opacity;
  
  // 设置字体
  const fontSize = calculateFontSize(width, height, options);
  ctx.font = `bold ${fontSize}px ${options.font}`;
  ctx.fillStyle = options.color;
  
  // 添加阴影（如果启用）
  if (options.shadow) {
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur;
    ctx.shadowOffsetX = options.shadowOffsetX;
    ctx.shadowOffsetY = options.shadowOffsetY;
  }
  
  // 测量文本宽度
  const textWidth = ctx.measureText(options.text).width;
  const textHeight = fontSize; // 近似值
  
  if (options.repeat) {
    // 绘制重复水印
    applyRepeatedWatermark(ctx, width, height, options, textWidth, textHeight);
  } else {
    // 绘制单个水印
    applySingleWatermark(ctx, width, height, options, textWidth, textHeight);
  }
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 应用图片水印
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @returns {Promise<void>}
 */
async function applyImageWatermark(ctx, width, height, options) {
  // 如果没有图片URL，直接返回
  if (!options.imageUrl) return;
  
  // 加载水印图片
  const watermarkImage = await loadImage(options.imageUrl);
  
  // 保存上下文状态
  ctx.save();
  
  // 设置透明度
  ctx.globalAlpha = options.opacity;
  
  // 计算水印尺寸
  const imageWidth = watermarkImage.width * options.imageScale;
  const imageHeight = watermarkImage.height * options.imageScale;
  
  // 添加阴影（如果启用）
  if (options.shadow) {
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur;
    ctx.shadowOffsetX = options.shadowOffsetX;
    ctx.shadowOffsetY = options.shadowOffsetY;
  }
  
  if (options.repeat) {
    // 绘制重复水印
    applyRepeatedWatermark(ctx, width, height, options, imageWidth, imageHeight, watermarkImage);
  } else {
    // 绘制单个水印
    applySingleWatermark(ctx, width, height, options, imageWidth, imageHeight, watermarkImage);
  }
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 应用重复水印
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @param {number} itemWidth 水印项宽度
 * @param {number} itemHeight 水印项高度
 * @param {HTMLImageElement} [image] 水印图片（可选）
 */
function applyRepeatedWatermark(ctx, width, height, options, itemWidth, itemHeight, image = null) {
  // 计算间距
  const spacing = options.spacing * Math.max(itemWidth, itemHeight) / 5;
  
  // 保存当前上下文状态
  ctx.save();
  
  // 将原点移动到画布中心
  ctx.translate(width / 2, height / 2);
  
  // 应用旋转
  ctx.rotate((options.rotation * Math.PI) / 180);
  
  // 计算需要绘制的行数和列数
  const diagonalLength = Math.sqrt(width * width + height * height);
  const cols = Math.ceil(diagonalLength / (itemWidth + spacing)) + 1;
  const rows = Math.ceil(diagonalLength / (itemHeight + spacing)) + 1;
  
  // 计算起始位置（确保覆盖整个画布）
  const startX = -diagonalLength / 2;
  const startY = -diagonalLength / 2;
  
  // 绘制水印网格
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (itemWidth + spacing);
      const y = startY + row * (itemHeight + spacing);
      
      if (image) {
        // 绘制图片水印
        ctx.drawImage(image, x, y, itemWidth, itemHeight);
        
        // 添加边框（如果启用）
        if (options.border) {
          ctx.strokeStyle = options.borderColor;
          ctx.lineWidth = options.borderWidth;
          ctx.strokeRect(x, y, itemWidth, itemHeight);
        }
      } else {
        // 绘制文本水印
        ctx.fillText(options.text, x, y);
        
        // 添加边框（如果启用）
        if (options.border) {
          const metrics = ctx.measureText(options.text);
          const textHeight = parseInt(ctx.font); // 近似值
          
          ctx.strokeStyle = options.borderColor;
          ctx.lineWidth = options.borderWidth;
          ctx.strokeText(options.text, x, y);
        }
      }
    }
  }
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 应用单个水印
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @param {number} itemWidth 水印项宽度
 * @param {number} itemHeight 水印项高度
 * @param {HTMLImageElement} [image] 水印图片（可选）
 */
function applySingleWatermark(ctx, width, height, options, itemWidth, itemHeight, image = null) {
  // 计算位置
  let x, y;
  
  switch (options.position) {
    case 'topLeft':
      x = options.margin;
      y = options.margin + (image ? 0 : itemHeight);
      break;
    case 'topRight':
      x = width - itemWidth - options.margin;
      y = options.margin + (image ? 0 : itemHeight);
      break;
    case 'bottomLeft':
      x = options.margin;
      y = height - options.margin - (image ? itemHeight : 0);
      break;
    case 'bottomRight':
      x = width - itemWidth - options.margin;
      y = height - options.margin - (image ? itemHeight : 0);
      break;
    case 'custom':
      x = options.customPosition.x * width / 100;
      y = options.customPosition.y * height / 100;
      if (!image) y += itemHeight / 2;
      break;
    case 'center':
    default:
      x = (width - itemWidth) / 2;
      y = (height + (image ? -itemHeight : itemHeight) / 2) / 2;
  }
  
  // 保存当前上下文状态
  ctx.save();
  
  // 移动到水印位置
  ctx.translate(x + (image ? itemWidth / 2 : 0), y - (image ? 0 : itemHeight / 2));
  
  // 应用旋转（对单个水印）
  ctx.rotate((options.rotation * Math.PI) / 180);
  
  if (image) {
    // 绘制图片水印（从中心点）
    ctx.drawImage(image, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    
    // 添加边框（如果启用）
    if (options.border) {
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.strokeRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    }
  } else {
    // 绘制文本水印（从中心点）
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.text, 0, 0);
    
    // 添加边框（如果启用）
    if (options.border) {
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.strokeText(options.text, 0, 0);
    }
  }
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 计算自适应字体大小
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @returns {number} 字体大小
 */
function calculateFontSize(width, height, options) {
  // 基础字体大小
  let baseFontSize = Math.min(width, height) / 20;
  
  // 应用用户设置的大小倍数
  let fontSize = baseFontSize * options.size;
  
  // 如果启用自适应大小
  if (options.adaptSize) {
    // 根据图像大小调整
    const imageSize = Math.sqrt(width * height);
    const scaleFactor = Math.max(0.5, Math.min(1.5, imageSize / 1000000));
    fontSize *= scaleFactor;
    
    // 应用最小/最大限制
    fontSize = Math.max(baseFontSize * options.minSize, Math.min(baseFontSize * options.maxSize, fontSize));
  }
  
  return Math.round(fontSize);
}

/**
 * 加载图片
 * @param {string} src 图片URL
 * @returns {Promise<HTMLImageElement>} 图片元素
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
    img.src = src;
  });
}

/**
 * 创建水印模板
 * 用于预先渲染水印，提高性能
 * @param {number} width 模板宽度
 * @param {number} height 模板高度
 * @param {Object} options 水印选项
 * @returns {Promise<HTMLCanvasElement>} 水印模板画布
 */
export async function createWatermarkTemplate(width, height, options = null) {
  // 使用传入的选项或获取默认选项
  const watermarkOptions = options || getWatermarkOptions();
  
  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // 获取上下文
  const ctx = canvas.getContext('2d');
  
  // 清除画布（透明背景）
  ctx.clearRect(0, 0, width, height);
  
  // 根据水印类型应用水印
  if (watermarkOptions.type === 'text') {
    await applyTextWatermark(ctx, width, height, watermarkOptions);
  } else if (watermarkOptions.type === 'image') {
    await applyImageWatermark(ctx, width, height, watermarkOptions);
  }
  
  return canvas;
}

/**
 * 将画布转换为Blob
 * @param {HTMLCanvasElement} canvas 画布
 * @param {string} type 输出类型
 * @param {number} quality 输出质量
 * @returns {Promise<Blob>} 图像Blob
 */
export function canvasToBlob(canvas, type = 'image/png', quality = 0.9) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, type, quality);
    } catch (error) {
      reject(error);
    }
  });
}
