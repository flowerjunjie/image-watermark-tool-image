/**
 * 图片处理模块
 * 处理图片的加载、水印应用和导出
 */

import { watermarkState, updateState } from '../core/state.js';
import { renderWatermarkOnCanvas, updateWatermark } from '../core/watermark.js';
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
 * 处理图像，添加水印或准备下载
 * @param {File|Blob} imageFile - 图像文件
 * @param {boolean|Object} applyWatermarkOrOptions - 是否应用水印或处理选项对象
 * @param {Object} [optionsArg] - 处理选项（如果第二个参数是布尔值）
 * @returns {Promise} - 处理结果Promise
 */
export function processImage(imageFile, applyWatermarkOrOptions = {}, optionsArg = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查文件是否有效
      if (!imageFile) {
        reject(new Error('未提供有效的图像文件'));
        return;
      }

      // 兼容旧的调用方式和新的调用方式
      let options = {};
      if (typeof applyWatermarkOrOptions === 'boolean') {
        console.log('使用旧的API调用方式 processImage(file, boolean, options)');
        options = { ...optionsArg, applyWatermark: applyWatermarkOrOptions };
      } else {
        options = applyWatermarkOrOptions || {};
      }

      // 获取文件类型
      const fileType = imageFile.type || '';
      const fileName = imageFile.name || 'image';
      const isGif = fileType.includes('gif') || fileName.toLowerCase().endsWith('.gif');
      
      // 确保选项中有 applyWatermark 字段，除非明确设置为 false，否则默认为 true
      if (options.applyWatermark !== false) {
        options.applyWatermark = true;
      }
      
      // 记录处理信息
      console.log('处理图像:', fileName, '类型:', fileType, '是否为GIF:', isGif);
      console.log('处理选项:', JSON.stringify({
        isPreview: options.isPreview,
        isDownload: options.isDownload,
        applyWatermark: options.applyWatermark,
        position: options.position ? { x: options.position.x, y: options.position.y } : null,
        text: options.text
      }));

      // 处理GIF图像
      if (isGif) {
        console.log('检测到GIF图像，使用GIF处理器');
        try {
          // 如果只是预览模式，创建一个特殊预览
          if (options.isPreview) {
            console.log('GIF预览模式，创建特殊预览并标记为GIF');
            
            // 更新全局状态，标记当前处理的是GIF
            updateState({
              isGif: true
            });
            
            // 创建预览结果
            const previewResult = {
              isGif: true,
              file: imageFile,
              blobUrl: URL.createObjectURL(imageFile),
              previewUrl: URL.createObjectURL(imageFile),
              watermarkApplied: false // GIF预览模式不在图像上应用水印，而是使用浮动水印
            };
            
            // 确保水印会在预览后显示
            setTimeout(() => {
              console.log('GIF预览模式：强制更新水印');
              updateWatermark();
            }, 50);
            
            resolve(previewResult);
            return;
          }
          
          // 使用GIF处理器处理GIF图像
          const result = await processGifImage(imageFile, options, options.onProgress, options.isPreview);
          resolve(result);
        } catch (gifError) {
          console.error('GIF处理失败:', gifError);
          // GIF处理失败时尝试作为普通图像处理
          console.log('尝试作为普通图像处理GIF');
          const result = await processRegularImage(imageFile, options);
          resolve(result);
        }
        return;
      }

      // 处理普通图像
      const result = await processRegularImage(imageFile, options);
      resolve(result);
    } catch (error) {
      console.error('图像处理失败:', error);
      reject(error);
    }
  });
}

/**
 * 处理GIF图片
 * @param {File} gifFile - GIF文件
 * @param {Object} watermarkOptions - 水印选项
 * @param {Function} onProgress - 进度回调函数
 * @param {boolean} isPreview - 是否为预览模式
 * @returns {Promise} - 处理结果Promise
 */
