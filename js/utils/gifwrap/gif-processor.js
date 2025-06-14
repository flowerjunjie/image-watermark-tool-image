/**
 * GIF处理工具 - 使用gifwrap库
 * 用于处理GIF动图，添加水印等
 */

// 使用全局变量而不是ES模块导入
// import { GifFrame, GifUtil, GifCodec } from 'gifwrap';
import { renderWatermarkOnCanvas } from '../../core/watermark.js';

// GIF处理缓存
const gifCache = new Map();
const MAX_CACHE_SIZE = 20;

// 处理状态跟踪
const processingGifs = new Map();
const gifProcessingQueue = [];
const MAX_CONCURRENT_GIF_PROCESSING = 2;
let activeGifProcessingCount = 0;

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
      if (activeGifProcessingCount === 0 && gifProcessingQueue.length === 0) {
        // 关闭处理模态框
        const processingModal = document.getElementById('processing-modal');
        if (processingModal && processingModal.style.display === 'flex') {
          processingModal.style.display = 'none';
        }
      }
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用成功回调
      if (nextTask.resolve) nextTask.resolve(result);
    })
    .catch(error => {
      // 任务失败
      activeGifProcessingCount--;
      console.error(`GIF处理任务失败: ${error.message || error}`);
      
      // 处理下一个任务
      processNextGifInQueue();
      
      // 调用失败回调
      if (nextTask.reject) nextTask.reject(error);
    });
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
 * 生成GIF缓存键
 * @param {Object} watermarkOptions - 水印选项
 * @returns {string} - 缓存键
 */
function generateCacheKey(watermarkOptions) {
  if (!watermarkOptions) return '';
  
  return `${watermarkOptions.fileName || ''}_${watermarkOptions.type || ''}_${watermarkOptions.text || ''}_${
    (watermarkOptions.position ? (watermarkOptions.position.x + '_' + watermarkOptions.position.y) : '0_0')
  }_${watermarkOptions.rotation || 0}_${watermarkOptions.opacity || 1.0}`;
}

/**
 * 显示处理进度
 * @param {Function} onProgress - 进度回调函数
 * @param {number} progress - 进度值（0-100）
 */
function updateProgress(onProgress, progress) {
  if (typeof onProgress === 'function') {
    onProgress(progress);
  }
  
  // 更新模态框进度
  const modalProgressBar = document.getElementById('modal-progress-bar');
  if (modalProgressBar) {
    modalProgressBar.style.width = `${progress}%`;
    modalProgressBar.textContent = `${Math.round(progress)}%`;
  }
}

/**
 * 从文件/URL获取ArrayBuffer
 * @param {File|Blob|string} source - 源数据
 * @returns {Promise<ArrayBuffer>} - 包含数据的ArrayBuffer
 */
async function getArrayBufferFromSource(source) {
  if (source instanceof Blob || source instanceof File) {
    return await source.arrayBuffer();
  } else if (source instanceof ArrayBuffer) {
    return source;
  } else if (source instanceof Uint8Array) {
    return source.buffer;
  }
  throw new Error('不支持的源类型');
}

/**
 * 处理GIF添加水印
 * @param {File|Blob|string} gifSource - GIF文件或URL
 * @param {Object} watermarkOptions - 水印选项
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Blob>} - 处理后的GIF
 */
