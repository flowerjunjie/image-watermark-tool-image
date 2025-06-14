/**
 * 图片处理模块
 * 处理图片的加载、水印应用和导出
 */

import { watermarkState, updateState } from '../core/state.js';
import { renderWatermarkOnCanvas } from '../core/watermark.js';
import { isGif, processGif } from './gif/gif-processor.js';

// 创建一个Worker实例
let imageWorker;
let workerReady = false;
let pendingTasks = [];
let taskIdCounter = 0;
let taskCallbacks = {};

// 初始化Worker
function initWorker() {
  if (imageWorker) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    try {
      imageWorker = new Worker('js/workers/image-worker.js');
      
      // 处理Worker消息
      imageWorker.onmessage = function(e) {
        const { type, id, blob, error, width, height } = e.data;
        
        if (error) {
          console.error('Worker错误:', error);
          if (id && taskCallbacks[id]) {
            taskCallbacks[id].reject(new Error(error));
            delete taskCallbacks[id];
          }
          return;
        }
        
        switch (type) {
          case 'processImageComplete':
            if (taskCallbacks[id]) {
              const blobUrl = URL.createObjectURL(blob);
              taskCallbacks[id].resolve({ 
                blobUrl, 
                blob, 
                width, 
                height 
              });
              delete taskCallbacks[id];
            }
            break;
            
          case 'applyWatermarkComplete':
            if (taskCallbacks[id]) {
              const blobUrl = URL.createObjectURL(blob);
              taskCallbacks[id].resolve({ blobUrl, blob });
              delete taskCallbacks[id];
            }
            break;
        }
        
        // 处理下一个任务
        if (pendingTasks.length > 0) {
          const nextTask = pendingTasks.shift();
          imageWorker.postMessage(nextTask.message, nextTask.transfer || []);
        }
      };
      
      // 处理Worker错误
      imageWorker.onerror = function(error) {
        console.error('Worker初始化错误:', error);
        reject(error);
      };
      
      workerReady = true;
      resolve();
      
      // 处理等待中的任务
      if (pendingTasks.length > 0) {
        const nextTask = pendingTasks.shift();
        imageWorker.postMessage(nextTask.message, nextTask.transfer || []);
      }
    } catch (error) {
      console.error('初始化Worker时出错:', error);
      reject(error);
    }
  });
}

// 向Worker发送任务
function sendToWorker(message, transfer) {
  return new Promise((resolve, reject) => {
    const taskId = ++taskIdCounter;
    message.data.id = taskId;
    taskCallbacks[taskId] = { resolve, reject };
    
    if (!workerReady) {
      pendingTasks.push({ message, transfer });
      initWorker().catch(reject);
    } else if (Object.keys(taskCallbacks).length > 1) {
      // 如果有其他任务正在处理，将此任务加入队列
      pendingTasks.push({ message, transfer });
    } else {
      // 直接发送任务
      imageWorker.postMessage(message, transfer || []);
    }
  });
}

/**
 * 处理单张图片
 * @param {File} file - 图片文件
 * @param {boolean} shouldApplyWatermark - 是否应用水印
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise，返回处理后的blobURL
 */
