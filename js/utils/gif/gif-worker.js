/**
 * GIF处理 Web Worker
 * 用于在后台线程处理GIF文件，避免阻塞主线程UI
 */

// 导入GIF.js依赖（Worker环境中通过importScripts）
try {
  importScripts('/public/libs/gif.js');
  console.log('[GIF Worker] 成功加载GIF.js库');
} catch (error) {
  console.error('[GIF Worker] 加载GIF.js库失败:', error);
  
  // 尝试从CDN加载
  try {
    importScripts('https://cdn.jsdelivr.net/npm/gif.js/dist/gif.js');
    console.log('[GIF Worker] 从CDN加载GIF.js库成功');
  } catch (cdnError) {
    console.error('[GIF Worker] 从CDN加载GIF.js库失败:', cdnError);
    self.postMessage({ type: 'error', error: '无法加载GIF.js库，GIF处理不可用' });
  }
}

// 存储处理中的任务
const tasks = new Map();
let taskIdCounter = 0;

// 处理GIF帧，应用水印
function processGifFrames(frames, options, taskId) {
  try {
    // 检查GIF.js是否可用
    if (typeof GIF === 'undefined') {
      throw new Error('GIF.js库未加载，无法处理GIF');
    }
    
    // 提取尺寸
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
      throw new Error('无法确定GIF尺寸');
    }
    
    console.log(`[GIF Worker] 开始处理GIF: ${width}x${height}, ${frames.length}帧`);
    
    // 帧数抽样处理 - 对于帧数过多的GIF进行抽帧处理
    let processedFrames = frames;
    const MAX_FRAMES_FULL_PROCESS = 60; // 完全处理的最大帧数
    let samplingRate = 1; // 默认采样率
    
    if (frames.length > MAX_FRAMES_FULL_PROCESS) {
      // 计算采样率
      samplingRate = Math.max(1, Math.floor(frames.length / 30));
      
      // 抽样帧
      processedFrames = [];
      for (let i = 0; i < frames.length; i++) {
        if (i % samplingRate === 0 || i === frames.length - 1) {
          // 保留关键帧（第一帧、最后一帧和按采样率选择的帧）
          processedFrames.push(frames[i]);
        }
      }
      
      console.log(`[GIF Worker] GIF帧数过多(${frames.length})，采用抽帧处理，采样率: 1/${samplingRate}，实际处理帧数: ${processedFrames.length}`);
    }
    
    // 创建GIF编码器
    const gif = new GIF({
      workers: 4, // 使用多个子Worker处理
      quality: options.quality || 10,
      width: width,
      height: height,
      workerScript: '/public/libs/gif.worker.js',
      transparent: null,
      dither: false
    });
    
    // 创建离屏Canvas用于处理
    const offscreenCanvas = new OffscreenCanvas(width, height);
    const ctx = offscreenCanvas.getContext('2d');
    
    // 检查是否需要应用水印
    const shouldApplyWatermark = options.applyWatermark !== false;
    
    // 创建水印模板
    const watermarkCanvas = new OffscreenCanvas(width, height);
    const watermarkCtx = watermarkCanvas.getContext('2d');
    
    // 渲染水印
    if (shouldApplyWatermark) {
      renderWatermark(watermarkCanvas, watermarkCtx, options);
    }
    
    // 处理进度回调
    gif.on('progress', progress => {
      self.postMessage({
        type: 'progress',
        taskId: taskId,
        progress: progress
      });
    });
    
    // 处理完成回调
    gif.on('finished', blob => {
      try {
        // 创建一个可转移的Blob副本
        const blobCopy = new Blob([blob], { type: 'image/gif' });
        
        self.postMessage({
          type: 'result',
          taskId: taskId,
          blob: blobCopy,
          frameCount: frames.length,
          width: width,
          height: height
        }, [blobCopy]);
      } catch (error) {
        console.error('[GIF Worker] 发送结果时出错:', error);
        // 尝试不使用转移对象
        self.postMessage({
          type: 'result',
          taskId: taskId,
          error: error.message,
          frameCount: frames.length,
          width: width,
          height: height
        });
      }
      
      // 清理任务
      tasks.delete(taskId);
    });
    
    // 添加帧到GIF
    let frameCount = 0;
    
    // 批量处理帧
    const BATCH_SIZE = 5; // 每批次处理的帧数
    
    function processBatch(startIndex) {
      for (let i = startIndex; i < startIndex + BATCH_SIZE && i < processedFrames.length; i++) {
        addFrameToGif(processedFrames[i], i);
        frameCount++;
        
        // 报告进度
        if (frameCount % 5 === 0 || frameCount === processedFrames.length) {
          self.postMessage({
            type: 'frameProgress',
            taskId: taskId,
            current: frameCount,
            total: processedFrames.length,
            progress: frameCount / processedFrames.length
          });
        }
      }
      
      // 检查是否有更多帧需要处理
      if (startIndex + BATCH_SIZE < processedFrames.length) {
        setTimeout(() => processBatch(startIndex + BATCH_SIZE), 0);
      } else {
        // 所有帧添加完成，开始渲染
        console.log(`[GIF Worker] 所有帧已添加 (${frameCount}/${processedFrames.length})，开始渲染`);
        gif.render();
      }
    }
    
    // 添加单帧到GIF
    function addFrameToGif(frame, index) {
      try {
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制帧
        if (frame.imageData) {
          ctx.putImageData(frame.imageData, 0, 0);
        } else if (frame.patch) {
          const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            width,
            height
          );
          ctx.putImageData(imageData, 0, 0);
        } else {
          // 空白帧
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        
        // 应用水印
        if (shouldApplyWatermark) {
          ctx.drawImage(watermarkCanvas, 0, 0);
        }
        
        // 计算延迟时间，考虑采样率
        let delay = frame.delay || 100;
        if (samplingRate > 1) {
          delay = delay * samplingRate;
        }
        
        // 转换为位图
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // 添加到GIF
        gif.addFrame(imageData, {
          delay: delay,
          copy: true,
          dispose: 1
        });
      } catch (error) {
        console.error(`[GIF Worker] 添加帧 ${index} 时出错:`, error);
      }
    }
    
    // 开始批量处理
    processBatch(0);
    
  } catch (error) {
    console.error('[GIF Worker] 处理GIF帧时出错:', error);
    self.postMessage({
      type: 'error',
      taskId: taskId,
      error: error.message || '处理GIF帧时出错'
    });
    
    // 清理任务
    tasks.delete(taskId);
  }
}

