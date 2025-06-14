/**
 * GIF帧提取器
 * 用于从GIF动图中提取所有帧
 */

// 设置最大处理时间（单位：毫秒）
const MAX_EXTRACTION_TIME = 15000;
const MAX_SECONDARY_ATTEMPT_TIME = 8000;
const GIF_WORKER_TIMEOUT = 10000; // Worker处理超时

/**
 * 检查是否取消处理
 * @returns {boolean} 是否已取消
 */
function isProcessingCancelled() {
  return window.processingCancelled === true;
}

/**
 * 从GIF中提取所有帧
 * @param {string|File|Blob} gifSource - GIF文件的URL或File对象
 * @returns {Promise<Array>} - 包含所有帧的Promise，每一帧都是一个canvas元素
 */
export function extractGifFrames(gifSource) {
  // 如果是File或Blob对象，创建一个URL
  let gifUrl = gifSource;
  let needsCleanup = false;
  
  if (gifSource instanceof File || gifSource instanceof Blob) {
    gifUrl = URL.createObjectURL(gifSource);
    needsCleanup = true;
    console.log('创建了GIF的临时URL:', gifUrl);
  }
  return new Promise((resolve, reject) => {
    // 设置安全超时，防止提取过程卡住
    const startTime = Date.now();
    
    // 定期检查是否取消
    const cancelCheckInterval = setInterval(() => {
      if (isProcessingCancelled()) {
        console.log('GIF处理已被用户取消');
        clearTimeout(primaryTimeout);
        clearInterval(cancelCheckInterval);
        
        // 清理临时URL
        if (needsCleanup && gifUrl) {
          try {
            URL.revokeObjectURL(gifUrl);
            console.log('清理了GIF的临时URL');
          } catch (e) {
            console.warn('清理GIF临时URL时出错:', e);
          }
        }
        
        resolve([]);  // 返回空数组表示已取消
      }
    }, 100);
    
    // 主提取超时
    const primaryTimeout = setTimeout(() => {
      console.warn('GIF帧提取超时，尝试备用方法');
      clearInterval(cancelCheckInterval);
      
      // 尝试备用方法提取
      const secondaryTimeout = setTimeout(() => {
        console.warn('备用提取方法也超时，返回基础帧');
        resolve(createFallbackFrames(gifUrl));
      }, MAX_SECONDARY_ATTEMPT_TIME);
      
      extractGifFramesNative(gifUrl)
        .then(frames => {
          clearTimeout(secondaryTimeout);
          console.log('备用方法成功提取帧');
          resolve(frames);
        })
        .catch(err => {
          clearTimeout(secondaryTimeout);
          console.error('备用提取方法失败:', err);
          resolve(createFallbackFrames(gifUrl));
        });
    }, MAX_EXTRACTION_TIME);

    try {
      // 检查是否已取消
      if (isProcessingCancelled()) {
        console.log('GIF处理已被用户取消');
        clearTimeout(primaryTimeout);
        clearInterval(cancelCheckInterval);
        
        // 清理临时URL
        if (needsCleanup && gifUrl) {
          try {
            URL.revokeObjectURL(gifUrl);
            console.log('清理了GIF的临时URL');
          } catch (e) {
            console.warn('清理GIF临时URL时出错:', e);
          }
        }
        
        resolve([]);
        return;
      }
      
      // 检查是否有SuperGif对象
      if (typeof SuperGif === 'undefined') {
        console.warn('SuperGif未定义，使用替代方法提取帧');
        clearTimeout(primaryTimeout);
        clearInterval(cancelCheckInterval);
        
        extractGifFramesNative(gifUrl)
          .then(frames => {
            resolve(frames);
          })
          .catch(err => {
            console.error('替代方法提取帧失败:', err);
            createFallbackFrames(gifUrl).then(frames => resolve(frames));
          });
        return;
      }
      
      // 创建一个容器元素
      const container = document.getElementById('gif-container') || document.createElement('div');
      container.style.position = 'absolute';
      container.style.visibility = 'hidden';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      
      // 创建一个图像元素
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous'; // 添加跨域支持
      img.src = gifUrl;
      img.setAttribute('rel:animated_src', gifUrl);
      img.setAttribute('rel:auto_play', '0');
      
      // 添加到容器
      container.innerHTML = '';
      container.appendChild(img);
      
      // 确保container在document中
      if (!document.body.contains(container)) {
        document.body.appendChild(container);
      }
      
      // 使用SuperGif库
      const superGif = new SuperGif({
        gif: img,
        auto_play: false,
        progressCallback: (progress) => {
          console.log('GIF加载进度:', Math.round(progress * 100) + '%');
          
          // 检查是否取消
          if (isProcessingCancelled()) {
            console.log('GIF加载过程中被用户取消');
            superGif.abort(); // 尝试中止加载
            clearTimeout(primaryTimeout);
            clearInterval(cancelCheckInterval);
            resolve([]);
            return false; // 返回false可能会中止SuperGif的加载过程
          }
        }
      });
      
      // 加载GIF并提取帧
      superGif.load(() => {
        clearTimeout(primaryTimeout); // 清除超时
        
        try {
          // 再次检查是否已取消
          if (isProcessingCancelled()) {
            console.log('GIF帧提取已被用户取消');
            clearInterval(cancelCheckInterval);
            resolve([]);
            return;
          }
          
          // 获取帧数
          const frameCount = superGif.get_length();
          console.log('GIF帧数:', frameCount);
          
          // 如果帧数为0，使用备用方法
          if (frameCount <= 0) {
            console.warn('SuperGif无法获取帧, 使用备用方法');
            clearInterval(cancelCheckInterval);
            
            extractGifFramesNative(gifUrl)
              .then(frames => resolve(frames))
              .catch(err => {
                console.error('备用方法提取帧失败:', err);
                createFallbackFrames(gifUrl).then(frames => resolve(frames));
              });
            
            return;
          }
          
          // 提取所有帧
          const frames = [];
          let width = 0;
          let height = 0;
          
          // 保存帧尺寸
          const firstFrame = superGif.get_canvas();
          if (firstFrame) {
            width = firstFrame.width;
            height = firstFrame.height;
          }
          
          // 使用批处理方法提取帧，避免卡顿
          const batchSize = 10;
          const totalFrames = frameCount;
          let processedFrames = 0;
          
          // 在超时前强制完成
          const remainingTime = MAX_EXTRACTION_TIME - (Date.now() - startTime);
          const forceCompleteTimeout = setTimeout(() => {
            console.warn('帧提取时间过长，强制完成当前批次');
            clearInterval(cancelCheckInterval);
            processBatch(processedFrames); // 处理当前已有帧
          }, Math.max(1000, remainingTime - 1000));
          
          function processBatch(startIndex) {
            // 检查是否已取消
            if (isProcessingCancelled()) {
              console.log('帧批处理过程中被用户取消');
              clearTimeout(forceCompleteTimeout);
              clearInterval(cancelCheckInterval);
              resolve(frames.length > 0 ? frames : []);
              return;
            }
            
            const endIndex = Math.min(startIndex + batchSize, totalFrames);
            
            // 处理当前批次
            for (let i = startIndex; i < endIndex; i++) {
              // 定期检查是否取消
              if (i % 3 === 0 && isProcessingCancelled()) {
                console.log('帧处理过程中被用户取消');
                clearTimeout(forceCompleteTimeout);
                clearInterval(cancelCheckInterval);
                resolve(frames.length > 0 ? frames : []);
                return;
              }
              
              // 移动到指定帧
              superGif.move_to(i);
              
              // 获取当前帧的canvas
              const frameCanvas = superGif.get_canvas();
              if (frameCanvas) {
                // 复制canvas内容
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = frameCanvas.width;
                tempCanvas.height = frameCanvas.height;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(frameCanvas, 0, 0);
                
                // 获取帧延迟
                let delay = 100; // 默认延迟100ms
                try {
                  // 尝试从不同属性获取延迟
                  if (typeof superGif.get_delay === 'function') {
                    delay = superGif.get_delay(i) * 10; // 单位从1/100s转换为毫秒
                  } else if (superGif.anim_delay && Array.isArray(superGif.anim_delay) && superGif.anim_delay[i] !== undefined) {
                    delay = superGif.anim_delay[i] * 10; // 单位从1/100s转换为毫秒
                  } else if (superGif.delay && Array.isArray(superGif.delay) && superGif.delay[i] !== undefined) {
                    delay = superGif.delay[i] * 10; // 单位从1/100s转换为毫秒
                  } else {
                    console.warn('无法获取帧延迟，使用默认延迟');
                  }
                } catch (e) {
                  console.warn('获取帧延迟时出错，使用默认值:', e);
                }
                
                // 获取图像数据
                const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                
                // 添加当前帧对象 - 不包含canvas对象，因为它不能被传递给Worker
                frames.push({
                  imageData: imageData,
                  delay: delay || 100,
                  width: tempCanvas.width,
                  height: tempCanvas.height,
                  // 添加可序列化的数据
                  data: Array.from(imageData.data),
                  dims: {
                    width: tempCanvas.width,
                    height: tempCanvas.height
                  }
                });
              } else {
                console.warn(`获取帧 ${i} 失败`);
              }
            }
            
            processedFrames = endIndex;
            
            // 继续处理下一批或完成
            if (processedFrames < totalFrames) {
              // 检查是否即将超时
              const elapsed = Date.now() - startTime;
              if (elapsed > MAX_EXTRACTION_TIME - 1000) {
                console.warn('即将到达最大提取时间，强制完成帧提取');
                clearInterval(cancelCheckInterval);
                // 如果已经提取了足够的帧，直接返回
                if (frames.length > 0) {
                  clearTimeout(forceCompleteTimeout);
                  resolve(frames);
                  return;
                }
              }
              
              // 避免长时间阻塞UI线程
              setTimeout(() => processBatch(processedFrames), 0);
            } else {
              clearTimeout(forceCompleteTimeout);
              clearInterval(cancelCheckInterval);
              resolve(frames);
            }
          }
          
          // 开始批处理
          processBatch(0);
          
        } catch (error) {
                console.error('提取GIF帧时出错:', error);
      clearInterval(cancelCheckInterval);
      createFallbackFrames(gifUrl).then(frames => resolve(frames));
        }
      });
      
    } catch (error) {
      console.error('GIF提取过程中出错:', error);
      clearTimeout(primaryTimeout);
      clearInterval(cancelCheckInterval);
      
      // 清理临时URL
      if (needsCleanup && gifUrl) {
        try {
          URL.revokeObjectURL(gifUrl);
          console.log('清理了GIF的临时URL');
        } catch (e) {
          console.warn('清理GIF临时URL时出错:', e);
        }
      }
      createFallbackFrames(gifUrl).then(frames => resolve(frames));
    }
  });
}