export function processImage(file, shouldApplyWatermark = false, options = {}) {
  return new Promise((resolve, reject) => {
    console.log('执行processImage函数, 是否应用水印:', shouldApplyWatermark);
    
    try {
      if (!file) {
        console.error('无效的图片文件');
        resolve(null);
        return;
      }
      
      // 检查是否为GIF
      if (isGif(file)) {
        console.log('检测到GIF文件，使用专门的GIF处理器');
        processGifImage(file, shouldApplyWatermark, options)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // 合并默认选项
      const defaultOptions = {
        quality: watermarkState.quality || 0.92,
        format: watermarkState.format || 'image/jpeg'
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      // 直接使用主线程处理，跳过Worker
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          // 创建图片对象
          const img = new Image();
          
          img.onload = function() {
            try {
              // 保存原始图像对象到watermarkState，确保水印渲染可以使用
              updateState({
                originalImage: img,
                originalImageWidth: img.width,
                originalImageHeight: img.height
              });
              
              console.log(`保存原始图像对象: ${img.width}x${img.height}`);
              
              // 创建Canvas
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              // 绘制原始图片
              ctx.drawImage(img, 0, 0);
              
              console.log(`处理图片: ${file.name}, 尺寸: ${img.width}x${img.height}, 应用水印: ${shouldApplyWatermark}`);
              
              // 如果需要应用水印
              if (shouldApplyWatermark) {
                // 创建完整的水印选项对象，确保包含所有必要的属性
                const watermarkOptions = {
                  type: watermarkState.type || 'text',
                  text: watermarkState.text || '仅供验证使用',
                  color: watermarkState.color || '#ff0000',
                  fontSize: watermarkState.fontSize,
                  opacity: watermarkState.opacity || 50,
                  rotation: watermarkState.rotation || 0,
                  position: watermarkState.relativePosition || { x: 50, y: 50 },
                  tileSpacing: watermarkState.tileSpacing || 150,
                  watermarkImage: watermarkState.watermarkImage
                };
                
                console.log('应用水印，选项:', JSON.stringify({
                  type: watermarkOptions.type,
                  text: watermarkOptions.text.substring(0, 20) + (watermarkOptions.text.length > 20 ? '...' : ''),
                  position: watermarkOptions.position
                }));
                
                // 应用水印
                applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkOptions);
              }
              
              // 转换为Blob
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    console.error('创建Blob失败');
                    reject(new Error('创建Blob失败'));
                    return;
                  }
                  
                  // 创建BlobURL
                  const blobUrl = URL.createObjectURL(blob);
                  console.log(`图片处理完成: ${file.name}, BlobURL创建成功`);
                  
                  // 返回处理结果
                  resolve({
                    blobUrl,
                    blob,
                    width: img.width,
                    height: img.height,
                    isGif: false
                  });
                },
                finalOptions.format,
                finalOptions.quality
              );
            } catch (error) {
              console.error('处理图片时出错:', error);
              reject(error);
            }
          };
          
          img.onerror = function() {
            console.error('加载图片失败');
            reject(new Error('加载图片失败'));
          };
          
          // 设置图片源
          img.src = e.target.result;
        } catch (error) {
          console.error('处理FileReader结果时出错:', error);
          reject(error);
        }
      };
      
      reader.onerror = function() {
        console.error('读取文件失败');
        reject(new Error('读取文件失败'));
      };
      
      // 读取文件
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('处理图片时出错:', error);
      reject(error);
    }
  });
}

/**
 * 处理GIF图片
 * @param {File} file - GIF文件
 * @param {boolean} shouldApplyWatermark - 是否应用水印
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise，返回处理后的blobURL
 */
async function processGifImage(file, shouldApplyWatermark = false, options = {}) {
  console.log('开始处理GIF图片:', file.name);
  
  try {
    // 使用专门的GIF处理器
    const result = await processGif(file, {
      applyWatermark: shouldApplyWatermark,
      quality: options.quality || 10,
      onProgress: options.onProgress
    });
    
    // 添加GIF标记
    result.isGif = true;
    
    console.log('GIF处理完成:', file.name);
    return result;
  } catch (error) {
    console.error('处理GIF时出错:', error);
    
    // 如果GIF处理失败，尝试使用普通图片处理
    console.log('尝试使用普通图片处理方法处理GIF');
    
    // 创建文件URL
    const fileUrl = URL.createObjectURL(file);
    
    // 创建图片对象
    const img = new Image();
    
    // 等待图片加载
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = fileUrl;
    });
    
    // 保存原始图像对象
    updateState({
      originalImage: img,
      originalImageWidth: img.width,
      originalImageHeight: img.height
    });
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // 绘制原始图片
    ctx.drawImage(img, 0, 0);
    
    // 如果需要应用水印
    if (shouldApplyWatermark) {
      // 创建水印选项
      const watermarkOptions = {
        type: watermarkState.type || 'text',
        text: watermarkState.text || '仅供验证使用',
        color: watermarkState.color || '#ff0000',
        fontSize: watermarkState.fontSize,
        opacity: watermarkState.opacity || 50,
        rotation: watermarkState.rotation || 0,
        position: watermarkState.relativePosition || { x: 50, y: 50 },
        tileSpacing: watermarkState.tileSpacing || 150,
        watermarkImage: watermarkState.watermarkImage
      };
      
      // 应用水印
      applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkOptions);
    }
    
    // 转换为Blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png', 0.92);
    });
    
    // 创建BlobURL
    const blobUrl = URL.createObjectURL(blob);
    
    // 清理资源
    URL.revokeObjectURL(fileUrl);
    
    // 返回处理结果
    return {
      blobUrl,
      blob,
      width: img.width,
      height: img.height,
      isGif: false // 标记为普通图片
    };
  }
}

