/**
 * GIF水印处理核心类
 * 负责GIF文件的帧解析、水印应用和重新生成
 */
class GifWatermarker {
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
    
    // 初始化canvas用于水印编辑
    this._initCanvas(options.canvasId || 'watermark-container');
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
   * 加载GIF文件并提取所有帧
   * @param {File|Blob|String} gifSource - GIF文件、blob或URL
   * @returns {Promise} - 帧提取完成时解析
   */
  loadGif(gifSource) {
    return new Promise((resolve, reject) => {
      this.frames = [];
      this.delays = [];
      
      const url = gifSource instanceof File || gifSource instanceof Blob 
        ? URL.createObjectURL(gifSource)
        : gifSource;
      
      // 使用gifwrap解析GIF
      if (window.gifwrap && window.omggif) {
        console.log('使用gifwrap解析GIF');
        // 首先将GIF加载为ArrayBuffer
        fetch(url)
          .then(response => response.arrayBuffer())
          .then(buffer => {
            const gifReader = new window.gifwrap.GifReader(new Uint8Array(buffer));
            this._processGifFrames(gifReader)
              .then(() => {
                if (gifSource instanceof File || gifSource instanceof Blob) {
                  URL.revokeObjectURL(url);
                }
                resolve({
                  width: this.options.width,
                  height: this.options.height,
                  frameCount: this.frames.length
                });
              })
              .catch(reject);
          })
          .catch(reject);
      } else {
        reject(new Error('缺少GIF解析库'));
      }
    });
  }
  
  /**
   * 使用gifwrap处理帧
   * @param {GifReader} gifReader - gifwrap GifReader实例
   * @returns {Promise} - 所有帧处理完成时解析
   */
  _processGifFrames(gifReader) {
    return new Promise((resolve, reject) => {
      try {
        const frameCount = gifReader.numFrames();
        this.options.width = gifReader.width;
        this.options.height = gifReader.height;
        
        // 创建临时canvas用于帧提取
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.options.width;
        tempCanvas.height = this.options.height;
        const ctx = tempCanvas.getContext('2d');
        
        // 处理每一帧
        for (let i = 0; i < frameCount; i++) {
          const frameInfo = gifReader.frameInfo(i);
          this.delays.push(frameInfo.delay * 10); // 转换为ms
          
          // 提取帧像素
          const pixels = new Uint8ClampedArray(this.options.width * this.options.height * 4);
          gifReader.decodeAndBlitFrameRGBA(i, pixels);
          
          // 创建ImageData并绘制到canvas
          const imageData = new ImageData(pixels, this.options.width, this.options.height);
          ctx.putImageData(imageData, 0, 0);
          
          // 为每一帧克隆canvas
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = this.options.width;
          frameCanvas.height = this.options.height;
          const frameCtx = frameCanvas.getContext('2d');
          frameCtx.drawImage(tempCanvas, 0, 0);
          
          this.frames.push(frameCanvas);
        }
        
        this._resizeCanvas();
        resolve();
      } catch (error) {
        console.error('处理GIF帧时出错:', error);
        reject(error);
      }
    });
  }
  
  /**
   * 调整fabric.js canvas尺寸以匹配GIF尺寸
   */
  _resizeCanvas() {
    if (!this.fabricCanvas) return;
    
    this.fabricCanvas.setWidth(this.options.width);
    this.fabricCanvas.setHeight(this.options.height);
    
    // 显示第一帧作为背景
    if (this.frames.length > 0) {
      this.fabricCanvas.setBackgroundImage(
        new fabric.Image(this.frames[0], {
          originX: 'left',
          originY: 'top',
          selectable: false
        }),
        this.fabricCanvas.renderAll.bind(this.fabricCanvas)
      );
    }
  }
  
  /**
   * 设置水印图像
   * @param {HTMLImageElement|String} image - 图像元素或URL
   * @param {Object} options - 水印选项（位置、缩放等）
   * @returns {Promise} - 水印设置完成时解析
   */
  setWatermark(image, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.fabricCanvas) {
        reject(new Error('Canvas未初始化'));
        return;
      }
      
      // 如果存在之前的水印，则移除
      if (this.watermark) {
        this.fabricCanvas.remove(this.watermark);
      }
      
      const loadImage = (src) => {
        return new Promise((resolve, reject) => {
          if (typeof src === 'string') {
            fabric.Image.fromURL(src, img => resolve(img), null, { crossOrigin: 'anonymous' });
          } else if (src instanceof HTMLImageElement) {
            fabric.Image.fromElement(src, img => resolve(img));
          } else {
            reject(new Error('无效的图像源'));
          }
        });
      };
      