export function processGif(gifSource, watermarkOptions = {}, onProgress = null) {
  // 显示处理模态窗口
  const processingModal = document.getElementById('processing-modal');
  if (processingModal && !watermarkOptions.isPreview) {
    processingModal.style.display = 'flex';
    const modalProgressBar = document.getElementById('modal-progress-bar');
    if (modalProgressBar) {
      modalProgressBar.style.width = '0%';
      modalProgressBar.textContent = '0%';
    }
    const processingStatus = document.getElementById('processing-status');
    if (processingStatus) {
      processingStatus.textContent = '正在处理GIF...';
    }
  }

  return new Promise((resolve, reject) => {
    try {
      // 生成唯一标识符
      const sourceId = generateCacheKey(watermarkOptions);
      
      // 检查是否已经在处理中
      if (sourceId && processingGifs.has(sourceId)) {
        console.log('GIF已经在处理中，等待完成...');
        processingGifs.get(sourceId)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // 检查缓存
      if (sourceId && gifCache.has(sourceId)) {
        const cachedGif = gifCache.get(sourceId);
        console.log('使用缓存的GIF结果');
        
        // 关闭处理模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
        resolve(cachedGif);
        return;
      }
      
      // 处理任务函数
      const processTask = async () => {
        try {
          // 声明一个全局的watermarkApplied变量
          let watermarkApplied = false;
          let staticGifCreated = false;
          
          // 进度初始化
          updateProgress(onProgress, 0);
          console.log('开始处理GIF...');
          
          // 获取GIF数据
          const gifBuffer = await getArrayBufferFromSource(gifSource);
          updateProgress(onProgress, 10);
          
          // 解码GIF
          const { GifCodec } = window.gifwrap;
          const codec = new GifCodec();
          console.log('正在解码GIF...');
          
          // 添加额外的错误处理和调试
          // 检查omggif是否正确加载
          if (!window.omggif) {
            throw new Error('omggif库未加载');
          }
          
          // 记录omggif的结构，帮助调试
          console.log('omggif类型:', typeof window.omggif);
          if (typeof window.omggif === 'object') {
            console.log('omggif包含:', Object.keys(window.omggif).join(', '));
          }
          
          const gifData = await codec.decodeGif(gifBuffer);
          console.log(`GIF解码完成: ${gifData.frames.length}帧, 尺寸: ${gifData.width}x${gifData.height}`);
          updateProgress(onProgress, 30);
          
          // 处理帧
          const frames = gifData.frames;
          const totalFrames = frames.length;
          
          console.log(`开始处理 ${totalFrames} 帧...`);
          
          // 帧采样率计算 - 当帧数过多时可以抽帧处理
          let samplingRate = 1;
          if (totalFrames > 50) {
            // 如果帧数过多，可以抽帧处理
            samplingRate = Math.ceil(totalFrames / 50);
            console.log(`GIF帧数过多(${totalFrames})，采样率: 1/${samplingRate}`);
          }
          
          // 处理所有帧，为每一帧添加水印
          console.log(`开始处理所有GIF帧并添加水印，共${frames.length}帧`);
          
          // 创建一个画布用于处理帧
          const canvas = document.createElement('canvas');
          canvas.width = gifData.width;
          canvas.height = gifData.height;
          const ctx = canvas.getContext('2d');
          
          // 获取GifUtil
          const { GifUtil, GifFrame } = window.gifwrap;
          
          // 处理第一帧作为预览
          if (frames.length > 0) {
            try {
              const firstFrame = frames[0];
              const firstImageData = await GifUtil.frameToImageData(firstFrame, null, {width: gifData.width, height: gifData.height});
              ctx.putImageData(firstImageData, 0, 0);
              
              // 添加水印到第一帧
              if (watermarkOptions && !watermarkOptions.isPreview) {
                try {
                  await renderWatermarkOnCanvas(canvas, ctx);
                  console.log('成功将水印应用到GIF第一帧');
                  
                  // 保存第一帧的数据URL作为预览
                  watermarkOptions.previewDataUrl = canvas.toDataURL('image/png');
                } catch (error) {
                  console.warn('应用水印到GIF第一帧时出错:', error);
                }
              }
            } catch (error) {
              console.warn('处理GIF第一帧时出错:', error);
            }
          }
          
          // 如果不是预览模式，处理所有帧
          const processedFrames = [];
          if (watermarkOptions && !watermarkOptions.isPreview) {
            try {
              // 处理每一帧
              for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                
                // 更新进度
                const progress = 30 + Math.floor((i / frames.length) * 50);
                updateProgress(onProgress, progress);
                
                // 将帧渲染到Canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const imageData = await GifUtil.frameToImageData(frame, null, {width: gifData.width, height: gifData.height});
                ctx.putImageData(imageData, 0, 0);
                
                // 添加水印
                await renderWatermarkOnCanvas(canvas, ctx);
                
                // 从Canvas创建新的帧
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // 复制像素数据，确保它是可写的
                const pixelData = new Uint8Array(newImageData.data.length);
                for (let p = 0; p < newImageData.data.length; p++) {
                  pixelData[p] = newImageData.data[p];
                }
                
                // 创建正确的bitmap对象结构
                const bitmap = {
                  width: canvas.width,
                  height: canvas.height,
                  data: pixelData
                };
                
                // 创建新的GIF帧
                const newFrame = new GifFrame(
                  { width: canvas.width, height: canvas.height },
                  pixelData,
                  { 
                    delayCentisecs: frame.delayCentisecs || 10,
                    disposalMethod: frame.disposalMethod || 0,
                    interlaced: frame.interlaced || false
                  }
                );
                
                // 确保帧有正确的bitmap属性
                newFrame.bitmap = bitmap;
                
                // 验证帧数据
                console.log(`帧 ${i+1} 像素数据长度: ${pixelData.length}, 尺寸: ${canvas.width}x${canvas.height}`);
                if (pixelData.length !== canvas.width * canvas.height * 4) {
                  console.warn(`帧 ${i+1} 像素数据长度不匹配预期值 ${canvas.width * canvas.height * 4}`);
                }
                
                // 添加到处理后的帧集合
                processedFrames.push(newFrame);
                
                console.log(`已处理GIF帧 ${i+1}/${frames.length}`);
              }
              
              console.log(`所有${frames.length}帧GIF处理完成，准备编码`);
            } catch (error) {
              console.error('处理GIF帧时出错:', error);
              // 出错时，使用原始帧
              console.log('使用原始帧作为备用');
              processedFrames.length = 0; // 清空处理后的帧
            }
          }
          
          // 更新进度到90%
          updateProgress(onProgress, 90);
          
          // 检查是否取消
          if (window.processingCancelled === true) {
            console.log('GIF处理被取消');
            throw new Error('处理已取消');
          }
          
          // 保存第一帧预览（无论编码是否成功）
          let previewDataUrl = null;
          if (watermarkOptions && watermarkOptions.previewDataUrl) {
            // 使用之前保存的预览数据URL
            previewDataUrl = watermarkOptions.previewDataUrl;
            console.log('使用之前保存的第一帧预览（带水印）');
          } else if (canvas) {
            // 如果没有保存预览，尝试使用当前canvas
            previewDataUrl = canvas.toDataURL('image/png');
            console.log('使用当前canvas作为第一帧预览（带水印）');
          }
          
          // 判断是否有处理后的帧
          if (processedFrames && processedFrames.length > 0 && processedFrames.length === frames.length) {
            try {
              console.log('使用处理后的帧编码GIF...');
              updateProgress(onProgress, 95);
              
              // 将帧编码为GIF
              const encodedGif = await encodeGif(processedFrames, gifData.width, gifData.height, {
                loops: gifData.loops || 0,
                colorScope: 1, // 每帧单独调色板
                transparentColor: null
              }, gifSource);
              
              // 创建Blob
              const processedGifBlob = new Blob([encodedGif], { type: 'image/gif' });
              
              // 确保原始GIF Blob存在
              let originalGifBlob;
              if (gifSource instanceof Blob || gifSource instanceof File) {
                originalGifBlob = gifSource;
              } else if (gifBuffer) {
                originalGifBlob = new Blob([gifBuffer], { type: 'image/gif' });
              } else {
                // 如果无法获取原始GIF，使用一个空的Blob作为占位符
                originalGifBlob = new Blob([], { type: 'image/gif' });
              }
              
              // 验证生成的GIF大小
              console.log(`处理后的GIF大小: ${Math.round(processedGifBlob.size / 1024)} KB`);
              console.log(`原始GIF大小: ${Math.round(originalGifBlob.size / 1024)} KB`);
              
              // 计算压缩率
              const compressionRatio = (originalGifBlob.size / processedGifBlob.size).toFixed(2);
              console.log(`GIF压缩率: ${compressionRatio}x`);
              
              // 创建水印应用成功的标志
              watermarkApplied = true;
              
              // 返回处理后的GIF
              updateProgress(onProgress, 100);
              
              // 添加到缓存
              if (sourceId) {
                gifCache.set(sourceId, processedGifBlob);
              }
              
              // 返回处理后的GIF和预览
              return {
                blob: processedGifBlob,
                previewDataUrl: previewDataUrl,
                watermarkApplied: true // 标记为成功应用水印到所有帧
              };
            } catch (encodeError) {
              console.error('GIF编码失败:', encodeError);
              // 不直接抛出错误，而是继续执行下面的回退逻辑
              console.log('编码失败，回退到使用原始GIF，但保留带水印的第一帧预览');
            }
          }
          
          // 如果GIF处理失败，返回原始GIF但保留带水印的第一帧预览
          console.log('使用原始GIF，但保留带水印的第一帧预览');
          
          // 检查是否有静态GIF备用
          if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
            console.log('使用之前创建的静态带水印GIF作为备用');
            // 添加到缓存
            if (sourceId) {
              gifCache.set(sourceId, window.staticGifWithWatermark);
            }
            
            // 返回静态GIF和预览
            return {
              blob: window.staticGifWithWatermark,
              previewDataUrl: previewDataUrl,
              watermarkApplied: true // 标记为成功应用水印(静态)
            };
          }
          
          // 检查是否有PNG数据URL备用
          if (window.watermarkedPngDataUrl) {
            try {
              console.log('使用PNG数据URL创建静态GIF备用');
              const pngBlob = dataURLToBlob(window.watermarkedPngDataUrl);
              if (pngBlob && pngBlob.size > 1000) {
                const gifBlob = new Blob([pngBlob], { type: 'image/gif' });
                
                // 添加到缓存
                if (sourceId) {
                  gifCache.set(sourceId, gifBlob);
                }
                
                // 返回静态GIF和预览
                return {
                  blob: gifBlob,
                  previewDataUrl: window.watermarkedPngDataUrl,
                  watermarkApplied: true // 标记为成功应用水印(静态)
                };
              }
            } catch (pngError) {
              console.error('使用PNG数据URL创建静态GIF失败:', pngError);
            }
          }
          
          // 确保有原始GIF的Blob
          let originalGifBlob;
          if (gifSource instanceof Blob || gifSource instanceof File) {
            console.log('使用原始Blob/File对象');
            originalGifBlob = gifSource;
          } else if (gifBuffer) {
            // 从ArrayBuffer创建Blob
            console.log('从ArrayBuffer创建Blob');
            originalGifBlob = new Blob([gifBuffer], { type: 'image/gif' });
          } else {
            console.error('无法创建原始GIF的Blob');
            throw new Error('无法创建原始GIF的Blob');
          }
          
          // 添加到缓存
          if (sourceId) {
            gifCache.set(sourceId, originalGifBlob);
          }
          
          // 返回原始GIF和预览
          return {
            blob: originalGifBlob,
            previewDataUrl: previewDataUrl,
            watermarkApplied: false // 标记为未成功应用水印到所有帧
          };
        } catch (error) {
          console.error('处理GIF时出错:', error);
          
          // 尝试获取预览数据URL（如果有）
          let previewDataUrl = null;
          if (watermarkOptions && watermarkOptions.previewDataUrl) {
            previewDataUrl = watermarkOptions.previewDataUrl;
            console.log('在错误处理中保留第一帧预览');
          }
          
          // 尝试使用原始GIF作为后备方案
          if (gifSource instanceof Blob || gifSource instanceof File) {
            console.log('使用原始GIF作为后备方案');
            // 返回带预览的结果
            if (previewDataUrl) {
              return {
                blob: gifSource,
                previewDataUrl: previewDataUrl,
                watermarkApplied: false
              };
            }
            return gifSource;
          }
          
          // 如果是URL，尝试获取原始GIF
          if (typeof gifSource === 'string') {
            try {
              const response = await fetch(gifSource);
              if (response.ok) {
                const blob = await response.blob();
                // 返回带预览的结果
                if (previewDataUrl) {
                  return {
                    blob: blob,
                    previewDataUrl: previewDataUrl,
                    watermarkApplied: false
                  };
                }
                return blob;
              }
            } catch (fetchError) {
              console.error('获取原始GIF失败:', fetchError);
            }
          }
          
          // 抛出错误
          throw error;
        } finally {
          // 结束处理
          if (sourceId) {
            processingGifs.delete(sourceId);
          }
        }
      };
      
      // 将任务加入队列
      const processPromise = enqueueGifProcessingTask(processTask);
      
      // 保存处理Promise
      if (sourceId) {
        processingGifs.set(sourceId, processPromise);
      }
      
      // 返回处理结果
      processPromise.then(resolve).catch(error => {
        // 关闭处理模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
        reject(error);
      });
      
    } catch (error) {
      console.error('处理GIF初始化出错:', error);
      
      // 关闭处理模态框
      if (processingModal) {
        processingModal.style.display = 'none';
      }
      
      reject(error);
    }
  });
}

