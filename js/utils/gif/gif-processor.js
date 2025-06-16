/**
 * GIF处理工具
 * 用于处理GIF动图，添加水印等
 */

import { extractGifFrames } from './gif-extractor.js';
import { renderWatermarkOnCanvas, applyWatermarkToCanvas } from '../../core/watermark.js';
import { GifWorkerProcessor } from './gif-worker-manager.js';

// 创建一个缓存对象，用于存储处理过的GIF
const gifCache = new Map();
const MAX_CACHE_SIZE = 20; // 最大缓存数量
const MAX_PROCESSING_TIME = 15000; // 最大处理时间（毫秒）
const GIF_WORKER_TIMEOUT = 10000; // Worker处理超时（毫秒）

// 添加一个处理状态标志，避免重复处理同一个文件
const processingGifs = new Map();

// 添加GIF处理队列和控制同时处理的GIF数量，避免处理大量GIF时UI卡住
const gifProcessingQueue = [];
const MAX_CONCURRENT_GIF_PROCESSING = 2; // 最大并发GIF处理数量
let activeGifProcessingCount = 0;

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
      checkAllTasksCompleted();
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用成功回调
      if (nextTask.resolve) nextTask.resolve(result);
    })
    .catch(error => {
      // 任务失败
      activeGifProcessingCount--;
      console.error(`GIF处理任务失败: ${error.message || error}`);
      
      // 检查是否所有任务都已完成
      checkAllTasksCompleted();
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用失败回调
      if (nextTask.reject) nextTask.reject(error);
    });
}

/**
 * 检查是否所有GIF处理任务都已完成
 * 如果所有任务都已完成，则关闭模态对话框
 */
