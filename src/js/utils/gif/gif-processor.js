/**
 * GIF处理模块
 * 使用gifwrap库处理GIF图像，添加水印等
 */

import { GifFrame, GifUtil, GifCodec } from 'gifwrap';
import { applyWatermark, createWatermarkTemplate } from '../../core/watermark-core.js';
import { getWatermarkOptions } from '../../core/state.js';

// 创建GIF编解码器
const gifCodec = new GifCodec();

// 缓存处理过的GIF，提高性能
const gifCache = new Map();
const MAX_CACHE_SIZE = 20; // 最大缓存数量

/**
 * 判断文件是否为GIF
 * @param {File|Blob|string} file 文件或URL
 * @returns {boolean} 是否为GIF
 */
export function isGif(file) {
  // 检查MIME类型
  if (file instanceof File || file instanceof Blob) {
    // 同时检查MIME类型和文件扩展名
    const isGifMime = file.type === 'image/gif';
    
    // 如果有文件名，检查扩展名
    if (file.name) {
      const isGifExt = file.name.toLowerCase().endsWith('.gif');
      return isGifMime || isGifExt; // 满足任一条件即认为是GIF
    }
    
    return isGifMime;
  }
  
  // 如果是字符串URL，检查扩展名
  if (typeof file === 'string') {
    return file.toLowerCase().endsWith('.gif');
  }
  
  return false;
}

/**
 * 处理GIF，添加水印
 * @param {Blob|File|string} gifSource GIF文件或URL
 * @param {Object} options 水印选项
 * @param {Function} progressCallback 进度回调函数
 * @returns {Promise<Blob>} 处理后的GIF
 */
export async function processGif(gifSource, options = null, progressCallback = null) {
  try {
    // 使用传入的选项或获取默认选项
    const watermarkOptions = options || getWatermarkOptions();
    
    // 生成缓存键
    const cacheKey = generateCacheKey(gifSource, watermarkOptions);
    
    // 检查缓存
    if (gifCache.has(cacheKey)) {
      console.log('使用缓存的GIF结果');
      return gifCache.get(cacheKey);
    }
    
    // 转换输入为ArrayBuffer
    const gifBuffer = await readGifSource(gifSource);
    
    // 解码GIF
    const gifData = await decodeGif(gifBuffer);
    
    // 处理GIF帧
    const processedFrames = await processGifFrames(gifData.frames, watermarkOptions, progressCallback);
    
    // 编码GIF
    const processedGif = await encodeGif(processedFrames, gifData.options);
    
    // 缓存结果
    if (gifCache.size >= MAX_CACHE_SIZE) {
      // 删除最旧的缓存项
      const firstKey = gifCache.keys().next().value;
      gifCache.delete(firstKey);
    }
    gifCache.set(cacheKey, processedGif);
    
    return processedGif;
  } catch (error) {
    console.error('GIF处理失败:', error);
    throw new Error(`GIF处理失败: ${error.message}`);
  }
}

/**
 * 读取GIF源
 * @param {Blob|File|string} source GIF源
 * @returns {Promise<ArrayBuffer>} GIF数据的ArrayBuffer
 */
async function readGifSource(source) {
  if (source instanceof Blob || source instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(source);
    });
  } else if (typeof source === 'string') {
    // 如果是URL，先获取Blob
    const response = await fetch(source);
    const blob = await response.blob();
    return readGifSource(blob);
  } else {
    throw new Error('不支持的GIF源类型');
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
 * @param {Function} progressCallback 进度回调函数
 * @returns {Promise<GifFrame[]>} 处理后的GIF帧
 */
async function processGifFrames(frames, options, progressCallback) {
  // 创建水印模板
  // 使用第一帧的尺寸创建水印模板
  const firstFrame = frames[0];
  const watermarkTemplate = await createWatermarkTemplate(
    firstFrame.bitmap.width,
    firstFrame.bitmap.height,
    options
  );
  
  // 创建离屏Canvas用于处理
  const canvas = document.createElement('canvas');
  canvas.width = firstFrame.bitmap.width;
  canvas.height = firstFrame.bitmap.height;
  const ctx = canvas.getContext('2d');
  
  // 处理每一帧
  const processedFrames = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    // 报告进度
    if (progressCallback) {
      progressCallback(i / frames.length);
    }
    
    // 创建图像数据
    const imageData = GifUtil.copyAsImageData(frame);
    
    // 绘制原始帧
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    
    // 绘制水印
    ctx.drawImage(watermarkTemplate, 0, 0);
    
    // 获取处理后的图像数据
    const processedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 创建新的GIF帧
    const processedFrame = new GifFrame(processedImageData, {
      disposalMethod: frame.disposalMethod,
      delayCentisecs: frame.delayCentisecs,
      interlaced: frame.interlaced
    });
    
    processedFrames.push(processedFrame);
  }
  
  // 最终进度
  if (progressCallback) {
    progressCallback(1);
  }
  
  return processedFrames;
}