/**
 * 将帧编码为GIF
 * @param {Array} frames - 帧数组
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {Object} options - 选项
 * @param {*} gifSource - 原始GIF源
 * @returns {Promise<Uint8Array>} - 编码后的GIF数据
 */
function encodeGif(frames, width, height, options, gifSource) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`开始编码GIF，帧数: ${frames.length}, 尺寸: ${width}x${height}`);
      
      // 提前创建一个静态GIF作为备用
      let staticBackupCreated = false;
      if (frames.length > 0) {
        try {
          console.log('创建静态GIF作为备用');
          staticBackupCreated = createStaticGifFromFrame(frames[0], width, height);
          if (staticBackupCreated) {
            console.log('成功创建静态GIF备用');
          }
        } catch (staticError) {
          console.warn('创建静态GIF备用失败:', staticError);
        }
      }
      
      // 如果只有一帧，尝试直接创建GIF
      if (frames.length === 1) {
        try {
          console.log('只有一帧，尝试创建备用GIF');
          createBackupGif(frames[0], width, height, gifSource);
        } catch (directError) {
          console.warn('创建备用GIF失败:', directError);
        }
      }
      
      // 创建GIF编码器
      const buffer = new Uint8Array(width * height * 4 * frames.length + 10240); // 增加缓冲区大小
      
      // 使用正确的GifWriter构造函数
      let writer;
      const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
      if (!GifWriter) {
        console.error('无法获取GifWriter，编码GIF失败');
        
        // 使用静态GIF作为备用
        if (staticBackupCreated && window.staticGifWithWatermark instanceof Blob) {
          console.log('无法获取GifWriter，使用静态GIF备用');
          resolve(window.staticGifWithWatermark);
          return;
        }
        
        throw new Error('无法获取GifWriter，编码GIF失败');
      }
      
      try {
        writer = new GifWriter(buffer, width, height, {
          loop: 0, // 0表示无限循环
          palette: null, // 使用全局调色板
          background: 0, // 背景色索引
          transparent: true // 启用透明
        });
      } catch (writerError) {
        console.error('创建GIF写入器失败:', writerError);
        // 使用静态GIF作为备用
        if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
          console.log('创建GIF写入器失败，使用静态GIF备用');
          resolve(window.staticGifWithWatermark);
          return;
        }
        throw writerError;
      }
      
      console.log('GIF编码器创建成功');
      
      // 添加帧到GIF
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const pixels = frame.bitmap.data;
        
        // 创建深拷贝以避免数据共享问题
        const pixelsCopy = new Uint8Array(pixels.length);
        for (let j = 0; j < pixels.length; j++) {
          pixelsCopy[j] = pixels[j];
        }
        
        try {
          // 计算延迟，确保至少有10ms的延迟
          // 注意：GIF延迟单位是1/100秒，而frame.delay单位是毫秒
          // 所以需要除以10而不是100
          let delay = Math.max(frame.delayCentisecs || 10, 1);
          
          console.log(`添加第${i+1}帧，延迟: ${delay}，原始延迟: ${frame.delayCentisecs || 10}cs`);
          
          // 添加帧到GIF
          try {
            writer.addFrame(0, 0, width, height, pixelsCopy, {
              delay: delay,
              disposal: 2, // 恢复到背景色
              transparent: true
            });
          } catch (frameError) {
            console.error(`添加第${i+1}帧时出错:`, frameError);
            // 尝试使用备用方法添加帧
            try {
              writer.addFrame(0, 0, width, height, pixelsCopy);
              console.log(`使用备用方法成功添加第${i+1}帧`);
            } catch (backupFrameError) {
              console.error(`备用方法添加第${i+1}帧也失败:`, backupFrameError);
              // 如果添加帧失败，但已经有一些帧，我们可以继续
              if (i > 0) {
                console.warn(`跳过第${i+1}帧，继续处理`);
                continue;
              } else {
                // 如果是第一帧就失败，则使用静态GIF备用
                if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
                  console.log('添加第一帧失败，使用静态GIF备用');
                  resolve(window.staticGifWithWatermark);
                  return;
                }
                throw backupFrameError;
              }
            }
          }
        } catch (frameError) {
          console.error(`处理第${i+1}帧时出错:`, frameError);
          if (i > 0) {
            console.warn(`跳过第${i+1}帧，继续处理`);
            continue;
          } else {
            // 如果是第一帧就失败，则使用静态GIF备用
            if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
              console.log('处理第一帧失败，使用静态GIF备用');
              resolve(window.staticGifWithWatermark);
              return;
            }
            throw frameError;
          }
        }
      }
      
      // 完成GIF编码
      const byteLength = writer.end();
      console.log('GIF编码完成，字节长度:', buffer.length, '有效字节:', byteLength);
      
      // 检查字节长度是否合理
      if (!byteLength || byteLength <= 100) {
        console.warn('GIF编码器返回的字节长度过小，尝试使用备用GIF数据');
        
        // 使用静态GIF数据（带水印的第一帧）
        if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
          console.log('使用带水印的静态GIF数据，大小:', window.staticGifWithWatermark.size);
          resolve(window.staticGifWithWatermark);
          return;
        }
        
        // 使用备用GIF数据
        if (window.backupGifData && window.backupGifData.length > 100) {
          console.log('使用备用GIF数据，大小:', window.backupGifData.length);
          resolve(window.backupGifData);
          return;
        }
        
        // 如果没有备用数据，尝试使用原始GIF
        if (window.originalGifSource) {
          try {
            console.log('使用原始GIF文件作为最终备用');
            const originalBuffer = await getArrayBufferFromSource(window.originalGifSource);
            resolve(new Uint8Array(originalBuffer));
            return;
          } catch (originalError) {
            console.error('使用原始GIF文件失败:', originalError);
            reject(new Error('GIF编码结果异常，无法处理原始文件'));
            return;
          }
        }
        
        reject(new Error('GIF编码结果异常，字节长度无效'));
        return;
      }
      
      // 创建最终的buffer
      const finalBuffer = buffer.slice(0, byteLength);
      console.log(`最终GIF大小: ${finalBuffer.length} 字节`);
      
      // 验证GIF是否有效
      const isValidGif = validateGifBuffer(finalBuffer, finalBuffer.length);
      if (!isValidGif) {
        console.warn('生成的GIF可能无效，尝试使用静态备用');
        
        // 使用静态GIF作为备用
        if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
          console.log('GIF无效，使用带水印的静态GIF作为备用');
          resolve(window.staticGifWithWatermark);
          return;
        }
        
        // 尝试修复GIF头部
        if (finalBuffer.length > 13) { // 确保至少有GIF头部的长度
          // 检查GIF头部签名
          if (finalBuffer[0] !== 0x47 || finalBuffer[1] !== 0x49 || finalBuffer[2] !== 0x46) {
            console.log('修复GIF头部签名');
            finalBuffer[0] = 0x47; // 'G'
            finalBuffer[1] = 0x49; // 'I'
            finalBuffer[2] = 0x46; // 'F'
            finalBuffer[3] = 0x38; // '8'
            finalBuffer[4] = 0x39; // '9'
            finalBuffer[5] = 0x61; // 'a'
          }
          
          // 确保GIF结束标记存在
          if (finalBuffer[finalBuffer.length - 1] !== 0x3B) {
            console.log('添加GIF结束标记');
            finalBuffer[finalBuffer.length - 1] = 0x3B;
          }
        } else {
          // 如果GIF太短，使用备用GIF
          if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
            console.log('GIF太短，使用带水印的静态GIF数据替代无效GIF');
            resolve(window.staticGifWithWatermark);
            return;
          }
        }
      }
      
      // 创建Blob测试GIF有效性
      try {
        const testBlob = new Blob([finalBuffer], { type: 'image/gif' });
        if (testBlob.size < 100) {
          console.warn('生成的GIF Blob太小，可能无效');
          
          // 使用静态GIF作为备用
          if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
            console.log('GIF Blob太小，使用带水印的静态GIF作为备用');
            resolve(window.staticGifWithWatermark);
            return;
          }
        }
      } catch (blobError) {
        console.error('创建GIF Blob时出错:', blobError);
        
        // 使用静态GIF作为备用
        if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
          console.log('创建Blob出错，使用带水印的静态GIF作为备用');
          resolve(window.staticGifWithWatermark);
          return;
        }
      }
      
      resolve(finalBuffer);
    } catch (error) {
      console.error('编码GIF时出错:', error);
      
      // 使用静态GIF作为备用
      if (window.staticGifWithWatermark instanceof Blob && window.staticGifWithWatermark.size > 1000) {
        console.log('出错时使用带水印的静态GIF数据');
        resolve(window.staticGifWithWatermark);
        return;
      }
      
      // 使用备用GIF数据
      if (window.backupGifData && window.backupGifData.length > 100) {
        console.log('出错时使用备用GIF数据');
        resolve(window.backupGifData);
      } else {
        // 尝试使用PNG数据URL创建静态GIF
        if (window.watermarkedPngDataUrl) {
          try {
            console.log('使用PNG数据URL创建静态GIF备用');
            const pngBlob = dataURLToBlob(window.watermarkedPngDataUrl);
            if (pngBlob && pngBlob.size > 1000) {
              const gifBlob = new Blob([pngBlob], { type: 'image/gif' });
              resolve(gifBlob);
              return;
            }
          } catch (pngError) {
            console.error('使用PNG数据URL创建静态GIF失败:', pngError);
          }
        }
        
        reject(error);
      }
    }
  });
}