function checkAllTasksCompleted() {
  if (activeGifProcessingCount === 0 && gifProcessingQueue.length === 0) {
    console.log('所有GIF处理任务已完成，确保模态对话框关闭');
    
    // 关闭处理模态框
    const processingModal = document.getElementById('processing-modal');
    if (processingModal && processingModal.style.display === 'flex') {
      console.log('GIF处理完成，关闭处理模态框');
      processingModal.style.display = 'none';
    }
  }
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
 * 生成缓存键
 * @param {Object} options - 水印选项
 * @returns {string} - 缓存键
 */
function generateCacheKey(options) {
  return `${options.fileName}_${options.type}_${options.text}_${options.position.x}_${options.position.y}_${options.rotation}_${options.opacity}`;
}

/**
 * 清理最旧的缓存
 */
function clearOldestCache() {
  if (gifCache.size === 0) return;
  
  // 获取第一个键
  const firstKey = gifCache.keys().next().value;
  
  // 删除第一个缓存项
  if (firstKey) {
    gifCache.delete(firstKey);
  }
}

/**
 * 判断文件是否为GIF
 * @param {File|Blob|string} file - 文件或URL
 * @returns {boolean} - 是否为GIF
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
 * 处理GIF，添加水印等
 * @param {Blob|File|string} gifSource - GIF文件对象或URL
 * @param {Object} watermarkOptions - 水印选项
 * @returns {Promise<Blob>} - 处理后的GIF文件
 */
export function processGif(gifSource, watermarkOptions = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 生成唯一标识符
      const sourceId = generateCacheKey(watermarkOptions);
      
      // 检查是否已经在处理中
      if (processingGifs.has(sourceId)) {
        console.log('GIF已经在处理中，等待完成...');
        
        // 等待处理完成
        const existingTask = processingGifs.get(sourceId);
        existingTask.then(resolve).catch(reject);
        return;
      }
      
      // 检查缓存
      if (gifCache.has(sourceId)) {
        const cachedGif = gifCache.get(sourceId);
        console.log('使用缓存的GIF结果');
        resolve(cachedGif);
        return;
      }
      
      // 创建一个新的处理任务
      let processingPromise;
      processingPromise = new Promise((resolveTask, rejectTask) => {
        // 添加到处理中列表
        processingGifs.set(sourceId, processingPromise);
        
        // 创建进度条
        const progressContainer = document.createElement('div');
        progressContainer.id = 'gif-progress-container';
        progressContainer.style.position = 'fixed';
        progressContainer.style.bottom = '10px';
        progressContainer.style.left = '10px';
        progressContainer.style.right = '10px';
        progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        progressContainer.style.padding = '10px';
        progressContainer.style.borderRadius = '5px';
        progressContainer.style.zIndex = '9999';
        progressContainer.style.display = 'none';
        
        const progressText = document.createElement('div');
        progressText.style.color = 'white';
        progressText.style.marginBottom = '5px';
        progressText.textContent = '处理GIF中...';
        
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.backgroundColor = '#444';
        progressBarContainer.style.height = '10px';
        progressBarContainer.style.borderRadius = '5px';
        progressBarContainer.style.overflow = 'hidden';
        
        const progressBar = document.createElement('div');
        progressBar.style.backgroundColor = '#4CAF50';
        progressBar.style.height = '100%';
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 0.3s';
        
        progressBarContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBarContainer);
        
        // 添加到文档
        if (!document.getElementById('gif-progress-container')) {
          document.body.appendChild(progressContainer);
        }
        
        // 显示进度条（如果不是预览模式）
        if (!watermarkOptions.isPreview) {
          progressContainer.style.display = 'block';
        }
        
        // 设置强制完成定时器，防止处理时间过长
        const forceCompleteTimer = setTimeout(() => {
          console.warn('GIF处理超时，强制返回原始GIF');
          
          // 关闭进度条
          if (progressContainer) progressContainer.style.display = 'none';
          
          // 关闭处理模态框
          const processingModal = document.getElementById('processing-modal');
          if (processingModal && processingModal.style.display === 'flex') {
            console.log('由于GIF处理超时，关闭处理模态框');
            processingModal.style.display = 'none';
          }
          
          // 从处理中移除
          processingGifs.delete(sourceId);
          
          // 返回原始GIF
          resolveTask(gifSource);
        }, MAX_PROCESSING_TIME);
        
        // 3. 明确指定保留原始GIF - 优化路径
        // 只有在预览模式或明确指定不应用水印时才返回原始GIF
        if (watermarkOptions.isPreview || watermarkOptions.applyWatermark === false) {
          clearTimeout(forceCompleteTimer);
          if (progressContainer) progressContainer.style.display = 'none';
          console.log('返回原始GIF，保留动画效果:', 
            watermarkOptions.isPreview ? '预览模式' : 
            watermarkOptions.applyWatermark === false ? '无需水印' : 
            '指定保留动画');
          
          // 如果是预览模式，确保关闭处理模态框
          if (watermarkOptions.isPreview) {
            const processingModal = document.getElementById('processing-modal');
            if (processingModal && processingModal.style.display === 'flex') {
              console.log('预览模式下，关闭处理模态框');
              processingModal.style.display = 'none';
            }
          }
          
          // 从处理中移除
          processingGifs.delete(sourceId);
          
          resolveTask(gifSource);
          return;
        }
        
        // 注意：这里不再根据preserveAnimation决定是否应用水印
        // 如果代码执行到这里，说明需要应用水印，即使preserveAnimation为true
        
        // 处理preserveAnimation选项 - 现在我们需要处理GIF，但保留动画效果
        // 这意味着我们需要应用水印到每一帧，但保留动画效果
        const shouldPreserveAnimation = watermarkOptions.preserveAnimation === true;
        
        // 尝试使用Worker处理
        if (typeof Worker !== 'undefined' && GifWorkerProcessor) {
          console.log('使用GIF Worker处理');
          
          // 初始化Worker
          GifWorkerProcessor.init()
            .then(() => {
              console.log('GIF Worker初始化成功，开始提取帧');
              
              // 提取GIF帧
              extractGifFrames(gifSource)
                .then(frames => {
                  console.log(`成功提取GIF帧，共${frames.length}帧`);
                  
                  // 使用Worker处理帧
                  // 检查position是否为对象而不是字符串
                  let position = watermarkOptions.position;
                  let positionX = watermarkOptions.positionX;
                  let positionY = watermarkOptions.positionY;
                  
                  // 如果position是对象，提取x和y值
                  if (typeof position === 'object' && position !== null) {
                    positionX = parseFloat(position.x) || positionX;
                    positionY = parseFloat(position.y) || positionY;
                    console.log(`检测到position对象: x=${position.x}, y=${position.y}, 解析后: x=${positionX}, y=${positionY}`);
                    // 保留原始对象，不转换为custom模式
                  }
                  
                  // 确保位置值为数值
                  positionX = parseFloat(positionX);
                  positionY = parseFloat(positionY);
                  
                  console.log('传递给Worker的水印选项:', JSON.stringify({
                    position: position,
                    positionX: positionX,
                    positionY: positionY,
                    relativePosition: typeof position === 'object' ? position : null
                  }));
                  
                  GifWorkerProcessor.processGifFrames(frames, {
                    ...watermarkOptions,
                    applyWatermark: true,
                    // 确保正确传递位置信息
                    position: position,
                    positionX: positionX || 50,
                    positionY: positionY || 50
                  }, {
                    onStart: () => {
                      console.log('开始处理GIF帧');
                    },
                    onProgress: (progress) => {
                      if (progressBar) {
                        progressBar.style.width = `${Math.round(progress * 100)}%`;
                      }
                    },
                    onFrameProgress: (progress, info) => {
                      console.log(`处理GIF帧进度: ${Math.round(progress * 100)}%, ${info.current}/${info.total}`);
                    },
                    onComplete: (blob) => {
                      // 检查blob是否有效
                      if (!blob || typeof blob !== 'object') {
                        console.error('GIF处理完成但返回的blob无效，回退到主线程处理');
                        processInMainThread();
                        return;
                      }
                      
                      try {
                        console.log('GIF处理完成，大小:', blob.size);
                        clearTimeout(forceCompleteTimer);
                        
                        // 关闭进度条
                        if (progressContainer) progressContainer.style.display = 'none';
                        
                        // 关闭处理模态框
                        const processingModal = document.getElementById('processing-modal');
                        if (processingModal && processingModal.style.display === 'flex') {
                          console.log('GIF处理完成，关闭处理模态框');
                          processingModal.style.display = 'none';
                        }
                        
                        // 从处理中移除
                        processingGifs.delete(sourceId);
                        
                        // 缓存结果
                        if (!watermarkOptions.isPreview) {
                          // 清理旧缓存
                          if (gifCache.size >= MAX_CACHE_SIZE) {
                            clearOldestCache();
                          }
                          gifCache.set(sourceId, blob);
                        }
                        
                        // 返回处理后的GIF
                        resolveTask(blob);
                      } catch (error) {
                        console.error('GIF处理完成回调出错:', error);
                        processInMainThread();
                      }
                    },
                    onError: (error) => {
                      console.error('GIF Worker处理错误:', error);
                      clearTimeout(forceCompleteTimer);
                      
                      // 关闭进度条
                      if (progressContainer) progressContainer.style.display = 'none';
                      
                      // 关闭处理模态框
                      const processingModal = document.getElementById('processing-modal');
                      if (processingModal && processingModal.style.display === 'flex') {
                        console.log('由于GIF处理错误，关闭处理模态框');
                        processingModal.style.display = 'none';
                      }
                      
                      // 从处理中移除
                      processingGifs.delete(sourceId);
                      
                      // 回退到主线程处理
                      console.log('回退到主线程处理GIF');
                      processInMainThread();
                    }
                  })
                  .catch(error => {
                    console.error('GIF Worker处理失败:', error);
                    
                    // 关闭处理模态框
                    const processingModal = document.getElementById('processing-modal');
                    if (processingModal && processingModal.style.display === 'flex') {
                      console.log('由于GIF Worker处理失败，关闭处理模态框');
                      processingModal.style.display = 'none';
                    }
                    
                    // 回退到主线程处理
                    processInMainThread();
                  });
                })
                .catch(error => {
                  console.error('提取GIF帧失败:', error);
                  
                  // 关闭处理模态框
                  const processingModal = document.getElementById('processing-modal');
                  if (processingModal && processingModal.style.display === 'flex') {
                    console.log('由于提取GIF帧失败，关闭处理模态框');
                    processingModal.style.display = 'none';
                  }
                  
                  // 回退到主线程处理
                  processInMainThread();
                });
            })
            .catch(error => {
              console.error('初始化GIF Worker失败:', error);
              
              // 关闭处理模态框
              const processingModal = document.getElementById('processing-modal');
              if (processingModal && processingModal.style.display === 'flex') {
                console.log('由于初始化GIF Worker失败，关闭处理模态框');
                processingModal.style.display = 'none';
              }
              
              // 回退到主线程处理
              processInMainThread();
            });
        } else {
          // 在主线程处理
          processInMainThread();
        }
        
        // 主线程处理函数
        function processInMainThread() {
          console.log('在主线程处理GIF');
          
          // 提取GIF帧
          extractGifFrames(gifSource)
            .then(frames => {
              console.log(`提取了${frames.length}帧`);
              
              // 处理帧
              // 检查position是否为对象而不是字符串
              let position = watermarkOptions.position;
              let positionX = watermarkOptions.positionX;
              let positionY = watermarkOptions.positionY;
              
              // 如果position是对象，提取x和y值
              if (typeof position === 'object' && position !== null) {
                positionX = parseFloat(position.x) || positionX;
                positionY = parseFloat(position.y) || positionY;
                console.log(`主线程检测到position对象: x=${position.x}, y=${position.y}, 解析后: x=${positionX}, y=${positionY}`);
                // 保留原始对象，不转换为custom模式
              }
              
              console.log('传递给主线程处理的水印选项:', JSON.stringify({
                position: position,
                positionX: positionX,
                positionY: positionY,
                relativePosition: typeof position === 'object' ? position : null
              }));
              
              processGifFrames(frames, {
                ...watermarkOptions,
                // 确保正确传递位置信息
                position: position,
                positionX: positionX || 50,
                positionY: positionY || 50
              }, progressBar, progressContainer)
                .then(result => {
                  console.log('GIF处理完成');
                  clearTimeout(forceCompleteTimer);
                  
                  // 关闭进度条
                  if (progressContainer) progressContainer.style.display = 'none';
                  
                  // 关闭处理模态框
                  const processingModal = document.getElementById('processing-modal');
                  if (processingModal && processingModal.style.display === 'flex') {
                    console.log('GIF处理完成，关闭处理模态框');
                    processingModal.style.display = 'none';
                  }
                  
                  // 从处理中移除
                  processingGifs.delete(sourceId);
                  
                  // 缓存结果
                  if (!watermarkOptions.isPreview) {
                    // 清理旧缓存
                    if (gifCache.size >= MAX_CACHE_SIZE) {
                      clearOldestCache();
                    }
                    gifCache.set(sourceId, result);
                  }
                  
                  // 返回处理后的GIF
                  resolveTask(result);
                })
                .catch(error => {
                  console.error('处理GIF帧失败:', error);
                  clearTimeout(forceCompleteTimer);
                  
                  // 关闭进度条
                  if (progressContainer) progressContainer.style.display = 'none';
                  
                  // 关闭处理模态框
                  const processingModal = document.getElementById('processing-modal');
                  if (processingModal && processingModal.style.display === 'flex') {
                    console.log('由于GIF处理错误，关闭处理模态框');
                    processingModal.style.display = 'none';
                  }
                  
                  // 从处理中移除
                  processingGifs.delete(sourceId);
                  
                  // 返回原始GIF
                  resolveTask(gifSource);
                });
            })
            .catch(error => {
              console.error('提取GIF帧失败:', error);
              clearTimeout(forceCompleteTimer);
              
              // 关闭进度条
              if (progressContainer) progressContainer.style.display = 'none';
              
              // 关闭处理模态框
              const processingModal = document.getElementById('processing-modal');
              if (processingModal && processingModal.style.display === 'flex') {
                console.log('由于GIF处理错误，关闭处理模态框');
                processingModal.style.display = 'none';
              }
              
              // 从处理中移除
              processingGifs.delete(sourceId);
              
              // 返回原始GIF
              resolveTask(gifSource);
            });
        }
      });
      
      // 返回处理任务的Promise
      processingPromise.then(resolve).catch(reject);
    } catch (error) {
      console.error('处理GIF时出错:', error);
      
      // 关闭进度条
      const progressContainer = document.getElementById('gif-progress-container');
      if (progressContainer) progressContainer.style.display = 'none';
      
      // 关闭处理模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal && processingModal.style.display === 'flex') {
        console.log('由于GIF处理错误，关闭处理模态框');
        processingModal.style.display = 'none';
      }
      
      // 返回原始GIF
      resolve(gifSource);
    }
  });
}

