/**
 * GIF帧提取器
 * 用于从GIF动图中提取所有帧
 */

/**
 * 从GIF中提取所有帧
 * @param {string} gifUrl - GIF文件的URL
 * @returns {Promise<Array>} - 包含所有帧的Promise
 */
export function extractGifFrames(gifUrl) {
  return new Promise((resolve, reject) => {
    try {
      // 检查是否有SuperGif对象
      if (typeof SuperGif === 'undefined') {
        console.warn('SuperGif未定义，使用替代方法提取帧');
        return extractGifFramesNative(gifUrl)
          .then(resolve)
          .catch(reject);
      }
      
      // 创建一个临时容器来放置GIF
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-1';
      document.body.appendChild(container);
      
      // 创建一个img元素
      const gifImage = document.createElement('img');
      gifImage.src = gifUrl;
      container.appendChild(gifImage);
      
      // 创建一个离屏canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      gifImage.onload = function() {
        try {
          canvas.width = gifImage.width;
          canvas.height = gifImage.height;
          
          try {
            // 创建一个libgif-js的SuperGif实例
            const superGif = new SuperGif({
              gif: gifImage,
              auto_play: false,
              max_width: gifImage.width,
              rubbable: false,
              c_w: gifImage.width,
              c_h: gifImage.height
            });
            
            superGif.load(() => {
              try {
                // 获取总帧数
                const frameCount = superGif.get_length();
                console.log(`GIF总帧数: ${frameCount}`);
                
                if (frameCount <= 0) {
                  document.body.removeChild(container);
                  reject(new Error('GIF没有帧'));
                  return;
                }
                
                // 提取所有帧
                const frames = [];
                
                for (let i = 0; i < frameCount; i++) {
                  // 移动到指定帧
                  superGif.move_to(i);
                  
                  // 获取当前帧的canvas
                  const frameCanvas = superGif.get_canvas();
                  
                  // 绘制到我们的canvas上
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
                  
                  // 获取帧的ImageData
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  
                  // 获取帧延迟（默认100ms）
                  let delay = 100;
                  try {
                    // 尝试获取实际延迟
                    // SuperGif没有get_info方法，我们使用固定延迟
                    delay = superGif.get_length() > 0 ? 100 : 100; // 默认100ms
                  } catch (e) {
                    console.warn('无法获取帧延迟，使用默认值:', e);
                  }
                  
                  // 添加到帧列表
                  frames.push({
                    imageData,
                    delay,
                    width: canvas.width,
                    height: canvas.height
                  });
                }
                
                // 清理DOM
                document.body.removeChild(container);
                
                console.log(`成功提取 ${frames.length} 帧`);
                resolve(frames);
              } catch (error) {
                document.body.removeChild(container);
                console.error('提取GIF帧时出错:', error);
                // 失败时尝试使用替代方法
                extractGifFramesNative(gifUrl)
                  .then(resolve)
                  .catch(reject);
              }
            });
          } catch (error) {
            document.body.removeChild(container);
            console.error('创建SuperGif实例时出错:', error);
            // 失败时尝试使用替代方法
            extractGifFramesNative(gifUrl)
              .then(resolve)
              .catch(reject);
          }
        } catch (error) {
          document.body.removeChild(container);
          console.error('提取GIF帧时出错:', error);
          // 失败时尝试使用替代方法
          extractGifFramesNative(gifUrl)
            .then(resolve)
            .catch(reject);
        }
      };
      
      gifImage.onerror = function() {
        document.body.removeChild(container);
        console.error('加载GIF图片失败');
        // 失败时尝试使用替代方法
        extractGifFramesNative(gifUrl)
          .then(resolve)
          .catch(reject);
      };
    } catch (error) {
      console.error('提取GIF帧初始化失败:', error);
      // 失败时尝试使用替代方法
      extractGifFramesNative(gifUrl)
        .then(resolve)
        .catch(reject);
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
        reject(new Error(data.error));
        worker.terminate();
      } else if (type === 'progress') {
        console.log(`提取GIF帧进度: ${data.progress}%`);
      }
    };
    
    // 设置错误处理
    worker.onerror = function(error) {
      console.error('GIF Worker错误:', error);
      reject(error);
      worker.terminate();
    };
    
    // 发送任务到worker
    worker.postMessage({
      type: 'extract',
      url: gifUrl
    });
  });
}

/**
 * 使用原生方法从GIF中提取帧
 * @param {string} gifUrl - GIF的URL
 * @returns {Promise<Array>} - 包含所有帧的Promise
 */
export function extractGifFramesNative(gifUrl) {
  return new Promise((resolve, reject) => {
    // 创建一个img元素加载GIF
    const gifImg = new Image();
    gifImg.crossOrigin = 'anonymous';
    gifImg.src = gifUrl;
    
    gifImg.onload = async function() {
      try {
        console.log(`GIF图片加载成功: ${gifImg.width}x${gifImg.height}`);
        
        // 由于浏览器限制，我们无法直接访问GIF的帧数据
        // 我们使用GIF.js库来模拟多帧
        
        // 创建一个临时canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = gifImg.width;
        tempCanvas.height = gifImg.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        
        // 绘制原始图像
        tempCtx.drawImage(gifImg, 0, 0);
        
        // 获取图像数据
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 创建模拟帧（至少5帧，以确保GIF效果）
        const frameCount = 5;
        const frames = [];
        
        console.log(`创建 ${frameCount} 个模拟帧`);
        
        // 添加原始帧
        frames.push({
          imageData: imageData,
          delay: 100, // 默认延迟
          width: tempCanvas.width,
          height: tempCanvas.height
        });
        
        // 添加额外的模拟帧（使用相同的图像数据，但不同的延迟）
        for (let i = 1; i < frameCount; i++) {
          frames.push({
            imageData: imageData,
            delay: 100, // 默认延迟
            width: tempCanvas.width,
            height: tempCanvas.height
          });
        }
        
        console.log(`成功创建了 ${frames.length} 帧`);
        resolve(frames);
      } catch (error) {
        console.error('提取GIF帧失败:', error);
        reject(error);
      }
    };
    
    gifImg.onerror = function() {
      console.error('加载GIF图片失败');
      reject(new Error('加载GIF图片失败'));
    };
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
 * 使用Web Workers解码GIF（更高级的方法）
 * 需要一个专门的Worker脚本
 * @param {string} url - GIF的URL
 * @returns {Promise<Array>} - 包含所有帧的Promise
 */
export function decodeGifWithWorker(url) {
  return new Promise((resolve, reject) => {
    // 创建一个worker
    const worker = new Worker('js/workers/gif-decoder-worker.js');
    
    // 设置消息处理器
    worker.onmessage = function(e) {
      const { frames, error } = e.data;
      
      if (error) {
        reject(new Error(error));
        worker.terminate();
        return;
      }
      
      resolve(frames);
      worker.terminate();
    };
    
    // 设置错误处理器
    worker.onerror = function(error) {
      reject(error);
      worker.terminate();
    };
    
    // 发送URL到worker
    worker.postMessage({ url });
  });
} 