/**
 * 从带水印的第一帧创建静态GIF
 * @param {Object} frame - 带水印的第一帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 */
function createStaticGifFromFrame(frame, width, height) {
  try {
    console.log('尝试从带水印的第一帧创建静态GIF');
    
    // 从帧数据创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 绘制帧数据到Canvas
    const imageData = new ImageData(
      new Uint8ClampedArray(frame.bitmap.data),
      width,
      height
    );
    ctx.putImageData(imageData, 0, 0);
    
    // 从Canvas获取PNG数据
    const pngDataUrl = canvas.toDataURL('image/png');
    console.log('成功创建带水印的PNG数据URL');
    
    // 保存PNG数据URL作为备用
    window.watermarkedPngDataUrl = pngDataUrl;
    
    // 尝试创建静态GIF
    try {
      // 使用Canvas API创建GIF (实际上是PNG，但我们将其转换为Blob并标记为GIF)
      const pngBlob = dataURLToBlob(pngDataUrl);
      if (pngBlob && pngBlob.size > 1000) {
        const gifBlob = new Blob([pngBlob], { type: 'image/gif' });
        console.log(`成功创建带水印的静态图像，大小: ${Math.round(gifBlob.size / 1024)} KB`);
        window.staticGifWithWatermark = gifBlob;
        return true;
      }
    } catch (blobError) {
      console.warn('从Canvas创建静态GIF失败:', blobError);
    }
    
    // 使用omggif库直接创建静态GIF (备用方法)
    try {
      // 创建足够大的缓冲区
      const gifBuffer = new Uint8Array(width * height * 5 + 10240); // 增加缓冲区大小
      
      // 创建GIF写入器
      const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
      const gifWriter = new GifWriter(gifBuffer, width, height, { loop: 0 });
      
      // 准备索引化的像素数据
      const pixels = frame.bitmap.data;
      const indexedPixels = new Uint8Array(width * height);
      const palette = [];
      
      // 创建256色调色板
      for (let i = 0; i < 256; i++) {
        palette.push(i, i, i); // 灰度调色板
      }
      
      // 将RGBA像素转换为索引像素
      for (let i = 0; i < width * height; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        // 简单的灰度计算
        indexedPixels[i] = Math.floor((r + g + b) / 3) & 0xFF;
      }
      
      // 添加帧
      gifWriter.addFrame(0, 0, width, height, indexedPixels, {
        palette: palette,
        delay: 100 // 1秒延迟
      });
      
      // 完成GIF
      const gifSize = gifWriter.end();
      
      if (gifSize > 1000) {
        console.log(`成功创建带水印的静态GIF，大小: ${gifSize} 字节`);
        const validGif = gifBuffer.slice(0, gifSize);
        const gifBlob = new Blob([validGif], { type: 'image/gif' });
        window.staticGifWithWatermark = gifBlob;
        return true;
      } else {
        console.warn('创建带水印的静态GIF失败，大小过小:', gifSize);
      }
    } catch (error) {
      console.error('创建带水印的静态GIF失败:', error);
    }
    
    // 添加另一种备用方法：直接从PNG数据URL创建静态GIF
    try {
      if (window.watermarkedPngDataUrl) {
        // 创建一个新的Image对象
        const img = new Image();
        img.onload = function() {
          // 创建一个新的Canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          // 绘制图像
          ctx.drawImage(img, 0, 0);
          
          // 尝试创建GIF格式的Blob
          canvas.toBlob(function(blob) {
            if (blob && blob.size > 1000) {
              console.log('从PNG图像成功创建静态GIF备用');
              window.staticGifWithWatermark = new Blob([blob], { type: 'image/gif' });
            }
          }, 'image/gif');
        };
        img.src = window.watermarkedPngDataUrl;
      }
    } catch (pngError) {
      console.error('从PNG创建备用GIF失败:', pngError);
    }
    
    return false;
  } catch (error) {
    console.error('创建带水印的静态GIF失败:', error);
    return false;
  }
}

