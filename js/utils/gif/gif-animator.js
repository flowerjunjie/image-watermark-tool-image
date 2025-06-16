/**
 * 动态GIF处理工具
 * 使用GIF.js库处理GIF动画，保留动画效果并添加水印
 */

import { renderWatermarkOnCanvas } from '../../core/watermark.js';
import { isGif } from './gif-processor.js';
import { extractGifFrames } from './gif-extractor.js';
import { applyWatermarkToCanvas } from '../../core/watermark.js';
import { watermarkState } from '../../core/state.js';

// 工具函数：数据URL转Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

// 获取Worker路径
function getWorkerPath() {
  // 首先尝试当前页面的基础路径
  const baseUrl = new URL('.', window.location.href).href;
  
  const locations = [
    `${baseUrl}public/libs/gif.worker.js`,
    `${baseUrl}libs/gif.worker.js`,
    '/public/libs/gif.worker.js',
    './public/libs/gif.worker.js',
    'public/libs/gif.worker.js',
    '/libs/gif.worker.js',
    './libs/gif.worker.js',
    'libs/gif.worker.js'
  ];
  
  // 检查哪个路径可用
  try {
    // 优先使用相对于当前页面的路径
    return new URL('public/libs/gif.worker.js', window.location.href).href;
  } catch (e) {
    console.warn('无法构建worker相对路径:', e);
  }
  
  // 返回第一个路径作为默认路径
  console.warn('找不到有效的GIF worker路径，使用默认路径');
  return locations[0];
}

/**
 * 创建动态GIF的类
 */
export class GifAnimator {
  constructor() {
    this.workerPath = getWorkerPath();
    console.log('GIF动画处理器初始化，Worker路径:', this.workerPath);
  }
  
  /**
   * 检查是否可以处理GIF
   * @returns {boolean} - 是否可以处理
   */
  canProcessGif() {
    return typeof window.GIF === 'function';
  }
  
