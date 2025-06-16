/**
 * 新版GIF处理工具
 * 提供多种库的支持，更好地处理GIF动图和水印
 */

import { applyWatermarkToCanvas } from '../../core/watermark.js';

// GIF处理库优先级
const GIF_LIBRARIES = {
  GIFJS: 'gif.js',     // https://github.com/jnordberg/gif.js
  GIFUCT: 'gifuct-js', // https://github.com/matt-way/gifuct-js
  LIBGIF: 'libgif',    // https://github.com/buzzfeed/libgif-js
  OMGGIF: 'omggif',    // https://github.com/deanm/omggif
  GIFLER: 'gifler'     // https://github.com/themadcreator/gifler
};

// 检测可用的GIF库
let availableLibraries = [];

/**
 * 读取文件为ArrayBuffer
 * @param {File|Blob} file - 文件
 * @returns {Promise<ArrayBuffer>} - 文件内容
 */
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 将frame转换为ImageData
 * @param {Object} frame - GIF帧
 * @returns {ImageData} - 图像数据
 */
function frameToImageData(frame) {
  try {
    if (!frame.patch) {
      console.warn('帧没有patch数据');
      return null;
    }
    
    return new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height
    );
  } catch (error) {
    console.error('转换帧到ImageData失败:', error);
    return null;
  }
}

/**
 * 初始化，导出为全局对象
 */
export function initGifProcessor() {
  console.log('初始化新版GIF处理器并导出到全局对象');
  
  // 检测可用的库
  if (window.GIF) {
    availableLibraries.push(GIF_LIBRARIES.GIFJS);
  }
  
  if (window.parseGIF || (window.GifUtil && window.GifUtil.read)) {
    availableLibraries.push(GIF_LIBRARIES.GIFUCT);
  }
  
  if (window.SuperGif) {
    availableLibraries.push(GIF_LIBRARIES.LIBGIF);
  }
  
  if (window.omggif || window.GifReader) {
    availableLibraries.push(GIF_LIBRARIES.OMGGIF);
  }
  
  if (window.gifler) {
    availableLibraries.push(GIF_LIBRARIES.GIFLER);
  }
  
  console.log('可用的GIF库:', availableLibraries.join(', ') || '无');
  
  // 如果没有可用的库，加载基本的GIF解析能力
  if (availableLibraries.length === 0) {
    console.warn('没有检测到GIF库，将使用基本Canvas回退方案');
  }
  
  // 导出全局对象
  window.newGifProcessor = {
    processGif,
    createStaticGif,
    applyWatermarkToGif,
    drawGifFrameToCanvas,
    imageDataToCanvas,
    isGif: (file) => isGif(file)
  };
  
  return availableLibraries.length > 0;
}

/**
 * 判断文件是否为GIF
 * @param {File|Blob|string} file - 文件或URL
 * @returns {boolean} - 是否为GIF
 */
export function isGif(file) {
  if (!file) return false;
  
  // 检查MIME类型
  const isGifType = file instanceof Blob && file.type === 'image/gif';
  
  // 检查文件名扩展
  const isGifExt = file.name && file.name.toLowerCase().endsWith('.gif');
  
  // 检查URL扩展名
  const isGifUrl = typeof file === 'string' && file.toLowerCase().endsWith('.gif');
  
  return isGifType || isGifExt || isGifUrl;
}

/**
 * 处理GIF
 * @param {File|Blob} file - GIF文件
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 处理结果
 */