async function processGifImage(gifFile, watermarkOptions, onProgress = null, isPreview = false) {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查是否为下载模式
      const isDownloadMode = watermarkOptions.isDownload === true;
      
      console.log('处理GIF图片:', gifFile.name, '水印选项:', JSON.stringify({
        isDownload: watermarkOptions.isDownload,
        isPreview: isPreview,
        applyWatermark: watermarkOptions.applyWatermark,
        position: watermarkOptions.position,
        text: watermarkOptions.text,
        fontSize: watermarkOptions.fontSize
      }));
      
      // 在预览模式下，显示动态GIF
      if (isPreview) {
        console.log('GIF预览模式，显示动态GIF');
        
        // 创建Blob URL来预览原始GIF
        const blobUrl = URL.createObjectURL(gifFile);
        
        // 返回预览结果
        resolve({
          previewUrl: blobUrl,
          blobUrl: blobUrl, 
          isGif: true,
          blob: gifFile,
          watermarkApplied: false
        });
        return;
      }
      
      // 下载或批量处理模式，使用GIF处理器
      console.log('使用GIF处理器处理GIF文件');
      
      // 确保应用水印，除非明确设置为false
      if (watermarkOptions.applyWatermark !== false) {
        watermarkOptions.applyWatermark = true;
      }
      
      // 添加进度回调
      const optionsWithProgress = {
        ...watermarkOptions,
        onProgress: onProgress
      };
      
      // 调用GIF处理器
      try {
        const result = await processGif(gifFile, optionsWithProgress);
        if (!result) {
          throw new Error('GIF处理结果为空');
        }
        
        console.log('GIF处理成功，应用水印:', result.watermarkApplied);
        resolve(result);
      } catch (error) {
        console.error('GIF处理失败：', error);
        reject(error);
      }
    } catch (error) {
      console.error('处理GIF图片时出错:', error);
      reject(error);
    }
  });
}

/**
 * 在主线程中处理图像
 * @param {string} dataUrl - 图像数据URL
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理结果Promise
 */
async function processImageInMainThread(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      console.log('主线程处理图像，选项:', JSON.stringify({
        isPreview: options.isPreview,
        isDownload: options.isDownload,
        applyWatermark: options.applyWatermark
      }));
      
      // 创建图像元素
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        try {
          // 创建Canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 设置Canvas尺寸
          canvas.width = img.width;
          canvas.height = img.height;
          
          // 绘制原始图像
          ctx.drawImage(img, 0, 0);
          
          // 如果需要应用水印 - 包括预览模式
          if (options.applyWatermark !== false) {
            console.log('应用水印到图像，预览模式:', options.isPreview ? '是' : '否');
            
            // 临时保存当前的watermarkState
            const originalWatermarkState = { ...window.watermarkState };
            
            try {
              // 确保水印选项中有位置信息
              if (!options.position && window.watermarkState && window.watermarkState.relativePosition) {
                options.position = { ...window.watermarkState.relativePosition };
                console.log('从watermarkState复制水印位置:', options.position);
              }
              
              // 如果还是没有位置信息，设置默认值
              if (!options.position) {
                options.position = { x: 50, y: 50 };
                console.log('设置默认水印位置:', options.position);
              }
              
              // 将水印选项应用到全局watermarkState
              window.watermarkState = {
                ...window.watermarkState,
                text: options.text || window.watermarkState?.text || '仅供验证使用',
                color: options.color || window.watermarkState?.color || '#ff0000',
                fontSize: options.fontSize || window.watermarkState?.fontSize || 24,
                opacity: options.opacity || window.watermarkState?.opacity || 50,
                rotation: options.rotation || window.watermarkState?.rotation || 0,
                relativePosition: options.position,
                type: options.type || window.watermarkState?.type || 'text',
                scale: options.scale || window.watermarkState?.scale || 1.0
              };
              
              // 应用水印
              renderWatermarkOnCanvas(canvas, ctx);
            } finally {
              // 恢复原始的watermarkState
              window.watermarkState = originalWatermarkState;
            }
          }
          
          // 获取处理后的图像数据
          const processedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          
          // 创建Blob
          const processedBlob = dataURLToBlob(processedDataUrl);
          
          // 创建BlobURL
          const blobUrl = URL.createObjectURL(processedBlob);
          
          // 返回处理结果
          resolve({
            previewUrl: processedDataUrl,
            blobUrl: blobUrl,
            blob: processedBlob,
            width: img.width,
            height: img.height,
            watermarkApplied: options.applyWatermark !== false
          });
        } catch (error) {
          console.error('处理图像时出错:', error);
          reject(error);
        }
      };
      
      img.onerror = function() {
        console.error('加载图像失败');
        reject(new Error('加载图像失败'));
      };
      
      img.src = dataUrl;
    } catch (error) {
      console.error('主线程处理图像时出错:', error);
      reject(error);
    }
  });
}