  /**
   * 分解GIF动画为帧序列
   * @param {Blob|File|string} gifSource - GIF文件或URL
   * @returns {Promise<Array>} - 帧序列
   */
  async extractFrames(gifSource) {
    return new Promise((resolve, reject) => {
      try {
        // 创建图像元素
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // 创建Canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // 使用SuperGif库分解GIF帧（如果可用）
            if (typeof window.SuperGif === 'function') {
              try {
                // 为SuperGif准备一个容器
                const gifContainer = document.getElementById('gif-container');
                if (!gifContainer) {
                  console.warn('找不到GIF容器，创建临时容器');
                  const tempContainer = document.createElement('div');
                  tempContainer.id = 'temp-gif-container';
                  tempContainer.style.position = 'absolute';
                  tempContainer.style.left = '-9999px';
                  tempContainer.style.top = '-9999px';
                  document.body.appendChild(tempContainer);
                }
                
                // 在容器中创建一个img元素
                const gifImage = document.createElement('img');
                gifImage.src = img.src;
                gifImage.width = img.width;
                gifImage.height = img.height;
                gifImage.style.position = 'absolute';
                gifImage.style.left = '-9999px';
                gifImage.style.top = '-9999px';
                
                // 将图像添加到文档中，SuperGif需要这样做
                document.body.appendChild(gifImage);
                
                // 使用SuperGif解析GIF
                const superGif = new SuperGif({
                  gif: gifImage,
                  auto_play: false
                });
                
                superGif.load(() => {
                  try {
                    const frameCount = superGif.get_length();
                    console.log(`GIF包含${frameCount}帧`);
                    
                    const frames = [];
                    // 提取所有帧
                    for (let i = 0; i < frameCount; i++) {
                      superGif.move_to(i);
                      const frameCanvas = superGif.get_canvas();
                      
                      // 复制帧到新Canvas
                      const frameClone = document.createElement('canvas');
                      frameClone.width = frameCanvas.width;
                      frameClone.height = frameCanvas.height;
                      const frameCtx = frameClone.getContext('2d');
                      frameCtx.drawImage(frameCanvas, 0, 0);
                      
                      frames.push({
                        canvas: frameClone,
                        delay: superGif.get_frames()[i].delay * 10 || 100 // 转换为毫秒
                      });
                    }
                    
                    // 清理
                    if (document.body.contains(gifImage)) {
                      document.body.removeChild(gifImage);
                    }
                    
                    resolve(frames);
                  } catch (frameError) {
                    console.error('提取GIF帧失败:', frameError);
                    // 降级处理：使用单帧
                    ctx.drawImage(img, 0, 0);
                    resolve([{
                      canvas: canvas,
                      delay: 100
                    }]);
                  }
                });
              } catch (superGifError) {
                console.error('使用SuperGif解析GIF失败:', superGifError);
                // 降级方法：仅返回单帧
                ctx.drawImage(img, 0, 0);
                resolve([{
                  canvas: canvas,
                  delay: 100
                }]);
              }
            } else {
              console.warn('SuperGif库未加载，仅提取单帧');
              // 降级方法：仅返回单帧
              ctx.drawImage(img, 0, 0);
              resolve([{
                canvas: canvas,
                delay: 100
              }]);
            }
          } catch (error) {
            console.error('提取GIF帧失败:', error);
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error('加载GIF图像失败:', error);
          reject(new Error('无法加载GIF图像'));
        };
        
        // 设置图像源
        if (typeof gifSource === 'string') {
          img.src = gifSource;
        } else if (gifSource instanceof Blob || gifSource instanceof File) {
          img.src = URL.createObjectURL(gifSource);
        } else {
          throw new Error('无效的GIF源');
        }
      } catch (error) {
        console.error('提取GIF帧失败:', error);
        reject(error);
      }
    });
  }
  
  /**
   * 处理GIF并添加水印
   * @param {Blob|File|string} gifSource - GIF文件或URL
   * @param {Object} options - 水印选项
   * @returns {Promise<Object>} - 处理结果
   */
  async processGif(gifSource, options = {}) {
    try {
      console.log('使用GIF.js处理动态GIF');
      
      if (!this.canProcessGif()) {
        throw new Error('GIF.js库未正确加载，无法处理动态GIF');
      }
      
      // 提取帧
      const frames = await this.extractFrames(gifSource);
      if (!frames || frames.length === 0) {
        throw new Error('无法提取GIF帧');
      }
      
      console.log(`成功提取${frames.length}帧GIF`);
      
      // 获取尺寸
      const width = frames[0].canvas.width;
      const height = frames[0].canvas.height;
      
      // 如果只有一帧，使用静态处理方式
      if (frames.length === 1) {
        console.log('GIF只有一帧，使用静态处理');
        return this.processStaticImage(frames[0].canvas, options);
      }
      
      // 创建水印模板
      const watermarkCanvas = document.createElement('canvas');
      watermarkCanvas.width = width;
      watermarkCanvas.height = height;
      const watermarkCtx = watermarkCanvas.getContext('2d');
      
      // 为每一帧应用水印
      const totalFrames = frames.length;
      let completedFrames = 0;
      
      // 使用Promise.all处理所有帧
      const framePromises = frames.map(async (frame, index) => {
        try {
          // 创建临时canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const ctx = tempCanvas.getContext('2d');
          
          // 绘制原始帧
          ctx.drawImage(frame.canvas, 0, 0);
          
          // 如果需要添加水印
          if (options.applyWatermark !== false) {
            // 应用水印
            await this.applyWatermarkToCanvas(ctx, width, height, options);
          }
          
          // 更新进度
          completedFrames++;
          if (typeof options.onProgress === 'function') {
            options.onProgress({
              progress: completedFrames / totalFrames,
              frame: index,
              total: totalFrames
            });
          }
          
          // 添加到处理后的帧列表
          return {
            canvas: tempCanvas,
            delay: frame.delay
          };
        } catch (frameError) {
          console.error(`处理第${index}帧时出错:`, frameError);
          // 如果单帧处理失败，使用原始帧
          return {
            canvas: frame.canvas,
            delay: frame.delay
          };
        }
      });
      
      // 等待所有帧处理完成
      const processedFrames = await Promise.all(framePromises);
      
      // 使用GIF.js创建最终GIF
      const renderer = this.createRenderer(options);
      
      return new Promise((resolve, reject) => {
        try {
          // 添加所有处理后的帧
          for (let i = 0; i < processedFrames.length; i++) {
            const frame = processedFrames[i];
            renderer.addFrame(frame.canvas, {
              delay: frame.delay,
              copy: true
            });
          }
          
          // 监听渲染完成事件
          renderer.on('finished', blob => {
            try {
              // 创建URL
              const blobUrl = URL.createObjectURL(blob);
              
              // 创建静态预览（使用第一帧）
              const firstFrame = processedFrames[0].canvas;
              const previewCanvas = document.createElement('canvas');
              previewCanvas.width = width;
              previewCanvas.height = height;
              const previewCtx = previewCanvas.getContext('2d');
              previewCtx.drawImage(firstFrame, 0, 0);
              
              // 返回结果对象
              resolve({
                blob: blob,
                blobUrl: blobUrl,
                firstFrame: previewCanvas,
                previewUrl: previewCanvas.toDataURL('image/png'),
                width: width,
                height: height,
                frameCount: processedFrames.length,
                isAnimated: true
              });
            } catch (finalError) {
              console.error('创建最终GIF结果对象失败:', finalError);
              reject(finalError);
            }
          });
          
          // 监听渲染进度
          renderer.on('progress', progress => {
            if (typeof options.onProgress === 'function') {
              options.onProgress({
                progress: progress,
                message: `正在渲染GIF: ${Math.round(progress * 100)}%`
              });
            }
          });
          
          // 开始渲染
          console.log('开始渲染最终GIF...');
          renderer.render();
        } catch (renderError) {
          console.error('渲染GIF失败:', renderError);
          reject(renderError);
        }
      });
    } catch (error) {
      console.error('GIF处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理静态图像
   * @param {HTMLCanvasElement} canvas - 图像Canvas
   * @param {Object} options - 水印选项
   * @returns {Promise<Object>} - 处理结果
   */
  async processStaticImage(canvas, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 创建临时canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 绘制原始图像
        tempCtx.drawImage(canvas, 0, 0);
        
        // 应用水印
        if (options.applyWatermark !== false) {
          try {
            // 临时保存当前的watermarkState
            const originalWatermarkState = { ...watermarkState };
            
            // 设置水印选项
            watermarkState = {
              ...watermarkState,
              text: options.text || watermarkState?.text || '仅供验证使用',
              color: options.color || watermarkState?.color || '#ff0000',
              fontSize: options.fontSize || watermarkState?.fontSize || 24,
              opacity: options.opacity || watermarkState?.opacity || 50,
              rotation: options.rotation || watermarkState?.rotation || 0,
              relativePosition: options.position || watermarkState?.relativePosition || { x: 50, y: 50 },
              type: options.type || watermarkState?.type || 'text',
              scale: options.scale || watermarkState?.scale || 1.0
            };
            
            // 应用水印
            renderWatermarkOnCanvas(tempCanvas, tempCtx);
            
            // 恢复原始状态
            watermarkState = originalWatermarkState;
          } catch (watermarkError) {
            console.error('应用水印到静态图像失败:', watermarkError);
          }
        }
        
        // 创建预览URL
        const previewUrl = tempCanvas.toDataURL('image/png');
        const blob = dataURLToBlob(previewUrl);
        const blobUrl = URL.createObjectURL(blob);
        
        // 返回结果
        resolve({
          previewUrl: previewUrl,
          blob: blob,
          blobUrl: blobUrl,
          isGif: true,
          isAnimated: false,
          watermarkApplied: options.applyWatermark !== false,
          width: canvas.width,
          height: canvas.height
        });
      } catch (error) {
        console.error('处理静态图像失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 创建一个新的GIF.js实例
   * @param {Object} [options] - GIF.js选项
   * @returns {Object} - GIF.js实例
   */
  createRenderer(options = {}) {
    const gifOptions = {
      workers: 4,
      quality: 10,
      width: options.width,
      height: options.height,
      workerScript: this.workerPath,
      transparent: 'rgba(0,0,0,0)'
    };
    
    // 如果有指定worker路径，使用它
    if (window.gifWorkerPath) {
      gifOptions.workerScript = window.gifWorkerPath;
    }
    
    console.log('创建GIF渲染器:', gifOptions);
    return new window.GIF(gifOptions);
  }

  /**
   * 应用水印到画布
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {Object} options - 水印选项
   */
  async applyWatermarkToCanvas(ctx, width, height, options) {
    // 如果不需要水印，直接返回
    if (options.applyWatermark === false) {
      return;
    }
    
    try {
      // 使用renderWatermarkOnCanvas函数
      if (typeof renderWatermarkOnCanvas === 'function') {
        // 为不同的水印类型设置适当的选项
        const watermarkType = options.type || 'text';
        const watermarkText = options.text || '';
        const watermarkColor = options.color || '#ff0000';
        const watermarkOpacity = typeof options.opacity === 'number' ? options.opacity : 0.5;
        const watermarkRotation = typeof options.rotation === 'number' ? options.rotation : 0;
        
        // 处理位置
        let posX = 50, posY = 50; // 默认居中
        if (options.position) {
          if (typeof options.position === 'object') {
            posX = options.position.x || 50;
            posY = options.position.y || 50;
          } else if (options.position === 'center') {
            posX = 50;
            posY = 50;
          }
        }
        
        // 创建适合watermarkOnCanvas的选项
        const watermarkOptions = {
          text: watermarkText,
          type: watermarkType,
          color: watermarkColor,
          opacity: watermarkOpacity,
          rotation: watermarkRotation,
          position: { x: posX, y: posY },
          fontSize: options.fontSize || 24,
          watermarkImage: options.watermarkImage,
          tileSpacing: options.tileSpacing || 150
        };
        
        // 调用水印函数
        await renderWatermarkOnCanvas(ctx, watermarkOptions);
      } else {
        // 简单的回退水印实现
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff0000';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('水印', width / 2, height / 2);
        ctx.restore();
      }
    } catch (error) {
      console.error('应用水印失败:', error);
      // 错误时不抛出异常，保持图像不变
    }
  }
}

// 创建一个全局实例
export const gifAnimator = new GifAnimator(); 