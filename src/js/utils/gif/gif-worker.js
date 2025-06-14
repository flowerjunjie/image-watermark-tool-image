/**
 * GIF Worker
 * 在后台线程处理GIF，避免阻塞主线程
 */

// 导入gifwrap库
// 注意：在Worker中，我们需要使用importScripts来导入外部库
importScripts('/node_modules/gifwrap/dist/gifwrap.js');
importScripts('/node_modules/omggif/omggif.js');

// 全局变量
const { GifFrame, GifUtil, GifCodec } = self.gifwrap;
const gifCodec = new GifCodec();

// 监听主线程消息
self.onmessage = async function(event) {
  const { type, id, data, options } = event.data;
  
  try {
    switch (type) {
      case 'process':
        // 处理GIF
        const result = await processGif(data, options);
        self.postMessage({ type: 'result', id, result }, [result.buffer]);
        break;
        
      case 'decode':
        // 解码GIF
        const frames = await decodeGif(data);
        // 注意：无法直接传输GifFrame对象，需要转换为可传输格式
        const transferableFrames = convertFramesToTransferable(frames.frames);
        self.postMessage({ 
          type: 'decoded', 
          id, 
          frames: transferableFrames.frames,
          options: frames.options
        }, transferableFrames.transferables);
        break;
        
      case 'encode':
        // 编码GIF
        const buffer = await encodeGif(data.frames, data.options);
        self.postMessage({ 
          type: 'encoded', 
          id, 
          buffer: buffer.buffer 
        }, [buffer.buffer]);
        break;
        
      default:
        throw new Error(`未知的操作类型: ${type}`);
    }
  } catch (error) {
    console.error('GIF Worker错误:', error);
    self.postMessage({ type: 'error', id, error: error.message });
  }
};

/**
 * 处理GIF
 * @param {ArrayBuffer} buffer GIF数据
 * @param {Object} options 水印选项
 * @returns {Uint8Array} 处理后的GIF数据
 */
async function processGif(buffer, options) {
  try {
    // 解码GIF
    const { frames, options: gifOptions } = await decodeGif(buffer);
    
    // 报告进度
    self.postMessage({ type: 'progress', progress: 0.3, message: '解码完成' });
    
    // 处理每一帧
    const processedFrames = await processFrames(frames, options);
    
    // 报告进度
    self.postMessage({ type: 'progress', progress: 0.7, message: '帧处理完成' });
    
    // 编码GIF
    const result = await encodeGif(processedFrames, gifOptions);
    
    // 报告进度
    self.postMessage({ type: 'progress', progress: 1.0, message: '编码完成' });
    
    return result;
  } catch (error) {
    console.error('处理GIF失败:', error);
    throw error;
  }
}

/**
 * 解码GIF
 * @param {ArrayBuffer} buffer GIF数据
 * @returns {Promise<{frames: GifFrame[], options: Object}>} 解码后的GIF帧和选项
 */
async function decodeGif(buffer) {
  try {
    // 使用gifwrap解码GIF
    const gif = await gifCodec.decodeGif(new Uint8Array(buffer));
    
    return {
      frames: gif.frames,
      options: {
        loops: gif.loops,
        globalPalette: gif.globalPalette,
        background: gif.background
      }
    };
  } catch (error) {
    console.error('GIF解码失败:', error);
    throw new Error(`GIF解码失败: ${error.message}`);
  }
}

/**
 * 处理GIF帧
 * @param {GifFrame[]} frames GIF帧
 * @param {Object} options 水印选项
 * @returns {Promise<GifFrame[]>} 处理后的GIF帧
 */
