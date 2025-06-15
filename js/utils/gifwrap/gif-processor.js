/**
 * GIF处理工具 - 使用gifwrap库
 * 用于处理GIF动图，添加水印等
 */

// 使用全局变量而不是ES模块导入
// import { GifFrame, GifUtil, GifCodec } from 'gifwrap';
import { renderWatermarkOnCanvas } from '../../core/watermark.js';

// GIF处理缓存
const gifCache = new Map();
const MAX_CACHE_SIZE = 20;

// 处理状态跟踪
const processingGifs = new Map();
const gifProcessingQueue = [];
const MAX_CONCURRENT_GIF_PROCESSING = 2;
let activeGifProcessingCount = 0;

// 确保GifUtil可用
function getGifUtil() {
  if (window.gifwrap && window.gifwrap.GifUtil) {
    return window.gifwrap.GifUtil;
  }
  throw new Error('GifUtil未定义，gifwrap库可能未正确加载');
}

/**
 * 检查文件是否为GIF
 * @param {File|Blob} file - 要检查的文件
 * @returns {boolean} - 是否为GIF文件
 */
export function isGif(file) {
  if (!file) return false;
  
  // 检查MIME类型
  const isGifType = file.type === 'image/gif';
  
  // 检查文件名扩展
  const isGifExt = file.name && file.name.toLowerCase().endsWith('.gif');
  
  return isGifType || isGifExt;
}

/**
 * 处理GIF队列中的下一个任务
 */
function processNextGifInQueue() {
  if (gifProcessingQueue.length === 0 || activeGifProcessingCount >= MAX_CONCURRENT_GIF_PROCESSING) {
    return;
  }
  
  const nextTask = gifProcessingQueue.shift();
  if (!nextTask) return;
  
  activeGifProcessingCount++;
  console.log(`开始处理GIF队列中的任务，当前活跃任务数: ${activeGifProcessingCount}，剩余任务: ${gifProcessingQueue.length}`);
  
  // 执行任务
  nextTask.execute()
    .then(result => {
      // 任务完成
      activeGifProcessingCount--;
      console.log(`GIF处理任务完成，当前活跃任务数: ${activeGifProcessingCount}，剩余任务: ${gifProcessingQueue.length}`);
      
      // 检查是否所有任务都已完成
      if (activeGifProcessingCount === 0 && gifProcessingQueue.length === 0) {
        // 关闭处理模态框
        const processingModal = document.getElementById('processing-modal');
        if (processingModal && processingModal.style.display === 'flex') {
          processingModal.style.display = 'none';
        }
      }
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用成功回调
      if (nextTask.resolve) nextTask.resolve(result);
    })
    .catch(error => {
      // 任务失败
      activeGifProcessingCount--;
      console.error(`GIF处理任务失败: ${error.message || error}`);
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用失败回调
      if (nextTask.reject) nextTask.reject(error);
    });
}

/**
 * 将GIF处理任务添加到队列
 * @param {Function} processTask - 处理任务函数
 * @returns {Promise} - 处理完成的Promise
 */
function enqueueGifProcessingTask(processTask) {
  return new Promise((resolve, reject) => {
    // 创建任务对象
    const task = {
      execute: processTask,
      resolve: resolve,
      reject: reject
    };
    
    // 添加到队列
    gifProcessingQueue.push(task);
    console.log(`添加GIF处理任务到队列，当前队列长度: ${gifProcessingQueue.length}`);
    
    // 尝试处理队列
    processNextGifInQueue();
  });
}

/**
 * 生成GIF缓存键
 * @param {Object} watermarkOptions - 水印选项
 * @returns {string} - 缓存键
 */
function generateCacheKey(watermarkOptions) {
  if (!watermarkOptions) return '';
  
  return `${watermarkOptions.fileName || ''}_${watermarkOptions.type || ''}_${watermarkOptions.text || ''}_${
    (watermarkOptions.position ? (watermarkOptions.position.x + '_' + watermarkOptions.position.y) : '0_0')
  }_${watermarkOptions.rotation || 0}_${watermarkOptions.opacity || 1.0}`;
}

