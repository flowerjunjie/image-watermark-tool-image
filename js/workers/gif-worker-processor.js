/**
 * GIF处理Web Worker
 * 用于在后台线程中处理GIF文件，避免阻塞主线程
 */

// GIF处理Worker初始化
let isInitialized = false;
let gifLib = null;
let watermarkLib = null;

// 初始化Worker
function initWorker() {
  if (isInitialized) return Promise.resolve();
  
  try {
    // 这里需要加载必要的库
    // 注意：Worker中不能使用Promise.all，因为importScripts是同步的
    importScripts('/public/libs/gif.min.js');
    console.log('GIF.js库加载成功');
    
    isInitialized = true;
    console.log('GIF Worker初始化完成');
    return Promise.resolve();
  } catch (error) {
    console.error('GIF Worker初始化失败:', error);
    return Promise.reject(error);
  }
}

// 从URL加载GIF
function loadGifFromUrl(url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`加载GIF失败: ${response.status} ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => createImageBitmap(blob))
    .catch(error => {
      console.error('Worker加载GIF失败:', error);
      throw error;
    });
}

// 提取GIF帧
function extractFrames(gifImage) {
  return new Promise((resolve, reject) => {
    try {
      // 在Worker中提取帧的实现是有限的
      // 我们只能提取第一帧作为静态图像
      const canvas = new OffscreenCanvas(gifImage.width, gifImage.height);
      const ctx = canvas.getContext('2d');
      
      // 绘制图像
      ctx.drawImage(gifImage, 0, 0);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 创建帧数组
      const frames = [{
        imageData: imageData,
        delay: 100,
        dims: {
          width: canvas.width,
          height: canvas.height
        }
      }];
      
      console.log('Worker: 提取了1帧作为静态图像，尺寸:', canvas.width, 'x', canvas.height);
      
      // 返回帧数组
      resolve(frames);
    } catch (error) {
      console.error('Worker提取帧失败:', error);
      reject(error);
    }
  });
}

// 处理GIF帧
function processFrames(frames, options) {
  return new Promise((resolve, reject) => {
    try {
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
      
      // 帧数抽样处理
      let processedFrames = frames;
      const MAX_FRAMES_FULL_PROCESS = 30;
      let samplingRate = 1;
      
      if (frames.length > MAX_FRAMES_FULL_PROCESS) {
        samplingRate = Math.max(1, Math.floor(frames.length / 10));
        
        processedFrames = [];
        for (let i = 0; i < frames.length; i++) {
          if (i % samplingRate === 0 || i === frames.length - 1) {
            processedFrames.push(frames[i]);
          }
        }
        
        console.log(`Worker: GIF帧数过多(${frames.length})，采用抽帧处理，采样率: 1/${samplingRate}，实际处理帧数: ${processedFrames.length}`);
      }
      
      // 创建一个OffscreenCanvas
      const tempCanvas = new OffscreenCanvas(width, height);
      const ctx = tempCanvas.getContext('2d');
      
      // 创建GIF编码器
      const gif = new GIF({
        workers: 2, // Worker内部使用较少的子worker
        quality: options.quality || 5,
        workerScript: '/public/libs/gif.worker.js',
        width: width,
        height: height,
        transparent: null,
        dither: false
      });
      
      // 处理完成回调
      gif.on('finished', function(blob) {
        console.log(`Worker: GIF处理完成，大小: ${Math.round(blob.size / 1024)}KB`);
        resolve(new Blob([blob], { type: 'image/gif' }));
      });
      
      // 错误回调
      gif.on('error', function(error) {
        console.error('Worker: GIF生成错误:', error);
        reject(error);
      });
      
      // 进度回调
      if (self.postMessage) {
        gif.on('progress', function(p) {
          self.postMessage({ 
            type: 'progress', 
            progress: Math.round(p * 100)
          });
        });
      }
      
      // 批量处理帧
      let frameIndex = 0;
      
      function processBatch() {
        if (frameIndex >= processedFrames.length) {
          // 所有帧处理完毕，渲染GIF
          try {
            console.log('Worker: 开始渲染GIF...');
            gif.render();
          } catch (error) {
            console.error('Worker: GIF渲染失败:', error);
            reject(error);
          }
          return;
        }
        
        // 处理当前批次
        const endIndex = Math.min(frameIndex + 5, processedFrames.length);
        
        for (let i = frameIndex; i < endIndex; i++) {
          processFrame(processedFrames[i], i);
        }
        
        // 更新索引
        frameIndex = endIndex;
        
        // 继续处理下一批
        setTimeout(processBatch, 0);
      }
      
      // 处理单个帧
      function processFrame(frame, index) {
        try {
          // 清除canvas
          ctx.clearRect(0, 0, width, height);
          
          // 绘制帧
          if (frame.imageData) {
            try {
              ctx.putImageData(frame.imageData, 0, 0);
            } catch (error) {
              console.warn(`Worker: 绘制帧 ${index} 出错:`, error);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
            }
          } else if (frame.image) {
            // 如果有image对象
            try {
              ctx.drawImage(frame.image, 0, 0);
            } catch (error) {
              console.warn(`Worker: 绘制图像帧 ${index} 出错:`, error);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
            }
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          
          // 应用水印
          if (options.applyWatermark) {
            // 在Worker中应用水印
            applyWatermark(tempCanvas, ctx, options);
          }
          
          // 计算延迟
          let delay = frame.delay || 100;
          if (samplingRate > 1) {
            delay = delay * samplingRate;
          }
          
          // 将帧添加到GIF
          try {
            // 将canvas转换为blob
            tempCanvas.convertToBlob({ type: 'image/png' })
              .then(blob => {
                // 创建图像
                createImageBitmap(blob)
                  .then(imageBitmap => {
                    // 添加帧到GIF
                    gif.addFrame(imageBitmap, {
                      delay: delay,
                      copy: true,
                      dispose: 1
                    });
                  })
                  .catch(error => {
                    console.error(`Worker: 创建图像位图失败: ${index}`, error);
                  });
              })
              .catch(error => {
                console.error(`Worker: 转换Canvas到Blob失败: ${index}`, error);
              });
          } catch (error) {
            console.error(`Worker: 处理帧 ${index} 失败:`, error);
          }
        } catch (error) {
          console.error(`Worker: 处理帧 ${index} 失败:`, error);
        }
      }
      
      // 开始批处理
      processBatch();
    } catch (error) {
      console.error('Worker: 处理GIF帧时出错:', error);
      reject(error);
    }
  });
}

// 在Worker中应用水印
function applyWatermark(canvas, ctx, options) {
  // 改进版水印应用，支持多种位置
  try {
    if (options.type === 'text') {
      // 文字水印
      ctx.save();
      
      // 设置透明度
      ctx.globalAlpha = (options.opacity || 50) / 100;
      
      // 设置字体
      const fontSize = options.fontSize || 24;
      ctx.font = `${fontSize}px Arial, sans-serif`;
      
      // 设置颜色
      ctx.fillStyle = options.color || '#ff0000';
      
      // 计算文本宽度
      const text = options.text || '水印';
      const textWidth = ctx.measureText(text).width;
      const textHeight = fontSize;
      
      // 计算位置
      let x, y;
      const position = options.position;
      const marginX = options.marginX || 10;
      const marginY = options.marginY || 10;
      
      // 根据位置计算坐标
      if (typeof position === 'object' && position !== null) {
        // 如果是对象，直接使用x和y属性（百分比值）
        const percentX = parseFloat(position.x) || 50;
        const percentY = parseFloat(position.y) || 50;
        x = (percentX / 100) * canvas.width;
        y = (percentY / 100) * canvas.height;
        console.log(`Worker: 使用对象position: x=${x}, y=${y}, 原始百分比: x=${percentX}%, y=${percentY}%`);
      } else {
        switch (position) {
          case 'top-left':
            x = textWidth / 2 + marginX;
            y = textHeight / 2 + marginY;
            break;
          case 'top-right':
            x = canvas.width - textWidth / 2 - marginX;
            y = textHeight / 2 + marginY;
            break;
          case 'bottom-left':
            x = textWidth / 2 + marginX;
            y = canvas.height - textHeight / 2 - marginY;
            break;
          case 'bottom-right':
            x = canvas.width - textWidth / 2 - marginX;
            y = canvas.height - textHeight / 2 - marginY;
            break;
          case 'center':
            x = canvas.width / 2;
            y = canvas.height / 2;
            break;
          case 'custom':
            // 使用自定义位置
            x = canvas.width * (options.positionX || 50) / 100;
            y = canvas.height * (options.positionY || 50) / 100;
            console.log(`Worker: 使用自定义位置 x=${x}, y=${y}, 原始值: positionX=${options.positionX}, positionY=${options.positionY}`);
            break;
          default:
            // 默认居中
            x = canvas.width / 2;
            y = canvas.height / 2;
        }
      }
      
      // 应用旋转
      ctx.translate(x, y);
      if (options.rotation) {
        ctx.rotate(options.rotation * Math.PI / 180);
      }
      
      // 绘制文本
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      
      // 恢复上下文
      ctx.restore();
    } else if (options.type === 'image' && options.watermarkImageData) {
      // 图像水印 - 改进版
      ctx.save();
      
      // 设置透明度
      ctx.globalAlpha = (options.opacity || 50) / 100;
      
      // 计算水印尺寸
      const watermarkWidth = options.watermarkWidth || 100;
      const watermarkHeight = options.watermarkHeight || 100;
      
      // 计算位置
      let x, y;
      const position = options.position;
      const marginX = options.marginX || 10;
      const marginY = options.marginY || 10;
      
      // 根据位置计算坐标
      if (typeof position === 'object' && position !== null) {
        // 如果是对象，直接使用x和y属性（百分比值）
        const percentX = parseFloat(position.x) || 50;
        const percentY = parseFloat(position.y) || 50;
        x = (percentX / 100) * canvas.width;
        y = (percentY / 100) * canvas.height;
        console.log(`Worker: 图像水印使用对象position: x=${x}, y=${y}, 原始百分比: x=${percentX}%, y=${percentY}%`);
      } else {
        switch (position) {
          case 'top-left':
            x = watermarkWidth / 2 + marginX;
            y = watermarkHeight / 2 + marginY;
            break;
          case 'top-right':
            x = canvas.width - watermarkWidth / 2 - marginX;
            y = watermarkHeight / 2 + marginY;
            break;
          case 'bottom-left':
            x = watermarkWidth / 2 + marginX;
            y = canvas.height - watermarkHeight / 2 - marginY;
            break;
          case 'bottom-right':
            x = canvas.width - watermarkWidth / 2 - marginX;
            y = canvas.height - watermarkHeight / 2 - marginY;
            break;
          case 'center':
            x = canvas.width / 2;
            y = canvas.height / 2;
            break;
          case 'custom':
            // 使用自定义位置
            x = canvas.width * (options.positionX || 50) / 100;
            y = canvas.height * (options.positionY || 50) / 100;
            break;
          default:
            // 默认居中
            x = canvas.width / 2;
            y = canvas.height / 2;
        }
      }
      
      // 尝试绘制图像数据
      try {
        if (options.watermarkImageData) {
          // 应用旋转
          ctx.translate(x, y);
          if (options.rotation) {
            ctx.rotate(options.rotation * Math.PI / 180);
          }
          
          // 绘制图像
          ctx.drawImage(options.watermarkImageData, -watermarkWidth/2, -watermarkHeight/2, watermarkWidth, watermarkHeight);
        }
      } catch (error) {
        console.error('Worker: 绘制图像水印失败:', error);
      }
      
      // 恢复上下文
      ctx.restore();
    }
  } catch (error) {
    console.error('Worker: 应用水印时出错:', error);
  }
}

// 处理来自主线程的消息
self.onmessage = function(e) {
  const { type, url, options, id } = e.data;
  
  if (type === 'process') {
    console.log('Worker: 收到处理请求:', id);
    
    initWorker()
      .then(() => {
        console.log('Worker: 开始加载GIF:', url);
        return loadGifFromUrl(url);
      })
      .then(gifImage => {
        console.log('Worker: GIF加载成功，开始提取帧');
        return extractFrames(gifImage);
      })
      .then(frames => {
        console.log('Worker: 帧提取成功，开始处理帧，总数:', frames.length);
        return processFrames(frames, options);
      })
      .then(processedGif => {
        console.log('Worker: GIF处理完成，发送结果');
        self.postMessage({ 
          type: 'success', 
          result: processedGif, 
          id: id 
        });
      })
      .catch(error => {
        console.error('Worker: 处理GIF出错:', error);
        self.postMessage({ 
          type: 'error', 
          error: error.toString(), 
          id: id 
        });
      });
  } else if (type === 'init') {
    console.log('Worker: 收到初始化请求');
    
    initWorker()
      .then(() => {
        console.log('Worker: 初始化成功');
        self.postMessage({ 
          type: 'initialized', 
          id: id 
        });
      })
      .catch(error => {
        console.error('Worker: 初始化失败:', error);
        self.postMessage({ 
          type: 'error', 
          error: error.toString(), 
          id: id 
        });
      });
  }
};

// 通知主线程Worker已加载
console.log('Worker: 已加载');
self.postMessage({ type: 'loaded' }); 