/**
 * 使用原生方法提取GIF帧
 * @param {string} gifUrl - GIF文件URL
 * @returns {Promise<Array>} - 帧数组
 */
function extractGifFramesNative(gifUrl) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = gifUrl;
    
    // 设置图像加载超时
    const loadTimeout = setTimeout(() => {
      console.warn('图像加载超时');
      reject(new Error('图像加载超时'));
    }, 10000);
    
    img.onload = function() {
      clearTimeout(loadTimeout);
      
      try {
        // 创建单帧
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // 创建一个静态帧
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const frames = [{
          imageData: imageData,
          canvas: canvas,
          delay: 100,
          width: canvas.width,
          height: canvas.height
        }];
        
        resolve(frames);
      } catch (error) {
        console.error('创建备用帧时出错:', error);
        reject(error);
      }
    };
    
    img.onerror = function(err) {
      clearTimeout(loadTimeout);
      console.error('加载图像出错:', err);
      reject(err);
    };
  });
}

/**
 * 创建备用帧
 * @param {string} gifUrl - GIF URL
 * @returns {Promise<Array>} - 包含多个帧的数组，用于模拟动画
 */
function createFallbackFrames(gifUrl) {
  return new Promise((resolve) => {
    // 尝试加载原始图像以获取尺寸
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = gifUrl;
    
    // 设置加载超时
    const loadTimeout = setTimeout(() => {
      console.warn('备用帧图像加载超时，使用默认尺寸');
      createDefaultFrames(500, 500).then(resolve);
    }, 5000);
    
    img.onload = function() {
      clearTimeout(loadTimeout);
      
      // 获取原始尺寸
      const width = img.width || 500;
      const height = img.height || 500;
      
      createDefaultFrames(width, height, img).then(resolve);
    };
    
    img.onerror = function(err) {
      clearTimeout(loadTimeout);
      console.error('备用帧图像加载失败:', err);
      createDefaultFrames(500, 500).then(resolve);
    };
  });
}