/**
 * 显示处理进度
 * @param {Function} onProgress - 进度回调函数
 * @param {number} progress - 进度值（0-100）
 */
function updateProgress(onProgress, progress) {
  if (typeof onProgress === 'function') {
    onProgress(progress);
  }
  
  // 更新模态框进度
  const modalProgressBar = document.getElementById('modal-progress-bar');
  if (modalProgressBar) {
    modalProgressBar.style.width = `${progress}%`;
    modalProgressBar.textContent = `${Math.round(progress)}%`;
  }
}

/**
 * 从源获取ArrayBuffer
 * @param {File|Blob|ArrayBuffer} source - 源数据
 * @returns {Promise<ArrayBuffer>} - 返回ArrayBuffer Promise
 */
async function getArrayBufferFromSource(source) {
  if (source instanceof ArrayBuffer) {
    return source;
  }
  
  if (source instanceof Blob || source instanceof File) {
    return await source.arrayBuffer();
  }
  
  throw new Error('不支持的源类型');
}

/**
 * 处理GIF图片，应用水印并保持动画效果
 * @param {Blob|File} gifFile - GIF文件或Blob
 * @param {Object} options - 处理选项
 * @returns {Promise<Blob>} - 处理后的GIF
 */
export async function processGif(gifFile, options) {
  return new Promise(async (resolve, reject) => {
    if (!window.gifwrap || !window.imageQ) {
      reject(new Error('缺少必要的GIF处理库'));
      return;
    }
    
    // 强制应用水印，除非明确设置为false
    if (options.applyWatermark !== false) {
      options.applyWatermark = true;
    }
    
    // 添加调试信息
    console.log('GIF处理选项:', JSON.stringify({
      applyWatermark: options.applyWatermark,
      isDownload: options.isDownload,
      isPreview: options.isPreview,
      quality: options.quality
    }));
    
    try {
      // 创建ArrayBuffer
      const arrayBuffer = await getArrayBufferFromSource(gifFile);
      const { Gif, BitmapImage, GifFrame, GifUtil } = window.gifwrap;
      
      // 获取水印选项
      const watermarkOptions = {
        ...options,
        isGif: true
      };
      
      // 读取GIF
      let gif = await new Promise((resolve, reject) => {
        try {
          Gif.fromArrayBuffer(arrayBuffer)
            .then(gif => resolve(gif))
            .catch(err => reject(err));
        } catch (error) {
          reject(error);
        }
      });
      
      // 获取第一帧生成预览
      const firstFrame = gif.frames[0];
      const canvas = document.createElement('canvas');
      canvas.width = firstFrame.bitmap.width;
      canvas.height = firstFrame.bitmap.height;
      const ctx = canvas.getContext('2d');
      
      // 在预览上应用水印
      GifUtil.copyPixels(firstFrame, new BitmapImage(canvas.width, canvas.height));
      await GifUtil.drawBitmap(canvas, firstFrame);
      
      // 判断是否需要应用水印 - 特殊处理下载场景
      const shouldApplyWatermark = options.applyWatermark === true || options.isDownload === true;
      
      console.log('是否应用水印到GIF:', shouldApplyWatermark, 
                  '(明确设置值:', options.applyWatermark, 
                  ', 是否为下载:', options.isDownload, ')');
      
      // 如果需要应用水印，应用到第一帧预览
      if (shouldApplyWatermark) {
        // 应用水印到第一帧
        applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkOptions);
      }
      
      // 存储预览和结果
      const previewUrl = canvas.toDataURL('image/png');
      
      // 检查是否需要应用水印到实际GIF
      if (options.applyWatermark === false && options.isDownload !== true) {
        // 不应用水印，直接返回结果
        console.log('跳过水印应用，直接返回原始GIF');
        resolve({
          previewUrl,
          blob: gifFile,
          blobUrl: URL.createObjectURL(gifFile),
          isGif: true,
          watermarkApplied: false
        });
        return;
      }
      
      console.log('开始应用水印到GIF的每一帧...');
      
      // 应用水印到每一帧 - 确保设置了应用水印标志
      const frames = gif.frames;
      const watermarkedFrames = [];
      let processedCount = 0;
      
      if (options.onProgress) {
        options.onProgress({
          frame: 0,
          total: frames.length,
          progress: 0
        });
      }
      
      // 确保有足够的帧来处理
      if (!frames || frames.length === 0) {
        reject(new Error('没有可处理的GIF帧'));
        return;
      }
      
      console.log(`处理GIF，共${frames.length}帧，尺寸: ${frames[0].bitmap.width}x${frames[0].bitmap.height}`);
      
      // 保存原始延迟时间和处置方法
      const originalDelays = frames.map(frame => frame.delayCentisecs);
      const originalDisposals = frames.map(frame => frame.disposalMethod);
      
      // 处理每一帧
      for (let i = 0; i < frames.length; i++) {
        try {
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = frames[i].bitmap.width;
          frameCanvas.height = frames[i].bitmap.height;
          const frameCtx = frameCanvas.getContext('2d');
          
          // 绘制帧到Canvas
          await GifUtil.drawBitmap(frameCanvas, frames[i]);
          
          // 应用水印
          applyWatermarkToCanvas(frameCtx, frameCanvas.width, frameCanvas.height, watermarkOptions);
          
          // 创建新的帧
          const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
          const bitmapImage = await GifUtil.dataToImage(imageData);
          
          // 使用原始帧的配置
          const watermarkedFrame = new GifFrame(bitmapImage, {
            xOffset: frames[i].xOffset || 0,
            yOffset: frames[i].yOffset || 0,
            disposalMethod: originalDisposals[i] || frames[i].disposalMethod || 0,
            interlaced: frames[i].interlaced || false,
            delayCentisecs: originalDelays[i] || frames[i].delayCentisecs || 10
          });
          
          // 确保帧延迟时间至少为10
          if (watermarkedFrame.delayCentisecs < 1) {
            watermarkedFrame.delayCentisecs = 10;
          }
          
          watermarkedFrames.push(watermarkedFrame);
          processedCount++;
          
          // 更新进度
          if (options.onProgress) {
            options.onProgress({
              frame: processedCount,
              total: frames.length,
              progress: processedCount / frames.length
            });
          }
        } catch (frameError) {
          console.error(`处理GIF帧 ${i} 出错:`, frameError);
          // 使用原始帧作为备用
          watermarkedFrames.push(frames[i]);
        }
      }
      
      // 创建新的GIF
      const qualitySetting = options.quality || 10;
      const newGif = new Gif({
        ...gif,
        frames: watermarkedFrames,
        loops: gif.loops !== undefined ? gif.loops : 0
      });
      
      console.log(`创建新GIF，帧数: ${newGif.frames.length}，循环次数: ${newGif.loops}`);
      
      // 使用quantizer高质量导出
      try {
        console.log('使用高质量模式导出GIF');
        const blob = await GifUtil.quantizeBurstAndWrite(newGif, {
          palette: (new window.imageQ.NeuQuantFloat(qualitySetting)),
          format: 'gif',
          dither: false
        });
        
        const gifBlob = new Blob([blob], {type: 'image/gif'});
        const blobUrl = URL.createObjectURL(gifBlob);
        
        resolve({
          previewUrl,
          blob: gifBlob,
          blobUrl: blobUrl,
          isGif: true,
          watermarkApplied: true
        });
      } catch (quantizeError) {
        console.error('GIF量化错误，尝试标准导出:', quantizeError);
        
        // 使用标准方法作为备用
        try {
          console.log('使用标准模式导出GIF');
          const gifBlob = await GifUtil.write(newGif);
          const blobUrl = URL.createObjectURL(gifBlob);
          
          resolve({
            previewUrl,
            blob: gifBlob,
            blobUrl: blobUrl,
            isGif: true,
            watermarkApplied: true
          });
        } catch (writeError) {
          console.error('GIF写入错误:', writeError);
          reject(writeError);
        }
      }
    } catch (error) {
      console.error('GIF处理失败:', error);
      reject(error);
    }
  });
}