/**
 * 使用Web Worker处理图像
 * @param {string} dataUrl - 图像数据URL
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理结果Promise
 */
function processImageWithWorker(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      console.log('使用Worker处理图像，选项:', JSON.stringify({
        isPreview: options.isPreview,
        isDownload: options.isDownload,
        applyWatermark: options.applyWatermark
      }));
      
      // 检查Worker是否可用
      if (!imageWorker) {
        reject(new Error('Worker未初始化'));
        return;
      }
      
      // 准备水印选项
      let watermarkOptions = null;
      if (options.applyWatermark !== false) {
        // 确保水印选项中有位置信息
        let position = options.position;
        if (!position && window.watermarkState && window.watermarkState.relativePosition) {
          position = { ...window.watermarkState.relativePosition };
        }
        if (!position) {
          position = { x: 50, y: 50 };
        }
        
        // 创建水印选项对象
        watermarkOptions = {
          type: options.type || window.watermarkState?.type || 'text',
          text: options.text || window.watermarkState?.text || '仅供验证使用',
          color: options.color || window.watermarkState?.color || '#ff0000',
          fontSize: options.fontSize || window.watermarkState?.fontSize || 24,
          opacity: options.opacity || window.watermarkState?.opacity || 50,
          rotation: options.rotation || window.watermarkState?.rotation || 0,
          position: position,
          scale: options.scale || window.watermarkState?.scale || 1.0
        };
      }
      
      // 设置消息处理函数
      const messageHandler = function(e) {
        try {
          // 移除事件监听器
          imageWorker.removeEventListener('message', messageHandler);
          imageWorker.removeEventListener('error', errorHandler);
          
          // 处理结果
          const result = e.data;
          
          // 检查是否有错误
          if (result.error) {
            console.error('Worker处理图像出错:', result.error);
            reject(new Error(result.error));
            return;
          }
          
          // 创建Blob
          const processedBlob = dataURLToBlob(result.processedDataUrl);
          
          // 创建BlobURL
          const blobUrl = URL.createObjectURL(processedBlob);
          
          // 返回处理结果
          resolve({
            previewUrl: result.processedDataUrl,
            blobUrl: blobUrl,
            blob: processedBlob,
            width: result.width,
            height: result.height,
            watermarkApplied: options.applyWatermark !== false
          });
        } catch (error) {
          console.error('处理Worker返回的数据时出错:', error);
          reject(error);
        }
      };
      
      // 设置错误处理函数
      const errorHandler = function(error) {
        console.error('Worker处理图像时出错:', error);
        imageWorker.removeEventListener('message', messageHandler);
        imageWorker.removeEventListener('error', errorHandler);
        reject(error);
      };
      
      // 添加事件监听器
      imageWorker.addEventListener('message', messageHandler);
      imageWorker.addEventListener('error', errorHandler);
      
      // 发送消息到Worker
      imageWorker.postMessage({
        action: 'processImage',
        dataUrl: dataUrl,
        watermarkOptions: watermarkOptions,
        format: options.format || 'image/jpeg',
        quality: options.quality || 0.92
      });
    } catch (error) {
      console.error('使用Worker处理图像时出错:', error);
      reject(error);
    }
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
 * 显示图像
 * @param {string} blobUrl - 图像的Blob URL
 * @param {Object} options - 显示选项
 */