      loadImage(image)
        .then(img => {
          const defaultOptions = {
            left: this.options.width / 4,
            top: this.options.height / 4,
            originX: 'center',
            originY: 'center',
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#FF4949',
            cornerColor: '#FF4949',
            cornerStrokeColor: '#FFFFFF'
          };
          
          const watermarkOptions = Object.assign({}, defaultOptions, options);
          
          // 设置初始缩放
          const scaleX = 0.3;
          const scaleY = 0.3;
          img.set({
            scaleX,
            scaleY,
            ...watermarkOptions
          });
          
          this.watermark = img;
          this.fabricCanvas.add(this.watermark);
          this.fabricCanvas.setActiveObject(this.watermark);
          this.fabricCanvas.renderAll();
          
          // 保存水印位置到全局状态
          if (window.watermarkState) {
            // 计算相对位置（百分比）
            const relativeX = (this.watermark.left / this.options.width) * 100;
            const relativeY = (this.watermark.top / this.options.height) * 100;
            
            window.watermarkState.watermarkPosition = {
              x: Math.max(0, Math.min(100, relativeX)),
              y: Math.max(0, Math.min(100, relativeY))
            };
            
            console.log('更新GIF水印位置状态:', window.watermarkState.watermarkPosition);
          }
          
          resolve(this.watermark);
        })
        .catch(reject);
    });
  }
  
  /**
   * 应用水印到所有帧并生成新的GIF
   * @param {Object} options - GIF生成的其他选项
   * @returns {Promise<Blob>} - 以生成的GIF blob解析
   */
  applyWatermarkAndGenerate(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.frames.length) {
        reject(new Error('未加载帧'));
        return;
      }
      
      if (!this.watermark) {
        reject(new Error('未设置水印'));
        return;
      }
      
      this.isProcessing = true;
      const gifOptions = Object.assign({
        workers: this.options.workers || 2,
        quality: this.options.quality || 10,
        width: this.options.width,
        height: this.options.height,
        workerScript: 'public/libs/gif.worker.js'
      }, options);
      
      const gif = new GIF(gifOptions);
      
      // 克隆水印属性
      const watermarkProps = {
        left: this.watermark.left,
        top: this.watermark.top,
        scaleX: this.watermark.scaleX,
        scaleY: this.watermark.scaleY,
        angle: this.watermark.angle || 0,
        opacity: this.watermark.opacity || 1
      };
      
      // 创建临时canvas用于帧处理
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.options.width;
      tempCanvas.height = this.options.height;
      const ctx = tempCanvas.getContext('2d');
      
      // 处理每一帧
      let processedFrames = 0;
      const totalFrames = this.frames.length;
      
      // 处理带水印的帧
      const processFrames = () => {
        if (processedFrames >= totalFrames) {
          // 所有帧处理完毕，渲染最终GIF
          gif.on('progress', (progress) => {
            this.onProgress(0.5 + progress * 0.5); // 50-100%
          });
          
          gif.on('finished', (blob) => {
            this.isProcessing = false;
            this.onProgress(1);
            resolve(blob);
          });
          
          gif.on('abort', () => {
            this.isProcessing = false;
            reject(new Error('GIF生成已中止'));
          });
          
          gif.render();
          return;
        }
        
        // 绘制当前帧
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(this.frames[processedFrames], 0, 0);
        
        // 绘制水印
        const tempFabricCanvas = new fabric.StaticCanvas(null);
        tempFabricCanvas.setWidth(this.options.width);
        tempFabricCanvas.setHeight(this.options.height);
        
        // 为此帧克隆水印
        fabric.Image.fromObject(this.watermark.toObject(), (clonedWatermark) => {
          // 应用保存的属性
          clonedWatermark.set(watermarkProps);
          tempFabricCanvas.add(clonedWatermark);
          tempFabricCanvas.renderAll();
          
          // 将fabric canvas绘制到临时canvas
          ctx.drawImage(tempFabricCanvas.getElement(), 0, 0);
          
          // 将帧添加到gif.js
          gif.addFrame(tempCanvas, {
            delay: this.delays[processedFrames],
            copy: true
          });
          
          processedFrames++;
          this.onProgress(processedFrames / totalFrames * 0.5); // 0-50%
          
          // 处理下一帧（允许UI更新）
          setTimeout(processFrames, 0);
        });
      };
      
      // 开始处理
      processFrames();
    });
  }
  
  /**
   * 取消当前处理（如果有）
   */
  cancel() {
    this.isProcessing = false;
  }
  
  /**
   * 清理资源
   */
  destroy() {
    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
    }
    this.frames = [];
    this.delays = [];
    this.watermark = null;
  }
}

// 导出类
window.GifWatermarker = GifWatermarker; 