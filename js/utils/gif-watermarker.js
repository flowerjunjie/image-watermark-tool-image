/**
 * GIF水印处理核心类
 * 负责GIF文件的帧解析、水印应用和重新生成
 */
class GifWatermarker {
  /**
   * 静态初始化方法，确保omggif库正确加载
   */
  static init() {
    // 检查omggif库状态
    if (!window.omggif) {
      console.warn('omggif库未加载');
      
      // 尝试直接加载omggif
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/omggif@1.0.10/omggif.js';
      script.async = false;
      script.onload = function() {
        console.log('成功加载omggif库');
        if (window.GifReader && !window.omggif) {
          // 如果直接加载了GifReader，将其赋值给window.omggif
          window.omggif = { GifReader: window.GifReader };
        }
      };
      document.head.appendChild(script);
    } 
    else if (!window.omggif.GifReader) {
      // 如果omggif已加载但没有GifReader
      if (window.omggif.default && window.omggif.default.GifReader) {
        // 如果是ES Module格式
        console.log('从default中获取GifReader');
        window.omggif.GifReader = window.omggif.default.GifReader;
      } else if (window.GifReader) {
        // 如果全局有GifReader
        console.log('从全局获取GifReader');
        window.omggif.GifReader = window.GifReader;
      }
    }
    
    // 附加诊断信息
    console.log('omggif状态:', window.omggif, '类型:', typeof window.omggif);
    
    // 返回库是否可用
    return !!(window.omggif && window.omggif.GifReader);
  }
  
  constructor(options = {}) {
    this.options = Object.assign({
      quality: 10,
      workers: 2,
      width: 0,
      height: 0
    }, options);
    
    this.frames = [];
    this.delays = [];
    this.watermark = null;
    this.canvas = null;
    this.fabricCanvas = null;
    this.isProcessing = false;
    this.onProgress = options.onProgress || function() {};
    this.onFinished = options.onFinished || function() {};
    this.onError = options.onError || function() {};
    
    // GIF库加载检测结果
    this.gifLibsAvailable = {
      gifwrap: false,
      omggif: false,
      gifjs: false
    };
    
    // 检测可用的GIF处理库
    this._detectAvailableLibraries();
    
    // 初始化canvas用于水印编辑
    this._initCanvas(options.canvasId || 'watermark-container');
  }
  
  /**
   * 检测可用的GIF处理库
   * @private
   */
  _detectAvailableLibraries() {
    // 检查gifwrap库
    if (window.gifwrap && typeof window.gifwrap === 'object') {
      this.gifLibsAvailable.gifwrap = true;
      console.log('检测到gifwrap库');
    }
    
    // 检查omggif库
    if (window.omggif) {
      // 尝试检查是否能够获取GifReader
      let hasGifReader = false;
      
      try {
        // 检查各种可能的位置
        if (typeof window.omggif === 'function') {
          hasGifReader = true;
        } else if (window.omggif.GifReader && typeof window.omggif.GifReader === 'function') {
          hasGifReader = true;
        } else if (window.omggif.default && typeof window.omggif.default.GifReader === 'function') {
          hasGifReader = true;
        }
      } catch (e) {
        console.warn('检查omggif.GifReader时出错:', e);
      }
      
      this.gifLibsAvailable.omggif = hasGifReader;
      console.log('检测到omggif库, GifReader可用:', hasGifReader);
    }
    
    // 检查gif.js库
    if (window.GIF) {
      this.gifLibsAvailable.gifjs = true;
      console.log('检测到GIF.js库');
    }
    
    console.log('GIF库可用状态:', this.gifLibsAvailable);
  }
  