// Canvas上应用水印
function applyWatermarkToCanvas(ctx, width, height, options) {
  if (!options || !ctx) return;
  
  const { type, text, color, fontSize, opacity, rotation, position } = options;
  if (!type) return;
  
  // 设置透明度
  ctx.globalAlpha = opacity !== undefined ? opacity / 100 : 0.5;
  
  // 保存当前状态
  ctx.save();
  
  // 处理水印文本
  if (type === 'text' || type === 'tiled') {
    // 设置文本样式
    ctx.font = `${fontSize || 36}px Arial`;
    ctx.fillStyle = color || 'red';
    
    // 处理普通文本水印
    if (type === 'text') {
      const x = position ? width * (position.x / 100) : width / 2;
      const y = position ? height * (position.y / 100) : height / 2;
      
      // 旋转
      if (rotation) {
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-x, -y);
      }
      
      // 绘制文本
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text || '水印文本', x, y);
    }
    
    // 处理平铺水印
    if (type === 'tiled') {
      const spacing = options.tileSpacing || 150;
      const textWidth = ctx.measureText(text || '水印文本').width;
      const rows = Math.ceil(height / spacing);
      const cols = Math.ceil(width / spacing);
      
      // 在画布上平铺水印
      for (let row = 0; row < rows + 1; row++) {
        for (let col = 0; col < cols + 1; col++) {
          const x = col * spacing;
          const y = row * spacing;
          
          ctx.save();
          ctx.translate(x, y);
          if (rotation) {
            ctx.rotate(rotation * Math.PI / 180);
          }
          ctx.fillText(text || '水印文本', 0, 0);
          ctx.restore();
        }
      }
    }
  }
  
  // 处理图片水印
  if (type === 'image' && options.watermarkImage) {
    const img = options.watermarkImage;
    const imageSize = options.watermarkImageSize || 40;
    const imgWidth = width * (imageSize / 100);
    const imgHeight = (img.height / img.width) * imgWidth;
    
    const x = position ? width * (position.x / 100) : width / 2;
    const y = position ? height * (position.y / 100) : height / 2;
    
    // 旋转
    if (rotation) {
      ctx.translate(x, y);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-x, -y);
    }
    
    // 绘制图像
    ctx.drawImage(img, x - imgWidth / 2, y - imgHeight / 2, imgWidth, imgHeight);
  }
  
  // 恢复状态
  ctx.restore();
}