/**
 * 编码GIF
 * @param {GifFrame[]} frames GIF帧
 * @param {Object} options GIF选项
 * @returns {Promise<Blob>} 编码后的GIF
 */
async function encodeGif(frames, options) {
  try {
    // 使用gifwrap编码GIF
    const buffer = await gifCodec.encodeGif(frames, options);
    
    // 转换为Blob
    return new Blob([buffer.buffer], { type: 'image/gif' });
  } catch (error) {
    console.error('GIF编码失败:', error);
    throw new Error(`GIF编码失败: ${error.message}`);
  }
}

/**
 * 生成缓存键
 * @param {Blob|File|string} source GIF源
 * @param {Object} options 水印选项
 * @returns {string} 缓存键
 */
function generateCacheKey(source, options) {
  // 为文件生成唯一标识符
  let sourceId = '';
  
  if (source instanceof File) {
    sourceId = `${source.name}_${source.size}_${source.lastModified}`;
  } else if (source instanceof Blob) {
    sourceId = `blob_${source.size}_${Date.now()}`;
  } else if (typeof source === 'string') {
    sourceId = source;
  }
  
  // 将选项序列化为字符串
  const optionsStr = JSON.stringify({
    type: options.type,
    text: options.text,
    color: options.color,
    opacity: options.opacity,
    position: options.position,
    rotation: options.rotation,
    repeat: options.repeat,
    size: options.size,
    spacing: options.spacing
  });
  
  return `${sourceId}_${optionsStr}`;
}

/**
 * 创建GIF静态预览
 * @param {Blob|File|string} gifSource GIF源
 * @returns {Promise<HTMLImageElement>} 静态预览图像
 */
export async function createGifPreview(gifSource) {
  try {
    // 读取GIF源
    const gifBuffer = await readGifSource(gifSource);
    
    // 解码GIF
    const gifData = await decodeGif(gifBuffer);
    
    // 使用第一帧创建预览
    const firstFrame = gifData.frames[0];
    const imageData = GifUtil.copyAsImageData(firstFrame);
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = firstFrame.bitmap.width;
    canvas.height = firstFrame.bitmap.height;
    
    // 绘制第一帧
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    // 转换为图像
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => reject(error);
      img.src = canvas.toDataURL('image/png');
    });
  } catch (error) {
    console.error('创建GIF预览失败:', error);
    throw new Error(`创建GIF预览失败: ${error.message}`);
  }
}

/**
 * 获取GIF信息
 * @param {Blob|File|string} gifSource GIF源
 * @returns {Promise<Object>} GIF信息
 */
export async function getGifInfo(gifSource) {
  try {
    // 读取GIF源
    const gifBuffer = await readGifSource(gifSource);
    
    // 解码GIF
    const gifData = await decodeGif(gifBuffer);
    
    // 提取信息
    const firstFrame = gifData.frames[0];
    
    return {
      width: firstFrame.bitmap.width,
      height: firstFrame.bitmap.height,
      frameCount: gifData.frames.length,
      duration: gifData.frames.reduce((total, frame) => total + frame.delayCentisecs, 0) / 100, // 转换为秒
      loops: gifData.options.loops,
      size: gifBuffer.byteLength
    };
  } catch (error) {
    console.error('获取GIF信息失败:', error);
    throw new Error(`获取GIF信息失败: ${error.message}`);
  }
} 