async function processGif(file, options) {
  console.log('新版GIF处理选项:', options);
  
  // 保存原始文件引用，方便后续使用
  const originalFile = options.originalFile || file;
  
  // 解析GIF
  console.log('尝试解析GIF');
  let gifData = null;
  let buffer = null;
  
  try {
    // 读取文件为ArrayBuffer
    buffer = await readFileAsArrayBuffer(file);
    
    // 首先尝试使用新的解析器
    try {
      console.log('尝试使用 gifuct-js 解析GIF');
      const gifParser = new GIF(buffer);
      const frameData = gifParser.decompressFrames(true);
      
      if (frameData && frameData.length > 0) {
        console.log('使用 gifuct-js 成功解析GIF，帧数:', frameData.length);
        
        // 创建GIF对象
        gifData = {
          width: frameData[0].dims.width,
          height: frameData[0].dims.height,
          frames: frameData.map(frame => ({
            delay: frame.delay || 100,
            imageData: frameToImageData(frame),
            dims: frame.dims,
            patch: frame.patch // 保存原始补丁数据
          })),
          parser: 'gifuct-js'
        };
      } else {
        throw new Error('gifuct-js 解析结果为空');
      }
    } catch (error) {
      console.warn('使用 gifuct-js 解析GIF失败:', error);
      
      // 尝试使用 omggif
      try {
        console.log('尝试使用 omggif 解析GIF');
        const gifReader = new GifReader(new Uint8Array(buffer));
        
        const width = gifReader.width;
        const height = gifReader.height;
        const numFrames = gifReader.numFrames();
        
        console.log('GIF尺寸:', width, 'x', height, '帧数:', numFrames);
        
        if (numFrames > 0) {
          // 创建GIF对象
          gifData = {
            width: width,
            height: height,
            frames: [],
            parser: 'omggif',
            originalFile: originalFile
          };
          
          // 读取每一帧
          for (let i = 0; i < numFrames; i++) {
            const frameInfo = gifReader.frameInfo(i);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // 读取帧数据
            const pixels = new Uint8Array(width * height * 4);
            gifReader.decodeAndBlitFrameRGBA(i, pixels);
            
            // 创建ImageData
            const imageData = new ImageData(
              new Uint8ClampedArray(pixels.buffer),
              width,
              height
            );
            
            // 绘制到Canvas
            ctx.putImageData(imageData, 0, 0);
            
            // 添加帧
            gifData.frames.push({
              delay: frameInfo.delay * 10 || 100,
              canvas: canvas,
              imageData: imageData,
              pixels: pixels // 保存原始像素数据
            });
          }
          
          console.log('使用 omggif 成功解析GIF，帧数:', gifData.frames.length);
        } else {
          throw new Error('GIF没有帧');
        }
      } catch (omggifError) {
        console.error('使用 omggif 解析GIF也失败:', omggifError);
        
        // 最后尝试直接使用原始文件
        console.log('尝试直接使用原始文件作为图像源');
        try {
          // 创建一个最小的GIF数据结构
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(originalFile);
          });
          
          gifData = {
            width: img.width || 400,
            height: img.height || 300,
            frames: [{
              delay: 100,
              originalImage: img
            }],
            parser: 'direct',
            originalFile: originalFile
          };
          
          console.log('成功创建直接图像源，尺寸:', gifData.width, 'x', gifData.height);
          URL.revokeObjectURL(img.src);
        } catch (directError) {
          console.error('直接使用原始文件也失败:', directError);
          throw new Error('无法解析GIF: ' + omggifError.message);
        }
      }
    }
  } catch (error) {
    console.error('解析GIF失败:', error);
    throw error;
  }
  
  // 检查解析结果
  if (!gifData || !gifData.frames || gifData.frames.length === 0) {
    console.error('GIF解析结果无效');
    throw new Error('GIF解析结果无效');
  }
  
  // 保存原始文件引用
  gifData.originalFile = originalFile;
  
  // 检查是否应用水印
  const shouldApplyWatermark = options.applyWatermark !== false && 
                              (options.applyWatermark === true || options.isDownload === true);
  console.log('是否应用水印到GIF:', shouldApplyWatermark, 
              '(明确设置值:', options.applyWatermark, ', 是否为下载:', options.isDownload, ')');
  
  // 为调试添加帧信息
  console.log('GIF帧信息检查:');
  for (let i = 0; i < Math.min(gifData.frames.length, 3); i++) {
    const frame = gifData.frames[i];
    console.log(`帧 ${i+1}/${gifData.frames.length}:`, 
                '延迟:', frame.delay, 
                '是否有Canvas:', !!frame.canvas,
                '是否有ImageData:', !!frame.imageData,
                '是否有原始图像:', !!frame.originalImage,
                frame.imageData ? `ImageData尺寸: ${frame.imageData.width}x${frame.imageData.height}` : '');
    
    // 如果帧的ImageData存在但没有Canvas，创建Canvas
    if (frame.imageData && !frame.canvas) {
      console.log(`为帧 ${i+1} 创建Canvas`);
      frame.canvas = imageDataToCanvas(frame.imageData);
    }
  }
  
  // 根据选项决定处理方法
  if (shouldApplyWatermark) {
    // 应用水印
    try {
      return await applyWatermarkToGif(gifData, buffer, options);
    } catch (error) {
      console.error('应用水印到GIF失败:', error);
      // 如果水印应用失败，降级为静态预览
      return createStaticGif(gifData, buffer, options);
    }
  } else {
    // 不应用水印，仅创建预览
    console.log('不应用水印，创建预览');
    if (options.preserveAnimation && gifData.frames.length > 1) {
      console.log('保留动画，创建预览GIF');
      try {
        return await createPreviewGif(gifData, buffer);
      } catch (error) {
        console.error('创建预览GIF失败:', error);
        return createStaticGif(gifData, buffer, options);
      }
    } else {
      console.log('创建静态预览');
      return createStaticGif(gifData, buffer, options);
    }
  }
}

/**
 * 将ImageData转换为Canvas
 * @param {ImageData} imageData - 图像数据
 * @returns {HTMLCanvasElement} - Canvas元素
 */