/**
 * 创建静态备用图像
 * 当GIF处理失败时使用
 * @param {Blob|File|string} source - 原始GIF源
 * @param {Object} options - 水印选项
 * @returns {Promise<Blob>} - 处理后的静态图像
 */
function createStaticFallback(source, options) {
  return new Promise((resolve, reject) => {
    try {
      // 创建图像元素
      const img = new Image();
      
      // 设置加载事件
      img.onload = function() {
        try {
          // 创建canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 200;
          canvas.height = img.height || 200;
          const ctx = canvas.getContext('2d');
          
          // 绘制图像
          ctx.drawImage(img, 0, 0);
          
          // 应用水印
          if (options.applyWatermark) {
            // 使用applyWatermarkToCanvas函数，它接受options参数
            applyWatermarkToCanvas(ctx, canvas.width, canvas.height, options);
          }
          
          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                // 创建空白图像作为最后的备用
                createEmptyImage()
                  .then(resolve)
                  .catch(reject);
              }
            },
            'image/png',
            0.92
          );
        } catch (error) {
          console.error('创建静态备用图像时出错:', error);
          // 创建空白图像作为最后的备用
          createEmptyImage()
            .then(resolve)
            .catch(reject);
        }
      };
      
      // 设置错误事件
      img.onerror = function(error) {
        console.error('加载图像失败:', error);
        // 创建空白图像作为最后的备用
        createEmptyImage()
          .then(resolve)
          .catch(reject);
      };
      
      // 设置图像源
      if (source instanceof File || source instanceof Blob) {
        img.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        img.src = source;
      } else {
        // 如果无法确定源类型，创建空白图像
        createEmptyImage()
          .then(resolve)
          .catch(reject);
      }
    } catch (error) {
      console.error('创建静态备用图像时出错:', error);
      // 创建空白图像作为最后的备用
      createEmptyImage()
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * 创建空白图像
 * 作为最后的备用方案
 * @returns {Promise<Blob>} - 空白图像Blob
 */
function createEmptyImage() {
  return new Promise((resolve) => {
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    
    // 添加文本
    ctx.fillStyle = '#ff0000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GIF处理失败', 100, 100);
    
    // 转换为Blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // 如果toBlob失败，创建一个简单的Blob
          const simpleBlob = new Blob(['GIF处理失败'], { type: 'image/png' });
          resolve(simpleBlob);
        }
      },
      'image/png',
      0.92
    );
  });
}

