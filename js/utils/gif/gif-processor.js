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

/**
 * 处理GIF图片
 * @param {File} file - GIF文件
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise，返回处理后的blobURL
 */
export async function processGif(file, options = {}) {
  console.log('开始处理GIF图片:', file.name);
  
  // 创建文件URL
  const fileUrl = URL.createObjectURL(file);
  
  try {
    // 提取GIF帧
    console.log('提取GIF帧...');
    let frames;
    
    try {
      // 首先尝试使用SuperGif提取
      frames = await extractGifFrames(fileUrl);
    } catch (error) {
      console.warn('使用SuperGif提取帧失败，尝试使用备用方法:', error);
      
      // 尝试使用原生方法提取
      frames = await extractGifFramesNative(fileUrl);
    }
    
    console.log(`成功提取 ${frames.length} 帧`);
    
    // 如果没有帧或只有一帧，使用普通图片处理
    if (!frames || frames.length <= 1) {
      console.log('GIF只有一帧或提取失败，作为普通图片处理');
      throw new Error('GIF帧提取失败或只有一帧');
    }
    
    // 创建GIF编码器
    const gif = new GIF({
      workers: 2,
      quality: options.quality || 10,
      workerScript: '/public/libs/gif.worker.min.js',
      width: frames[0].width,
      height: frames[0].height,
      transparent: true
    });
    
    // 保存原始图像尺寸到状态
    const width = frames[0].width;
    const height = frames[0].height;
    
    // 创建临时canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 如果需要应用水印
    if (options.applyWatermark) {
      console.log('为GIF的每一帧应用水印...');
      
      // 创建水印选项
      const watermarkOptions = {
        type: watermarkState.type || 'text',
        text: watermarkState.text || '仅供验证使用',
        color: watermarkState.color || '#ff0000',
        fontSize: watermarkState.fontSize || 24,
        opacity: watermarkState.opacity || 50,
        rotation: watermarkState.rotation || 0,
        position: watermarkState.relativePosition || { x: 50, y: 50 },
        tileSpacing: watermarkState.tileSpacing || 150,
        watermarkImage: watermarkState.watermarkImage
      };
      
      // 为每一帧应用水印
      let processedFrames = 0;
      const totalFrames = frames.length;
      
      for (const frame of frames) {
        // 绘制帧到canvas
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(frame.imageData, 0, 0);
        
        // 应用水印
        applyWatermarkToCanvas(ctx, width, height, watermarkOptions);
        
        // 添加到GIF
        const imageData = ctx.getImageData(0, 0, width, height);
        gif.addFrame(imageData, { delay: frame.delay || 100 });
        
        // 更新进度
        processedFrames++;
        if (options.onProgress) {
          options.onProgress(processedFrames / totalFrames);
        }
        
        // 更新进度条
        const gifProgressBar = document.getElementById('gif-progress-bar');
        if (gifProgressBar) {
          gifProgressBar.style.width = `${(processedFrames / totalFrames) * 100}%`;
        }
        
        // 显示进度容器
        const gifProgressContainer = document.getElementById('gif-progress-container');
        if (gifProgressContainer) {
          gifProgressContainer.style.display = 'block';
        }
        
        // 允许UI更新
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } else {
      // 如果不需要应用水印，直接添加原始帧
      for (const frame of frames) {
        gif.addFrame(frame.imageData, { delay: frame.delay || 100 });
      }
    }
    
    // 渲染GIF
    console.log('渲染GIF...');
    const blob = await new Promise((resolve, reject) => {
      gif.on('finished', blob => {
        resolve(blob);
      });
      
      gif.on('progress', progress => {
        console.log(`GIF渲染进度: ${(progress * 100).toFixed(0)}%`);
        
        // 更新进度条
        const gifProgressBar = document.getElementById('gif-progress-bar');
        if (gifProgressBar) {
          gifProgressBar.style.width = `${progress * 100}%`;
        }
        
        // 显示进度容器
        const gifProgressContainer = document.getElementById('gif-progress-container');
        if (gifProgressContainer) {
          gifProgressContainer.style.display = 'block';
        }
        
        if (options.onProgress) {
          options.onProgress(0.5 + progress * 0.5); // 50%-100%
        }
      });
      
      gif.render();
    });
    
    // 隐藏进度容器
    const gifProgressContainer = document.getElementById('gif-progress-container');
    if (gifProgressContainer) {
      gifProgressContainer.style.display = 'none';
    }
    
    // 创建BlobURL
    const blobUrl = URL.createObjectURL(blob);
    console.log('GIF处理完成，创建BlobURL成功');
    
    // 清理资源
    URL.revokeObjectURL(fileUrl);
    
    // 显示GIF标识
    const gifBadge = document.getElementById('gif-badge');
    if (gifBadge) {
      gifBadge.style.display = 'block';
    }
    
    // 显示GIF水印提示信息
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = "GIF水印已烧录到每一帧，已完成下载处理";
      statusMessage.className = 'status-message show';
      setTimeout(() => {
        statusMessage.classList.remove('show');
      }, 5000);
    }
    
    // 返回处理结果
    return {
      blobUrl,
      blob,
      width,
      height,
      isGif: true
    };
  } catch (error) {
    console.error('处理GIF时出错:', error);
    
    // 清理资源
    URL.revokeObjectURL(fileUrl);
    
    // 隐藏进度容器
    const gifProgressContainer = document.getElementById('gif-progress-container');
    if (gifProgressContainer) {
      gifProgressContainer.style.display = 'none';
    }
    
    // 重新抛出错误
    throw error;
  }
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