export function displayImage(blobUrl, options = {}) {
  const previewImage = document.getElementById('preview-image');
  const previewCanvas = document.getElementById('preview-canvas');
  const watermarkContainer = document.getElementById('watermark-container');
  const noImageMessage = document.getElementById('no-image-message');
  const gifBadge = document.getElementById('gif-badge');
  
  // 隐藏"无图片"消息
  if (noImageMessage) {
    noImageMessage.style.display = 'none';
  }
  
  // 是否为GIF
  const isGif = options.isGif || false;
  
  // 显示/隐藏GIF标记
  if (gifBadge) {
    gifBadge.style.display = isGif ? 'block' : 'none';
  }

  if (isGif) {
    // 对于GIF，使用img标签显示，这样可以保持动画效果
    if (previewImage) {
      previewImage.style.display = 'block';
      previewImage.src = blobUrl;
      
      if (previewCanvas) {
        previewCanvas.style.display = 'none';
      }
      
      // 等待图片加载完成，然后调整水印容器大小
      previewImage.onload = function() {
        console.log('GIF加载完成，尺寸：', previewImage.naturalWidth, 'x', previewImage.naturalHeight);
        
        // 调整水印容器大小
        if (watermarkContainer) {
          watermarkContainer.style.width = previewImage.offsetWidth + 'px';
          watermarkContainer.style.height = previewImage.offsetHeight + 'px';
          
          // 更新水印，如果需要
          if (typeof updateWatermark === 'function' && options.updateWatermark !== false) {
            updateWatermark();
          }
        }
      };
    }
  } else {
    // 对于非GIF图像，使用Canvas显示
    if (previewCanvas && options.imageData) {
      const ctx = previewCanvas.getContext('2d');
      
      // 设置Canvas大小
      previewCanvas.width = options.imageData.width;
      previewCanvas.height = options.imageData.height;
      
      // 绘制图像
      ctx.putImageData(options.imageData, 0, 0);
      
      // 显示Canvas并隐藏img
      previewCanvas.style.display = 'block';
      if (previewImage) {
        previewImage.style.display = 'none';
      }
      
      // 调整水印容器大小
      if (watermarkContainer) {
        watermarkContainer.style.width = previewCanvas.offsetWidth + 'px';
        watermarkContainer.style.height = previewCanvas.offsetHeight + 'px';
        
        // 更新水印，如果需要
        if (typeof updateWatermark === 'function' && options.updateWatermark !== false) {
          updateWatermark();
        }
      }
    } else if (previewImage && blobUrl) {
      // 如果没有imageData，回退到使用img显示
      previewImage.style.display = 'block';
      previewImage.src = blobUrl;
      
      if (previewCanvas) {
        previewCanvas.style.display = 'none';
      }
      
      // 等待图片加载完成，然后调整水印容器大小
      previewImage.onload = function() {
        // 调整水印容器大小
        if (watermarkContainer) {
          watermarkContainer.style.width = previewImage.offsetWidth + 'px';
          watermarkContainer.style.height = previewImage.offsetHeight + 'px';
          
          // 更新水印，如果需要
          if (typeof updateWatermark === 'function' && options.updateWatermark !== false) {
            updateWatermark();
          }
        }
      };
    }
  }
  
  // 触发预览更新事件
  const previewUpdateEvent = new CustomEvent('previewUpdate', {
    detail: {
      blobUrl,
      ...options
    }
  });
  document.dispatchEvent(previewUpdateEvent);
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
            isBatchProcessing: true,
            // 确保传递当前水印设置
            text: options.text || watermarkState.text,
            color: options.color || watermarkState.color,
            fontSize: options.fontSize || watermarkState.fontSize,
            opacity: options.opacity || watermarkState.opacity,
            rotation: options.rotation || watermarkState.rotation,
            position: options.position || watermarkState.relativePosition,
            tileSpacing: options.tileSpacing || watermarkState.tileSpacing,
            type: options.type || watermarkState.type
          };
          
          // 处理图片
          processImage(file, fileOptions)
            .then(result => {
              if (result) {
                // 添加到结果数组
                processedImages[index] = {
                  blob: result.blob || result,
                  fileName: file.name,
                  originalFile: file,
                  width: result.width,
                  height: result.height,
                  watermarkApplied: true // 标记已应用水印
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
      
      // 创建根文件夹
      const rootFolder = zip.folder('watermarked_images');
      
      // 保存文件路径结构
      const filePathMap = new Map();
      let hasPathStructure = false;
      
      // 确定是否需要保留文件夹结构
      processedImages.forEach(img => {
        if (img && img.originalFile && img.originalFile.webkitRelativePath) {
          const path = img.originalFile.webkitRelativePath;
          if (path && path.includes('/')) {
            hasPathStructure = true;
            // 获取路径中的文件夹部分
            const folderPath = path.substring(0, path.lastIndexOf('/'));
            filePathMap.set(img, folderPath);
          }
        }
      });
      
      console.log(`是否保留文件夹结构: ${hasPathStructure}`);
      
      // 错误日志
      const errorLog = [];
      
      // 总图片数
      const totalImages = processedImages.filter(img => img).length;
      let addedCount = 0;
      
      // 创建错误日志更新函数
      const updateErrorLog = () => {
        if (errorLog.length > 0) {
          console.log('生成错误日志文件...');
          // 创建错误日志内容
          let logContent = '水印处理错误日志\n';
          logContent += '====================\n\n';
          logContent += `总文件数: ${totalImages}\n`;
          logContent += `处理失败: ${errorLog.length}\n\n`;
          logContent += '详细错误信息:\n';
          
          errorLog.forEach((error, index) => {
            logContent += `${index + 1}. 文件: ${error.file}\n`;
            logContent += `   错误: ${error.error}\n\n`;
          });
          
          // 添加到ZIP文件
          rootFolder.file('error_log.txt', logContent);
        }
      };
      
      // ZIP进度更新函数
      const updateZipProgress = (status) => {
        if (progressCallback) {
          const progress = addedCount / totalImages;
          progressCallback({
            status: status || `已添加 ${addedCount}/${totalImages} 张图片到ZIP文件`,
            progress: progress
          });
        }
      };
      
      // 递归添加图片到ZIP
      const addImageToZip = async (index) => {
        try {
          // 所有图片都已添加
          if (index >= processedImages.length) {
            // 添加错误日志
            updateErrorLog();
            
            // 更新状态
            updateZipProgress('生成ZIP文件中...');
            
            // 生成ZIP文件内容
            const zipContent = await zip.generateAsync({
              type: 'blob',
              compression: 'DEFLATE',
              compressionOptions: {
                level: 6
              }
            }, (metadata) => {
              // 更新ZIP生成进度
              const zipGenProgress = metadata.percent / 100;
              progressCallback({
                status: `生成ZIP文件中... ${Math.round(metadata.percent)}%`,
                progress: zipGenProgress
              });
            });
            
            // 创建下载链接
            const zipUrl = URL.createObjectURL(zipContent);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = zipFileName;
            
            // 模拟点击下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL
            setTimeout(() => {
              URL.revokeObjectURL(zipUrl);
            }, 100);
            
            // 返回结果
            resolve({
              success: true,
              totalFiles: processedImages.length,
              addedFiles: addedCount,
              errors: errorLog.length
            });
            
            return;
          }
          
          const img = processedImages[index];
          
          // 跳过空值
          if (!img) {
            addImageToZip(index + 1);
            return;
          }
          
          // 获取文件名和blob
          const fileName = img.fileName || `image_${index}.jpg`;
          let blob = img.blob;
          
          // 更新进度
          updateZipProgress(`正在处理: ${fileName}`);
          
          // 检查是否为GIF文件
          const isGifFile = fileName.toLowerCase().endsWith('.gif') || 
                          (blob && blob.type === 'image/gif') ||
                          (img.originalFile && img.originalFile.type === 'image/gif');
          
          // 检查是否需要处理GIF（处理错误或尚未应用水印的GIF）
          if (isGifFile && (!img.watermarkApplied || img.processingError)) {
            try {
              console.log(`处理ZIP中的GIF文件: ${fileName}`);
              
              // 特殊处理GIF文件
              const processGifForZip = async () => {
                // 更新状态
                updateZipProgress(`正在应用水印到GIF: ${fileName}`);
                
                // 使用原始文件
                const originalFile = img.originalFile || img.blob;
                
                // 创建GIF处理选项
                const gifOptions = {
                  fileName: fileName,
                  applyWatermark: true, // 明确指定应用水印
                  preserveAnimation: true, // 保留GIF动画
                  isDownload: true,
                  text: watermarkState.text,
                  color: watermarkState.color,
                  fontSize: watermarkState.fontSize,
                  opacity: watermarkState.opacity,
                  rotation: watermarkState.rotation,
                  position: watermarkState.relativePosition,
                  tileSpacing: watermarkState.tileSpacing,
                  type: watermarkState.type
                };
                
                // 再次尝试处理GIF
                try {
                  const result = await processImage(originalFile, gifOptions);
                  
                  if (result && (result.blob || result)) {
                    console.log(`GIF文件 ${fileName} 处理成功`);
                    return result.blob || result;
                  } else {
                    throw new Error('GIF处理结果为空');
                  }
                } catch (gifError) {
                  console.error(`ZIP中GIF处理失败: ${fileName}`, gifError);
                  throw gifError;
                }
              };
              
              // 处理GIF文件
              try {
                // 尝试处理GIF
                blob = await processGifForZip();
                console.log(`ZIP中的GIF处理完成: ${fileName}`);
              } catch (gifError) {
                console.warn(`无法处理ZIP中的GIF: ${fileName}，使用原始文件`, gifError);
                errorLog.push({
                  file: fileName,
                  error: `GIF处理失败: ${gifError.message || '未知错误'}`
                });
                blob = img.originalFile || img.blob; // 使用原始文件作为回退
              }
            } catch (gifError) {
              console.error(`ZIP中的GIF处理出错: ${fileName}`, gifError);
              // 记录错误但继续使用原始blob
            }
          }
          
          // 确保blob有效
          if (!blob) {
            console.error(`文件 ${fileName} 的blob为空`);
            errorLog.push({
              file: fileName,
              error: 'Blob为空'
            });
            // 继续处理下一个
            setTimeout(() => addImageToZip(index + 1), 0);
            return;
          }
          
          try {
            // 确定文件路径
            let filePath = fileName;
            
            // 如果有文件夹结构，保留它
            if (hasPathStructure && filePathMap.has(img)) {
              const folderPath = filePathMap.get(img);
              filePath = `${folderPath}/${fileName}`;
            }
            
            // 添加到ZIP
            rootFolder.file(filePath, blob);
            addedCount++;
            
            // 更新进度
            updateZipProgress(`已添加 ${addedCount}/${totalImages} 张图片到ZIP文件`);
            
            // 处理下一张图片（使用定时器避免阻塞UI）
            setTimeout(() => addImageToZip(index + 1), 0);
          } catch (error) {
            console.error(`添加文件 ${fileName} 到ZIP时出错:`, error);
            errorLog.push({
              file: fileName,
              error: error.message || '未知错误'
            });
            
            // 继续处理下一个
            setTimeout(() => addImageToZip(index + 1), 0);
          }
        } catch (error) {
          console.error('添加图片到ZIP时出错:', error);
          errorLog.push({
            file: `索引 ${index}`,
            error: error.message || '未知错误'
          });
          
          // 继续处理下一个
          setTimeout(() => addImageToZip(index + 1), 0);
        }
      };
      
      // 开始添加图片
      addImageToZip(0);
    } catch (error) {
      console.error('生成ZIP文件时出错:', error);
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

/**
 * 处理普通图像（非GIF）
 * @param {File|Blob} imageFile - 图像文件
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理结果Promise
 */
async function processRegularImage(imageFile, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      console.log('处理普通图像:', imageFile.name);
      
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
            result = await processImageInMainThread(dataUrl, options);
          } else {
            // 尝试使用Worker处理
            const canUseWorker = options.useWorker !== false && typeof Worker !== 'undefined' && imageWorker;
            
            if (canUseWorker) {
              try {
                // 使用Web Worker处理图像
                console.log('使用Web Worker处理图像');
                result = await processImageWithWorker(dataUrl, options);
              } catch (workerError) {
                console.warn('Worker处理失败，回退到主线程处理:', workerError);
                result = await processImageInMainThread(dataUrl, options);
              }
            } else {
              console.log('在主线程处理图像');
              result = await processImageInMainThread(dataUrl, options);
            }
          }
          
          // 设置文件名
          result.fileName = imageFile.name;
          
          // 添加原始文件引用
          result.originalBlob = imageFile;
          
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
      
      reader.readAsDataURL(imageFile);
    } catch (error) {
      console.error('处理普通图像时出错:', error);
      reject(error);
    }
  });
}