/**
 * 处理GIF帧
 * @param {Array} frames - GIF帧数组
 * @param {Object} options - 处理选项
 * @param {HTMLElement} progressBar - 进度条元素
 * @param {HTMLElement} progressContainer - 进度条容器
 * @returns {Promise<Blob>} - 处理后的GIF Blob
 */
function processGifFrames(frames, options, progressBar, progressContainer) {
  return new Promise((resolve, reject) => {
    try {
      // 检查是否需要应用水印
      const shouldApplyWatermark = options.applyWatermark !== false;
      
      // 如果不需要应用水印，直接返回原始帧
      if (!shouldApplyWatermark) {
        console.log('不需要应用水印，直接处理GIF');
        return processGifFramesDirect(frames, options)
          .then(resolve)
          .catch(reject);
      }
      
      console.log('处理GIF帧，应用水印');
      
      // 获取第一帧的尺寸
      let width = 0;
      let height = 0;
      
      // 检查frames结构，适应不同的帧格式
      if (frames && frames.length > 0) {
        if (frames[0].dims) {
          width = frames[0].dims.width;
          height = frames[0].dims.height;
        } else if (frames[0].width && frames[0].height) {
          width = frames[0].width;
          height = frames[0].height;
        } else if (frames[0].canvas) {
          width = frames[0].canvas.width;
          height = frames[0].canvas.height;
        } else if (frames[0].imageData) {
          width = frames[0].imageData.width;
          height = frames[0].imageData.height;
        } else {
          console.warn('无法从帧中获取尺寸，使用默认值');
          width = 500;
          height = 500;
        }
      } else {
        console.error('无有效帧数据');
        reject(new Error('无有效帧数据'));
        return;
      }
      
      console.log(`检测到GIF尺寸: ${width}x${height}`);
      
      // 检查GIF.js是否已加载
      if (typeof window.GIF === 'undefined') {
        console.error('GIF.js库未加载，无法处理GIF');
        reject(new Error('GIF.js库未加载'));
        return;
      }
      
      // 检查frames是否有效
      if (!frames || !Array.isArray(frames) || frames.length === 0) {
        console.error('无效的帧数据');
        reject(new Error('无效的帧数据'));
        return;
      }
      
      // 获取正确的worker脚本路径
      let workerScriptPath;
      
      // 检测环境并设置合适的路径
      if (window.location.href.includes('file://')) {
        // 本地文件系统模式
        workerScriptPath = 'public/libs/gif.worker.js';
      } else if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
        // 本地服务器模式
        workerScriptPath = '/public/libs/gif.worker.js';
      } else {
        // 生产服务器模式 - 尝试相对路径和绝对路径
        workerScriptPath = './public/libs/gif.worker.js';
      }

      console.log('使用GIF worker脚本路径:', workerScriptPath);
        
      const gif = new window.GIF({
        workers: Math.min(navigator.hardwareConcurrency || 2, 2), // 根据CPU核心数优化，但不超过2个worker
        quality: options.quality || 10, // 使用较高的质量值，确保GIF清晰
        workerScript: workerScriptPath,
        width: Math.floor(width),
        height: Math.floor(height),
        workerOptions: {
          transferable: true
        },
        dither: false, // 不使用抖动效果
        transparent: null, // 不使用透明色
        background: '#ffffff', // 设置白色背景
        debug: false
      });
      
      // 为每一帧添加水印
      const watermarkedFrames = [];
      let processedFrames = 0;
      
      // 创建一个临时canvas
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      // 确保宽度和高度是整数
      width = Math.floor(width);
      height = Math.floor(height);
      
      // 确保宽度和高度至少为1
      width = Math.max(1, width);
      height = Math.max(1, height);
      
      console.log(`GIF尺寸: ${width}x${height}, 总帧数: ${frames.length}`);
      
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      // 设置处理超时
      const frameProcessingTimeout = setTimeout(() => {
        console.warn('GIF帧处理超时，使用已处理的帧');
        
        // 如果有已处理的帧，使用它们
        if (watermarkedFrames.length > 0) {
          try {
            // 完成GIF生成
            gif.on('finished', function(blob) {
              if (progressBar) progressBar.style.width = '100%';
              if (progressContainer) progressContainer.style.display = 'none';
              
              // 返回处理后的Blob
              const result = new Blob([blob], { type: 'image/gif' });
              console.log(`GIF处理部分完成，大小: ${Math.round(result.size / 1024)}KB`);
              resolve(result);
            });
            
            gif.render();
          } catch (renderError) {
            console.error('GIF渲染失败:', renderError);
            reject(new Error('GIF渲染失败'));
          }
        } else {
          // 如果没有已处理的帧，创建静态图像
          console.error('GIF帧处理超时且无已处理帧');
          reject(new Error('GIF帧处理超时'));
        }
      }, 20000); // 20秒超时
      
      // 处理每一帧
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        // 清除canvas
        ctx.clearRect(0, 0, width, height);
        
        // 绘制帧
        // 首先绘制白色背景，确保不会有透明问题
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        let frameDrawn = false;
        
        // 尝试使用canvas属性
        if (frame.canvas) {
          try {
            ctx.drawImage(frame.canvas, 0, 0);
            frameDrawn = true;
            console.log(`帧 ${i}: 使用canvas绘制成功`);
          } catch (error) {
            console.warn(`帧 ${i}: canvas绘制失败:`, error);
          }
        }
        
        // 尝试使用imageData
        if (!frameDrawn && frame.imageData) {
          try {
            // 创建临时canvas来绘制imageData
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.putImageData(frame.imageData, 0, 0);
            
            // 将临时canvas绘制到主canvas
            ctx.drawImage(tmpCanvas, 0, 0);
            frameDrawn = true;
            console.log(`帧 ${i}: 使用imageData绘制成功`);
          } catch (error) {
            console.warn(`帧 ${i}: imageData绘制失败:`, error);
          }
        }
        
        // 尝试使用data数组
        if (!frameDrawn && frame.data) {
          try {
            const imageData = new ImageData(
              new Uint8ClampedArray(frame.data), 
              width, 
              height
            );
            
            // 创建临时canvas来绘制imageData
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.putImageData(imageData, 0, 0);
            
            // 将临时canvas绘制到主canvas
            ctx.drawImage(tmpCanvas, 0, 0);
            frameDrawn = true;
            console.log(`帧 ${i}: 使用data数组绘制成功`);
          } catch (error) {
            console.warn(`帧 ${i}: data数组绘制失败:`, error);
          }
        }
        
        // 如果所有方法都失败，绘制一个带有文字的帧
        if (!frameDrawn) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#ff0000';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('仅供验证使用', width/2, height/2);
          console.warn(`帧 ${i}: 使用默认帧替代`);
        }
        
        // 应用水印
        if (shouldApplyWatermark) {
          // 检查position是否为对象而不是字符串
          let position = options.position;
          let positionX = options.positionX;
          let positionY = options.positionY;
          
          // 如果position是对象，提取x和y值
          if (typeof position === 'object' && position !== null) {
            positionX = parseFloat(position.x) || positionX;
            positionY = parseFloat(position.y) || positionY;
            console.log(`帧 ${i}: 检测到position对象: x=${position.x}, y=${position.y}, 解析后: x=${positionX}, y=${positionY}`);
            // 保留原始对象，不转换为custom模式
          }
          
          // 确保位置值为数值
          positionX = parseFloat(positionX);
          positionY = parseFloat(positionY);
          
          // 记录水印位置信息
          console.log(`应用水印到帧 ${i}, 位置类型: ${typeof position}, 位置: ${JSON.stringify(position)}, X: ${positionX}, Y: ${positionY}`);
          
          // 使用applyWatermarkToCanvas函数，它接受options参数
          applyWatermarkToCanvas(ctx, tempCanvas.width, tempCanvas.height, {
            ...options,
            // 确保位置信息正确
            position: position,
            positionX: positionX || 50,
            positionY: positionY || 50,
            isGif: true // 明确标识这是GIF处理
          });
        }
        
        // 添加帧到GIF
        try {
          // 检查帧是否有足够的数据
          if (tempCanvas.width === 0 || tempCanvas.height === 0) {
            console.warn('跳过无效的帧 - 尺寸为0');
            return;
          }
          
          // 确保画布中有内容
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const hasData = Array.from(imageData.data).some(val => val > 0);
          
          if (!hasData) {
            console.warn('跳过空白帧');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('仅供验证使用', tempCanvas.width/2, tempCanvas.height/2);
          }
          
          // 直接添加canvas到GIF
          gif.addFrame(tempCanvas, {
            delay: frame.delay || 100,
            copy: true,
            dispose: 2 // 使用"恢复到背景色"的处置方法
          });
        } catch (error) {
          console.warn(`添加帧 ${i} 到GIF时出错:`, error);
          // 尝试创建一个新的临时画布并复制内容
          try {
            const safeCanvas = document.createElement('canvas');
            safeCanvas.width = Math.floor(width);
            safeCanvas.height = Math.floor(height);
            const safeCtx = safeCanvas.getContext('2d', { willReadFrequently: true });
            safeCtx.drawImage(tempCanvas, 0, 0);
            
            // 使用toDataURL方法替代直接传递context
            const dataURL = safeCanvas.toDataURL('image/png');
            const img = new Image();
            img.src = dataURL;
            
            gif.addFrame(img, {
              delay: frame.delay || 100,
              copy: true
            });
          } catch (secondError) {
            console.error(`第二次尝试添加帧 ${i} 失败:`, secondError);
          }
        }
        
        // 收集处理后的帧
        watermarkedFrames.push({
          delay: frame.delay || 100
        });
        
        // 更新进度
        processedFrames++;
        if (progressBar) {
          progressBar.style.width = `${30 + Math.round((processedFrames / frames.length) * 50)}%`;
        }
      }
      
      // 清除超时
      clearTimeout(frameProcessingTimeout);
      
      // 添加完成事件处理器
      gif.on('finished', function(blob) {
        if (progressBar) progressBar.style.width = '100%';
        if (progressContainer) progressContainer.style.display = 'none';
        
        // 检查blob是否有效
        if (!blob || blob.size === 0) {
          console.error('生成的GIF blob无效');
          reject(new Error('无有效的blob或blobUrl'));
          return;
        }
        
        // 返回处理后的Blob
        const result = new Blob([blob], { type: 'image/gif' });
        console.log(`GIF处理完成，大小: ${Math.round(result.size / 1024)}KB`);
        resolve(result);
      });
      
      // 添加错误事件处理器
      gif.on('error', function(error) {
        console.error('GIF生成错误:', error);
        reject(error);
      });
      
      // 开始渲染
      try {
        console.log('开始渲染GIF...');
        gif.render();
      } catch (renderError) {
        console.error('GIF渲染失败:', renderError);
        
        // 提供更详细的错误信息并尝试修复
        console.log('尝试诊断GIF渲染失败原因...');
        console.log('已处理帧数:', watermarkedFrames.length);
        console.log('GIF配置:', {
          width: width,
          height: height,
          frameCount: frames.length,
          processedFrames: processedFrames,
          quality: options.quality || 10,
          workerScript: gif.options.workerScript,
          workers: gif.options.workers
        });
        
        // 重新尝试渲染，使用默认的worker路径
        try {
          console.log('重试GIF渲染，使用备用配置...');
          const backupGif = new window.GIF({
            workers: 1, // 减少worker数量
            quality: options.quality || 10,
            workerScript: 'public/libs/gif.worker.js', // 尝试不同的路径
            width: Math.floor(width),
            height: Math.floor(height),
            dither: false,
            transparent: null,
            background: '#ffffff'
          });
          
          // 配置完成事件
          backupGif.on('finished', function(blob) {
            console.log('备用GIF渲染成功!');
            if (progressBar) progressBar.style.width = '100%';
            if (progressContainer) progressContainer.style.display = 'none';
            resolve(new Blob([blob], { type: 'image/gif' }));
          });
          
          // 配置错误事件
          backupGif.on('error', function(error) {
            console.error('备用GIF渲染也失败:', error);
            reject(new Error('GIF渲染失败'));
          });
          
          // 尝试添加至少第一帧
          if (watermarkedFrames.length > 0) {
            // 添加第一帧
            backupGif.addFrame(tempCanvas, {
              delay: watermarkedFrames[0].delay || 100,
              copy: true
            });
            backupGif.render();
          } else {
            reject(new Error('无可用帧进行渲染'));
          }
        } catch (backupError) {
          console.error('备用GIF渲染失败:', backupError);
          reject(new Error('GIF渲染失败'));
        }
      }
    } catch (error) {
      console.error('处理GIF帧时出错:', error);
      reject(error);
    }
  });
}