function imageDataToCanvas(imageData) {
  if (!imageData) {
    console.error('imageDataToCanvas: imageData为空');
    return null;
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch (error) {
    console.error('imageDataToCanvas错误:', error);
    return null;
  }
}

/**
 * 绘制GIF帧到Canvas
 * @param {Object} frame - GIF帧
 * @param {HTMLCanvasElement} canvas - 目标Canvas
 * @returns {boolean} - 是否成功
 */
function drawGifFrameToCanvas(frame, canvas) {
  if (!frame || !canvas) {
    console.error('drawGifFrameToCanvas: 参数无效');
    return false;
  }
  
  try {
    const ctx = canvas.getContext('2d');
    
    // 先清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 尝试不同的方法绘制帧
    if (frame.canvas) {
      // 从另一个Canvas绘制
      try {
        ctx.drawImage(frame.canvas, 0, 0);
        return true;
      } catch (e) {
        console.warn('使用canvas绘制帧失败:', e);
      }
    }
    
    if (frame.imageData) {
      // 从ImageData绘制
      try {
        ctx.putImageData(frame.imageData, 0, 0);
        return true;
      } catch (e) {
        console.warn('使用imageData绘制帧失败:', e);
      }
    }
    
    // 如果有原始图像数据
    if (frame.patch) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 创建ImageData
        const imageData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height
        );
        
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
        return true;
      } catch (e) {
        console.warn('使用patch数据绘制帧失败:', e);
      }
    }
    
    // 所有方法都失败，绘制一个占位符
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('无法绘制GIF帧', canvas.width / 2, canvas.height / 2);
    return false;
  } catch (error) {
    console.error('绘制GIF帧到Canvas错误:', error);
    return false;
  }
}