/**
 * 将数据URL转换为Blob
 * @param {string} dataURL - 数据URL
 * @returns {Blob} - 转换后的Blob
 */
function dataURLToBlob(dataURL) {
  // 提取MIME类型和base64数据
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  
  // 创建ArrayBuffer
  const uInt8Array = new Uint8Array(rawLength);
  
  // 填充ArrayBuffer
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  // 创建Blob
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * 添加图像到ZIP文件
 * @param {JSZip} zip - JSZip实例
 * @param {Object} imageData - 图像数据
 * @param {string} folderName - 文件夹名称
 * @returns {Promise} - 处理结果Promise
 */
export async function addImageToZip(zip, imageData, folderName = '') {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查参数
      if (!zip || !imageData) {
        reject(new Error('无效的参数'));
        return;
      }
      
      // 获取文件名
      const fileName = imageData.fileName || generateFileName(imageData);
      
      // 创建文件路径
      const filePath = folderName ? `${folderName}/${fileName}` : fileName;
      
      // 检查是否为GIF
      const isGif = fileName.toLowerCase().endsWith('.gif') || 
                   (imageData.blob && imageData.blob.type && imageData.blob.type.includes('gif')) ||
                   imageData.isGif === true;
      
      console.log(`添加图像到ZIP: ${filePath}, 是否为GIF: ${isGif}`);
      
      // 处理GIF文件
      if (isGif) {
        try {
          console.log('处理GIF文件:', fileName);
          
          // 尝试多种方法获取GIF数据
          let gifData = null;
          
          // 方法1: 直接使用blob
          if (imageData.blob instanceof Blob) {
            try {
              console.log('使用blob添加GIF到ZIP');
              zip.file(filePath, imageData.blob);
              console.log('成功添加GIF到ZIP (使用blob)');
              resolve();
              return;
            } catch (blobError) {
              console.warn('使用blob添加GIF失败:', blobError);
            }
          }
          
          // 方法2: 使用blobUrl
          if (imageData.blobUrl) {
            try {
              console.log('使用blobUrl获取GIF数据');
              const response = await fetch(imageData.blobUrl);
              if (response.ok) {
                const blob = await response.blob();
                zip.file(filePath, blob);
                console.log('成功添加GIF到ZIP (使用blobUrl)');
                resolve();
                return;
              }
            } catch (urlError) {
              console.warn('使用blobUrl获取GIF数据失败:', urlError);
            }
          }
          
          // 方法3: 使用原始文件
          if (imageData.originalBlob instanceof Blob) {
            try {
              console.log('使用originalBlob添加GIF到ZIP');
              zip.file(filePath, imageData.originalBlob);
              console.log('成功添加GIF到ZIP (使用originalBlob)');
              resolve();
              return;
            } catch (originalError) {
              console.warn('使用originalBlob添加GIF失败:', originalError);
            }
          }
          
          // 方法4: 使用静态备份
          if (window.staticGifWithWatermark instanceof Blob) {
            try {
              console.log('使用静态GIF备份添加到ZIP');
              zip.file(filePath, window.staticGifWithWatermark);
              console.log('成功添加GIF到ZIP (使用静态备份)');
              resolve();
              return;
            } catch (staticError) {
              console.warn('使用静态GIF备份添加失败:', staticError);
            }
          }
          
          // 如果所有方法都失败，尝试使用最小备份
          if (window.backupGifData) {
            try {
              console.log('使用最小GIF备份添加到ZIP');
              const minimalBlob = new Blob([window.backupGifData], { type: 'image/gif' });
              zip.file(filePath, minimalBlob);
              console.log('成功添加GIF到ZIP (使用最小备份)');
              resolve();
              return;
            } catch (minimalError) {
              console.warn('使用最小GIF备份添加失败:', minimalError);
            }
          }
          
          // 如果所有方法都失败，返回错误
          console.error('无法添加GIF到ZIP，所有方法都失败');
          reject(new Error('无法添加GIF到ZIP，所有方法都失败'));
        } catch (gifError) {
          console.error('处理GIF文件时出错:', gifError);
          reject(gifError);
        }
        return;
      }
      
      // 处理普通图像
      try {
        console.log('处理普通图像:', fileName);
        
        // 获取Blob数据
        let imageBlob = null;
        
        // 尝试使用blob
        if (imageData.blob instanceof Blob) {
          imageBlob = imageData.blob;
        }
        // 尝试使用blobUrl
        else if (imageData.blobUrl) {
          const response = await fetch(imageData.blobUrl);
          if (response.ok) {
            imageBlob = await response.blob();
          }
        }
        // 尝试使用原始文件
        else if (imageData.originalBlob instanceof Blob) {
          imageBlob = imageData.originalBlob;
        }
        // 尝试使用previewUrl
        else if (imageData.previewUrl) {
          imageBlob = dataURLToBlob(imageData.previewUrl);
        }
        
        // 检查是否获取到Blob
        if (!imageBlob) {
          throw new Error('无法获取图像数据');
        }
        
        // 添加到ZIP
        zip.file(filePath, imageBlob);
        console.log('成功添加图像到ZIP');
        resolve();
      } catch (error) {
        console.error('添加图像到ZIP时出错:', error);
        reject(error);
      }
    } catch (error) {
      console.error('添加图像到ZIP时出错:', error);
      reject(error);
    }
  });
} 