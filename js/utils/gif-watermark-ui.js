/**
 * GIF水印UI控制器
 * 桥接GIF水印工具与UI界面的交互
 */
const GifWatermarkUI = {
  /**
   * 初始化GIF水印UI
   */
  init: function() {
    console.log('初始化GIF水印UI');

    // 设置质量滑块
    const qualitySlider = document.getElementById('gif-quality');
    const qualityValue = document.getElementById('gif-quality-value');
    
    if (qualitySlider && qualityValue) {
      qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value;
      });
    }
    
    // 确保omggif库正确初始化
    if (typeof GifWatermarker !== 'undefined' && typeof GifWatermarker.init === 'function') {
      console.log('正在初始化GIF库');
      GifWatermarker.init();
    }
    
    // 创建GIF水印处理器
    try {
      this.gifProcessor = new GifWatermarker({
        quality: 10,
        workers: 2,
        onProgress: this.updateProgress.bind(this)
      });
      
      console.log('GIF水印处理器初始化成功');
      
      // 将处理器添加到window对象，便于主程序调用
      window.gifProcessor = this.gifProcessor;
      window.GifWatermarkUI = this;
    } catch (error) {
      console.error('GIF水印处理器初始化失败:', error);
    }
    
    // 初始化标志
    window.gifWatermarkUIInitialized = true;
  },
  
  /**
   * 更新进度条
   * @param {Number} progress - 处理进度，0-1
   */
  updateProgress: function(progress) {
    const progressBar = document.getElementById('gif-progress-bar');
    const progressContainer = document.getElementById('gif-progress-container');
    const modalProgressBar = document.getElementById('modal-progress-bar');
    
    const percent = Math.floor(progress * 100);
    
    if (progressBar) {
      progressBar.style.width = percent + '%';
      progressContainer.style.display = 'block';
    }
    
    if (modalProgressBar) {
      modalProgressBar.style.width = percent + '%';
      modalProgressBar.textContent = percent + '%';
    }
  },
  
  /**
   * 处理GIF图片
   * @param {File} gifFile - GIF文件
   * @param {Object} watermarkOptions - 水印选项
   * @returns {Promise} - 返回处理后的Blob
   */
  processGif: function(gifFile, watermarkOptions) {
    return new Promise((resolve, reject) => {
      console.log('开始处理GIF', gifFile.name);
      
      if (!this.gifProcessor) {
        this._initProcessorIfNeeded();
      }
      
      if (!this.gifProcessor) {
        reject(new Error('GIF处理器未初始化'));
        return;
      }
      
      // 显示进度条
      const progressContainer = document.getElementById('gif-progress-container');
      if (progressContainer) {
        progressContainer.style.display = 'block';
      }
      
      // 从界面获取GIF质量
      const qualitySlider = document.getElementById('gif-quality');
      const quality = qualitySlider ? parseInt(qualitySlider.value) : 10;
      
      // 设置超时控制
      const timeout = setTimeout(() => {
        console.warn('GIF处理超时，尝试取消操作');
        if (this.gifProcessor) {
          this.gifProcessor.cancel();
        }
        reject(new Error('GIF处理超时'));
      }, 30000); // 30秒超时
      
      // 第1步：加载GIF文件
      console.log('步骤1/3: 加载GIF文件');
      this.updateProgress(0.1); // 10%进度
      
      this.gifProcessor.loadGif(gifFile)
        .then(result => {
          console.log('GIF加载完成:', result);
          
          // 第2步：应用水印
          console.log('步骤2/3: 设置水印');
          this.updateProgress(0.3); // 30%进度
          
          // 提取水印图片URL
          const watermarkUrl = this._getWatermarkUrl(watermarkOptions);
          
          // 创建水印选项的深拷贝，确保所见即所得
          const previewWatermarkOptions = JSON.parse(JSON.stringify(watermarkOptions));
          
          return this.gifProcessor.setWatermark(watermarkUrl, previewWatermarkOptions)
            .then(() => {
              // 第3步：生成最终GIF
              console.log('步骤3/3: 生成GIF');
              this.updateProgress(0.5); // 50%进度
              
              const generationOptions = {
                quality: quality
              };
              
              return this.gifProcessor.applyWatermarkAndGenerate(generationOptions);
            });
        })
        .then(blob => {
          console.log('GIF处理完成');
          this.updateProgress(1); // 100%进度
          
          // 成功完成，清除超时
          clearTimeout(timeout);
          
          // 从原始文件中获取文件路径和相关信息
          const originalPath = gifFile.webkitRelativePath || '';
          const directory = originalPath ? originalPath.split('/').slice(0, -1).join('/') : '';
          const newFileName = 'watermarked_' + gifFile.name;
          
          // 将blob包装成文件，保持原始文件名
          const processedFile = new File([blob], newFileName, {
            type: blob.type || 'image/gif'
          });
          
          // 为处理后的文件添加原始文件引用，用于保留目录结构
          processedFile.originalFile = gifFile;
          
          // 返回处理结果
          resolve({
            file: processedFile,
            originalFile: gifFile,
            isGif: true,
            watermarkApplied: true,
            previewUrl: URL.createObjectURL(blob) // 提供预览URL
          });
          
          // 隐藏进度条（延迟一会）
          setTimeout(() => {
            const progressContainer = document.getElementById('gif-progress-container');
            if (progressContainer) {
              progressContainer.style.display = 'none';
            }
          }, 1000);
        })
        .catch(error => {
          console.error('GIF处理失败:', error);
          this.updateProgress(0); // 重置进度
          
          // 出现错误，清除超时
          clearTimeout(timeout);
          
          // 隐藏进度条
          const progressContainer = document.getElementById('gif-progress-container');
          if (progressContainer) {
            progressContainer.style.display = 'none';
          }
          
          // 尝试降级处理：获取第一帧并返回静态图像
          this._processFallbackImage(gifFile, watermarkOptions)
            .then(result => {
              console.log('使用降级方法处理GIF成功');
              resolve(result);
            })
            .catch(fallbackError => {
              console.error('降级处理也失败:', fallbackError);
              reject(error);
            });
        });
    });
  },
  
  /**
   * 批量处理GIF图片
   * @param {Array<File>} files - 文件列表
   * @param {Object} watermarkOptions - 水印选项
   * @returns {Promise} - 返回处理后的文件列表
   */
  batchProcessGifs: function(files, watermarkOptions) {
    return new Promise((resolve, reject) => {
      console.log('开始批量处理GIF，文件数:', files.length);
      
      const gifFiles = files.filter(file => file.type === 'image/gif');
      const nonGifFiles = files.filter(file => file.type !== 'image/gif');
      
      if (gifFiles.length === 0) {
        console.log('没有GIF文件，跳过处理');
        resolve({
          processedFiles: [],
          skippedFiles: files
        });
        return;
      }
      
      console.log('发现GIF文件数:', gifFiles.length);
      
      // 序列处理GIF文件
      const processedFiles = [];
      let currentIndex = 0;
      
      const processNext = () => {
        if (currentIndex >= gifFiles.length) {
          // 所有GIF处理完成
          console.log('所有GIF文件处理完成');
          resolve({
            processedFiles: processedFiles,
            skippedFiles: nonGifFiles
          });
          return;
        }
        
        const currentFile = gifFiles[currentIndex];
        const modalStatus = document.getElementById('processing-status');
        if (modalStatus) {
          modalStatus.textContent = `处理GIF: ${currentFile.name} (${currentIndex + 1}/${gifFiles.length})`;
        }
        
        this.processGif(currentFile, watermarkOptions)
          .then(result => {
            processedFiles.push(result.file);
            currentIndex++;
            
            // 防止UI阻塞，使用setTimeout处理下一个
            setTimeout(processNext, 100);
          })
          .catch(error => {
            console.error(`处理GIF文件失败 [${currentFile.name}]:`, error);
            
            // 继续处理下一个
            currentIndex++;
            setTimeout(processNext, 100);
          });
      };
      
      // 开始处理第一个文件
      processNext();
    });
  },
  
  /**
   * 当处理器未初始化时尝试初始化
   * @private
   */
  _initProcessorIfNeeded: function() {
    try {
      console.log('尝试初始化GIF处理器');
      this.gifProcessor = new GifWatermarker({
        quality: 10,
        workers: 2,
        onProgress: this.updateProgress.bind(this)
      });
      window.gifProcessor = this.gifProcessor;
    } catch (error) {
      console.error('GIF处理器初始化失败:', error);
    }
  },
  
  /**
   * 降级处理：提取第一帧并作为静态图像处理
   * @param {File} gifFile - GIF文件
   * @param {Object} watermarkOptions - 水印选项
   * @returns {Promise} - 返回处理后的静态图像
   * @private
   */
  _processFallbackImage: function(gifFile, watermarkOptions) {
    return new Promise((resolve, reject) => {
      console.log('尝试降级处理：提取第一帧作为静态图像');
      
      // 创建Image和Canvas
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // 设置canvas尺寸
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // 绘制第一帧
        ctx.drawImage(img, 0, 0);
        
        // 在画布上添加水印文字（简单的文字水印）
        if (watermarkOptions.text) {
          ctx.font = `${watermarkOptions.fontSize || 36}px Arial`;
          ctx.fillStyle = watermarkOptions.color || 'red';
          ctx.globalAlpha = watermarkOptions.opacity || 0.5;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((watermarkOptions.rotation || 0) * Math.PI / 180);
          ctx.fillText(watermarkOptions.text, 0, 0);
          ctx.restore();
        }
        
        // 将结果转换为Blob
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('生成降级图片失败'));
            return;
          }
          
          // 创建新文件
          const newFileName = 'watermarked_static_' + gifFile.name.replace('.gif', '.png');
          const processedFile = new File([blob], newFileName, { type: 'image/png' });
          
          resolve({
            file: processedFile,
            originalFile: gifFile,
            isGif: false, // 这不是GIF了
            watermarkApplied: true,
            previewUrl: URL.createObjectURL(blob)
          });
        }, 'image/png');
      };
      
      img.onerror = () => {
        reject(new Error('加载GIF图像失败'));
      };
      
      img.src = URL.createObjectURL(gifFile);
    });
  },
  
  /**
   * 从水印选项中获取水印图片URL
   * @param {Object} watermarkOptions - 水印选项
   * @returns {String} - 水印图片URL
   * @private
   */
  _getWatermarkUrl: function(watermarkOptions) {
    // 如果传入了图片URL
    if (watermarkOptions.imageUrl) {
      return watermarkOptions.imageUrl;
    }
    
    // 如果传入了图片元素
    if (watermarkOptions.imageElement) {
      return watermarkOptions.imageElement.src;
    }
    
    // 否则创建文字水印
    return this._createTextWatermark(
      watermarkOptions.text || '图片水印',
      watermarkOptions
    );
  },
  
  /**
   * 创建文字水印图片
   * @param {String} text - 水印文字
   * @param {Object} options - 文字水印选项
   * @returns {String} - 水印图片URL
   * @private
   */
  _createTextWatermark: function(text, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置字体
    const fontSize = options.fontSize || 36;
    const font = `${fontSize}px Arial`;
    ctx.font = font;
    
    // 测量文字宽度
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2; // 估计文字高度
    
    // 设置画布大小，预留空间
    canvas.width = textWidth + 40;
    canvas.height = textHeight + 40;
    
    // 重新设置字体（canvas重置后需要再次设置）
    ctx.font = font;
    ctx.fillStyle = options.color || 'red';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 绘制文字
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // 返回图片URL
    return canvas.toDataURL('image/png');
  }
};

// 自动初始化
if (typeof window !== 'undefined') {
  // 将对象暴露给全局
  window.GifWatermarkUI = GifWatermarkUI;
  
  // 如果DOM已加载，则初始化
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => GifWatermarkUI.init(), 1000);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => GifWatermarkUI.init(), 1000);
    });
  }
} 