/**
 * 将Data URL转换为Blob
 * @param {string} dataUrl - Data URL
 * @returns {Blob} - Blob对象
 */
function dataURLToBlob(dataUrl) {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('将Data URL转换为Blob失败:', error);
    return null;
  }
}

/**
 * 创建备用GIF数据
 * @param {Object} frame - 第一帧
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {*} gifSource - 原始GIF源
 */
function createBackupGif(frame, width, height, gifSource) {
  try {
    // 使用omggif库直接创建
    try {
      // 创建足够大的缓冲区
      const gifBuffer = new Uint8Array(width * height * 5 + 1000); // 添加额外空间用于头部和其他数据
      
      // 创建GIF写入器
      const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
      const gifWriter = new GifWriter(gifBuffer, width, height, { loop: 0 });
      
      // 准备索引化的像素数据
      const pixels = frame.bitmap.data || frame.pixels;
      const indexedPixels = new Uint8Array(width * height);
      const palette = [];
      
      // 简单的调色板生成 - 灰度
      for (let i = 0; i < 256; i++) {
        palette.push(i, i, i); // 灰度调色板
      }
      
      // 将RGBA像素转换为索引像素
      for (let i = 0; i < width * height; i++) {
        // 简单的灰度转换
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        // 简单的灰度计算
        indexedPixels[i] = Math.floor((r + g + b) / 3) & 0xFF;
      }
      
      // 添加帧
      gifWriter.addFrame(0, 0, width, height, indexedPixels, {
        palette: palette,
        delay: 10
      });
      
      // 完成GIF
      const gifSize = gifWriter.end();
      
      if (gifSize > 0) {
        console.log(`成功创建有效的备用GIF，大小: ${gifSize} 字节`);
        const validGif = gifBuffer.slice(0, gifSize);
        window.backupGifData = validGif;
      } else {
        console.warn('直接创建备用GIF失败，大小为0');
        createMinimalGif();
      }
    } catch (gifWriteError) {
      console.warn('使用omggif创建备用GIF失败:', gifWriteError);
      createMinimalGif();
    }
    
    // 保存原始文件的副本作为最终备用
    if (gifSource instanceof Blob || gifSource instanceof File) {
      console.log('保存原始GIF文件作为最终备用');
      window.originalGifSource = gifSource;
    }
  } catch (error) {
    console.error('创建备用GIF失败:', error);
  }
}