/**
 * 创建默认帧集
 * @param {number} width - 帧宽度
 * @param {number} height - 帧高度
 * @param {Image} [originalImage] - 原始图像（可选）
 * @returns {Promise<Array>} - 帧数组
 */
function createDefaultFrames(width, height, originalImage = null) {
  return new Promise((resolve) => {
    try {
      // 创建一个空白canvas作为备用
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // 绘制原始图像
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // 先绘制白色背景，确保不会有透明问题
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // 如果有原始图像，绘制它
      if (originalImage) {
        ctx.drawImage(originalImage, 0, 0);
      }
      
      // 尝试应用水印文本
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.font = Math.max(16, Math.floor(width / 20)) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('仅供验证使用', width / 2, height / 2);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // 创建多个帧以保持动画效果
      const frames = [];
      
      // 创建10个帧，模拟动画效果
      const frameCount = 10;
      for (let i = 0; i < frameCount; i++) {
        // 创建帧的副本
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.drawImage(canvas, 0, 0);
        
        // 获取帧的图像数据
        const frameImageData = frameCtx.getImageData(0, 0, width, height);
        
        // 添加帧
        frames.push({
          imageData: frameImageData,
          canvas: frameCanvas,
          delay: 100,
          width: width,
          height: height,
          data: Array.from(frameImageData.data),
          dims: {
            width: width,
            height: height
          }
        });
      }
      
      console.log(`创建了备用帧，尺寸: ${width}x${height}`);
      resolve(frames);
    } catch (error) {
      console.error('创建默认帧时出错:', error);
      // 创建一个简单的备用帧
      const simpleCanvas = document.createElement('canvas');
      simpleCanvas.width = width || 200;
      simpleCanvas.height = height || 200;
      const simpleCtx = simpleCanvas.getContext('2d');
      
      // 绘制简单背景
      simpleCtx.fillStyle = '#ffffff';
      simpleCtx.fillRect(0, 0, simpleCanvas.width, simpleCanvas.height);
      simpleCtx.fillStyle = '#ff0000';
      simpleCtx.font = '16px Arial';
      simpleCtx.textAlign = 'center';
      simpleCtx.fillText('GIF处理失败', simpleCanvas.width / 2, simpleCanvas.height / 2);
      
      // 获取图像数据
      const simpleImageData = simpleCtx.getImageData(0, 0, simpleCanvas.width, simpleCanvas.height);
      
      // 创建单个帧
      const frames = [{
        imageData: simpleImageData,
        canvas: simpleCanvas,
        delay: 100,
        width: simpleCanvas.width,
        height: simpleCanvas.height,
        data: Array.from(simpleImageData.data),
        dims: {
          width: simpleCanvas.width,
          height: simpleCanvas.height
        }
      }];
      
      resolve(frames);
    }
      });
  }