/**
 * 初始化GIF处理器
 */
export function initGifProcessor() {
  console.log('初始化GIF处理器');
  
  // 检查必要的库是否可用
  if (!window.gifwrap) {
    console.warn('gifwrap库未加载，GIF处理将不可用');
    return false;
  }
  
  if (!window.imageQ) {
    console.warn('imageQ库未加载，GIF质量控制将不可用');
  }
  
  console.log('GIF处理器初始化完成');
  return true;
}

/**
 * 从带水印的第一帧创建静态GIF
 * @param {Object} frame - 带水印的第一帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
function createStaticGifFromFrame(frame, width, height) {
  try {
    console.log('尝试从带水印的第一帧创建静态GIF');
    
    // 检查帧是否有效
    if (!frame || !frame.bitmap || !frame.bitmap.data) {
      console.error('无效的帧数据，无法创建静态GIF');
      return false;
    }
    
    // 从帧数据创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 绘制帧数据到Canvas
    try {
      // 先尝试使用GifUtil
      if (window.gifwrap && window.gifwrap.GifUtil) {
        const GifUtil = window.gifwrap.GifUtil;
        GifUtil.frameToImageData(frame, null, {width, height})
          .then(imageData => {
            ctx.putImageData(imageData, 0, 0);
          })
          .catch(err => {
            console.warn('使用GifUtil转换帧失败:', err);
            // 失败时使用备用方法
            fallbackDrawFrame();
          });
      } else {
        // 备用方法
        fallbackDrawFrame();
      }
    } catch (drawError) {
      console.warn('绘制帧到Canvas失败:', drawError);
      // 失败时使用备用方法
      fallbackDrawFrame();
    }
    
    // 备用绘制方法
    function fallbackDrawFrame() {
      try {
        // 直接使用帧的bitmap数据
        const imageData = new ImageData(
          new Uint8ClampedArray(frame.bitmap.data),
          width,
          height
        );
        ctx.putImageData(imageData, 0, 0);
      } catch (fallbackError) {
        console.error('备用绘制方法也失败:', fallbackError);
        return false;
      }
    }
    
    // 从Canvas获取PNG数据
    const pngDataUrl = canvas.toDataURL('image/png');
    console.log('成功创建带水印的PNG数据URL');
    
    // 保存PNG数据URL作为备用
    window.watermarkedPngDataUrl = pngDataUrl;
    
    // 尝试创建静态GIF
    try {
      // 方法0：使用NeuQuant量化器创建更好的静态GIF
      const betterGifBuffer = createBetterStaticGif(frame, width, height);
      if (betterGifBuffer && betterGifBuffer.length > 1000) {
        window.staticGifWithWatermark = new Blob([betterGifBuffer], { type: 'image/gif' });
        console.log('成功创建高质量带水印的静态GIF，大小:', Math.round(window.staticGifWithWatermark.size / 1024), 'KB');
        return true;
      }
      
      // 方法1：直接从Canvas创建Blob
      canvas.toBlob((blob) => {
        if (blob && blob.size > 1000) {
          window.staticGifWithWatermark = new Blob([blob], { type: 'image/gif' });
          console.log('成功创建带水印的静态图像，大小:', Math.round(window.staticGifWithWatermark.size / 1024), 'KB');
          return true;
        }
      }, 'image/gif');
      
      // 方法2：从PNG数据URL创建Blob
      const pngBlob = dataURLToBlob(pngDataUrl);
      if (pngBlob && pngBlob.size > 1000) {
        window.staticGifWithWatermark = new Blob([pngBlob], { type: 'image/gif' });
        console.log('成功创建带水印的静态图像，大小:', Math.round(window.staticGifWithWatermark.size / 1024), 'KB');
        return true;
      }
      
      // 方法3：使用omggif直接创建静态GIF
      const staticGifBuffer = createMinimalGif(frame, width, height);
      if (staticGifBuffer && staticGifBuffer.length > 1000) {
        window.staticGifWithWatermark = new Blob([staticGifBuffer], { type: 'image/gif' });
        console.log('成功创建带水印的静态GIF，大小:', Math.round(window.staticGifWithWatermark.size / 1024), 'KB');
        return true;
      }
      
      // 如果所有方法都失败，尝试创建最小备用GIF
      createMinimalBackupGif();
      return window.staticGifWithWatermark instanceof Blob;
    } catch (error) {
      console.warn('创建静态GIF时出错:', error);
      // 尝试创建最小备用GIF
      createMinimalBackupGif();
      return window.staticGifWithWatermark instanceof Blob;
    }
  } catch (error) {
    console.warn('创建静态GIF时出错:', error);
    // 尝试创建最小备用GIF
    createMinimalBackupGif();
    return window.staticGifWithWatermark instanceof Blob;
  }
}

/**
 * 将数据URL转换为Blob
 * @param {string} dataURL - 数据URL
 * @returns {Blob} - Blob对象
 */