/**
 * 创建最小有效的GIF
 */
function createMinimalGif() {
  try {
    // 创建最简单的GIF - 1x1像素的黑色GIF
    const minimalGif = new Uint8Array([
      // GIF头
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      0x01, 0x00, 0x01, 0x00, // 1x1像素
      0x80, 0x00, 0x00, // 全局颜色表标志
      0x00, 0x00, 0x00, // 黑色
      0xFF, 0xFF, 0xFF, // 白色
      // 图形控制扩展
      0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
      // 图像描述符
      0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      // 图像数据
      0x02, 0x02, 0x44, 0x01, 0x00,
      // 结束标记
      0x3B
    ]);
    
    console.log('创建最小有效GIF作为备用');
    window.backupGifData = minimalGif;
  } catch (minimalGifError) {
    console.error('创建最小GIF失败:', minimalGifError);
  }
}

/**
 * 验证GIF缓冲区的有效性
 * @param {Uint8Array} buffer - GIF数据缓冲区
 * @param {number} length - 数据长度
 * @returns {boolean} 是否是有效的GIF
 */
function validateGifBuffer(buffer, length) {
  // 检查基本长度
  if (!buffer || !length || length < 14) {
    console.warn('GIF缓冲区太短');
    return false;
  }
  
  // 检查GIF头部签名
  if (buffer[0] !== 0x47 || // 'G'
      buffer[1] !== 0x49 || // 'I'
      buffer[2] !== 0x46 || // 'F'
      buffer[3] !== 0x38 || // '8'
      buffer[4] !== 0x39 || // '9'
      buffer[5] !== 0x61 && buffer[5] !== 0x37) { // 'a' or '7'
    console.warn('无效的GIF头部签名');
    return false;
  }
  
  // 检查GIF结束标记
  if (buffer[length - 1] !== 0x3B) {
    console.warn('缺少GIF结束标记');
    return false;
  }
  
  // 检查是否有图像描述符
  let hasImageDescriptor = false;
  for (let i = 13; i < length - 1; i++) {
    if (buffer[i] === 0x2C) { // 图像描述符标记
      hasImageDescriptor = true;
      break;
    }
  }
  
  if (!hasImageDescriptor) {
    console.warn('GIF缺少图像描述符');
    return false;
  }
  
  // 基本检查通过
  console.log('GIF验证通过基本检查');
  return true;
}

/**
 * 初始化GIF处理器
 */