/**
 * 使用Web Worker提取GIF帧
 * 这是一个更高效的方法，但需要额外的worker文件
 * @param {string} gifUrl - GIF文件的URL
 * @returns {Promise<Array>} - 包含所有帧的Promise
 */
export function extractGifFramesWithWorker(gifUrl) {
  return new Promise((resolve, reject) => {
    // 创建worker
    const worker = new Worker('js/workers/gif-decoder-worker.js');
    
    // 设置消息处理
    worker.onmessage = function(e) {
      const { type, data } = e.data;
      
      if (type === 'frames') {
        console.log(`Worker成功提取 ${data.frames.length} 帧`);
        resolve(data.frames);
        worker.terminate();
      } else if (type === 'error') {
        console.error('Worker提取GIF帧时出错:', data.error);
        // 尝试使用替代方法
        createFallbackFrames(gifUrl)
          .then(resolve)
          .catch(reject);
        worker.terminate();
      } else if (type === 'progress') {
        console.log(`提取GIF帧进度: ${data.progress}%`);
      }
    };
    
    // 设置错误处理
    worker.onerror = function(error) {
      console.error('GIF Worker错误:', error);
      // 尝试使用替代方法
      createFallbackFrames(gifUrl)
        .then(resolve)
        .catch(reject);
      worker.terminate();
    };
    
    // 设置超时处理
    const timeoutId = setTimeout(() => {
      console.warn('GIF Worker处理超时，使用备用方法');
      worker.terminate();
      createFallbackFrames(gifUrl)
        .then(resolve)
        .catch(reject);
    }, 10000);
    
    // 发送任务到worker
    worker.postMessage({
      type: 'extract',
      url: gifUrl
    });
  });
}