/**
 * 解析GIF
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseGif(buffer) {
  // 尝试使用可用的库按优先级解析
  for (const library of availableLibraries) {
    try {
      console.log(`尝试使用 ${library} 解析GIF`);
      
      switch (library) {
        case GIF_LIBRARIES.GIFUCT:
          return await parseWithGifuct(buffer);
        case GIF_LIBRARIES.OMGGIF:
          return await parseWithOmggif(buffer);
        case GIF_LIBRARIES.LIBGIF:
          return await parseWithLibgif(buffer);
        case GIF_LIBRARIES.GIFLER:
          return await parseWithGifler(buffer);
      }
    } catch (error) {
      console.warn(`使用 ${library} 解析GIF失败:`, error);
      // 继续尝试下一个库
    }
  }
  
  // 所有库都失败，尝试基本解析
  console.log('所有GIF库解析失败，尝试基本解析');
  return await parseBasic(buffer);
}

/**
 * 使用gifuct-js解析
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseWithGifuct(buffer) {
  if (!window.parseGIF) {
    throw new Error('gifuct-js库不可用');
  }
  
  // 使用gifuct-js解析
  const gifData = window.parseGIF(new Uint8Array(buffer));
  const frames = window.decompressFrames(gifData, true);
  
  return {
    width: gifData.lsd.width,
    height: gifData.lsd.height,
    frames: frames,
    frameCount: frames.length,
    loopCount: getLoopCount(gifData),
    source: 'gifuct'
  };
}

/**
 * 使用omggif解析
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseWithOmggif(buffer) {
  // 获取GifReader构造函数
  let GifReader;
  if (typeof window.omggif === 'function') {
    GifReader = window.omggif;
  } else if (window.omggif && typeof window.omggif.GifReader === 'function') {
    GifReader = window.omggif.GifReader;
  } else if (window.GifReader) {
    GifReader = window.GifReader;
  } else {
    throw new Error('GifReader不可用');
  }
  
  // 解析GIF
  const gifData = new Uint8Array(buffer);
  const reader = new GifReader(gifData);
  
  // 提取帧
  const frames = [];
  for (let i = 0; i < reader.numFrames(); i++) {
    const frameInfo = reader.frameInfo(i);
    const canvas = document.createElement('canvas');
    canvas.width = reader.width;
    canvas.height = reader.height;
    const ctx = canvas.getContext('2d');
    
    // 创建ImageData
    const imageData = ctx.createImageData(reader.width, reader.height);
    reader.decodeAndBlitFrameRGBA(i, imageData.data);
    ctx.putImageData(imageData, 0, 0);
    
    // 添加帧
    frames.push({
      imageData: imageData,
      canvas: canvas,
      delay: frameInfo.delay * 10, // 转换为毫秒
      disposalMethod: frameInfo.disposal,
      dims: {
        width: reader.width,
        height: reader.height,
        top: frameInfo.y,
        left: frameInfo.x
      }
    });
  }
  
  return {
    width: reader.width,
    height: reader.height,
    frames: frames,
    frameCount: frames.length,
    loopCount: 0, // omggif不提供循环信息
    source: 'omggif'
  };
}

/**
 * 使用libgif-js解析
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseWithLibgif(buffer) {
  if (!window.SuperGif) {
    throw new Error('libgif-js库不可用');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // 创建blob URL
      const blob = new Blob([buffer], { type: 'image/gif' });
      const blobUrl = URL.createObjectURL(blob);
      
      // 创建临时图像和容器
      const img = document.createElement('img');
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.style.left = '-9999px';
      container.appendChild(img);
      document.body.appendChild(container);
      
      img.onload = function() {
        try {
          // 创建SuperGif实例
          const superGif = new window.SuperGif({ 
            gif: img,
            auto_play: false
          });
          
          superGif.load(() => {
            try {
              // 获取GIF属性
              const width = superGif.get_canvas().width;
              const height = superGif.get_canvas().height;
              
              // 提取帧
              const frames = [];
              const frameCount = superGif.get_length();
              
              for (let i = 0; i < frameCount; i++) {
                superGif.move_to(i);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(superGif.get_canvas(), 0, 0);
                
                frames.push({
                  canvas: canvas,
                  imageData: ctx.getImageData(0, 0, width, height),
                  delay: superGif.get_delay_ms(i) || 100,
                  disposalMethod: 2, // 假设为恢复到背景色
                  dims: {
                    width: width,
                    height: height,
                    top: 0,
                    left: 0
                  }
                });
              }
              
              // 清理
              document.body.removeChild(container);
              URL.revokeObjectURL(blobUrl);
              
              resolve({
                width: width,
                height: height,
                frames: frames,
                frameCount: frameCount,
                loopCount: -1, // -1表示无限循环
                source: 'libgif'
              });
            } catch (error) {
              console.error('SuperGif帧提取失败:', error);
              document.body.removeChild(container);
              URL.revokeObjectURL(blobUrl);
              reject(error);
            }
          });
        } catch (error) {
          console.error('SuperGif加载失败:', error);
          document.body.removeChild(container);
          URL.revokeObjectURL(blobUrl);
          reject(error);
        }
      };
      
      img.onerror = function(error) {
        console.error('SuperGif图像加载失败:', error);
        document.body.removeChild(container);
        URL.revokeObjectURL(blobUrl);
        reject(new Error('图像加载失败'));
      };
      
      img.src = blobUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 使用gifler解析
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseWithGifler(buffer) {
  if (!window.gifler) {
    throw new Error('gifler库不可用');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // 创建blob URL
      const blob = new Blob([buffer], { type: 'image/gif' });
      const blobUrl = URL.createObjectURL(blob);
      
      // 创建canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 使用gifler加载GIF
      window.gifler(blobUrl)
        .get((animator) => {
          try {
            // 设置canvas尺寸
            canvas.width = animator.width;
            canvas.height = animator.height;
            
            // 获取帧
            const frames = [];
            animator.frames.forEach((frame) => {
              // 创建帧canvas
              const frameCanvas = document.createElement('canvas');
              frameCanvas.width = animator.width;
              frameCanvas.height = animator.height;
              const frameCtx = frameCanvas.getContext('2d');
              
              // 绘制帧
              frame.ctx = frameCtx; // 设置帧的绘制上下文
              animator.drawFrame(0, frame);
              
              // 获取图像数据
              const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
              
              // 添加帧
              frames.push({
                canvas: frameCanvas,
                imageData: imageData,
                delay: frame.delay || 100,
                disposalMethod: 2, // 假设为恢复到背景色
                dims: {
                  width: animator.width,
                  height: animator.height,
                  top: 0,
                  left: 0
                }
              });
            });
            
            // 清理
            URL.revokeObjectURL(blobUrl);
            
            resolve({
              width: animator.width,
              height: animator.height,
              frames: frames,
              frameCount: frames.length,
              loopCount: -1, // 假设为无限循环
              source: 'gifler'
            });
          } catch (error) {
            console.error('gifler帧提取失败:', error);
            URL.revokeObjectURL(blobUrl);
            reject(error);
          }
        })
        .catch((error) => {
          console.error('gifler加载失败:', error);
          URL.revokeObjectURL(blobUrl);
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 基本GIF解析 - 作为最后的回退方案
 * @param {ArrayBuffer} buffer - GIF数据
 * @returns {Promise<Object>} - 解析结果
 */