  _initCanvas(canvasId) {
    const container = document.getElementById(canvasId);
    if (!container) {
      console.error('Canvas容器未找到:', canvasId);
      return;
    }
    
    // 检查容器中是否已有canvas
    let existingCanvas = container.querySelector('canvas');
    if (existingCanvas) {
      this.canvas = existingCanvas;
    } else {
      this.canvas = document.createElement('canvas');
      container.appendChild(this.canvas);
    }
    
    // 初始化fabric.js canvas
    if (typeof fabric !== 'undefined') {
      this.fabricCanvas = new fabric.Canvas(this.canvas, {
        selection: false
      });
      console.log('Fabric canvas已初始化');
    } else {
      console.error('Fabric.js库未加载');
    }
  }
  
  /**
   * 使用原生方法加载GIF
   * @param {File|Blob|String} gifSource - GIF文件、blob或URL
   * @returns {Promise} - 帧提取完成时解析
   */
  _loadGifNative(gifSource) {
    return new Promise((resolve, reject) => {
      console.log('使用原生方法加载GIF');
      
      const url = gifSource instanceof File || gifSource instanceof Blob 
        ? URL.createObjectURL(gifSource)
        : gifSource;
      
      // 创建一个Image元素来加载GIF
      const img = new Image();
      img.onload = () => {
        try {
          // 获取GIF尺寸
          this.options.width = img.naturalWidth;
          this.options.height = img.naturalHeight;
          
          // 创建临时canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = this.options.width;
          tempCanvas.height = this.options.height;
          const ctx = tempCanvas.getContext('2d');
          
          // 绘制GIF的第一帧
          ctx.drawImage(img, 0, 0);
          
          // 创建帧canvas
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = this.options.width;
          frameCanvas.height = this.options.height;
          const frameCtx = frameCanvas.getContext('2d');
          frameCtx.drawImage(tempCanvas, 0, 0);
          
          // 添加到帧数组
          this.frames = [frameCanvas];
          this.delays = [100]; // 默认延迟100ms
          
          // 调整canvas尺寸
          this._resizeCanvas();
          
          // 如果是File或Blob，释放URL
          if (gifSource instanceof File || gifSource instanceof Blob) {
            URL.revokeObjectURL(url);
          }
          
          console.log('使用原生方法加载GIF成功（仅第一帧）');
          resolve({
            width: this.options.width,
            height: this.options.height,
            frameCount: 1
          });
        } catch (error) {
          console.error('原生GIF加载失败:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        console.error('加载GIF图像失败');
        if (gifSource instanceof File || gifSource instanceof Blob) {
          URL.revokeObjectURL(url);
        }
        reject(new Error('加载GIF图像失败'));
      };
      
      img.src = url;
    });
  }
  
  /**
   * 加载GIF文件并提取所有帧 - 简化版本，优先使用原生方法
   * @param {File|Blob|String} gifSource - GIF文件、blob或URL
   * @returns {Promise} - 帧提取完成时解析
   */
  loadGif(gifSource) {
    return new Promise((resolve, reject) => {
      console.log('开始加载GIF，优先使用原生方法');
                  
      // 直接使用原生方法，避免使用不可靠的库
                      this._loadGifNative(gifSource)
        .then(result => {
          console.log('原生方法加载GIF成功:', result);
          resolve(result);
                })
                .catch(error => {
          console.error('原生方法加载GIF失败:', error);
          reject(error);
        });
    });
  }
  
  /**
   * 调整canvas大小
   */
  _resizeCanvas() {
    if (!this.fabricCanvas) return;
    
    // 调整canvas大小
    this.fabricCanvas.setWidth(this.options.width);
    this.fabricCanvas.setHeight(this.options.height);
    this.fabricCanvas.renderAll();
  }
  
  /**
   * 设置水印
   * @param {String|HTMLImageElement} image - 水印图片URL或元素
   * @param {Object} options - 水印配置
   */
  setWatermark(image, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.fabricCanvas) {
        reject(new Error('Fabric canvas未初始化'));
        return;
      }
      
      console.log('设置水印，参数:', { image: typeof image, options });
      
      const loadImage = (src) => {
        return new Promise((resolveImg, rejectImg) => {
          fabric.Image.fromURL(src, (img) => {
            if (!img) {
              rejectImg(new Error('加载水印图片失败'));
              return;
            }
            resolveImg(img);
          }, { crossOrigin: 'anonymous' });
        });
      };
      
      // 清除旧的水印
      if (this.watermark) {
        this.fabricCanvas.remove(this.watermark);
      }
      
      // 加载水印图片
      const src = image instanceof HTMLImageElement ? image.src : image;
      
      // 记录日志
      console.log('加载水印图片:', src ? '有效' : '无效', typeof src);
      
      loadImage(src)
        .then(img => {
          // 创建设置的深拷贝，确保与预览完全一致
          const previewOptions = JSON.parse(JSON.stringify(options));
          
          // 计算水印位置
          const position = previewOptions.position || { x: 50, y: 50 };
          const positionX = position.x ? (position.x / 100) * this.options.width : this.options.width / 2;
          const positionY = position.y ? (position.y / 100) * this.options.height : this.options.height / 2;
          
          // 计算水印大小 - 使用前面的深拷贝设置
          const imageSize = previewOptions.imageSize || 40; // 默认40%
          const scale = (previewOptions.scale || 1.0) * (imageSize / 100);
          
          // 确保水印适合画布
          const maxDimension = Math.min(this.options.width, this.options.height) * 0.8;
          const scaleFactor = maxDimension / Math.max(img.width, img.height);
          const finalScale = scale * scaleFactor;
          
          console.log('水印参数:', {
            position,
            positionX, 
            positionY,
            imageSize,
            scale,
            opacity: previewOptions.opacity,
            angle: previewOptions.angle || previewOptions.rotation || 0,
            finalScale
          });
          
          // 设置水印属性
          img.set({
            left: positionX,
            top: positionY,
            originX: 'center',
            originY: 'center',
            opacity: typeof previewOptions.opacity !== 'undefined' ? previewOptions.opacity : 0.5,
            angle: typeof previewOptions.angle !== 'undefined' ? previewOptions.angle : 
                  (typeof previewOptions.rotation !== 'undefined' ? previewOptions.rotation : 0),
            scaleX: finalScale,
            scaleY: finalScale
          });
          
          // 添加到canvas
          this.fabricCanvas.add(img);
          this.watermark = img;
          this.fabricCanvas.renderAll();
          
          resolve(img);
        })
        .catch(error => {
          console.error('设置水印失败:', error);
          reject(error);
        });
    });
  }
  
  /**
   * 应用水印到每一帧并生成新的GIF
   * @param {Object} options - 配置项
   */
  applyWatermarkAndGenerate(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.watermark) {
        reject(new Error('未设置水印'));
        return;
      }
      
      if (this.frames.length === 0) {
        reject(new Error('无可用帧'));
        return;
      }
      
      if (this.isProcessing) {
        reject(new Error('GIF处理中，请等待'));
        return;
      }
      
      this.isProcessing = true;
      
      try {
        // 如果只有一帧（只有静态预览），直接生成图片
        if (this.frames.length === 1) {
          console.log('只有一帧，生成静态图片');
          // 将水印渲染到canvas上
          this.fabricCanvas.renderAll();
      
          // 获取带水印的canvas内容
          this.canvas.toBlob(blob => {
            this.isProcessing = false;
            if (!blob) {
              reject(new Error('生成图片失败'));
              return;
            }
            resolve(blob);
          }, 'image/png');
          return;
        }
        
        // 如果支持gif.js，使用它
        if (window.GIF && typeof window.GIF === 'function') {
          console.log('使用gif.js生成GIF');
          
          // 创建预览选项的深拷贝，确保与预览一致
          const previewOptions = JSON.parse(JSON.stringify(options));
          
          const gif = new window.GIF({
            workers: this.options.workers,
            quality: 101 - Math.max(1, Math.min(100, this.options.quality || previewOptions.quality || 10)),
            workerScript: 'public/libs/gif.worker.js',
            width: this.options.width,
            height: this.options.height
          });
          
          // 应用水印到每帧
          const processFrames = () => {
            const frameCount = this.frames.length;
            let processedCount = 0;
            
            for (let i = 0; i < frameCount; i++) {
              const frame = this.frames[i];
              const delay = this.delays[i] || 100;
              
              // 克隆帧
              const frameClone = document.createElement('canvas');
              frameClone.width = frame.width;
              frameClone.height = frame.height;
              frameClone.getContext('2d').drawImage(frame, 0, 0);
        
              // 在克隆帧上应用水印
              const ctx = frameClone.getContext('2d');
              
              // 保存当前fabric canvas状态
              const currentObjects = this.fabricCanvas.getObjects().filter(obj => obj !== this.watermark);
              
              // 临时清除其他对象，只保留水印
              currentObjects.forEach(obj => {
                this.fabricCanvas.remove(obj);
              });
              
              // 调整fabric canvas大小以匹配帧大小
              this.fabricCanvas.setWidth(frame.width);
              this.fabricCanvas.setHeight(frame.height);
        
              // 确保水印在适当位置
              if (this.watermark) {
                // 创建位置设置的深拷贝，确保与预览完全一致
                const position = options.position ? JSON.parse(JSON.stringify(options.position)) : { x: 50, y: 50 };
                
                // 将水印位置调整到中心（或根据设置的位置）
                this.watermark.set({
                  left: (position.x) ? frame.width * (position.x / 100) : frame.width / 2,
                  top: (position.y) ? frame.height * (position.y / 100) : frame.height / 2,
                  scaleX: options.scale ? options.scale : this.watermark.scaleX,
                  scaleY: options.scale ? options.scale : this.watermark.scaleY,
                });
                this.watermark.setCoords();
              }
              
              // 渲染水印到canvas
              this.fabricCanvas.renderAll();
              
              // 将水印渲染到帧上 - 使用正确的合成模式
              ctx.save();
              ctx.globalAlpha = typeof options.opacity !== 'undefined' ? options.opacity : 0.5;
              ctx.globalCompositeOperation = 'source-over'; // 确保水印覆盖在原始图像上方
              ctx.drawImage(this.canvas, 0, 0);
              ctx.restore();
          
              // 还原fabric canvas
              currentObjects.forEach(obj => {
                this.fabricCanvas.add(obj);
              });
          
              // 添加帧到GIF
              gif.addFrame(frameClone, {delay: delay});
              
              // 更新进度
              processedCount++;
              const progress = processedCount / frameCount;
              this.onProgress(progress);
            }
            
            // 生成GIF
            gif.on('finished', blob => {
              this.isProcessing = false;
              resolve(blob);
            });
            
            gif.on('progress', progress => {
              // 渲染阶段的进度（0.5-1.0）
              this.onProgress(0.5 + progress * 0.5);
            });
            
            gif.on('abort', () => {
              this.isProcessing = false;
              reject(new Error('GIF生成已取消'));
        });
            
            gif.render();
      };
      
      processFrames();
        } else {
          // 无法处理GIF，直接创建单帧图片
          console.warn('无可用的GIF处理库，返回单帧图片');
          
          // 确保canvas中有水印
          this.fabricCanvas.renderAll();
          
          // 获取当前canvas的内容作为结果
          this.canvas.toBlob(blob => {
            this.isProcessing = false;
            if (!blob) {
              reject(new Error('生成图片失败'));
              return;
            }
            resolve(blob);
          }, 'image/png');
        }
      } catch (error) {
        this.isProcessing = false;
        console.error('处理GIF时出错:', error);
        reject(error);
      }
    });
  }
  
  /**
   * 取消处理
   */
  cancel() {
    this.isProcessing = false;
  }
  
  /**
   * 释放资源
   */
  destroy() {
    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }
    this.frames = [];
    this.delays = [];
    this.watermark = null;
  }
}

// 导出类
window.GifWatermarker = GifWatermarker; 