/**
 * 使用fetch API和ArrayBuffer解码GIF
 * @param {string} url - GIF的URL
 * @returns {Promise<Array>} - 包含所有帧的Promise
 */
async function decodeGif(url) {
  try {
    // 获取GIF数据
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // 使用自定义GIF解析器
    return parseGifFromArrayBuffer(buffer);
  } catch (error) {
    console.error('解码GIF失败:', error);
    return null;
  }
}

/**
 * 从ArrayBuffer解析GIF
 * 这是一个简化的GIF解析器，仅用于演示
 * 实际应用中，应使用成熟的GIF解析库
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Array} - 帧数据数组
 */
function parseGifFromArrayBuffer(buffer) {
  // 创建一个视图来读取数据
  const view = new Uint8Array(buffer);
  
  // 检查GIF头部
  const header = String.fromCharCode(...view.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') {
    throw new Error('无效的GIF格式');
  }
  
  // 读取逻辑屏幕宽度和高度
  const width = view[6] + (view[7] << 8);
  const height = view[8] + (view[9] << 8);
  
  // 创建一个临时canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // 创建一个图像对象来加载GIF
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([buffer], { type: 'image/gif' }));
  
  // 等待图像加载
  return new Promise((resolve) => {
    img.onload = function() {
      // 绘制图像到canvas
      ctx.drawImage(img, 0, 0);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // 清理资源
      URL.revokeObjectURL(img.src);
      
      // 由于我们无法直接获取GIF的多个帧，
      // 这里我们模拟返回多个帧（实际上是同一帧的多个副本）
      // 在实际应用中，应使用专门的GIF解析库
      
      // 模拟5个帧
      const frames = [];
      for (let i = 0; i < 5; i++) {
        frames.push({
          imageData: imageData,
          delay: 100, // 默认延迟
          width,
          height
        });
      }
      
      resolve(frames);
    };
    
    img.onerror = function() {
      // 如果加载失败，返回空数组
      resolve([]);
    };
  });
}

/**
 * 使用Web Worker解码GIF（推荐方法）
 * @param {string} url - GIF的URL
 * @returns {Promise<Object>} - 包含解码后GIF信息的Promise
 */
export function decodeGifWithWorker(url) {
  return new Promise((resolve, reject) => {
    // 检查是否已取消
    if (isProcessingCancelled()) {
      console.log('GIF Worker处理已被用户取消');
      resolve({frames: []});
      return;
    }
    
    // 设置超时保护
    const workerTimeout = setTimeout(() => {
      console.warn('GIF Worker处理超时');
      if (worker) {
        worker.terminate();
      }
      resolve({frames: [], width: 0, height: 0, error: 'Worker处理超时'});
    }, GIF_WORKER_TIMEOUT);
    
    // 定期检查是否取消
    const cancelCheckInterval = setInterval(() => {
      if (isProcessingCancelled()) {
        console.log('GIF Worker处理中被用户取消');
        clearTimeout(workerTimeout);
        clearInterval(cancelCheckInterval);
        if (worker) {
          worker.terminate();
        }
        resolve({frames: []});
      }
    }, 100);
    
    // 创建Worker
    const worker = new Worker('/js/workers/gif-worker.js');
    
    // 监听Worker消息
    worker.onmessage = function(e) {
      clearTimeout(workerTimeout);
      clearInterval(cancelCheckInterval);
      
      if (e.data.error) {
        console.error('GIF Worker处理错误:', e.data.error);
        reject(new Error(e.data.error));
      } else {
        console.log('GIF Worker成功解码:', e.data.frames.length, '帧');
        resolve(e.data);
      }
      
      // 终止Worker
      worker.terminate();
    };
    
    // 监听Worker错误
    worker.onerror = function(err) {
      clearTimeout(workerTimeout);
      clearInterval(cancelCheckInterval);
      console.error('GIF Worker错误:', err);
      reject(err);
      worker.terminate();
    };
    
    // 发送GIF URL给Worker
    worker.postMessage({
      type: 'decode',
      url: url
    });
  });
} 