async function parseBasic(buffer) {
  return new Promise((resolve, reject) => {
    try {
      // 创建blob URL
      const blob = new Blob([buffer], { type: 'image/gif' });
      const blobUrl = URL.createObjectURL(blob);
      
      // 加载图像
      const img = new Image();
      img.onload = function() {
        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 400;
        canvas.height = img.height || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 创建单帧
        const frame = {
          canvas: canvas,
          imageData: imageData,
          delay: 100,
          disposalMethod: 2,
          dims: {
            width: canvas.width,
            height: canvas.height,
            top: 0,
            left: 0
          }
        };
        
        // 清理
        URL.revokeObjectURL(blobUrl);
        
        resolve({
          width: canvas.width,
          height: canvas.height,
          frames: [frame],
          frameCount: 1,
          loopCount: 0,
          source: 'basic'
        });
      };
      
      img.onerror = function(error) {
        console.error('基本图像加载失败:', error);
        URL.revokeObjectURL(blobUrl);
        
        // 创建空白GIF
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无法处理GIF图像', canvas.width / 2, canvas.height / 2);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        resolve({
          width: canvas.width,
          height: canvas.height,
          frames: [{
            canvas: canvas,
            imageData: imageData,
            delay: 100,
            disposalMethod: 2,
            dims: {
              width: canvas.width,
              height: canvas.height,
              top: 0,
              left: 0
            }
          }],
          frameCount: 1,
          loopCount: 0,
          source: 'empty'
        });
      };
      
      img.src = blobUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取GIF的循环次数
 * @param {Object} gifData - GIF数据
 * @returns {number} - 循环次数，-1表示无限循环
 */
function getLoopCount(gifData) {
  if (!gifData || !gifData.applicationExtensions) {
    return 0;
  }
  
  // 查找NETSCAPE2.0应用扩展
  for (const ext of gifData.applicationExtensions) {
    if (ext.identifier === 'NETSCAPE2.0') {
      // 获取循环次数
      if (ext.data && ext.data.length >= 3) {
        return ext.data[1] | (ext.data[2] << 8);
      }
    }
  }
  
  return 0;
}

/**
 * 应用水印到GIF
 * @param {Object} gif - 解析的GIF数据
 * @param {ArrayBuffer} originalBuffer - 原始GIF数据
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 处理结果
 */
async function applyWatermarkToGif(gif, originalBuffer, options) {
  try {
    // 准备Canvas和上下文
    const canvas = document.createElement('canvas');
    canvas.width = gif.width;
    canvas.height = gif.height;
    const ctx = canvas.getContext('2d');
    
    console.log('开始处理', gif.frames.length, '个GIF帧');
    
    // 处理每一帧
    const processedFrames = await processGifFrames(gif.frames, canvas, ctx, options);
    console.log('成功处理', processedFrames.length, '个GIF帧');
    
    // 没有帧或只有一帧时，直接返回静态图像
    if (processedFrames.length === 0) {
      console.error('处理后没有有效帧');
      return createEmptyResult();
    }
    
    if (processedFrames.length === 1 || !options.preserveAnimation) {
      // 返回静态图像
      return createStaticGifFromProcessedFrames(processedFrames[0], gif.width, gif.height, options);
    }
    
    // 组装GIF
    try {
      // 使用canvas2gif创建GIF
      console.log('使用Canvas2GIF创建GIF');
      const gifResult = await createGifFromProcessedFrames(processedFrames, gif.width, gif.height, options);
      return gifResult;
    } catch (gifError) {
      console.error('创建动态GIF失败:', gifError);
      // 失败时返回静态图像
      return createStaticGifFromProcessedFrames(processedFrames[0], gif.width, gif.height, options);
    }
  } catch (error) {
    console.error('应用水印到GIF失败:', error);
    throw error;
  }
}

/**
 * 处理GIF帧
 * @param {Array} frames - GIF帧数组
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Object} options - 选项
 * @returns {Promise<Array>} - 处理后的帧数组
 */
async function processGifFrames(frames, canvas, ctx, options) {
  try {
    console.log('处理', frames.length, '个GIF帧');
    
    // 处理结果
    const processedFrames = [];
    
    // 处理每一帧
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制帧到Canvas
      let frameDrawn = drawGifFrameToCanvas(frame, canvas);
      
      if (!frameDrawn) {
        console.warn(`无法绘制第 ${i+1} 帧，尝试其他方法`);
        
        // 尝试使用备用方法
        if (frame.canvas) {
          try {
            ctx.drawImage(frame.canvas, 0, 0);
            frameDrawn = true;
          } catch (e) {
            console.warn('备用方法1失败:', e);
          }
        }
        
        if (!frameDrawn && frame.imageData) {
          try {
            ctx.putImageData(frame.imageData, 0, 0);
            frameDrawn = true;
          } catch (e) {
            console.warn('备用方法2失败:', e);
          }
        }
        
        if (!frameDrawn) {
          console.warn(`跳过第 ${i+1} 帧，无法绘制`);
          continue;
        }
      }
      
      // 应用水印
      applyWatermarkToGifFrame(ctx, canvas.width, canvas.height, options);
      
      // 获取处理后的帧
      const processedFrame = {
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay: frame.delay || 100
      };
      
      // 添加到结果
      processedFrames.push(processedFrame);
    }
    
    return processedFrames;
  } catch (error) {
    console.error('处理GIF帧错误:', error);
    throw error;
  }
}

/**
 * 应用水印到GIF帧
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {Object} options - 水印选项
 */
function applyWatermarkToGifFrame(ctx, width, height, options) {
  try {
    console.log('应用水印到GIF帧，类型:', options.type);
    
    if (!options.applyWatermark) {
      console.log('不应用水印，已在选项中禁用');
      return;
    }
    
    if (options.type === 'image') {
      // 图片水印
      let watermarkImage = null;
      
      // 获取水印图片对象
      if (options.watermarkImage instanceof HTMLImageElement) {
        watermarkImage = options.watermarkImage;
      } else if (options.watermarkImage instanceof HTMLCanvasElement) {
        watermarkImage = options.watermarkImage;
      } else if (typeof options.watermarkImage === 'string') {
        try {
          // 尝试从DOM获取水印图片
          const imgElem = document.getElementById('watermarkImage');
          if (imgElem && imgElem instanceof HTMLImageElement && imgElem.complete) {
            watermarkImage = imgElem;
            console.log('从DOM获取水印图片成功');
          } else {
            console.log('从DOM获取水印图片失败或图片未加载完成');
          }
        } catch (e) {
          console.error('尝试从DOM获取水印图片错误:', e);
        }
      }
      
      if (!watermarkImage) {
        console.log('无法找到有效的水印图片，降级使用文本水印');
        // 降级使用文本水印
        const textOptions = { ...options, type: 'text' };
        if (!textOptions.text) {
          textOptions.text = '水印';
        }
        applyTextWatermarkToGifFrame(ctx, width, height, textOptions);
        return;
      }
      
      // 应用水印图片
      try {
        const watermarkWidth = Math.min(width * 0.3, watermarkImage.width);
        const watermarkHeight = watermarkImage.height * (watermarkWidth / watermarkImage.width);
        
        // 计算位置
        let x = 10;
        let y = 10;
        
        if (options.position) {
          x = Math.floor(width * (options.position.x / 100));
          y = Math.floor(height * (options.position.y / 100));
        }
        
        // 设置透明度
        const originalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = (options.opacity || 50) / 100;
        
        // 如果有旋转
        if (options.rotation) {
          ctx.save();
          ctx.translate(x + watermarkWidth / 2, y + watermarkHeight / 2);
          ctx.rotate(options.rotation * Math.PI / 180);
          ctx.drawImage(watermarkImage, -watermarkWidth / 2, -watermarkHeight / 2, watermarkWidth, watermarkHeight);
          ctx.restore();
        } else {
          ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
        }
        
        // 恢复透明度
        ctx.globalAlpha = originalAlpha;
        
      } catch (e) {
        console.error('应用图片水印到GIF帧错误:', e);
        // 出错时尝试降级到文本水印
        const textOptions = { ...options, type: 'text' };
        if (!textOptions.text) {
          textOptions.text = '水印';
        }
        applyTextWatermarkToGifFrame(ctx, width, height, textOptions);
      }
      
    } else {
      // 文本水印
      applyTextWatermarkToGifFrame(ctx, width, height, options);
    }
  } catch (error) {
    console.error('应用水印到GIF帧错误:', error);
  }
}

/**
 * 应用文本水印到GIF帧
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {Object} options - 水印选项
 */
function applyTextWatermarkToGifFrame(ctx, width, height, options) {
  try {
    console.log('应用文本水印到GIF帧');
    
    if (!options.text) {
      console.log('未提供水印文本，使用默认文本');
      options.text = '水印';
    }
    
    // 设置水印文本样式
    const fontSize = options.fontSize || 24;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = options.color || '#ff0000';
    
    // 计算位置
    let x = 10;
    let y = fontSize + 10;
    
    if (options.position) {
      x = Math.floor(width * (options.position.x / 100));
      y = Math.floor(height * (options.position.y / 100));
    }
    
    // 设置透明度
    const originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = (options.opacity || 50) / 100;
    
    // 如果有旋转
    if (options.rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(options.rotation * Math.PI / 180);
      ctx.fillText(options.text, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(options.text, x, y);
    }
    
    // 恢复透明度
    ctx.globalAlpha = originalAlpha;
  } catch (error) {
    console.error('应用文本水印到GIF帧错误:', error);
  }
}

/**
 * 使用gif.js创建GIF
 * @param {Array} frames - 处理后的帧数组
 * @param {number} width - GIF宽度
 * @param {number} height - GIF高度
 * @param {number} loopCount - 循环次数
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 处理结果
 */
async function createGifWithGifJs(frames, width, height, loopCount, options) {
  return new Promise((resolve, reject) => {
    try {
      // 确保GIF.js可用
      if (typeof window.GIF !== 'function') {
        throw new Error('GIF.js库不可用');
      }
      
      // 获取GIF工作器脚本路径
      const workerScript = options.gifWorkerPath || 'libs/gif.worker.js';
      
      // 创建GIF实例
      const gif = new window.GIF({
        workers: 4,
        quality: 10,
        workerScript: workerScript,
        width: width,
        height: height,
        transparent: 'rgba(0,0,0,0)',
        repeat: loopCount < 0 ? 0 : loopCount
      });
      
      // 添加所有帧
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const delay = frame.delay || 100;
        
        // 添加帧到GIF
        gif.addFrame(frame.canvas, { delay: delay, copy: true });
      }
      
      // 渲染完成事件
      gif.on('finished', blob => {
        try {
          // 创建结果对象
          const result = {
            blob: blob,
            blobUrl: URL.createObjectURL(blob),
            width: width,
            height: height,
            frameCount: frames.length,
            isAnimated: frames.length > 1
          };
          
          // 创建预览URL
          const firstFrame = frames[0].canvas;
          result.previewUrl = firstFrame.toDataURL('image/png');
          
          // 完成回调
          if (typeof options.onProgress === 'function') {
            options.onProgress({
              progress: 1,
              message: '完成'
            });
          }
          
          resolve(result);
        } catch (error) {
          console.error('创建GIF URL失败:', error);
          reject(error);
        }
      });
      
      // 渲染进度事件
      gif.on('progress', progress => {
        console.log('GIF渲染进度:', Math.round(progress * 100) + '%');
        
        // 调用外部进度回调
        if (typeof options.onProgress === 'function') {
          options.onProgress({
            progress: 0.5 + progress * 0.5,
            message: `渲染GIF: ${Math.round(progress * 100)}%`
          });
        }
      });
      
      // 开始渲染
      console.log('开始渲染GIF...');
      gif.render();
    } catch (error) {
      console.error('创建GIF失败:', error);
      reject(error);
    }
  });
}

/**
 * 创建静态GIF
 * @param {Object} gif - 解析的GIF数据
 * @param {ArrayBuffer} originalBuffer - 原始GIF数据
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 处理结果
 */
async function createStaticGif(gif, originalBuffer, options) {
  try {
    console.log('创建静态GIF预览');
    
    // 获取第一帧
    const firstFrame = gif.frames[0];
    if (!firstFrame) {
      console.error('GIF没有有效帧，使用空白GIF');
      return createEmptyResult();
    }
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = gif.width;
    canvas.height = gif.height;
    const ctx = canvas.getContext('2d');
    
    // 首先绘制白色背景确保透明区域可见
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 尝试多种方法绘制帧内容
    let frameDrawn = false;
    
    // 方法0: 如果有原始图像，直接使用
    if (firstFrame.originalImage && firstFrame.originalImage instanceof HTMLImageElement) {
      try {
        console.log('使用原始图像绘制GIF');
        ctx.drawImage(firstFrame.originalImage, 0, 0, canvas.width, canvas.height);
        console.log('成功使用原始图像绘制GIF');
        frameDrawn = true;
      } catch (e) {
        console.warn('使用原始图像绘制失败:', e);
      }
    }
    
    // 方法1: 直接绘制第一帧的canvas
    if (!frameDrawn && firstFrame.canvas) {
      try {
        ctx.drawImage(firstFrame.canvas, 0, 0);
        console.log('成功使用canvas绘制第一帧');
        frameDrawn = true;
      } catch (e) {
        console.warn('使用canvas绘制帧失败:', e);
      }
    }
    
    // 方法2: 使用imageData绘制
    if (!frameDrawn && firstFrame.imageData) {
      try {
        // 保存当前状态以防putImageData影响整个画布
        ctx.save();
        ctx.putImageData(firstFrame.imageData, 0, 0);
        ctx.restore();
        console.log('成功使用imageData绘制第一帧');
        frameDrawn = true;
      } catch (e) {
        console.warn('使用imageData绘制帧失败:', e);
      }
    }
    
    // 方法3: 从原始缓冲区创建图像
    if (!frameDrawn && originalBuffer) {
      try {
        console.log('尝试从原始缓冲区创建图像');
        // 创建临时图像元素
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          
          // 创建一个临时URL
          const blobUrl = URL.createObjectURL(new Blob([originalBuffer], {type: 'image/gif'}));
          img.src = blobUrl;
          
          // 设置超时，以防永久等待
          setTimeout(() => {
            if (!img.complete) {
              URL.revokeObjectURL(blobUrl);
              reject(new Error('图像加载超时'));
            }
          }, 3000);
        });
        
        // 绘制到canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('成功从原始缓冲区绘制GIF图像');
        
        // 清理临时URL
        URL.revokeObjectURL(img.src);
        frameDrawn = true;
      } catch (e) {
        console.warn('从原始缓冲区创建图像失败:', e);
      }
    }
    
    // 方法4: 使用原始文件直接绘制
    if (!frameDrawn && gif.originalFile) {
      try {
        console.log('尝试使用原始文件直接绘制');
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(gif.originalFile);
          
          // 设置超时，以防永久等待
          setTimeout(() => {
            if (!img.complete) {
              URL.revokeObjectURL(img.src);
              reject(new Error('图像加载超时'));
            }
          }, 3000);
        });
        
        // 绘制到canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('成功使用原始文件直接绘制GIF图像');
        
        // 清理临时URL
        URL.revokeObjectURL(img.src);
        frameDrawn = true;
      } catch (e) {
        console.warn('使用原始文件直接绘制失败:', e);
      }
    }
    
    // 方法5: 使用像素数据绘制（针对某些特殊格式的GIF）
    if (!frameDrawn && firstFrame.pixels) {
      try {
        console.log('尝试使用像素数据绘制');
        const imageData = new ImageData(
          new Uint8ClampedArray(firstFrame.pixels),
          gif.width,
          gif.height
        );
        ctx.putImageData(imageData, 0, 0);
        console.log('成功使用像素数据绘制');
        frameDrawn = true;
      } catch (e) {
        console.warn('使用像素数据绘制失败:', e);
      }
    }
    
    // 如果所有方法都失败，使用占位符
    if (!frameDrawn) {
      console.warn('所有绘制方法都失败，使用占位符');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('无法绘制GIF帧', canvas.width / 2, canvas.height / 2);
    }
    
    // 确定要使用哪种类型的水印
    let watermarkType = options.type || 'text';
    
    // 如果是图片水印但没有找到有效的水印图片，则降级为文字水印
    if (watermarkType === 'image' && (!options.watermarkImage || typeof options.watermarkImage === 'string')) {
      console.log('未找到有效的水印图片，降级为文字水印');
      watermarkType = 'text';
      
      // 创建一个临时的水印选项对象，保留原始选项中除了type之外的所有内容
      const textOptions = { ...options, type: 'text' };
      
      // 如果没有提供文本，则使用默认文本
      if (!textOptions.text) {
        textOptions.text = '水印';
      }
      
      // 应用文字水印
      applyWatermarkToGifFrame(ctx, canvas.width, canvas.height, textOptions);
    } else {
      // 应用原始类型的水印
      applyWatermarkToGifFrame(ctx, canvas.width, canvas.height, options);
    }
    
    // 获取数据URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // 将Canvas转换为Blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    if (!blob) {
      console.error('Canvas转换为Blob失败');
      return createEmptyResult();
    }
    
    // 返回结果
    return {
      blob: blob,
      blobUrl: URL.createObjectURL(blob),
      previewUrl: dataUrl,
      width: canvas.width,
      height: canvas.height,
      frameCount: 1,
      isAnimated: false
    };
  } catch (error) {
    console.error('创建静态GIF失败:', error);
    return createEmptyResult();
  }
}