function dataURLToBlob(dataURL) {
  try {
    // 提取MIME类型和数据
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    
    // 创建ArrayBuffer
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    // 创建Blob
    return new Blob([uInt8Array], { type: contentType });
  } catch (error) {
    console.error('转换数据URL到Blob时出错:', error);
    return null;
  }
}

/**
 * 创建最小有效的GIF
 * @param {Object} frame - 帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {Uint8Array} - GIF数据
 */
function createMinimalGif(frame, width, height) {
  try {
    console.log('创建最小有效GIF作为备用');
    
    // 创建缓冲区
    const buffer = new Uint8Array(width * height * 4 + 1000);
    
    // 获取GifWriter
    const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
    if (!GifWriter) {
      console.error('无法获取GifWriter');
      return null;
    }
    
    // 创建GIF写入器
    const writer = new GifWriter(buffer, width, height, { loop: 0 });
    
    // 准备像素数据
    const pixels = frame.bitmap.data;
    
    // 创建索引化像素数据
    const indexedPixels = new Uint8Array(width * height);
    const palette = [];
    
    // 创建256色灰度调色板
    for (let i = 0; i < 256; i++) {
      palette.push(i, i, i);
    }
    
    // 将RGBA像素转换为灰度索引
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      indexedPixels[i] = Math.floor((r + g + b) / 3) & 0xFF;
    }
    
    // 添加帧
    writer.addFrame(0, 0, width, height, indexedPixels, {
      palette: palette,
      delay: 100,
      disposal: 2
    });
    
    // 完成GIF
    const byteLength = writer.end();
    
    // 检查字节长度
    if (byteLength > 1000) {
      return buffer.slice(0, byteLength);
    }
    
    return null;
  } catch (error) {
    console.error('创建最小有效GIF时出错:', error);
    return null;
  }
}

