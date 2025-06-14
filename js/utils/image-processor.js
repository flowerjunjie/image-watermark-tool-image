/**
 * 图片处理模块
 * 处理图片的加载、水印应用和导出
 */

import { watermarkState, updateState } from '../core/state.js';
import { renderWatermarkOnCanvas } from '../core/watermark.js';

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
                  fontSize: watermarkState.fontSize || 36,
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
                  resolve(blobUrl);
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
          console.error('处理图片数据时出错:', error);
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
      console.error('处理图片异常:', error);
      reject(error);
    }
  });
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
              fontSize: watermarkState.fontSize || 24,
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
 * @param {File[]} files - 图片文件列表
 * @param {Function} progressCallback - 进度回调函数
 * @param {Object} options - 处理选项
 * @returns {Promise} - 处理完成的Promise，返回处理后的图片列表
 */
export function batchProcessImages(files, progressCallback, options = {}) {
  return new Promise((resolve, reject) => {
    if (!files || files.length === 0) {
      reject(new Error('没有选择文件'));
      return;
    }
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      reject(new Error('没有发现图片文件'));
      return;
    }
    
    // 合并默认选项
    const defaultOptions = {
      quality: watermarkState.quality || 0.92,
      format: watermarkState.format || 'image/jpeg'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    const processedImages = [];
    let processedCount = 0;
    const totalFiles = imageFiles.length;
    
    // 使用并发处理提高性能
    const concurrency = navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency - 1, 4) : 3;
    let activeProcesses = 0;
    let currentIndex = 0;
    
    // 更新进度的函数
    const updateProgress = () => {
      if (progressCallback) {
        const progress = (processedCount / totalFiles) * 100;
        const currentFile = currentIndex < totalFiles ? imageFiles[currentIndex].name : '';
        progressCallback(progress, currentFile);
      }
    };
    
    // 处理单个图片的函数
    const processOneImage = (index) => {
      if (index >= totalFiles) {
        return Promise.resolve();
      }
      
      const file = imageFiles[index];
      const fileName = file.name;
      
      // 更新当前处理的文件名
      currentIndex = index;
      updateProgress();
      
      // 使用性能计时API
      const startTime = performance.now();
      
      return processImage(file, true, finalOptions)
        .then(blobUrl => {
          // 记录处理时间
          const processTime = performance.now() - startTime;
          console.log(`处理图片 ${fileName} 耗时: ${processTime.toFixed(2)}ms`);
          
          if (blobUrl) {
            // 将处理后的图片添加到结果数组
            processedImages.push({
              name: fileName,
              dataUrl: blobUrl
            });
          } else {
            console.warn(`图片 ${fileName} 处理失败，跳过`);
          }
          
          // 更新已处理数量和进度
          processedCount++;
          updateProgress();
          
          // 处理下一张图片
          activeProcesses--;
          startNextProcesses();
        })
        .catch(error => {
          console.error(`处理图片 ${fileName} 时出错:`, error);
          
          // 即使出错也要继续处理其他图片
          processedCount++;
          updateProgress();
          
          // 处理下一张图片
          activeProcesses--;
          startNextProcesses();
        });
    };
    
    // 启动下一批处理过程
    const startNextProcesses = () => {
      while (activeProcesses < concurrency && currentIndex < totalFiles) {
        activeProcesses++;
        processOneImage(currentIndex++);
      }
      
      // 检查是否所有图片都已处理完成
      if (activeProcesses === 0 && processedCount === totalFiles) {
        resolve(processedImages);
      }
    };
    
    // 初始化Worker后开始处理图片
    initWorker()
      .then(() => {
        // 开始处理图片
        startNextProcesses();
      })
      .catch(error => {
        console.error('初始化Worker失败，回退到主线程处理:', error);
        // 这里可以添加回退逻辑，使用主线程处理图片
        reject(error);
      });
  });
}

/**
 * 生成并下载ZIP文件
 * @param {Array} processedImages - 已处理的图片列表
 * @param {string} zipFileName - ZIP文件名
 * @returns {Promise} - 下载完成的Promise
 */
export function generateAndDownloadZip(processedImages, zipFileName = 'watermarked_images.zip') {
  return new Promise((resolve, reject) => {
    try {
      // 检查全局JSZip对象是否可用
      if (typeof JSZip === 'undefined') {
        console.error('JSZip库未加载，请确保已加载JSZip库');
        reject(new Error('JSZip库未加载，请确保已加载JSZip库'));
        return;
      }
      
      const zip = new JSZip();
      const fetchPromises = [];
      
      console.log(`开始处理 ${processedImages.length} 张图片进行打包下载`);
      
      // 添加所有图片到zip
      processedImages.forEach((image, index) => {
        // 从blobUrl获取blob
        const fetchPromise = fetch(image.dataUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`获取图片失败: ${response.status} ${response.statusText}`);
            }
            return response.blob();
          })
          .then(blob => {
            // 添加到zip
            console.log(`添加图片 ${index + 1}/${processedImages.length} 到ZIP: ${image.name}`);
            zip.file(image.name, blob);
          })
          .catch(error => {
            console.error(`获取图片 ${image.name} 的blob时出错:`, error);
          });
          
        fetchPromises.push(fetchPromise);
      });
      
      // 等待所有图片获取完成
      Promise.all(fetchPromises)
        .then(() => {
          console.log('所有图片已添加到ZIP，开始生成ZIP文件');
          // 生成zip文件并下载
          return zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
        })
        .then(content => {
          console.log('ZIP文件生成完成，准备下载');
          // 创建下载链接
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = zipFileName;
          link.style.display = 'none';
          
          // 添加到文档中并触发下载
          document.body.appendChild(link);
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            console.log('ZIP文件下载完成');
            resolve();
          }, 100);
        })
        .catch(error => {
          console.error('生成ZIP文件时出错:', error);
          reject(error);
        });
    } catch (error) {
      console.error('生成下载ZIP文件时出错:', error);
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