/**
 * 在主线程中处理图片
 * @param {string} dataUrl - 图片的dataURL
 * @param {boolean} shouldApplyWatermark - 是否应用水印
 * @param {Object} options - 处理选项
 * @returns {Promise<string>} - 返回处理后的blobURL
 */
function processImageInMainThread(dataUrl, shouldApplyWatermark, options) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          // 绘制原始图片
          ctx.drawImage(img, 0, 0);
          
          // 保存原始图像对象和尺寸，用于Canvas渲染
          updateState({
            originalImage: img,
            originalImageWidth: img.width,
            originalImageHeight: img.height
          });
          
          console.log('已保存原始图像对象:', img.width, 'x', img.height);
          
          // 如果需要应用水印
          if (shouldApplyWatermark) {
            // 创建完整的水印选项对象，确保包含所有必要的属性
            const watermarkOptions = {
              type: watermarkState.type || 'text',
              text: watermarkState.text || '仅供验证使用',
              color: watermarkState.color || '#ff0000',
              fontSize: watermarkState.fontSize,
              opacity: watermarkState.opacity || 50,
              rotation: watermarkState.rotation || 0,
              position: watermarkState.relativePosition || { x: 50, y: 50 }, // 使用relativePosition
              tileSpacing: watermarkState.tileSpacing || 150,
              watermarkImage: watermarkState.watermarkImage
            };
            
            console.log('应用水印，选项:', JSON.stringify({
              type: watermarkOptions.type,
              position: watermarkOptions.position
            }));
            
            applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkOptions);
          }
          
          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('创建Blob失败'));
                return;
              }
              
              const blobUrl = URL.createObjectURL(blob);
              resolve(blobUrl);
            },
            options.format,
            options.quality
          );
        } catch (error) {
          console.error('处理图片时出错:', error);
          reject(error);
        }
      };
      
      img.onerror = function() {
        console.error('加载图片失败');
        reject(new Error('加载图片失败'));
      };
      
      img.src = dataUrl;
    } catch (error) {
      console.error('主线程处理图片时出错:', error);
      reject(error);
    }
  });
}

/**
 * 使用Worker处理图片
 * @param {string} dataUrl - 图片数据URL
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise
 */
function processImageWithWorker(dataUrl, options = {}) {
  return initWorker().then(() => {
    return sendToWorker({
      type: 'processImage',
      data: {
        imageData: dataUrl,
        quality: options.quality,
        format: options.format
      }
    });
  });
}

/**
 * 使用Worker应用水印
 * @param {string} dataUrl - 图片数据URL
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise
 */
function applyWatermarkWithWorker(dataUrl, options = {}) {
  return initWorker().then(() => {
    // 准备水印选项
    const watermarkOptions = {
      type: watermarkState.type,
      text: watermarkState.text,
      color: watermarkState.color,
      fontSize: watermarkState.fontSize * (watermarkState.scale || 1),
      opacity: watermarkState.opacity,
      rotation: watermarkState.rotation,
      position: watermarkState.relativePosition,
      tileSpacing: watermarkState.tileSpacing
    };
    
    // 如果是图片水印，添加水印图片数据
    if (watermarkState.type === 'image' && watermarkState.watermarkImage) {
      watermarkOptions.watermarkImageData = watermarkState.watermarkImage;
    }
    
    return sendToWorker({
      type: 'applyWatermark',
      data: {
        imageData: dataUrl,
        watermarkOptions: watermarkOptions,
        quality: options.quality,
        format: options.format
      }
    });
  });
}