/**
 * 从原始GIF创建结果
 * @param {ArrayBuffer} buffer - 原始GIF数据
 * @param {Object} gif - 解析的GIF数据
 * @returns {Object} - 结果对象
 */
function createResultFromOriginal(buffer, gif) {
  try {
    // 创建Blob
    const blob = new Blob([buffer], { type: 'image/gif' });
    const blobUrl = URL.createObjectURL(blob);
    
    // 获取第一帧作为预览
    let previewUrl = '';
    if (gif.frames && gif.frames[0] && gif.frames[0].canvas) {
      previewUrl = gif.frames[0].canvas.toDataURL('image/png');
    } else {
      // 创建简单预览
      const canvas = document.createElement('canvas');
      canvas.width = gif.width;
      canvas.height = gif.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GIF预览', canvas.width / 2, canvas.height / 2);
      previewUrl = canvas.toDataURL('image/png');
    }
    
    return {
      blob: blob,
      blobUrl: blobUrl,
      previewUrl: previewUrl,
      width: gif.width,
      height: gif.height,
      frameCount: gif.frameCount,
      isAnimated: gif.frameCount > 1
    };
  } catch (error) {
    console.error('创建结果失败:', error);
    return createEmptyResult();
  }
}

/**
 * 创建错误结果
 * @param {Error} error - 错误对象
 * @returns {Object} - 结果对象
 */
function createErrorResult(error) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  // 绘制错误信息
  ctx.fillStyle = '#ffeeee';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff0000';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('处理GIF时出错', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '14px Arial';
  ctx.fillText(error.message || '未知错误', canvas.width / 2, canvas.height / 2 + 20);
  
  return {
    blob: null,
    blobUrl: canvas.toDataURL('image/png'),
    previewUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    frameCount: 1,
    isAnimated: false,
    error: error.message || '处理GIF时出错'
  };
}

/**
 * 创建空结果
 * @returns {Object} - 结果对象
 */
function createEmptyResult() {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  // 绘制占位信息
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('无法处理GIF图像', canvas.width / 2, canvas.height / 2);
  
  return {
    blob: null,
    blobUrl: canvas.toDataURL('image/png'),
    previewUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    frameCount: 1,
    isAnimated: false
  };
} 