// 简单的水印渲染函数
function renderWatermark(canvas, ctx, options) {
  try {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算水印位置
    let x, y;
    
    // 检查position类型
    if (typeof options.position === 'object' && options.position !== null) {
      // 如果是对象，直接使用x和y属性
      x = (options.position.x / 100) * canvas.width;
      y = (options.position.y / 100) * canvas.height;
    } else if (options.position === 'custom' && options.positionX !== undefined && options.positionY !== undefined) {
      // 如果是custom模式，使用positionX和positionY
      x = (options.positionX / 100) * canvas.width;
      y = (options.positionY / 100) * canvas.height;
    } else {
      // 默认中心位置
      x = canvas.width / 2;
      y = canvas.height / 2;
    }
    
    // 设置透明度
    const opacity = (options.opacity || 50) / 100;
    ctx.globalAlpha = opacity;
    
    // 保存上下文状态
    ctx.save();
    
    // 设置旋转中心点
    ctx.translate(x, y);
    ctx.rotate((options.rotation || 0) * Math.PI / 180);
    
    // 根据水印类型进行处理
    if (options.type === 'text') {
      // 文本水印
      const text = options.text || '仅供验证使用';
      const fontSize = options.fontSize || 24;
      const color = options.color || '#ff0000';
      
      // 设置字体和颜色
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 绘制文本
      ctx.fillText(text, 0, 0);
      
      // 如果启用了平铺
      if (options.tileSpacing && options.tileSpacing > 0) {
        const spacing = options.tileSpacing;
        const columns = Math.ceil(canvas.width / spacing);
        const rows = Math.ceil(canvas.height / spacing);
        
        for (let i = -columns; i <= columns; i++) {
          for (let j = -rows; j <= rows; j++) {
            if (i === 0 && j === 0) continue; // 跳过中心点，已经绘制了
            
            const offsetX = i * spacing;
            const offsetY = j * spacing;
            
            ctx.fillText(text, offsetX, offsetY);
          }
        }
      }
    } else {
      // 未支持的水印类型
      console.warn('[GIF Worker] 未支持的水印类型:', options.type);
    }
    
    // 恢复上下文状态
    ctx.restore();
    
    // 恢复透明度
    ctx.globalAlpha = 1.0;
  } catch (error) {
    console.error('[GIF Worker] 渲染水印时出错:', error);
  }
}

// 监听消息
self.addEventListener('message', function(event) {
  try {
    const data = event.data;
    
    if (!data || !data.type) {
      console.error('[GIF Worker] 收到无效消息:', data);
      return;
    }
    
    switch (data.type) {
      case 'init':
        // 初始化Worker
        self.postMessage({ type: 'ready', status: 'GIF Worker已初始化' });
        break;
        
      case 'process':
        // 处理GIF帧
        const taskId = taskIdCounter++;
        tasks.set(taskId, { frames: data.frames, options: data.options });
        
        self.postMessage({ 
          type: 'start', 
          taskId: taskId, 
          message: `开始处理GIF，${data.frames.length}帧` 
        });
        
        // 开始处理
        processGifFrames(data.frames, data.options, taskId);
        break;
        
      case 'cancel':
        // 取消任务
        if (tasks.has(data.taskId)) {
          tasks.delete(data.taskId);
          self.postMessage({ 
            type: 'cancelled', 
            taskId: data.taskId, 
            message: '任务已取消' 
          });
        }
        break;
        
      default:
        console.warn('[GIF Worker] 未知消息类型:', data.type);
    }
  } catch (error) {
    console.error('[GIF Worker] 处理消息时出错:', error);
    self.postMessage({ type: 'error', error: error.message || '处理消息时出错' });
  }
}); 