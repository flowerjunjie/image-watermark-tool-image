/**
 * 图片处理模块
 * 处理图片的加载、水印应用和导出
 */

import { watermarkState, updateState } from '../core/state.js';
import { renderWatermarkOnCanvas } from '../core/watermark.js';
// 使用gifwrap方式处理GIF
import { isGif, processGif } from './gifwrap/gif-processor.js';
import { displayFileStatistics } from './drag-drop.js';

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
 * 处理图片，添加水印或其他效果
 * @param {File} file - 图片文件
 * @param {boolean} shouldApplyWatermark - 是否应用水印
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise
 */
export function processImage(file, shouldApplyWatermark = false, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('处理图片:', file.name, '应用水印:', shouldApplyWatermark, '选项:', Object.keys(options).join(','));
      
      // 判断是否为GIF
      const isGifImage = isGif(file);
      
      if (isGifImage) {
        console.log('识别为GIF文件，使用GIF处理器');
        
        // 优化：检测是否应该保留动画效果
        const preserveAnimation = options.preserveAnimation || 
                                  options.isPreview || 
                                  !shouldApplyWatermark;
        
        // 使用专门的GIF处理函数
        const result = await processGifImage(file, shouldApplyWatermark, {
          ...options, 
          preserveAnimation // 传递是否保留动画的标记
        });
        
        resolve(result);
        return;
      }
      
      // 非GIF图片处理
      console.log('非GIF文件，使用标准图像处理');
      
      // 使用FileReader读取文件
      const reader = new FileReader();
      
      reader.onload = async function(e) {
        try {
          const dataUrl = e.target.result;
          
          // 根据选项确定如何处理图像
          let result;
          
          // 为了确保稳定性，在批量处理模式下直接使用主线程处理
          if (options.isBatchProcessing) {
            console.log('批量处理模式：在主线程处理图像');
            result = await processImageInMainThread(dataUrl, shouldApplyWatermark, options);
          } else {
            // 尝试使用Worker处理
            const canUseWorker = options.useWorker !== false && typeof Worker !== 'undefined' && imageWorker;
            
            if (canUseWorker) {
              try {
                // 使用Web Worker处理图像
                console.log('使用Web Worker处理图像');
                result = await processImageWithWorker(dataUrl, {
                  ...options,
                  applyWatermark: shouldApplyWatermark
                });
              } catch (workerError) {
                console.warn('Worker处理失败，回退到主线程处理:', workerError);
                result = await processImageInMainThread(dataUrl, shouldApplyWatermark, options);
              }
            } else {
              console.log('在主线程处理图像');
              result = await processImageInMainThread(dataUrl, shouldApplyWatermark, options);
            }
          }
          
          // 设置文件名
          result.fileName = file.name;
          
          // 添加原始文件引用
          result.originalBlob = file;
                  
                  // 返回处理结果
          resolve(result);
            } catch (error) {
          console.error('处理图像数据时出错:', error);
          reject(error);
        }
      };
      
      reader.onerror = function() {
        console.error('读取文件失败');
        reject(new Error('读取文件失败'));
      };
      
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
 * @returns {Promise} - 处理完成的Promise
 */
async function processGifImage(file, shouldApplyWatermark = false, options = {}) {
  console.log('执行processGifImage函数, 文件:', file.name, '应用水印:', shouldApplyWatermark, 
              '保留动画:', options.preserveAnimation, 
              '批量处理:', options.isBatchProcessing);
  
  try {
    // 预检查文件
    if (!file || !isGif(file)) {
      console.error('无效的GIF文件:', file);
      throw new Error('无效的GIF文件');
    }
    
    // 准备水印选项
    const watermarkOptions = shouldApplyWatermark ? {
      ...options,
      type: watermarkState.type,
      text: watermarkState.text,
      position: watermarkState.position,
      fontSize: watermarkState.fontSize,
      color: watermarkState.color,
      opacity: watermarkState.opacity,
      rotation: watermarkState.rotation,
      image: watermarkState.image,
      imageSize: watermarkState.imageSize,
      // GIF特有选项
      gifOptions: {
        ...options.gifOptions,
        quality: document.getElementById('gif-quality') ? 
          parseInt(document.getElementById('gif-quality').value, 10) : 10
      },
      fileName: file.name
    } : { isPreview: options.isPreview };
    
    // GIF进度条更新函数
    function updateGifProgressBar(progress) {
      const progressContainer = document.getElementById('gif-progress-container');
      const progressBar = document.getElementById('gif-progress-bar');
      
      if (progressContainer && progressBar) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${progress}%`;
        
        // 如果进度为100%，稍后隐藏进度条
        if (progress >= 100) {
          setTimeout(() => {
            progressContainer.style.display = 'none';
          }, 1000);
        }
      }
    }
    
    // 获取图片尺寸工具函数
    async function getImageDimensions(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({ 
            width: img.naturalWidth || img.width, 
            height: img.naturalHeight || img.height 
          });
        };
        img.onerror = reject;
        img.src = url;
      });
    }
    
    // 预览模式特殊处理
    if (options.isPreview) {
      // 针对预览使用特殊的快速处理方式
      console.log('GIF预览模式');
      watermarkOptions.isPreview = true;
      
      // 使用直接的Blob URL渲染预览
      const processStartTime = performance.now();
      
      // 使用新的gifwrap处理器
      const processedGif = await processGif(file, watermarkOptions, (progress) => {
        // 处理进度回调
        if (options.onProgress) {
          options.onProgress(progress);
        }
        
        // 更新GIF进度条
        updateGifProgressBar(progress);
      });
      
      const processEndTime = performance.now();
      console.log(`GIF处理完成，耗时: ${(processEndTime - processStartTime) / 1000}秒`);
      
      // 检查processedGif是否是对象（新格式）或Blob（旧格式）
      let blobUrl, previewUrl, gifBlob;
      
      if (processedGif instanceof Blob || processedGif instanceof File) {
        // 旧格式，直接使用Blob
        gifBlob = processedGif;
        blobUrl = URL.createObjectURL(gifBlob);
        // 检查watermarkOptions中是否有预览
        previewUrl = watermarkOptions.previewDataUrl || blobUrl;
      } else {
        // 新格式，包含blob和预览
        gifBlob = processedGif.blob;
        blobUrl = URL.createObjectURL(gifBlob);
        previewUrl = processedGif.previewDataUrl || blobUrl;
      }
      
      // 测量尺寸
      const dimensions = await getImageDimensions(blobUrl).catch(() => ({
        width: 0,
        height: 0
      }));
      
      // 返回处理结果
      const result = {
        isGif: true,
        blobUrl,
        previewUrl: previewUrl || blobUrl, // 使用预览图或blobUrl
        blob: gifBlob,
        width: dimensions.width,
        height: dimensions.height,
        originalFile: file,
        watermarkApplied: previewUrl ? true : false // 如果有预览图，则认为水印已应用
      };
      
      console.log('GIF处理结果准备完成:', result);
      return result;
    } 
    // 下载模式 - 根据情况选择是否应用水印
    else {
      console.log('GIF下载模式，检查是否需要应用水印');
      
      // 如果不需要应用水印，直接返回原文件
      if (!shouldApplyWatermark) {
        console.log('不需要应用水印，返回原始GIF文件');
        const fileUrl = URL.createObjectURL(file);
        return {
          blobUrl: fileUrl,
          previewUrl: fileUrl, // 添加预览URL
          blob: file,
          isGif: true,
          originalBlob: file, // 保留原始文件引用
          fileName: file.name,
          watermarkApplied: false
        };
      }
      
      // 需要应用水印并处理GIF
      console.log('开始处理GIF并应用水印到每一帧，使用gifwrap方式');
      
      // 使用gifwrap处理，直接使用上面创建的watermarkOptions
      const processedGif = await processGif(file, watermarkOptions, (progress) => {
        // 更新进度条
        if (options.onProgress) {
          options.onProgress(progress);
        }
        
        // 更新GIF进度条
        updateGifProgressBar(progress);
        
        // 记录日志
        if (progress % 10 === 0) {
          console.log(`GIF处理进度: ${progress}%`);
        }
      });
      
      if (!processedGif) {
        console.error('GIF处理失败，返回结果为空');
        throw new Error('GIF处理失败，返回结果为空');
      }
      
      // 检查processedGif是否是对象（新格式）或Blob（旧格式）
      let gifBlob, previewDataUrl, watermarkApplied;
      
      if (processedGif instanceof Blob || processedGif instanceof File) {
        // 旧格式，直接使用Blob
        console.log('GIF处理结果为Blob格式，大小:', Math.round(processedGif.size / 1024), 'KB');
        gifBlob = processedGif;
        // 检查watermarkOptions中是否有预览
        previewDataUrl = watermarkOptions.previewDataUrl ? watermarkOptions.previewDataUrl : null;
        // 检查是否为静态GIF备用
        watermarkApplied = previewDataUrl ? true : false; // 如果有预览，则认为水印已应用
        
        // 额外检查：如果gifBlob与window.staticGifWithWatermark相同，则认为水印已应用
        if (window.staticGifWithWatermark instanceof Blob && 
            gifBlob.size === window.staticGifWithWatermark.size) {
          console.log('检测到使用了静态GIF备用，标记水印为已应用');
          watermarkApplied = true;
        }
      } else {
        // 新格式，包含blob和预览
        console.log('GIF处理结果为对象格式，包含blob和预览');
        gifBlob = processedGif.blob;
        previewDataUrl = processedGif.previewDataUrl;
        watermarkApplied = processedGif.watermarkApplied || false;
        
        if (!gifBlob) {
          console.error('GIF处理结果中缺少blob属性');
          throw new Error('GIF处理结果格式错误');
        }
        
        console.log('GIF处理完成，大小:', Math.round(gifBlob.size / 1024), 'KB');
      }
      
      // 确保水印状态正确
      if (previewDataUrl && !watermarkApplied) {
        console.log('检测到预览图但水印状态为false，修正为true');
        watermarkApplied = true;
      }
      
      // 额外检查：如果是静态GIF备用，确保水印状态为true
      if (window.staticGifWithWatermark instanceof Blob && 
          gifBlob instanceof Blob &&
          Math.abs(gifBlob.size - window.staticGifWithWatermark.size) < 100) {
        console.log('检测到使用了静态GIF备用（大小相近），标记水印为已应用');
        watermarkApplied = true;
      }
      
      console.log('是否成功应用水印到所有帧:', watermarkApplied ? '是' : '否 (使用原始GIF)');
      
      // 创建BlobURL
      let blobUrl;
      try {
        // 确保我们有一个有效的Blob，并且保留GIF的MIME类型
        const validBlob = new Blob([gifBlob], { type: 'image/gif' });
        blobUrl = URL.createObjectURL(validBlob);
        console.log('成功创建GIF的BlobURL，MIME类型为image/gif');
      } catch (blobError) {
        console.error('创建BlobURL失败:', blobError);
        // 尝试直接使用gifBlob创建URL
        try {
          blobUrl = URL.createObjectURL(gifBlob);
          console.log('使用原始gifBlob创建BlobURL成功');
        } catch (directError) {
          console.error('直接创建BlobURL也失败:', directError);
          // 创建一个静态备用图像
          const backupCanvas = document.createElement('canvas');
          backupCanvas.width = 500;
          backupCanvas.height = 500;
          const backupCtx = backupCanvas.getContext('2d');
          backupCtx.fillStyle = '#f0f0f0';
          backupCtx.fillRect(0, 0, 500, 500);
          backupCtx.fillStyle = '#333333';
          backupCtx.font = '16px Arial';
          backupCtx.textAlign = 'center';
          backupCtx.fillText('GIF处理完成但无法显示', 250, 240);
          backupCtx.fillText(file.name, 250, 260);
          
          // 创建备用BlobURL
          const backupDataUrl = backupCanvas.toDataURL('image/png');
          blobUrl = backupDataUrl;
          console.log('使用备用静态图像替代GIF');
        }
      }
      
      // 创建图片对象以获取尺寸
      const img = new Image();
      let width = 0;
      let height = 0;
      
      try {
        // 尝试获取处理后GIF的尺寸
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('获取GIF尺寸超时，使用默认值');
            resolve();
          }, 3000);
          
          img.onload = function() {
            clearTimeout(timeout);
            width = img.width;
            height = img.height;
            resolve();
          };
          
          img.onerror = function(error) {
            clearTimeout(timeout);
            console.warn('无法获取处理后GIF尺寸:', error);
            resolve();
          };
          
          img.src = blobUrl;
        });
      } catch (error) {
        console.warn('获取GIF尺寸出错:', error);
      }
      
      // 如果无法获取尺寸，尝试使用原始文件
      if (width === 0 || height === 0) {
        const originalImg = new Image();
        const originalUrl = URL.createObjectURL(file);
        
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('获取原始GIF尺寸超时，使用默认值');
              resolve();
            }, 2000);
            
            originalImg.onload = function() {
              clearTimeout(timeout);
              width = originalImg.width || 200;
              height = originalImg.height || 200;
              console.log('成功获取原始GIF尺寸:', width, 'x', height);
              resolve();
            };
            
            originalImg.onerror = function(error) {
              clearTimeout(timeout);
              console.warn('获取原始GIF尺寸出错:', error);
              resolve();
            };
            
            originalImg.src = originalUrl;
          });
          
          // 清理原始URL
          URL.revokeObjectURL(originalUrl);
        } catch (error) {
          console.warn('获取原始GIF尺寸出错:', error);
        }
      }
      
      // 如果仍然无法获取尺寸，使用默认值
      if (width === 0 || height === 0) {
        console.warn('无法获取GIF尺寸，使用默认值');
        width = 200;
        height = 200;
      }
      
      // 返回处理结果
      const result = {
        blobUrl,
        previewUrl: previewDataUrl || blobUrl, // 使用预览图或blobUrl
        blob: gifBlob,
        isGif: true,
        width,
        height,
        fileName: file.name,
        originalFile: file,
        watermarkApplied: previewDataUrl ? true : false // 如果有预览图，则认为水印已应用
      };
      
      console.log('GIF处理结果准备完成:', result);
      return result;
    }
  } catch (error) {
    console.error('处理GIF时出错:', error);
    
    // 创建一个错误结果，使用原始文件
    const fileUrl = URL.createObjectURL(file);
    return {
      blobUrl: fileUrl,
      previewUrl: fileUrl,
      blob: file,
      isGif: true,
      width: 200,
      height: 200,
      fileName: file.name,
      originalFile: file,
      watermarkApplied: false,
      error: error.message
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
              // 返回一个对象，而不仅仅是blobUrl
              resolve({
                blobUrl: blobUrl,
                blob: blob,
                width: img.width,
                height: img.height
              });
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
export function displayImage(blobUrl, options = {}) {
  try {
    if (!blobUrl) {
      console.error('无效的图片URL');
      return;
    }
    
    const previewImage = document.getElementById('preview-image');
    const noImageMessage = document.getElementById('no-image-message');
    const previewCanvas = document.getElementById('preview-canvas');
    const gifBadge = document.getElementById('gif-badge');
    
    if (noImageMessage) {
      noImageMessage.style.display = 'none';
    }
    
    if (previewCanvas) {
      previewCanvas.style.display = 'none';
    }
    
    // 显示GIF标记（如果适用）
    if (gifBadge) {
      if (options.isGif) {
        gifBadge.style.display = 'block';
      } else {
        gifBadge.style.display = 'none';
      }
    }
    
    // 检查是否有处理后的GIF预览帧
    const usePreviewUrl = options.previewUrl && options.isGif;
    const displayUrl = usePreviewUrl ? options.previewUrl : blobUrl;
    
    if (usePreviewUrl) {
      console.log('使用处理后的GIF第一帧作为预览（带水印）');
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
        previewImage.src = displayUrl;
        previewImage.style.display = 'block';
        
        // 更新水印位置
        updateWatermarkPosition();
      };
      
      img.onerror = function() {
        console.error('加载图片失败:', displayUrl);
        
        // 如果预览URL加载失败，尝试使用原始URL
        if (usePreviewUrl) {
          console.log('预览图加载失败，尝试使用原始GIF');
          previewImage.src = blobUrl;
        } else {
          if (noImageMessage) {
            noImageMessage.textContent = '图片加载失败';
            noImageMessage.style.display = 'block';
          }
        }
      };
      
      img.src = displayUrl;
    }
  } catch (error) {
    console.error('显示图片时出错:', error);
  }
}

/**
 * 批量处理图片
 * @param {Array} files - 图片文件列表
 * @param {Function} progressCallback - 进度回调函数
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise
 */
export function batchProcessImages(files, progressCallback, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!files || files.length === 0) {
        reject(new Error('没有提供文件'));
        return;
      }
      
      console.log(`批量处理 ${files.length} 个文件`);
      
      // 初始化结果数组
      const processedImages = [];
      let processedCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // 分离GIF和非GIF文件，先处理非GIF文件，再处理GIF文件
      // 这样可以避免GIF处理阻塞其他图片的处理
      const gifFiles = [];
      const nonGifFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        if (isGif(files[i])) {
          gifFiles.push({ file: files[i], index: i });
        } else {
          nonGifFiles.push({ file: files[i], index: i });
        }
      }
      
      console.log(`分离文件：${nonGifFiles.length} 个普通图片，${gifFiles.length} 个GIF图片`);
      
      // 合并文件列表，先处理普通图片，再处理GIF
      const orderedFiles = [...nonGifFiles, ...gifFiles];
      
      // 更新进度的函数
      const updateProgress = () => {
        const progress = processedCount / files.length;
        if (progressCallback) {
          progressCallback({
            processed: processedCount,
            total: files.length,
            progress: progress,
            errors: errorCount
          });
        }
      };
      
      // 处理单个图片的函数
      const processOneImage = (file, index, isGif = false) => {
        return new Promise((resolveOne, rejectOne) => {
          console.log(`处理第 ${index + 1}/${files.length} 个文件: ${file.name}, 是否为GIF: ${isGif}`);
          
          // 为GIF文件设置特殊选项
          const fileOptions = {
            ...options,
            fileName: file.name,
            // 对于GIF，保留动画效果，但仍然应用水印
            preserveAnimation: isGif,
            applyWatermark: true, // 明确指定应用水印，确保GIF也会应用水印
            isDownload: true,
            // 添加明确的标志，表示这是批量处理模式
            isBatchProcessing: true
          };
          
          // 处理图片
          processImage(file, true, fileOptions)
            .then(result => {
              if (result) {
                // 添加到结果数组
                processedImages[index] = {
                  blob: result.blob || result,
                  fileName: file.name,
                  originalFile: file,
                  width: result.width,
                  height: result.height
                };
                
                console.log(`文件 ${file.name} 处理成功`);
                resolveOne();
              } else {
                console.warn(`文件 ${file.name} 处理结果为空`);
                errorCount++;
                errors.push({ file: file.name, error: '处理结果为空' });
                resolveOne(); // 继续处理下一个
              }
            })
            .catch(error => {
              console.error(`处理文件 ${file.name} 时出错:`, error);
              errorCount++;
              errors.push({ file: file.name, error: error.message || '未知错误' });
              
              // 即使处理失败，也将原始文件添加到结果中，确保不丢失任何文件
              processedImages[index] = {
                blob: file, // 使用原始文件
                fileName: file.name,
                originalFile: file,
                processingError: true, // 标记为处理失败
                errorMessage: error.message || '未知错误'
              };
              
              console.log(`文件 ${file.name} 处理失败，但仍添加到结果中`);
              resolveOne(); // 继续处理下一个
            });
        });
      };
      
      // 递归处理图片
      const processNextImage = () => {
        if (processedCount >= orderedFiles.length) {
          // 所有图片处理完成
          console.log(`批量处理完成，共 ${files.length} 个文件，${errorCount} 个错误`);
          
          // 确保关闭处理模态框
          const processingModal = document.getElementById('processing-modal');
          if (processingModal && processingModal.style.display === 'flex') {
            console.log('批量处理完成，关闭处理模态框');
            processingModal.style.display = 'none';
          }
          
          resolve({
            images: processedImages.filter(img => img), // 过滤掉空值
            errors: errors,
            total: files.length,
            processed: processedCount - errorCount,
            failed: errorCount
          });
          return;
        }
        
        const current = orderedFiles[processedCount];
        const isGifFile = isGif(current.file);
        
        // 处理当前图片
        processOneImage(current.file, current.index, isGifFile)
          .then(() => {
            processedCount++;
            updateProgress();
            
            // 添加延迟以避免UI阻塞
            setTimeout(processNextImage, 10);
          })
          .catch(error => {
            console.error('处理图片时出错:', error);
            processedCount++;
            errorCount++;
            updateProgress();
            
            // 添加延迟以避免UI阻塞
            setTimeout(processNextImage, 10);
          });
      };
      
      // 开始处理
      updateProgress();
      processNextImage();
    } catch (error) {
      console.error('批量处理图片时出错:', error);
      
      // 确保关闭处理模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal && processingModal.style.display === 'flex') {
        console.log('由于批量处理错误，关闭处理模态框');
        processingModal.style.display = 'none';
      }
      
      reject(error);
    }
  });
}

/**
 * 生成并下载ZIP文件
 * @param {Array} processedImages - 处理后的图片数组
 * @param {string} zipFileName - ZIP文件名
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise} - 处理完成的Promise
 */
export function generateAndDownloadZip(processedImages, zipFileName = 'watermarked_images.zip', progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      // 检查是否有图片
      if (!processedImages || processedImages.length === 0) {
        reject(new Error('没有提供图片'));
      return;
    }
    
      console.log(`开始生成ZIP: ${zipFileName}, 包含 ${processedImages.length} 张图片`);
      
      // 加载JSZip库
      if (typeof JSZip === 'undefined') {
        console.error('JSZip库未加载');
        reject(new Error('JSZip库未加载，无法创建ZIP文件'));
        return;
      }
      
      // 创建新的ZIP实例
      const zip = new JSZip();
      
      // 创建images文件夹
      const imagesFolder = zip.folder('images');
      
      // 记录已添加的文件名，避免重名
      const addedFileNames = new Set();
      
      // 添加的图片数量
      let addedCount = 0;
      
      // 错误计数
      let errorCount = 0;
      const errorFiles = [];
      
      // 更新错误日志的函数
    const updateErrorLog = () => {
        if (errorFiles.length === 0) return;
        
        // 创建错误日志文本
        let errorLog = '处理错误日志\n';
        errorLog += '=================\n';
        errorLog += `生成时间: ${new Date().toLocaleString()}\n`;
        errorLog += `总图片数: ${processedImages.length}\n`;
        errorLog += `错误数量: ${errorFiles.length}\n\n`;
        errorLog += '错误详情:\n';
        
        // 添加每个错误的详情
        errorFiles.forEach((error, index) => {
          errorLog += `${index + 1}. 文件: ${error.fileName}\n`;
          errorLog += `   错误: ${error.error}\n\n`;
        });
        
        // 添加错误日志到ZIP
        zip.file('error_log.txt', errorLog);
    };
    
    // 更新进度的函数
    const updateZipProgress = (status) => {
      if (progressCallback) {
          const progress = addedCount / processedImages.length;
          progressCallback({
            status: status || `添加到ZIP: ${addedCount}/${processedImages.length}`,
            progress: progress,
            addedCount: addedCount,
            totalCount: processedImages.length,
            errorCount: errorCount
        });
      }
    };
    
      // 开始处理
      updateZipProgress('开始创建ZIP文件...');
      
      // 递归添加图片到ZIP
      const addImageToZip = (index) => {
        if (index >= processedImages.length) {
          // 所有图片添加完成
          updateErrorLog();
          
          // 生成ZIP文件
          updateZipProgress('正在生成ZIP文件...');
          
          zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
              level: 6
            }
          }, (metadata) => {
            const percent = metadata.percent.toFixed(0);
            updateZipProgress(`正在压缩: ${percent}%`);
          })
          .then(blob => {
            console.log(`ZIP文件生成完成，大小: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
            updateZipProgress('ZIP文件生成完成，准备下载');
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = zipFileName;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放对象URL
            setTimeout(() => {
              URL.revokeObjectURL(link.href);
            }, 100);
            
            // 确保关闭处理模态框
            const processingModal = document.getElementById('processing-modal');
            if (processingModal && processingModal.style.display === 'flex') {
              console.log('ZIP生成完成，关闭处理模态框');
              processingModal.style.display = 'none';
            }
            
            // 返回结果
            resolve({
              success: true,
              zipSize: blob.size,
              imageCount: addedCount,
              errorCount: errorCount
            });
          })
          .catch(error => {
            console.error('生成ZIP文件时出错:', error);
            
            // 确保关闭处理模态框
            const processingModal = document.getElementById('processing-modal');
            if (processingModal && processingModal.style.display === 'flex') {
              console.log('由于ZIP生成错误，关闭处理模态框');
              processingModal.style.display = 'none';
            }
            
            reject(error);
          });
          
          return;
        }
        
        // 获取当前图片
        const image = processedImages[index];
        
        // 跳过完全无效的图片
        if (!image) {
          console.warn(`跳过无效图片，索引: ${index}`);
          setTimeout(() => addImageToZip(index + 1), 0);
          return;
        }
        
        // 如果没有blob，但有originalFile，使用原始文件
        if (!image.blob && image.originalFile) {
          console.log(`使用原始文件作为备用: ${image.fileName || `image_${index + 1}`}`);
          image.blob = image.originalFile;
        }
        
        // 如果仍然没有可用的blob，跳过
        if (!image.blob) {
          console.warn(`无法找到有效的blob数据，跳过图片: ${index}`);
          setTimeout(() => addImageToZip(index + 1), 0);
          return;
        }
        
        try {
          // 获取文件名
          let fileName = image.fileName || `image_${index + 1}.jpg`;
          
          // 确保文件名唯一
          if (addedFileNames.has(fileName)) {
            // 添加唯一标识符
            const dotIndex = fileName.lastIndexOf('.');
            if (dotIndex > 0) {
              const name = fileName.substring(0, dotIndex);
              const ext = fileName.substring(dotIndex);
              fileName = `${name}_${Date.now() % 10000}${ext}`;
            } else {
              fileName = `${fileName}_${Date.now() % 10000}`;
            }
          }
          
          // 记录文件名
          addedFileNames.add(fileName);
          
          // 确保文件扩展名与MIME类型匹配
          const blob = image.blob;
          
          // 使用统一的扩展名处理函数
          fileName = ensureCorrectExtension(blob, fileName);
        
        // 添加到ZIP
          imagesFolder.file(fileName, blob);
          
          // 更新计数
          addedCount++;
          
          // 更新进度
          updateZipProgress();
          
          // 添加延迟，避免UI阻塞
          setTimeout(() => addImageToZip(index + 1), 0);
      } catch (error) {
          console.error(`添加图片 ${index} 到ZIP时出错:`, error);
          
          // 记录错误
          errorCount++;
          errorFiles.push({
            fileName: image.fileName || `image_${index + 1}`,
            error: error.message || '添加到ZIP时出错'
          });
          
          // 继续处理下一个
          setTimeout(() => addImageToZip(index + 1), 0);
        }
      };
      
      // 开始添加图片
      addImageToZip(0);
    } catch (error) {
      console.error('生成ZIP文件时出错:', error);
      
      // 确保关闭处理模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal && processingModal.style.display === 'flex') {
        console.log('由于ZIP生成错误，关闭处理模态框');
        processingModal.style.display = 'none';
      }
      
      reject(error);
    }
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
    watermarkImage,
    isGif = false // 添加参数标识是否为GIF
  } = watermarkOptions;
  
  // 确保position是有效对象
  let posX = 50, posY = 50;
  
  if (typeof position === 'object' && position !== null) {
    posX = parseFloat(position.x) || 50;
    posY = parseFloat(position.y) || 50;
  } else if (watermarkOptions.positionX !== undefined && watermarkOptions.positionY !== undefined) {
    posX = parseFloat(watermarkOptions.positionX);
    posY = parseFloat(watermarkOptions.positionY);
  }
  
  console.log('应用水印到Canvas，类型:', type, '位置类型:', typeof position, '处理后位置:', {x: posX, y: posY});
  
  // 计算实际位置（基于百分比）
  const actualX = (posX / 100) * canvasWidth;
  const actualY = (posY / 100) * canvasHeight;
  
  // 设置透明度
  ctx.globalAlpha = opacity / 100;
  
  // 保存当前的变换状态
  ctx.save();
  
  // 判断水印类型，GIF强制使用text类型而不是tiled
  const effectiveType = isGif ? 'text' : (type || 'text');
  
  // 根据水印类型渲染
  switch (effectiveType) {
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

/**
 * 在ImageData上应用水印
 * @param {ImageData} imageData - 图像数据
 * @param {Object} watermarkOptions - 水印选项
 * @returns {ImageData} - 应用水印后的图像数据
 */
export function applyWatermarkToImageData(imageData, watermarkOptions) {
  // 创建临时canvas来处理图像数据
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  // 绘制原始图像数据
  ctx.putImageData(imageData, 0, 0);
  
  // 应用水印
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
  
  // 确保position是有效对象
  let posX = 50, posY = 50;
  
  if (typeof position === 'object' && position !== null) {
    posX = parseFloat(position.x) || 50;
    posY = parseFloat(position.y) || 50;
  } else if (watermarkOptions.positionX !== undefined && watermarkOptions.positionY !== undefined) {
    posX = parseFloat(watermarkOptions.positionX);
    posY = parseFloat(watermarkOptions.positionY);
  }
  
  // 计算实际位置（基于百分比）
  const actualX = (posX / 100) * canvas.width;
  const actualY = (posY / 100) * canvas.height;
  
  // 设置透明度
  ctx.globalAlpha = opacity / 100;
  
  // 保存当前的变换状态
  ctx.save();
  
  // 根据水印类型渲染
  switch (type) {
    case 'text':
      // 设置旋转中心点到水印位置
      ctx.translate(actualX, actualY);
      ctx.rotate((rotation * Math.PI) / 180);
      
      // 设置字体和颜色
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 绘制文字
      ctx.fillText(text, 0, 0);
      break;
      
    case 'tiled':
      // 设置字体和颜色
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 计算行列数
      const spacing = tileSpacing || 150;
      const cols = Math.ceil(canvas.width / spacing);
      const rows = Math.ceil(canvas.height / spacing);
      
      // 计算起始偏移，使水印居中分布
      const offsetX = (canvas.width - (cols - 1) * spacing) / 2;
      const offsetY = (canvas.height - (rows - 1) * spacing) / 2;
      
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
      break;
      
    case 'image':
      if (watermarkImage) {
        // 计算水印图片尺寸（默认为30%的画布宽度）
        const watermarkWidth = canvas.width * 0.3;
        const aspectRatio = watermarkImage.height / watermarkImage.width;
        const watermarkHeight = watermarkWidth * aspectRatio;
        
        // 设置旋转中心点到水印位置
        ctx.translate(actualX, actualY);
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
      break;
  }
  
  // 恢复变换状态
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
  
  // 获取处理后的图像数据
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * 确保文件扩展名与其实际格式匹配
 * @param {Blob|File} blob - 文件对象
 * @param {string} fileName - 原始文件名
 * @returns {string} - 修正后的文件名
 */
function ensureCorrectExtension(blob, fileName) {
  // 如果没有文件名，返回默认名称
  if (!fileName) {
    const defaultName = `image_${Date.now()}`;
    // 根据MIME类型添加扩展名
    if (blob.type === 'image/jpeg') return `${defaultName}.jpg`;
    if (blob.type === 'image/png') return `${defaultName}.png`;
    if (blob.type === 'image/gif') return `${defaultName}.gif`;
    if (blob.type === 'image/webp') return `${defaultName}.webp`;
    if (blob.type === 'image/svg+xml') return `${defaultName}.svg`;
    return `${defaultName}.jpg`; // 默认为jpg
  }

  // 提取文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1;
  
  // 如果没有扩展名，添加扩展名
  if (!hasExtension) {
    // 根据MIME类型添加扩展名
    if (blob.type === 'image/jpeg') return `${fileName}.jpg`;
    if (blob.type === 'image/png') return `${fileName}.png`;
    if (blob.type === 'image/gif') return `${fileName}.gif`;
    if (blob.type === 'image/webp') return `${fileName}.webp`;
    if (blob.type === 'image/svg+xml') return `${fileName}.svg`;
    return `${fileName}.jpg`; // 默认为jpg
  }
  
  // 已有扩展名，检查是否匹配MIME类型
  const fileExt = fileName.substring(lastDotIndex).toLowerCase();
  const baseName = fileName.substring(0, lastDotIndex);
  
  // GIF文件特殊处理：始终保留原始扩展名
  if (blob.type === 'image/gif' || fileExt === '.gif') {
    // 如果是GIF但扩展名不是.gif，添加正确的扩展名
    if (fileExt !== '.gif') {
      console.log(`保留GIF MIME类型，更正扩展名: ${fileName} -> ${baseName}.gif`);
      return `${baseName}.gif`;
    }
    // 如果扩展名已经是.gif，保持不变
    console.log(`保留原始GIF文件名: ${fileName}`);
    return fileName;
  }
  
  // 其他类型文件：检查扩展名是否与MIME类型匹配
  let expectedExt = null;
  if (blob.type === 'image/jpeg' && !fileExt.match(/\.(jpg|jpeg)$/i)) {
    expectedExt = '.jpg';
  } else if (blob.type === 'image/png' && fileExt !== '.png') {
    expectedExt = '.png';
  } else if (blob.type === 'image/webp' && fileExt !== '.webp') {
    expectedExt = '.webp';
  } else if (blob.type === 'image/svg+xml' && fileExt !== '.svg') {
    expectedExt = '.svg';
  }
  
  // 如果扩展名需要更正，返回更正后的文件名
  if (expectedExt) {
    console.log(`修正文件扩展名: ${fileName} -> ${baseName}${expectedExt}`);
    return `${baseName}${expectedExt}`;
  }
  
  // 扩展名正确，保留原始文件名
  return fileName;
} 