/**
 * 直接处理GIF帧，避免使用getImageData
 * @param {Array} frames - GIF帧数组
 * @param {Object} options - 水印选项
 * @returns {Promise<Blob>} - 处理后的GIF文件
 */
function processGifFramesDirect(frames, options) {
  return new Promise((resolve, reject) => {
    try {
      // 检查GIF.js是否已加载
      if (typeof window.GIF === 'undefined') {
        console.error('GIF.js库未加载，无法处理GIF');
        reject(new Error('GIF.js库未加载'));
        return;
      }
      
      // 确定尺寸
      let width, height;
      if (frames[0].width && frames[0].height) {
        width = Math.floor(frames[0].width);
        height = Math.floor(frames[0].height);
      } else if (frames[0].dims) {
        width = Math.floor(frames[0].dims.width);
        height = Math.floor(frames[0].dims.height);
      } else if (frames[0].imageData) {
        width = Math.floor(frames[0].imageData.width);
        height = Math.floor(frames[0].imageData.height);
      } else {
        console.error('无法确定GIF尺寸，使用默认值');
        width = 200;
        height = 200;
      }
      
      // 帧数抽样处理 - 对于帧数过多的GIF进行抽帧处理
      let processedFrames = frames;
      const MAX_FRAMES_FULL_PROCESS = 30; // 完全处理的最大帧数
      let samplingRate = 1; // 默认采样率
      
      if (frames.length > MAX_FRAMES_FULL_PROCESS) {
        // 计算采样率，确保至少处理10帧
        samplingRate = Math.max(1, Math.floor(frames.length / 10));
        
        // 抽样帧
        processedFrames = [];
        for (let i = 0; i < frames.length; i++) {
          if (i % samplingRate === 0 || i === frames.length - 1) {
            // 保留关键帧（第一帧、最后一帧和按采样率选择的帧）
            processedFrames.push(frames[i]);
          }
        }
        
        console.log(`GIF帧数过多(${frames.length})，采用抽帧处理，采样率: 1/${samplingRate}，实际处理帧数: ${processedFrames.length}`);
      }
      
      console.log(`直接GIF处理尺寸: ${width}x${height}, 总帧数: ${processedFrames.length}`);
      
      // 创建一个临时canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      // 优化：使用更多的worker提高并行处理能力
      const workerCount = navigator.hardwareConcurrency 
        ? Math.min(4, navigator.hardwareConcurrency) // 最多使用4个worker或CPU核心数
        : 2; // 默认使用2个worker
        
      console.log(`使用 ${workerCount} 个worker处理GIF`);
      
      // 获取正确的worker脚本路径
      let workerScriptPath;
      
      // 检测环境并设置合适的路径
      if (window.location.href.includes('file://')) {
        // 本地文件系统模式
        workerScriptPath = 'public/libs/gif.worker.js';
      } else if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
        // 本地服务器模式
        workerScriptPath = '/public/libs/gif.worker.js';
      } else {
        // 生产服务器模式 - 尝试相对路径和绝对路径
        workerScriptPath = './public/libs/gif.worker.js';
      }

      console.log('直接处理使用GIF worker脚本路径:', workerScriptPath);
        
      // 创建GIF编码器
      const gif = new window.GIF({
        workers: workerCount,
        quality: options.quality || 10, // 使用较高的质量值，确保GIF清晰
        workerScript: workerScriptPath,
        width: width,
        height: height,
        transparent: null, // 不使用透明色
        background: '#ffffff', // 设置白色背景
        dither: false, // 不使用抖动效果
        debug: false
      });
      
      // 处理完成回调
      gif.on('finished', function(blob) {
        console.log(`直接GIF处理完成，大小: ${Math.round(blob.size / 1024)}KB`);
        resolve(new Blob([blob], { type: 'image/gif' }));
      });
      
      // 错误回调
      gif.on('error', function(error) {
        console.error('GIF生成错误:', error);
        reject(error);
      });
      
      // 进度回调
      if (options.onProgress) {
        gif.on('progress', function(p) {
          options.onProgress(Math.round(p * 100));
        });
      }
      
      // 预渲染水印到模板
      const watermarkTemplate = document.createElement('canvas');
      watermarkTemplate.width = width;
      watermarkTemplate.height = height;
      const watermarkCtx = watermarkTemplate.getContext('2d', { willReadFrequently: true });
      
      // 只绘制一次水印模板
      if (options.applyWatermark) {
        watermarkCtx.fillStyle = 'rgba(0,0,0,0)'; // 透明背景
        watermarkCtx.fillRect(0, 0, width, height);
        // 使用applyWatermarkToCanvas函数，它接受options参数
        applyWatermarkToCanvas(watermarkCtx, watermarkTemplate.width, watermarkTemplate.height, options);
      }
      
      // 批量处理帧，每次处理一批，避免阻塞主线程
      const BATCH_SIZE = 5; // 每批处理的帧数
      let frameIndex = 0;
      
      function processBatch() {
        if (frameIndex >= processedFrames.length) {
          // 所有帧处理完毕，渲染GIF
          try {
            gif.render();
          } catch (error) {
            console.error('GIF渲染失败:', error);
            reject(error);
          }
          return;
        }
        
        // 处理当前批次
        const endIndex = Math.min(frameIndex + BATCH_SIZE, processedFrames.length);
        const promises = [];
        
        for (let i = frameIndex; i < endIndex; i++) {
          promises.push(processFrame(processedFrames[i], i));
        }
        
        // 等待当前批次完成后处理下一批
        Promise.all(promises)
          .then(() => {
            frameIndex = endIndex;
            // 使用requestAnimationFrame确保UI响应性
            requestAnimationFrame(processBatch);
          })
          .catch(error => {
            console.error('批处理帧时出错:', error);
            // 继续处理下一批
            frameIndex = endIndex;
            requestAnimationFrame(processBatch);
          });
      }
      
      // 处理单个帧
      function processFrame(frame, index) {
        return new Promise((resolve) => {
          try {
            // 创建帧专用canvas
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = width;
            frameCanvas.height = height;
            const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
            
            // 绘制帧
            if (frame.imageData) {
              try {
                frameCtx.putImageData(frame.imageData, 0, 0);
              } catch (error) {
                console.warn(`绘制帧 ${index} 出错:`, error);
                frameCtx.fillStyle = '#ffffff';
                frameCtx.fillRect(0, 0, width, height);
              }
            } else {
              // 使用空白帧
              frameCtx.fillStyle = '#ffffff';
              frameCtx.fillRect(0, 0, width, height);
            }
            
            // 应用水印
            if (options.applyWatermark) {
              // 直接复制预渲染的水印
              frameCtx.drawImage(watermarkTemplate, 0, 0);
            }
            
            // 计算实际延迟（考虑采样率）
            let delay = frame.delay || 100;
            if (samplingRate > 1) {
              // 根据采样率调整延迟，保持总动画时长
              delay = delay * samplingRate;
            }
            
            // 添加帧到GIF
            gif.addFrame(frameCanvas, {
              delay: delay,
              copy: true,
              dispose: 1 // 使用背景处理模式，减小文件大小
            });
            
            resolve();
          } catch (error) {
            console.error(`处理帧 ${index} 失败:`, error);
            resolve(); // 即使失败也继续处理
          }
        });
      }
      
      // 开始批处理
      processBatch();
    } catch (error) {
      console.error('直接处理GIF帧时出错:', error);
      reject(error);
    }
  });
}