/**
 * 在预览区域显示图片
 * @param {string} blobUrl - 图片的BlobURL
 */
export function displayImage(blobUrl) {
  try {
    if (!blobUrl) {
      console.error('无效的图片URL');
      return;
    }
    
    const previewImage = document.getElementById('preview-image');
    const noImageMessage = document.getElementById('no-image-message');
    const previewCanvas = document.getElementById('preview-canvas');
    
    if (noImageMessage) {
      noImageMessage.style.display = 'none';
    }
    
    if (previewCanvas) {
      previewCanvas.style.display = 'none';
    }
    
    if (previewImage) {
      // 先清除旧的src以避免内存泄漏
      if (previewImage.src && previewImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage.src);
      }
      
      // 预加载图片，确保完全加载后再显示
      const img = new Image();
      img.onload = function() {
        // 保存原始图像对象和尺寸，用于水印渲染
        updateState({
          originalImage: img,
          originalImageWidth: img.naturalWidth,
          originalImageHeight: img.naturalHeight
        });
        
        console.log('displayImage: 已保存原始图像对象:', img.naturalWidth, 'x', img.naturalHeight);
        
        // 图片加载完成后，更新预览图
        previewImage.src = blobUrl;
        previewImage.style.display = 'block';
        
        // 更新水印位置
        updateWatermarkPosition();
      };
      
      img.onerror = function() {
        console.error('加载图片失败:', blobUrl);
        if (noImageMessage) {
          noImageMessage.textContent = '图片加载失败';
          noImageMessage.style.display = 'block';
        }
      };
      
      img.src = blobUrl;
    }
  } catch (error) {
    console.error('显示图片时出错:', error);
  }
}

/**
 * 批量处理图片
 * @param {Array} files - 图片文件数组
 * @param {Function} progressCallback - 进度回调函数
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise，返回处理后的图片数组
 */
export function batchProcessImages(files, progressCallback, options = {}) {
  return new Promise((resolve, reject) => {
    const processedImages = [];
    const total = files.length;
    let completed = 0;
    
    // 默认并发数
    const concurrency = options.concurrency || 3;
    let running = 0;
    let index = 0;
    
    // 更新进度
    const updateProgress = () => {
      completed++;
      if (progressCallback) {
        progressCallback(completed / total);
      }
      
      // 检查是否全部完成
      if (completed === total) {
        resolve(processedImages);
      } else {
        // 继续处理
        startNextProcesses();
      }
    };
    
    // 处理单个图片
    const processOneImage = (index) => {
      if (index >= files.length) return;
      
      const file = files[index];
      running++;
      
      // 检查是否有保存的设置
      let shouldApplyWatermark = true;
      let watermarkOptions = null;
      
      // 如果有第一张图片的设置，使用它
      if (watermarkState.firstImageSettings) {
        watermarkOptions = { ...watermarkState.firstImageSettings };
      }
      
      // 如果有这个图片的设置，优先使用它
      if (watermarkState.processedSettings[file.name]) {
        watermarkOptions = { ...watermarkState.processedSettings[file.name] };
      }
      
      // 处理图片
      processImage(file, shouldApplyWatermark, {
        ...options,
        ...watermarkOptions
      })
        .then(result => {
          // 添加到处理后的图片列表
          processedImages.push({
            file,
            result,
            fileName: file.name
          });
          
          running--;
          updateProgress();
        })
        .catch(error => {
          console.error(`处理图片 ${file.name} 失败:`, error);
          
          // 添加错误信息
          processedImages.push({
            file,
            error: error.message,
            fileName: file.name
          });
          
          running--;
          updateProgress();
        });
    };
    
    // 启动下一批处理
    const startNextProcesses = () => {
      while (running < concurrency && index < files.length) {
        processOneImage(index++);
      }
    };
    
    // 开始处理
    startNextProcesses();
  });
}

/**
 * 生成并下载ZIP
 * @param {Array} processedImages - 处理后的图片数组
 * @param {string} zipFileName - ZIP文件名
 * @returns {Promise} - 下载完成的Promise
 */