/**
 * 验证GIF缓冲区
 * @param {Uint8Array} buffer - GIF缓冲区
 * @param {number} length - 长度
 * @returns {boolean} - 是否有效
 */
function validateGifBuffer(buffer, length) {
  try {
    // 检查GIF头部
    if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46) {
      console.warn('GIF验证失败：无效的GIF头部');
      return false;
    }
    
    // 检查GIF版本
    if (buffer[3] !== 0x38 || buffer[4] !== 0x39 || buffer[5] !== 0x61) {
      console.warn('GIF验证失败：无效的GIF版本');
      return false;
    }
    
    // 检查结束标记
    if (buffer[length - 1] !== 0x3B) {
      console.warn('GIF验证失败：无效的GIF结束标记');
      return false;
    }
    
    // 基本检查通过
    console.log('GIF验证通过基本检查');
    return true;
  } catch (error) {
    console.error('验证GIF缓冲区时出错:', error);
    return false;
  }
}

/**
 * 创建备用GIF数据
 * @param {Object} frame - 第一帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {*} gifSource - 原始GIF源
 */
function createBackupGif(frame, width, height, gifSource) {
  try {
    // 使用omggif库直接创建
    try {
      // 创建足够大的缓冲区
      const gifBuffer = new Uint8Array(width * height * 5 + 1000); // 添加额外空间用于头部和其他数据
      
      // 创建GIF写入器
      const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
      const gifWriter = new GifWriter(gifBuffer, width, height, { loop: 0 });
      
      // 准备索引化的像素数据
      const pixels = frame.bitmap.data || frame.pixels;
      const indexedPixels = new Uint8Array(width * height);
      const palette = [];
      
      // 简单的调色板生成 - 灰度
      for (let i = 0; i < 256; i++) {
        palette.push(i, i, i); // 灰度调色板
      }
      
      // 将RGBA像素转换为索引像素
      for (let i = 0; i < width * height; i++) {
        // 简单的灰度转换
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        // 简单的灰度计算
        indexedPixels[i] = Math.floor((r + g + b) / 3) & 0xFF;
      }
      
      // 添加帧
      gifWriter.addFrame(0, 0, width, height, indexedPixels, {
        palette: palette,
        delay: 10
      });
      
      // 完成GIF
      const gifSize = gifWriter.end();
      
      if (gifSize > 0) {
        console.log(`成功创建有效的备用GIF，大小: ${gifSize} 字节`);
        const validGif = gifBuffer.slice(0, gifSize);
        window.backupGifData = validGif;
      } else {
        console.warn('直接创建备用GIF失败，大小为0');
        createMinimalBackupGif();
      }
    } catch (gifWriteError) {
      console.warn('使用omggif创建备用GIF失败:', gifWriteError);
      createMinimalBackupGif();
    }
    
    // 保存原始文件的副本作为最终备用
    if (gifSource instanceof Blob || gifSource instanceof File) {
      console.log('保存原始GIF文件作为最终备用');
      window.originalGifSource = gifSource;
    }
  } catch (error) {
    console.error('创建备用GIF失败:', error);
  }
}