/**
 * 从给定的ArrayBuffer创建GIF
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - GIF对象
 */
async function gif(buffer) {
  try {
    // 检查gif.js库是否可用
    if (typeof window.GIF === 'undefined') {
      console.warn('gif.js库不可用，尝试使用备用方法');
      return parseGifUsingGifwrap(buffer);
    }
    
    // 创建一个blob URL
    const blob = new Blob([buffer], { type: 'image/gif' });
    const blobUrl = URL.createObjectURL(blob);
    
    // 尝试使用gif.js解析GIF
    try {
      // 防止fromArrayBuffer错误
      if (window.GIF && typeof window.GIF.fromArrayBuffer === 'function') {
        const gifData = await window.GIF.fromArrayBuffer(buffer);
        return {
          width: gifData.width,
          height: gifData.height,
          frames: gifData.frames,
          frameCount: gifData.frames.length,
          loopCount: gifData.loopCount || 0,
          source: 'gif.js'
        };
      } else {
        console.warn('gif.js的fromArrayBuffer方法不可用，使用替代方法');
        throw new Error('fromArrayBuffer方法不可用');
      }
    } catch (error) {
      console.warn(`使用gif.js解析失败: ${error.message}`);
      
      // 尝试使用gifwrap库
      return parseGifUsingGifwrap(buffer);
    } finally {
      // 清理URL
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('GIF解析失败:', error);
    // 创建一个简单的回退对象，确保不会抛出额外错误
    return {
      width: 1,
      height: 1,
      frames: [],
      frameCount: 0,
      loopCount: 0,
      source: 'fallback',
      error: error.message
    }; 
  }
}

/**
 * 使用gifwrap库解析GIF
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - GIF对象
 */
function parseGifUsingGifwrap(buffer) {
  return new Promise((resolve, reject) => {
    try {
      // 检查gifwrap是否可用
      if (typeof gifwrap === 'undefined' || !gifwrap.GifReader) {
        console.error('gifwrap库不可用');
        throw new Error('gifwrap库不可用');
      }
      
      // 将ArrayBuffer转换为Uint8Array
      const uint8Array = new Uint8Array(buffer);
      
      // 创建GifReader
      const reader = new gifwrap.GifReader(uint8Array);
      
      // 提取基本信息
      const width = reader.width;
      const height = reader.height;
      const frameCount = reader.numFrames();
      const loopCount = reader.loopCount();
      
      const frames = [];
      
      // 提取每一帧
      for (let i = 0; i < frameCount; i++) {
        const frameInfo = reader.frameInfo(i);
        frames.push({
          imageData: null, // gifwrap不直接提供ImageData
          delay: frameInfo.delay * 10, // 转换为毫秒
          disposal: frameInfo.disposal
        });
      }
      
      resolve({
        width,
        height,
        frames,
        frameCount,
        loopCount,
        source: 'gifwrap'
      });
    } catch (error) {
      console.error('使用gifwrap解析GIF失败:', error);
      // 返回一个简单的回退对象
      resolve({
        width: 1,
        height: 1,
        frames: [],
        frameCount: 0,
        loopCount: 0,
        source: 'fallback',
        error: error.message
      });
    }
  });
}

/**
 * 初始化GIF处理器
 */
export function initGifProcessor() {
  try {
    // 确保GIF.js库已加载
    if (typeof window.GIF === 'undefined') {
      console.warn('GIF.js库未加载，GIF处理功能可能不可用');
    }
    
    // 初始化GIF Worker
    try {
      // 动态导入GIF Worker管理器
      import('../gif/gif-worker-manager.js')
        .then(module => {
          // 将GIF Worker处理器添加到全局对象
          window.GifWorkerProcessor = module.GifWorkerProcessor;
          
          // 初始化Worker
          module.GifWorkerProcessor.init()
            .then(() => {
              console.log('GIF Worker初始化成功，多线程处理可用');
            })
            .catch(error => {
              console.warn('GIF Worker初始化失败，将使用单线程处理:', error);
            });
        })
        .catch(error => {
          console.warn('加载GIF Worker管理器失败:', error);
        });
    } catch (workerError) {
      console.warn('初始化GIF Worker失败:', workerError);
    }
    
    // 初始化缓存
    if (!gifCache) {
      gifCache = new Map();
    }
    
    console.log('GIF处理器初始化完成');
  } catch (error) {
    console.error('初始化GIF处理器时出错:', error);
  }
} 