async function processFrames(frames, options) {
  // 创建离屏Canvas用于处理
  const firstFrame = frames[0];
  const width = firstFrame.bitmap.width;
  const height = firstFrame.bitmap.height;
  
  // 在Worker中创建OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // 创建水印模板
  const watermarkTemplate = await createWatermarkTemplate(width, height, options);
  
  // 处理每一帧
  const processedFrames = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    // 报告进度
    self.postMessage({ 
      type: 'frameProgress', 
      frameIndex: i, 
      totalFrames: frames.length,
      progress: i / frames.length
    });
    
    // 创建图像数据
    const imageData = GifUtil.copyAsImageData(frame);
    
    // 绘制原始帧
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);
    
    // 绘制水印
    ctx.drawImage(watermarkTemplate, 0, 0);
    
    // 获取处理后的图像数据
    const processedImageData = ctx.getImageData(0, 0, width, height);
    
    // 创建新的GIF帧
    const processedFrame = new GifFrame(processedImageData, {
      disposalMethod: frame.disposalMethod,
      delayCentisecs: frame.delayCentisecs,
      interlaced: frame.interlaced
    });
    
    processedFrames.push(processedFrame);
  }
  
  return processedFrames;
}

/**
 * 创建水印模板
 * @param {number} width 宽度
 * @param {number} height 高度
 * @param {Object} options 水印选项
 * @returns {OffscreenCanvas} 水印模板
 */
async function createWatermarkTemplate(width, height, options) {
  // 创建离屏Canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // 清除画布（透明背景）
  ctx.clearRect(0, 0, width, height);
  
  // 根据水印类型应用水印
  if (options.type === 'text') {
    await applyTextWatermark(ctx, width, height, options);
  } else if (options.type === 'image' && options.imageData) {
    await applyImageWatermark(ctx, width, height, options);
  }
  
  return canvas;
}

/**
 * 应用文本水印
 * @param {OffscreenCanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
async function applyTextWatermark(ctx, width, height, options) {
  // 保存上下文状态
  ctx.save();
  
  // 设置透明度
  ctx.globalAlpha = options.opacity;
  
  // 设置字体
  const fontSize = calculateFontSize(width, height, options);
  ctx.font = `bold ${fontSize}px ${options.font || 'Arial'}`;
  ctx.fillStyle = options.color || '#000000';
  
  // 添加阴影（如果启用）
  if (options.shadow) {
    ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = options.shadowBlur || 3;
    ctx.shadowOffsetX = options.shadowOffsetX || 2;
    ctx.shadowOffsetY = options.shadowOffsetY || 2;
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
 * @param {OffscreenCanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 */