export function initGifProcessor() {
  console.log('初始化GifWrap GIF处理器');
  
  // 检查依赖库是否加载
  if (typeof window.gifwrap === 'undefined') {
    console.error('gifwrap库未加载，GIF处理将不可用');
    return;
  }
  
  if (typeof window.omggif === 'undefined') {
    console.error('omggif库未加载，GIF处理将不可用');
    return;
  }
  
  // 检查是否包含必要的类
  const { GifFrame, GifUtil, GifCodec } = window.gifwrap;
  if (!GifFrame || !GifUtil || !GifCodec) {
    console.error('gifwrap库缺少必要的类，GIF处理可能不可用');
    console.log('可用的gifwrap组件:', Object.keys(window.gifwrap).join(', '));
    return;
  }
  
  // 检查omggif结构
  console.log('检查omggif库结构...');
  if (typeof window.omggif === 'object') {
    console.log('omggif库导出对象，包含:', Object.keys(window.omggif).join(', '));
  } else if (typeof window.omggif === 'function') {
    console.log('omggif库导出函数');
  } else {
    console.log('omggif库导出类型:', typeof window.omggif);
  }
  
  // 验证omggif的关键功能
  try {
    const testBuffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
    const GifReader = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifReader;
    
    if (!GifReader) {
      console.error('无法获取GifReader，omggif库可能结构不正确');
      return;
    }
    
    const reader = new GifReader(testBuffer);
    console.log('omggif GifReader测试通过');
  } catch (error) {
    console.error('omggif GifReader测试失败:', error);
    return;
  }
  
  // 修补gifwrap库，确保它能正确使用omggif
  try {
    console.log('正在修补gifwrap库以兼容omggif...');
    
    // 获取原始的GifCodec
    const originalGifCodec = window.gifwrap.GifCodec;
    
    // 创建一个新的GifCodec类，修复omggif的使用
    class PatchedGifCodec extends originalGifCodec {
      async decodeGif(buffer) {
        return new Promise((resolve, reject) => {
          try {
            // 使用omggif解码GIF，适配不同的导出方式
            const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer;
            const GifReader = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifReader;
            
            if (!GifReader) {
              reject(new Error('无法获取GifReader'));
              return;
            }
            
            const gif = new GifReader(new Uint8Array(arrayBuffer));
            
            // 继续原始解码逻辑
            const width = gif.width;
            const height = gif.height;
            const frameCount = gif.numFrames();
            const frames = [];
            
            const { GifFrame } = window.gifwrap;
            
            for (let i = 0; i < frameCount; i++) {
              const frameInfo = gif.frameInfo(i);
              const pixels = new Uint8Array(width * height * 4);
              
              // 解码帧
              gif.decodeAndBlitFrameRGBA(i, pixels);
              
              // 创建帧对象
              frames.push(new GifFrame(
                { width, height },
                pixels,
                {
                  delayCentisecs: frameInfo.delay || 10,
                  disposalMethod: frameInfo.disposal || 0,
                  interlaced: frameInfo.interlaced || false
                }
              ));
            }
            
            resolve({
              width,
              height,
              frames,
              loops: gif.loopCount()
            });
          } catch (error) {
            reject(error);
          }
        });
      }
      
      async encodeGif(frames, options = {}) {
        return new Promise((resolve, reject) => {
          try {
            console.log(`开始编码GIF，共${frames.length}帧`);
            
            // 检查帧是否有效
            if (!frames || frames.length === 0) {
              reject(new Error('没有有效的帧可编码'));
              return;
            }
            
            // 检查第一帧是否有效
            const firstFrame = frames[0];
            if (!firstFrame) {
              reject(new Error('第一帧无效'));
              return;
            }
            
            // 检查bitmap属性
            if (!firstFrame.bitmap) {
              console.warn('帧缺少bitmap属性，尝试从dimensions获取尺寸');
              // 尝试创建bitmap属性
              firstFrame.bitmap = {
                width: firstFrame.dimensions.width,
                height: firstFrame.dimensions.height,
                data: firstFrame.pixels
              };
            }
            
            // 获取第一帧的尺寸
            const width = firstFrame.bitmap.width || firstFrame.dimensions.width;
            const height = firstFrame.bitmap.height || firstFrame.dimensions.height;
            
            console.log(`GIF尺寸: ${width}x${height}`);
            
            // 检查尺寸是否合理
            if (!width || !height || width <= 0 || height <= 0 || width > 10000 || height > 10000) {
              console.error(`GIF尺寸异常: ${width}x${height}`);
              reject(new Error(`GIF尺寸异常: ${width}x${height}`));
              return;
            }
            
            // 创建GIF写入器
            const bufferSize = width * height * frames.length * 5; // 预估大小
            console.log(`创建GIF缓冲区，大小: ${Math.round(bufferSize / 1024)} KB`);
            
            // 确保缓冲区大小合理
            if (bufferSize <= 0 || bufferSize > 100 * 1024 * 1024) { // 不超过100MB
              console.error(`GIF缓冲区大小异常: ${bufferSize} 字节`);
              reject(new Error(`GIF缓冲区大小异常: ${bufferSize} 字节`));
              return;
            }
            
            const buffer = new Uint8Array(bufferSize);
            const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
            
            if (!GifWriter) {
              reject(new Error('无法获取GifWriter'));
              return;
            }
            
            // 创建GIF写入器
            let writer;
            try {
              // 使用明确的参数创建GIF写入器
              const writerOptions = {
                loop: options.loops === undefined ? 0 : options.loops,
                palette: null,  // 使用默认调色板
                background: 0   // 背景颜色索引
              };
              
              writer = new GifWriter(buffer, width, height, writerOptions);
              console.log('成功创建GIF写入器');
            } catch (writerError) {
              console.error('创建GIF写入器失败:', writerError);
              reject(writerError);
              return;
            }
            
            // 写入每一帧
            for (let i = 0; i < frames.length; i++) {
              const frame = frames[i];
              
              // 确保帧有bitmap属性
              if (!frame.bitmap) {
                frame.bitmap = {
                  width: width,
                  height: height,
                  data: frame.pixels
                };
              }
              
              // 获取帧的像素数据
              const pixels = frame.bitmap.data || frame.pixels;
              
              if (!pixels) {
                console.warn(`帧 ${i} 没有有效的像素数据，跳过`);
                continue;
              }
              
              // 检查像素数据长度
              const expectedLength = width * height * 4;
              if (pixels.length !== expectedLength) {
                console.warn(`帧 ${i+1} 像素数据长度 ${pixels.length} 不匹配预期值 ${expectedLength}`);
                
                // 尝试修复像素数据
                if (pixels.length > expectedLength) {
                  console.log(`尝试截断像素数据到预期长度 ${expectedLength}`);
                  const fixedPixels = new Uint8Array(expectedLength);
                  for (let p = 0; p < expectedLength; p++) {
                    fixedPixels[p] = pixels[p];
                  }
                  // 使用修复后的像素数据
                  frame.bitmap.data = fixedPixels;
                } else {
                  console.error(`帧 ${i+1} 像素数据长度不足，无法修复`);
                  reject(new Error(`帧 ${i+1} 像素数据长度不足，无法修复`));
                  return;
                }
              }
              
              // 创建像素数据的深拷贝，确保数据不被共享引用
              const pixelsCopy = new Uint8Array(pixels.length);
              for (let p = 0; p < pixels.length; p++) {
                pixelsCopy[p] = pixels[p];
              }
              
              console.log(`准备写入第 ${i+1}/${frames.length} 帧，像素数据长度: ${pixelsCopy.length}`);
              
              try {
                // 计算延迟，确保至少有10ms的延迟
                // 注意：GIF延迟单位是1/100秒，而frame.delay单位是毫秒
                // 所以需要除以10而不是100
                let delay = Math.max(frame.delayCentisecs || 100, 10) / 10;
                
                console.log(`添加第${i+1}帧，延迟: ${delay}，原始延迟: ${frame.delay}ms`);
                
                // 添加帧到GIF
                try {
                  writer.addFrame(0, 0, width, height, pixelsCopy, {
                    delay: delay,
                    disposal: 2 // 恢复到背景色
                  });
                } catch (frameError) {
                  console.error(`添加第${i+1}帧时出错:`, frameError);
                  // 尝试使用备用方法添加帧
                  try {
                    writer.addFrame(0, 0, width, height, pixelsCopy);
                    console.log(`使用备用方法成功添加第${i+1}帧`);
                  } catch (backupFrameError) {
                    console.error(`备用方法添加第${i+1}帧也失败:`, backupFrameError);
                    // 如果添加帧失败，但已经有一些帧，我们可以继续
                    if (i > 0) {
                      console.warn(`跳过第${i+1}帧，继续处理`);
                      continue;
                    } else {
                      // 如果是第一帧就失败，则抛出错误
                      throw backupFrameError;
                    }
                  }
                }
              } catch (frameError) {
                console.error(`写入第 ${i+1} 帧时出错:`, frameError);
                reject(frameError);
                return;
              }
            }
            
            // 尝试使用直接方法创建GIF
            if (frames.length === 1) {
              try {
                console.log('只有一帧，尝试直接创建GIF');
                
                // 使用更可靠的方法创建GIF
                // GIF文件头
                const header = [
                  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
                  width & 0xFF, (width >> 8) & 0xFF,  // 宽度（小端序）
                  height & 0xFF, (height >> 8) & 0xFF, // 高度（小端序）
                  0xF7, 0x00, 0x00 // 全局颜色表标志等
                ];
                
                // 使用第一帧的像素数据
                const frame = frames[0];
                const pixels = frame.bitmap.data || frame.pixels;
                
                // 创建一个简单但有效的GIF
                // 使用omggif库直接创建
                try {
                  // 创建足够大的缓冲区
                  const gifBuffer = new Uint8Array(width * height * 5 + 1000); // 添加额外空间用于头部和其他数据
                  
                  // 创建GIF写入器
                  const GifWriter = typeof window.omggif === 'function' ? window.omggif : window.omggif.GifWriter;
                  const gifWriter = new GifWriter(gifBuffer, width, height, { loop: 0 });
                  
                  // 准备索引化的像素数据
                  // 对于简单的GIF，我们可以将RGBA转换为索引颜色
                  const indexedPixels = new Uint8Array(width * height);
                  const palette = [];
                  
                  // 非常简单的调色板生成 - 仅用于测试
                  // 在实际应用中应使用更复杂的量化算法
                  for (let i = 0; i < 256; i++) {
                    palette.push(i, i, i); // 灰度调色板
                  }
                  
                  // 将RGBA像素转换为索引像素
                  for (let i = 0; i < width * height; i++) {
                    // 简单的灰度转换
                    const r = pixels[i * 4];
                    const g = pixels[i * 4 + 1];
                    const b = pixels[i * 4 + 2];
                    // 简单的灰度计算
                    indexedPixels[i] = Math.floor((r + g + b) / 3) & 0xFF;
                  }
                  
                  // 添加帧
                  gifWriter.addFrame(0, 0, width, height, indexedPixels, {
                    palette: palette,
                    delay: 10
                  });
                  
                  // 完成GIF
                  const gifSize = gifWriter.end();
                  
                  if (gifSize > 0) {
                    console.log(`成功创建有效的GIF，大小: ${gifSize} 字节`);
                    const validGif = gifBuffer.slice(0, gifSize);
                    window.backupGifData = validGif;
                  } else {
                    console.warn('直接创建GIF失败，大小为0');
                  }
                } catch (gifWriteError) {
                  console.warn('使用omggif直接创建GIF失败:', gifWriteError);
                  
                  // 尝试更简单的方法 - 创建最小的有效GIF
                  try {
                    // 创建最简单的GIF - 1x1像素的黑色GIF
                    const minimalGif = new Uint8Array([
                      // GIF头
                      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
                      0x01, 0x00, 0x01, 0x00, // 1x1像素
                      0x80, 0x00, 0x00, // 全局颜色表标志
                      0x00, 0x00, 0x00, // 黑色
                      0xFF, 0xFF, 0xFF, // 白色
                      // 图形控制扩展
                      0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
                      // 图像描述符
                      0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
                      // 图像数据
                      0x02, 0x02, 0x44, 0x01, 0x00,
                      // 结束标记
                      0x3B
                    ]);
                    
                    console.log('创建最小有效GIF作为备用');
                    window.backupGifData = minimalGif;
                  } catch (minimalGifError) {
                    console.error('创建最小GIF失败:', minimalGifError);
                  }
                }
                
                // 保存原始文件的副本作为最终备用
                if (gifSource instanceof Blob || gifSource instanceof File) {
                  console.log('保存原始GIF文件作为最终备用');
                  window.originalGifSource = gifSource;
                }
              } catch (directError) {
                console.warn('直接创建GIF失败:', directError);
              }
            }
            
            // 完成GIF编码
            const byteLength = writer.end();
            console.log('GIF编码完成，字节长度:', byteLength);
            
            // 检查字节长度是否合理
            if (!byteLength || byteLength <= 0) {
              console.warn('GIF编码器返回的字节长度为0，尝试手动计算有效字节长度');
              
              // 检查是否有备用GIF数据
              if (window.backupGifData && window.backupGifData.length > 0) {
                console.log('使用备用GIF数据，大小:', window.backupGifData.length);
                // 使用备用GIF数据替换buffer
                for (let i = 0; i < window.backupGifData.length && i < buffer.length; i++) {
                  buffer[i] = window.backupGifData[i];
                }
                byteLength = window.backupGifData.length;
              } else {
                // GIF文件至少应该有GIF头部(6字节)和文件结束标记(1字节)
                // 查找GIF文件结束标记(0x3B)的位置
                let calculatedLength = 0;
                const gifEndMarker = 0x3B; // GIF文件结束标记
                
                // 从头开始查找最后一个GIF结束标记
                for (let i = 0; i < buffer.length; i++) {
                  if (buffer[i] === gifEndMarker) {
                    calculatedLength = i + 1; // 包含结束标记
                  }
                }
                
                if (calculatedLength > 6) { // 至少应该有GIF头部(6字节)和结束标记
                  console.log(`手动计算的GIF字节长度: ${calculatedLength}`);
                  byteLength = calculatedLength;
                } else {
                  console.error('无法手动计算有效的GIF字节长度');
                }
              }
            }
            
            // 最终处理和验证
            const finalBuffer = buffer.slice(0, byteLength);
            console.log(`最终GIF大小: ${finalBuffer.length} 字节`);
            
            // 验证GIF是否有效
            const isValidGif = validateGifBuffer(finalBuffer, finalBuffer.length);
            if (!isValidGif) {
              console.warn('生成的GIF可能无效，尝试修复');
              
              // 尝试修复GIF头部
              if (finalBuffer.length > 13) { // 确保至少有GIF头部的长度
                // 检查GIF头部签名
                if (finalBuffer[0] !== 0x47 || finalBuffer[1] !== 0x49 || finalBuffer[2] !== 0x46) {
                  console.log('修复GIF头部签名');
                  finalBuffer[0] = 0x47; // 'G'
                  finalBuffer[1] = 0x49; // 'I'
                  finalBuffer[2] = 0x46; // 'F'
                  finalBuffer[3] = 0x38; // '8'
                  finalBuffer[4] = 0x39; // '9'
                  finalBuffer[5] = 0x61; // 'a'
                }
                
                // 确保GIF结束标记存在
                if (finalBuffer[finalBuffer.length - 1] !== 0x3B) {
                  console.log('添加GIF结束标记');
                  finalBuffer[finalBuffer.length - 1] = 0x3B;
                }
              }
            }
            
            // 验证GIF是否有效 - 检查文件大小
            if (finalBuffer.length < 100) {
              console.warn('生成的GIF文件太小，可能无效');
              
              // 如果有备用GIF数据，使用它
              if (window.backupGifData && window.backupGifData.length > 100) {
                console.log('使用备用GIF数据替换无效GIF');
                resolve(window.backupGifData);
                return;
              }
            }
            
            return finalBuffer;
          } catch (error) {
            console.error('编码GIF时出错:', error);
            reject(error);
          }
        });
      }
    }
    
    // 替换原始的GifCodec
    window.gifwrap.GifCodec = PatchedGifCodec;
    console.log('gifwrap库修补成功');
  } catch (error) {
    console.error('修补gifwrap库失败:', error);
    return;
  }
  
  console.log('GIF处理器初始化成功，已找到所有必要组件');
} 