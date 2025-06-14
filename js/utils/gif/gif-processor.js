/**
 * GIF处理器
 * 用于处理GIF动图的水印
 */

import { watermarkState } from '../../core/state.js';
import { renderWatermarkOnCanvas } from '../../core/watermark.js';
import { extractGifFrames } from './gif-extractor.js';

/**
 * 检查文件是否为GIF
 * @param {File} file - 文件对象
 * @returns {boolean} - 是否为GIF
 */
export function isGif(file) {
  return file && (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif'));
}

// 创建GIF处理的缓存池，避免重复处理相同参数的GIF
const gifCache = new Map();

// 设置缓存限制，避免内存溢出
const MAX_CACHE_SIZE = 10; // 最多缓存10个不同参数的GIF处理结果

/**
 * 清除最旧的缓存项
 */
function clearOldestCache() {
  if (gifCache.size >= MAX_CACHE_SIZE) {
    // 获取第一个键（最旧的）并删除
    const firstKey = gifCache.keys().next().value;
    gifCache.delete(firstKey);
  }
}

/**
 * 生成GIF缓存键
 * @param {Object} params - 参数对象
 * @returns {String} 缓存键
 */
function generateCacheKey(params) {
  // 为了避免对象循环引用问题，只取需要的参数
  const keyParams = {
    fileName: params.fileName || '',
    watermarkText: params.watermarkText || '',
    x: params.x || 0,
    y: params.y || 0,
    fontSize: params.fontSize || 24,
    opacity: params.opacity || 1.0,
    angle: params.angle || 0,
    color: params.color || '#000000',
    quality: params.quality || 10
  };
  
  return JSON.stringify(keyParams);
}

/**
 * 处理GIF，添加水印等
 * @param {Blob} gifBlob - GIF文件对象
 * @param {Function} addWatermark - 添加水印的函数
 * @param {Object} watermarkOptions - 水印选项
 * @param {Boolean} isPreview - 是否是预览模式
 * @returns {Promise<Blob>} - 处理后的GIF文件
 */
export function processGif(gifBlob, addWatermark, watermarkOptions, isPreview = false) {
  return new Promise((resolve, reject) => {
    try {
      // 如果是预览模式，则直接返回原始GIF
      if (isPreview) {
        resolve(gifBlob);
        return;
      }
      
      // 检查缓存是否存在
      const cacheKey = generateCacheKey({
        fileName: watermarkOptions.fileName,
        ...watermarkOptions
      });
      
      // 如果在缓存中找到，直接返回缓存结果
      if (gifCache.has(cacheKey)) {
        console.log('从缓存加载GIF处理结果');
        resolve(gifCache.get(cacheKey));
        return;
      }
      
      // 获取GIF的帧信息
      extractGifFrames(gifBlob).then(frames => {
        // 创建帧canvas数组
        const frameCanvases = [];
        
        // 获取第一帧的尺寸
        const firstFrame = frames[0];
        const width = firstFrame.dims.width;
        const height = firstFrame.dims.height;
        
        // 创建临时canvas来绘制每一帧
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        
        // 使用Web Worker优化GIF编码
        const gif = new window.GIF({
          workers: Math.min(navigator.hardwareConcurrency || 2, 2), // 根据CPU核心数优化，但不超过2个worker
          quality: watermarkOptions.quality || 5, // 降低默认质量以提高速度
          workerScript: '/public/libs/gif.worker.min.js'
        });
        
        // 添加进度处理
        if (watermarkOptions.onProgress) {
          gif.on('progress', p => {
            watermarkOptions.onProgress(p);
          });
        }
        
        // 处理完成回调
        gif.on('finished', blob => {
          // 存入缓存
          clearOldestCache();
          gifCache.set(cacheKey, blob);
          
          resolve(blob);
        });
        
        // 处理每一帧（分批处理以优化内存使用）
        let processedFrames = 0;
        const totalFrames = frames.length;
        
        // 分批处理
        const batchSize = 5; // 每批处理5帧
        
        const processNextBatch = (startIdx) => {
          let endIdx = Math.min(startIdx + batchSize, totalFrames);
          let processPromises = [];
          
          for (let i = startIdx; i < endIdx; i++) {
            const frame = frames[i];
            
            // 创建新的ImageData
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(frame.patch);
            
            // 清除画布
            ctx.clearRect(0, 0, width, height);
            
            // 绘制当前帧
            ctx.putImageData(imageData, 0, 0);
            
            // 添加水印
            const watermarkPromise = addWatermark(tempCanvas, watermarkOptions);
            
            processPromises.push(watermarkPromise.then(() => {
              // 将处理后的帧添加到GIF中
              gif.addFrame(tempCanvas, {
                copy: true,
                delay: frame.delay
              });
              
              processedFrames++;
              
              // 更新进度
              if (watermarkOptions.onFrameProgress) {
                watermarkOptions.onFrameProgress(processedFrames / totalFrames);
              }
            }));
          }
          
          // 等待当前批次处理完成
          Promise.all(processPromises).then(() => {
            if (endIdx < totalFrames) {
              // 处理下一批
              setTimeout(() => processNextBatch(endIdx), 0); // 使用setTimeout避免堆栈溢出
            } else {
              // 所有帧处理完成，开始渲染GIF
              gif.render();
            }
          });
        };
        
        // 开始处理第一批
        processNextBatch(0);
        
      }).catch(error => {
        console.error('处理GIF帧时出错:', error);
        reject(error);
      });
      
    } catch (error) {
      console.error('处理GIF时出错:', error);
      reject(error);
    }
  });
}

/**
 * 在Canvas上应用水印
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} canvasWidth - Canvas宽度
 * @param {number} canvasHeight - Canvas高度
 * @param {Object} watermarkOptions - 水印选项
 */
function applyWatermarkToCanvas(ctx, canvasWidth, canvasHeight, watermarkOptions) {
  const { 
    type, 
    text, 
    color, 
    fontSize, 
    opacity, 
    rotation, 
    position = { x: 50, y: 50 }, // 默认值，居中
    tileSpacing,
    watermarkImage
  } = watermarkOptions;
  
  // 计算实际位置（基于百分比）
  const actualX = (position.x / 100) * canvasWidth;
  const actualY = (position.y / 100) * canvasHeight;
  
  // 设置透明度
  ctx.globalAlpha = opacity / 100;
  
  // 保存当前的变换状态
  ctx.save();
  
  // 根据水印类型渲染
  switch (type) {
    case 'text':
      renderTextWatermark(ctx, actualX, actualY, text, fontSize, color, rotation);
      break;
      
    case 'tiled':
      renderTiledWatermark(ctx, text, fontSize, color, rotation, tileSpacing, canvasWidth, canvasHeight);
      break;
      
    case 'image':
      if (watermarkImage) {
        renderImageWatermark(ctx, actualX, actualY, watermarkImage, rotation, canvasWidth, canvasHeight);
      }
      break;
  }
  
  // 恢复变换状态
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
}

/**
 * 渲染文字水印
 */
function renderTextWatermark(ctx, x, y, text, fontSize, color, rotation) {
  // 设置旋转中心点到水印位置
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 设置字体和颜色
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制文字
  ctx.fillText(text, 0, 0);
}

/**
 * 渲染平铺水印
 */
function renderTiledWatermark(ctx, text, fontSize, color, rotation, spacing, width, height) {
  // 设置字体和颜色
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 计算行列数
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  
  // 计算起始偏移，使水印居中分布
  const offsetX = (width - (cols - 1) * spacing) / 2;
  const offsetY = (height - (rows - 1) * spacing) / 2;
  
  // 绘制平铺水印
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * spacing;
      const y = offsetY + row * spacing;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * 渲染图片水印
 */
function renderImageWatermark(ctx, x, y, watermarkImage, rotation, canvasWidth, canvasHeight) {
  // 计算水印图片尺寸（默认为30%的画布宽度）
  const watermarkWidth = canvasWidth * 0.3;
  const aspectRatio = watermarkImage.height / watermarkImage.width;
  const watermarkHeight = watermarkWidth * aspectRatio;
  
  // 设置旋转中心点到水印位置
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 绘制水印图片
  ctx.drawImage(
    watermarkImage,
    -watermarkWidth / 2,
    -watermarkHeight / 2,
    watermarkWidth,
    watermarkHeight
  );
}

/**
 * 初始化GIF处理器
 */
export function initGifProcessor() {
  console.log('初始化GIF处理器');
  
  // 初始化GIF质量控制
  const gifQualitySlider = document.getElementById('gif-quality');
  const gifQualityValue = document.getElementById('gif-quality-value');
  
  if (gifQualitySlider && gifQualityValue) {
    gifQualitySlider.addEventListener('input', function() {
      const value = this.value;
      gifQualityValue.textContent = value;
      
      // 更新状态
      watermarkState.gifQuality = parseInt(value, 10);
    });
  }
} 