async function applyImageWatermark(ctx, width, height, options) {
  // 如果没有图片数据，直接返回
  if (!options.imageData) return;
  
  // 保存上下文状态
  ctx.save();
  
  // 设置透明度
  ctx.globalAlpha = options.opacity;
  
  // 创建图像
  const imageData = options.imageData;
  const imgBitmap = await createImageBitmap(imageData);
  
  // 计算水印尺寸
  const imageWidth = imgBitmap.width * (options.imageScale || 1);
  const imageHeight = imgBitmap.height * (options.imageScale || 1);
  
  // 添加阴影（如果启用）
  if (options.shadow) {
    ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = options.shadowBlur || 3;
    ctx.shadowOffsetX = options.shadowOffsetX || 2;
    ctx.shadowOffsetY = options.shadowOffsetY || 2;
  }
  
  if (options.repeat) {
    // 绘制重复水印
    applyRepeatedWatermark(ctx, width, height, options, imageWidth, imageHeight, imgBitmap);
  } else {
    // 绘制单个水印
    applySingleWatermark(ctx, width, height, options, imageWidth, imageHeight, imgBitmap);
  }
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 应用重复水印
 * @param {OffscreenCanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @param {number} itemWidth 水印项宽度
 * @param {number} itemHeight 水印项高度
 * @param {ImageBitmap} [image] 水印图片（可选）
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
          ctx.strokeStyle = options.borderColor || '#ffffff';
          ctx.lineWidth = options.borderWidth || 1;
          ctx.strokeRect(x, y, itemWidth, itemHeight);
        }
      } else {
        // 绘制文本水印
        ctx.fillText(options.text, x, y);
        
        // 添加边框（如果启用）
        if (options.border) {
          ctx.strokeStyle = options.borderColor || '#ffffff';
          ctx.lineWidth = options.borderWidth || 1;
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
 * @param {OffscreenCanvasRenderingContext2D} ctx 画布上下文
 * @param {number} width 画布宽度
 * @param {number} height 画布高度
 * @param {Object} options 水印选项
 * @param {number} itemWidth 水印项宽度
 * @param {number} itemHeight 水印项高度
 * @param {ImageBitmap} [image] 水印图片（可选）
 */
function applySingleWatermark(ctx, width, height, options, itemWidth, itemHeight, image = null) {
  // 计算位置
  let x, y;
  
  switch (options.position) {
    case 'topLeft':
      x = options.margin || 10;
      y = options.margin || 10;
      if (!image) y += itemHeight;
      break;
    case 'topRight':
      x = width - itemWidth - (options.margin || 10);
      y = options.margin || 10;
      if (!image) y += itemHeight;
      break;
    case 'bottomLeft':
      x = options.margin || 10;
      y = height - itemHeight - (options.margin || 10);
      if (!image) y += itemHeight;
      break;
    case 'bottomRight':
      x = width - itemWidth - (options.margin || 10);
      y = height - itemHeight - (options.margin || 10);
      if (!image) y += itemHeight;
      break;
    case 'custom':
      x = (options.customPosition?.x || 0) * width / 100;
      y = (options.customPosition?.y || 0) * height / 100;
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
      ctx.strokeStyle = options.borderColor || '#ffffff';
      ctx.lineWidth = options.borderWidth || 1;
      ctx.strokeRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
    }
  } else {
    // 绘制文本水印（从中心点）
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.text, 0, 0);
    
    // 添加边框（如果启用）
    if (options.border) {
      ctx.strokeStyle = options.borderColor || '#ffffff';
      ctx.lineWidth = options.borderWidth || 1;
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
  let fontSize = baseFontSize * (options.size || 2);
  
  // 如果启用自适应大小
  if (options.adaptSize) {
    // 根据图像大小调整
    const imageSize = Math.sqrt(width * height);
    const scaleFactor = Math.max(0.5, Math.min(1.5, imageSize / 1000000));
    fontSize *= scaleFactor;
    
    // 应用最小/最大限制
    fontSize = Math.max(baseFontSize * (options.minSize || 0.5), 
                        Math.min(baseFontSize * (options.maxSize || 5), fontSize));
  }
  
  return Math.round(fontSize);
}

/**
 * 编码GIF
 * @param {GifFrame[]} frames GIF帧
 * @param {Object} options GIF选项
 * @returns {Promise<Uint8Array>} 编码后的GIF数据
 */
async function encodeGif(frames, options) {
  try {
    // 使用gifwrap编码GIF
    return await gifCodec.encodeGif(frames, options);
  } catch (error) {
    console.error('GIF编码失败:', error);
    throw new Error(`GIF编码失败: ${error.message}`);
  }
}

/**
 * 将GifFrame对象转换为可传输格式
 * @param {GifFrame[]} frames GIF帧
 * @returns {{frames: Object[], transferables: ArrayBuffer[]}} 可传输的帧数据
 */
function convertFramesToTransferable(frames) {
  const transferableFrames = [];
  const transferables = [];
  
  frames.forEach(frame => {
    // 创建可传输的帧数据
    const imageData = GifUtil.copyAsImageData(frame);
    const buffer = imageData.data.buffer;
    
    transferableFrames.push({
      width: frame.bitmap.width,
      height: frame.bitmap.height,
      data: new Uint8ClampedArray(buffer),
      disposalMethod: frame.disposalMethod,
      delayCentisecs: frame.delayCentisecs,
      interlaced: frame.interlaced
    });
    
    transferables.push(buffer);
  });
  
  return { frames: transferableFrames, transferables };
}

// 通知主线程Worker已准备就绪
self.postMessage({ type: 'ready' }); 