export function generateAndDownloadZip(processedImages, zipFileName = 'watermarked_images.zip') {
  return new Promise((resolve, reject) => {
    // 检查是否有JSZip库
    if (!window.JSZip) {
      reject(new Error('JSZip库未加载'));
      return;
    }
    
    // 创建一个新的ZIP
    const zip = new window.JSZip();
    
    // 添加所有图片到ZIP
    const promises = processedImages.map(async (item) => {
      try {
        if (item.error) {
          console.warn(`跳过添加图片 ${item.fileName} 到ZIP，因为处理时出错:`, item.error);
          return;
        }
        
        // 获取blob
        let blob;
        if (item.result.blob) {
          // 如果已经有blob，直接使用
          blob = item.result.blob;
        } else if (item.result.blobUrl) {
          // 如果只有blobUrl，获取blob
          const response = await fetch(item.result.blobUrl);
          blob = await response.blob();
        } else {
          console.warn(`跳过添加图片 ${item.fileName} 到ZIP，因为没有blob或blobUrl`);
          return;
        }
        
        // 确定文件扩展名
        let extension;
        if (item.result.isGif) {
          extension = '.gif'; // GIF文件保持.gif扩展名
        } else if (blob.type === 'image/png') {
          extension = '.png';
        } else if (blob.type === 'image/jpeg') {
          extension = '.jpg';
        } else if (blob.type === 'image/webp') {
          extension = '.webp';
        } else {
          // 默认使用原始文件的扩展名
          const originalExt = item.fileName.substring(item.fileName.lastIndexOf('.'));
          extension = originalExt || '.jpg';
        }
        
        // 创建新的文件名（去除原始扩展名）
        const baseName = item.fileName.substring(0, item.fileName.lastIndexOf('.'));
        const newFileName = `${baseName}_watermarked${extension}`;
        
        // 添加到ZIP
        zip.file(newFileName, blob);
        console.log(`添加图片 ${newFileName} 到ZIP`);
      } catch (error) {
        console.error(`添加图片 ${item.fileName} 到ZIP时出错:`, error);
      }
    });
    
    // 等待所有图片添加完成
    Promise.all(promises)
      .then(() => {
        // 生成ZIP
        return zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6 // 压缩级别，1-9，9为最高压缩率
          }
        });
      })
      .then((blob) => {
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFileName;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        
        resolve();
      })
      .catch((error) => {
        console.error('生成ZIP文件时出错:', error);
        reject(error);
      });
  });
}

/**
 * 清理图片资源
 * @param {string} blobUrl - 要清理的Blob URL
 */
export function cleanupImageResource(blobUrl) {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * 清理所有图片资源
 * @param {Array} images - 图片列表
 */
export function cleanupAllImageResources(images) {
  if (Array.isArray(images)) {
    images.forEach(image => {
      if (image.dataUrl && image.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(image.dataUrl);
      }
    });
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
  
  console.log('应用水印到Canvas，类型:', type, '位置:', position);
  
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
 * 更新水印位置
 * 在图片加载完成后调用，确保水印位置正确
 */
function updateWatermarkPosition() {
  try {
    const watermarkContainer = document.getElementById('watermark-container');
    if (!watermarkContainer) return;
    
    // 获取当前水印类型和位置
    const { type, position } = watermarkState;
    
    // 如果水印容器中有水印元素
    const watermarkElement = watermarkContainer.querySelector('.watermark');
    if (watermarkElement) {
      // 根据百分比计算实际位置
      const previewContainer = document.getElementById('preview-container');
      if (previewContainer) {
        const containerWidth = previewContainer.offsetWidth;
        const containerHeight = previewContainer.offsetHeight;
        
        const actualX = (position.x / 100) * containerWidth;
        const actualY = (position.y / 100) * containerHeight;
        
        // 更新水印元素位置
        watermarkElement.style.left = `${actualX}px`;
        watermarkElement.style.top = `${actualY}px`;
      }
    }
  } catch (error) {
    console.error('更新水印位置时出错:', error);
  }
} 