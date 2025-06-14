/**
 * GIF处理器
 * 用于处理GIF动图的水印
 */

import { watermarkState } from '../../core/state.js';
import { renderWatermarkOnCanvas } from '../../core/watermark.js';
import { extractGifFrames, extractGifFramesNative } from './gif-extractor.js';
import { applyWatermarkToImageData } from '../image-processor.js';

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
 * @param {Blob|File|string} gifSource - GIF文件对象或URL
 * @param {Object} watermarkOptions - 水印选项
 * @returns {Promise<Blob>} - 处理后的GIF文件
 */
export function processGif(gifSource, watermarkOptions = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 显示进度条
      const progressContainer = document.getElementById('gif-progress-container');
      const progressBar = document.getElementById('gif-progress-bar');
      
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      
      console.log('开始处理GIF:', typeof gifSource, '是下载模式:', watermarkOptions.isDownload);
      
      // 如果是预览模式，则直接返回原始GIF
      if (watermarkOptions.isPreview) {
        if (progressContainer) progressContainer.style.display = 'none';
        console.log('GIF预览模式，直接返回原始GIF');
        resolve(gifSource);
        return;
      }
      
      // 确保水印选项完整
      const completeWatermarkOptions = {
        type: watermarkOptions.type || 'text',
        text: watermarkOptions.text || '仅供验证使用',
        color: watermarkOptions.color || '#ff0000',
        fontSize: watermarkOptions.fontSize || 24,
        opacity: watermarkOptions.opacity || 50,
        rotation: watermarkOptions.rotation || 0,
        position: watermarkOptions.position || { x: 50, y: 50 },
        tileSpacing: watermarkOptions.tileSpacing || 150,
        watermarkImage: watermarkOptions.watermarkImage,
        quality: watermarkOptions.quality || 5,
        isDownload: watermarkOptions.isDownload || false,
        applyWatermark: watermarkOptions.applyWatermark !== false, // 默认为true
        ...watermarkOptions // 保留其他可能的选项
      };
      
      console.log('GIF水印选项:', JSON.stringify({
        type: completeWatermarkOptions.type,
        text: completeWatermarkOptions.text.substring(0, 20) + (completeWatermarkOptions.text.length > 20 ? '...' : ''),
        position: completeWatermarkOptions.position,
        isDownload: completeWatermarkOptions.isDownload,
        applyWatermark: completeWatermarkOptions.applyWatermark
      }));
      
      // 检查缓存是否存在
      const cacheKey = generateCacheKey({
        fileName: watermarkOptions.fileName || '',
        ...completeWatermarkOptions
      });
      
      // 如果在缓存中找到，直接返回缓存结果
      if (gifCache.has(cacheKey)) {
        console.log('从缓存加载GIF处理结果');
        if (progressContainer) progressContainer.style.display = 'none';
        resolve(gifCache.get(cacheKey));
        return;
      }
      
      // 确保我们有一个URL或Blob
      let gifUrl = gifSource;
      if (gifSource instanceof File || gifSource instanceof Blob) {
        gifUrl = URL.createObjectURL(gifSource);
      }
      
      // 获取GIF的帧信息
      console.log('开始提取GIF帧...');
      if (progressBar) progressBar.style.width = '10%';
      
      extractGifFrames(gifUrl)
        .then(frames => {
          if (!frames || frames.length === 0) {
            console.error('无法提取GIF帧');
            throw new Error('无法提取GIF帧');
          }
          
          console.log(`成功提取 ${frames.length} 帧，开始添加水印`);
          if (progressBar) progressBar.style.width = '30%';
          
          // 检查GIF.js库是否可用
          if (typeof window.GIF === 'undefined') {
            console.error('GIF.js库未加载');
            throw new Error('GIF.js库未加载');
          }
          
          // 使用Web Worker优化GIF编码
          const gif = new window.GIF({
            workers: Math.min(navigator.hardwareConcurrency || 2, 2), // 根据CPU核心数优化，但不超过2个worker
            quality: completeWatermarkOptions.quality, // 使用完整的水印选项
            workerScript: 'public/libs/gif.worker.min.js'
          });
          
          // 为每一帧添加水印
          const watermarkedFrames = [];
          let processedFrames = 0;
          
          // 创建一个临时canvas
          const tempCanvas = document.createElement('canvas');
          const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
          
          // 设置canvas尺寸
          let width, height;
          
          // 确定尺寸
          if (frames[0].width && frames[0].height) {
            width = frames[0].width;
            height = frames[0].height;
          } else if (frames[0].dims) {
            width = frames[0].dims.width;
            height = frames[0].dims.height;
          } else if (frames[0].imageData) {
            width = frames[0].imageData.width;
            height = frames[0].imageData.height;
          } else {
            console.error('无法确定GIF尺寸');
            throw new Error('无法确定GIF尺寸');
          }
          
          console.log(`GIF尺寸: ${width}x${height}, 总帧数: ${frames.length}`);
          
          tempCanvas.width = width;
          tempCanvas.height = height;
          
          // 处理每一帧
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            
            // 清除canvas
            ctx.clearRect(0, 0, width, height);
            
            // 绘制帧
            if (frame.imageData) {
              ctx.putImageData(frame.imageData, 0, 0);
            } else if (frame.patch) {
              const imageData = ctx.createImageData(width, height);
              imageData.data.set(frame.patch);
              ctx.putImageData(imageData, 0, 0);
            } else {
              console.error('无法处理GIF帧:', i);
              throw new Error('无法处理GIF帧');
            }
            
            // 应用水印
            applyWatermarkToCanvas(ctx, width, height, completeWatermarkOptions);
            
            // 将帧添加到GIF
            gif.addFrame(tempCanvas, {
              copy: true,
              delay: frame.delay || 100
            });
            
            processedFrames++;
            if (progressBar) {
              const progress = 30 + (50 * processedFrames / frames.length);
              progressBar.style.width = `${progress}%`;
            }
          }
          
          // GIF渲染完成的回调
          gif.on('finished', function(blob) {
            console.log('GIF渲染完成', blob.size);
            
            // 更新进度条
            if (progressBar) progressBar.style.width = '100%';
            
            // 隐藏进度条
            setTimeout(() => {
              if (progressContainer) progressContainer.style.display = 'none';
            }, 500);
            
            // 清理资源
            if (gifUrl !== gifSource) {
              URL.revokeObjectURL(gifUrl);
            }
            
            // 缓存结果
            clearOldestCache();
            gifCache.set(cacheKey, blob);
            
            // 创建结果对象
            const result = {
              blob: blob,
              blobUrl: URL.createObjectURL(blob),
              width: width,
              height: height
            };
            
            console.log('GIF处理完成，返回结果:', result);
            resolve(result);
          });
          
          // 错误处理
          gif.on('error', function(error) {
            console.error('GIF渲染错误:', error);
            if (progressContainer) progressContainer.style.display = 'none';
            reject(error);
          });
          
          // 开始渲染
          console.log('开始渲染GIF...');
          gif.render();
        })
        .catch(error => {
          console.error('处理GIF帧时出错:', error);
          
          // 隐藏进度条
          if (progressContainer) progressContainer.style.display = 'none';
          
          // 尝试使用备用方法
          console.log('尝试使用备用方法处理GIF');
          extractGifFramesNative(gifUrl)
            .then(frames => {
              if (!frames || frames.length === 0) {
                console.error('备用方法无法提取GIF帧');
                throw new Error('备用方法无法提取GIF帧');
              }
              
              console.log(`备用方法成功提取了 ${frames.length} 帧`);
              
              // 简化的GIF处理，只返回第一帧
              const firstFrame = frames[0];
              
              // 创建一个临时canvas
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = firstFrame.width;
              tempCanvas.height = firstFrame.height;
              const tempCtx = tempCanvas.getContext('2d');
              
              // 绘制第一帧
              tempCtx.putImageData(firstFrame.imageData, 0, 0);
              
              // 应用水印
              applyWatermarkToCanvas(tempCtx, firstFrame.width, firstFrame.height, completeWatermarkOptions);
              
              // 转换为Blob
              tempCanvas.toBlob(blob => {
                console.log('使用备用方法处理了GIF的第一帧');
                
                // 清理资源
                if (gifUrl !== gifSource) {
                  URL.revokeObjectURL(gifUrl);
                }
                
                // 创建结果对象
                const result = {
                  blob: blob,
                  blobUrl: URL.createObjectURL(blob),
                  width: firstFrame.width,
                  height: firstFrame.height
                };
                
                console.log('备用方法处理完成，返回结果:', result);
                resolve(result);
              }, 'image/png');
            })
            .catch(backupError => {
              console.error('备用GIF处理方法失败:', backupError);
              
              // 清理资源
              if (gifUrl !== gifSource) {
                URL.revokeObjectURL(gifUrl);
              }
              
              reject(new Error('所有GIF处理方法均失败: ' + backupError.message));
            });
        });
    } catch (error) {
      console.error('处理GIF时出错:', error);
      
      // 隐藏进度条
      const progressContainer = document.getElementById('gif-progress-container');
      if (progressContainer) progressContainer.style.display = 'none';
      
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
    position, 
    tileSpacing,
    watermarkImage
  } = watermarkOptions;
  
  // 确保position是一个有效的对象
  const pos = position || { x: 50, y: 50 };
  
  // 计算实际位置（基于百分比）
  const actualX = (pos.x / 100) * canvasWidth;
  const actualY = (pos.y / 100) * canvasHeight;
  
  console.log(`应用水印到Canvas: 位置=${JSON.stringify(pos)}, 实际坐标=(${actualX}, ${actualY})`);
  
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