/**
 * 创建1x1像素的最小备用GIF
 */
function createMinimalBackupGif() {
  try {
    console.log('创建最小有效GIF作为备用');
    // 创建最简单的GIF - 1x1像素的黑色GIF
    const minimalGif = new Uint8Array([
      // GIF头
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      0x01, 0x00, 0x01, 0x00, // 1x1像素
      0x80, 0x00, 0x00, // 全局颜色表标志
      0x00, 0x00, 0x00, // 黑色
      0xFF, 0xFF, 0xFF, // 白色
      // 图形控制扩展
      0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
      // 图像描述符
      0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      // 图像数据
      0x02, 0x02, 0x44, 0x01, 0x00,
      // 结束标记
      0x3B
    ]);
    
    // 保存为备用GIF数据
    window.backupGifData = minimalGif;
    
    // 创建Blob并保存为静态GIF
    window.staticGifWithWatermark = new Blob([minimalGif], { type: 'image/gif' });
    console.log('创建最小有效GIF作为备用，大小:', window.staticGifWithWatermark.size, '字节');
    
    return true;
  } catch (minimalGifError) {
    console.error('创建最小GIF失败:', minimalGifError);
    return false;
  }
}

/**
 * 使用NeuQuant量化器创建更好的静态GIF
 * @param {Object} frame - 帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {Uint8Array} - GIF数据
 */
function createBetterStaticGif(frame, width, height) {
  try {
    console.log('使用NeuQuant量化器创建更好的静态GIF');
    
    // 检查image-q库是否可用
    if (!window.imageq || !window.imageq.NeuQuant) {
      console.warn('NeuQuant量化器不可用，使用简单方法');
      return createMinimalGif(frame, width, height);
    }
    
    // 创建缓冲区
    const buffer = new Uint8Array(width * height * 4 + 10240);
    
    // 获取GifWriter
    const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
    if (!GifWriter) {
      console.error('无法获取GifWriter');
      return null;
    }
    
    // 创建GIF写入器
    const writer = new GifWriter(buffer, width, height, { loop: 0 });
    
    // 准备像素数据
    const pixels = frame.bitmap.data;
    
    // 使用NeuQuant量化器创建索引化像素
    const { NeuQuant } = window.imageq;
    const quantizer = new NeuQuant(pixels, 256);
    quantizer.buildColormap();
    const colorPalette = quantizer.getColormap();
    
    // 将RGBA像素转换为索引像素
    const indexedPixels = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      indexedPixels[i] = quantizer.lookupRGB(r, g, b);
    }
    
    // 添加帧
    writer.addFrame(0, 0, width, height, indexedPixels, {
      palette: colorPalette,
      delay: 100,
      disposal: 2
    });
    
    // 完成GIF
    const byteLength = writer.end();
    
    // 检查字节长度
    if (byteLength > 1000) {
      return buffer.slice(0, byteLength);
    }
    
    return null;
  } catch (error) {
    console.error('使用NeuQuant创建静态GIF时出错:', error);
    return null;
  }
}