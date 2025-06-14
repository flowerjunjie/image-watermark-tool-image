/**
 * 水印核心功能模块
 * 处理各种类型的水印渲染、定位和缩放
 */
export class WatermarkCore {
  /**
   * 构造函数
   * @param {AppState} state - 应用状态
   */
  constructor(state) {
    this.state = state;
    
    // 创建水印画布和上下文
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 创建水印图片对象 (用于图片水印)
    this.watermarkImage = new Image();
    
    // 水印拖动状态
    this.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };
    
    // 初始化水印拖拽相关事件
    this.initWatermarkDrag();
  }
  
  /**
   * 初始化水印拖拽功能
   */
  initWatermarkDrag() {
    // 获取水印容器
    const watermarkContainer = document.getElementById('watermark-container');
    
    if (!watermarkContainer) {
      console.error('找不到水印容器元素');
      return;
    }
    
    // 创建拖拽控制点
    const dragHandle = document.createElement('div');
    dragHandle.className = 'watermark-drag-handle';
    dragHandle.style.display = 'none';
    watermarkContainer.appendChild(dragHandle);
    
    // 鼠标按下事件 - 开始拖拽
    dragHandle.addEventListener('mousedown', (e) => {
      if (this.state.watermarkSettings.position !== 'custom') return;
      
      this.dragState.isDragging = true;
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
      
      // 记录当前水印位置作为偏移量
      this.dragState.offsetX = this.state.watermarkSettings.x;
      this.dragState.offsetY = this.state.watermarkSettings.y;
      
      // 添加拖拽类
      document.body.classList.add('dragging-watermark');
      
      e.preventDefault();
    });
    
    // 鼠标移动事件 - 拖拽中
    document.addEventListener('mousemove', (e) => {
      if (!this.dragState.isDragging) return;
      
      // 计算拖拽的距离
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      
      // 更新水印位置
      const previewContainer = document.getElementById('preview-container');
      const previewImage = document.getElementById('preview-image');
      
      if (previewContainer && previewImage && previewImage.style.display !== 'none') {
        // 获取图片和预览容器的边界
        const containerRect = previewContainer.getBoundingClientRect();
        const imageRect = previewImage.getBoundingClientRect();
        
        // 将拖拽位置从屏幕坐标转换为图片内部坐标
        const imageX = this.dragState.offsetX + dx * (previewImage.naturalWidth / imageRect.width);
        const imageY = this.dragState.offsetY + dy * (previewImage.naturalHeight / imageRect.height);
        
        // 更新水印设置
        this.state.updateWatermarkSettings({
          x: imageX,
          y: imageY
        });
        
        // 更新水印位置
        this.updateWatermarkPosition();
      }
    });
    
    // 鼠标松开事件 - 结束拖拽
    document.addEventListener('mouseup', () => {
      if (!this.dragState.isDragging) return;
      
      this.dragState.isDragging = false;
      document.body.classList.remove('dragging-watermark');
    });
    
    // 滚轮事件 - 调整水印大小
    watermarkContainer.addEventListener('wheel', (e) => {
      // 仅在自定义位置模式下启用
      if (this.state.watermarkSettings.position !== 'custom') return;
      
      e.preventDefault();
      
      // 根据水印类型调整相应的大小
      if (this.state.watermarkSettings.type === 'text') {
        // 调整字体大小
        let fontSize = this.state.watermarkSettings.fontSize;
        fontSize += e.deltaY < 0 ? 1 : -1; // 向上滚动增大，向下滚动减小
        fontSize = Math.max(10, Math.min(100, fontSize)); // 限制在10-100之间
        
        this.state.updateWatermarkSettings({ fontSize });
      } else if (this.state.watermarkSettings.type === 'image') {
        // 调整图片水印大小
        let imageSize = this.state.watermarkSettings.imageSize;
        imageSize += e.deltaY < 0 ? 0.01 : -0.01;
        imageSize = Math.max(0.1, Math.min(1, imageSize)); // 限制在0.1-1之间
        
        this.state.updateWatermarkSettings({ imageSize });
      }
      
      // 更新水印
      this.applyWatermark();
    });
  }
  
  /**
   * 应用水印到当前图片
   * @returns {Promise<HTMLCanvasElement|null>} 处理后的Canvas
   */
  async applyWatermark() {
    const image = this.state.currentImage;
    if (!image || !image.result) return null;
    
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkContainer = document.getElementById('watermark-container');
    
    if (!previewImage || !previewCanvas || !watermarkContainer) {
      console.error('找不到预览元素');
      return null;
    }
    
    try {
      // 如果是GIF，我们只预览第一帧
      if (image.isGif) {
        // 预览区域使用图片模式
        previewCanvas.style.display = 'none';
        previewImage.style.display = 'block';
        
        // 更新水印位置
        this.updateWatermarkPosition();
        
        // 返回null表示GIF在实际下载时才处理
        return null;
      } else {
        // 普通图片处理
        const img = new Image();
        
        // 等待图片加载
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = image.result.blobUrl || URL.createObjectURL(image.file);
        });
        
        // 设置预览画布尺寸
        previewCanvas.width = img.naturalWidth;
        previewCanvas.height = img.naturalHeight;
        
        // 绘制原始图片
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(img, 0, 0);
        
        // 应用水印
        await this.applyWatermarkToCanvas(ctx, previewCanvas.width, previewCanvas.height);
        
        // 显示结果
        previewCanvas.style.display = 'block';
        previewImage.style.display = 'none';
        
        // 更新水印位置
        this.updateWatermarkPosition();
        
        return previewCanvas;
      }
    } catch (error) {
      console.error('应用水印失败:', error);
      return null;
    }
  }

  /**
   * 将水印应用到指定的Canvas上下文
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @returns {Promise<void>}
   */
  async applyWatermarkToCanvas(ctx, width, height) {
    const settings = this.state.watermarkSettings;
    
    // 保存上下文状态
    ctx.save();
    
    // 应用透明度
    ctx.globalAlpha = settings.opacity;
    
    // 根据水印类型应用不同的渲染方法
    switch(settings.type) {
      case 'text':
        this.applyTextWatermark(ctx, width, height);
        break;
        
      case 'image':
        await this.applyImageWatermark(ctx, width, height);
        break;
        
      case 'tiled':
        this.applyTiledWatermark(ctx, width, height);
        break;
    }
    
    // 恢复上下文状态
    ctx.restore();
  }
  
  /**
   * 应用文字水印
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  applyTextWatermark(ctx, width, height) {
    const settings = this.state.watermarkSettings;
    
    // 计算字体大小，处理相对缩放模式
    let fontSize = settings.fontSize;
    if (settings.scaleMode === 'relative') {
      // 计算相对于图像大小的字体大小
      const minDimension = Math.min(width, height);
      fontSize = Math.round(minDimension * settings.scaleRatio);
    }
    
    // 设置字体
    ctx.font = `${fontSize}px ${settings.fontFamily}`;
    ctx.fillStyle = settings.color;
    
    // 获取文本尺寸
    const textMetrics = ctx.measureText(settings.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize; // 近似高度
    
    // 根据位置类型确定水印位置
    const position = this.calculatePosition(settings.position, width, height, textWidth, textHeight);
    
    // 应用旋转（围绕文字中心点）
    if (settings.rotation !== 0) {
      ctx.translate(position.x + textWidth / 2, position.y - textHeight / 2);
      ctx.rotate(settings.rotation * Math.PI / 180);
      ctx.translate(-(position.x + textWidth / 2), -(position.y - textHeight / 2));
    }
    
    // 如果是平铺模式
    if (settings.position === 'tile') {
      this.drawTiledText(ctx, settings.text, width, height, settings.tileSpacing, fontSize);
    } else {
      // 绘制单个水印
      ctx.fillText(settings.text, position.x, position.y);
    }
  }
  
  /**
   * 绘制平铺文字水印
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {string} text - 水印文字
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {number} spacing - 平铺间距
   * @param {number} fontSize - 字体大小
   */
  drawTiledText(ctx, text, width, height, spacing, fontSize) {
    // 测量文本大小
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize; // 近似高度
    
    // 确定行列数
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    
    // 计算偏移量使水印均匀分布
    const offsetX = (spacing - textWidth) / 2;
    const offsetY = (spacing - textHeight) / 2;
    
    // 绘制水印网格
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing + offsetX;
        const y = row * spacing + textHeight + offsetY;
        
        // 每隔一行偏移半个单元格，形成错位效果
        const rowOffset = row % 2 === 0 ? 0 : spacing / 2;
        
        ctx.fillText(text, x + rowOffset, y);
      }
    }
  }
  
  /**
   * 应用图片水印
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @returns {Promise<void>}
   */
  async applyImageWatermark(ctx, width, height) {
    const settings = this.state.watermarkSettings;
    
    // 如果没有水印图片URL，则返回
    if (!settings.imageUrl) return;
    
    try {
      // 加载水印图片
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = settings.imageUrl;
      });
      
      // 计算水印图片的显示尺寸
      let wmWidth, wmHeight;
      
      if (settings.scaleMode === 'relative') {
        // 相对缩放模式
        const minDimension = Math.min(width, height);
        const scaleFactor = settings.scaleRatio;
        
        wmWidth = minDimension * scaleFactor;
        wmHeight = (img.height / img.width) * wmWidth;
      } else {
        // 固定缩放模式
        wmWidth = img.width * settings.imageSize;
        wmHeight = img.height * settings.imageSize;
      }
      
      // 根据位置类型确定水印位置
      const position = this.calculatePosition(settings.position, width, height, wmWidth, wmHeight);
      
      // 应用旋转（围绕图片中心点）
      if (settings.rotation !== 0) {
        ctx.translate(position.x + wmWidth / 2, position.y + wmHeight / 2);
        ctx.rotate(settings.rotation * Math.PI / 180);
        ctx.translate(-(position.x + wmWidth / 2), -(position.y + wmHeight / 2));
      }
      
      // 如果是平铺模式
      if (settings.position === 'tile') {
        this.drawTiledImage(ctx, img, width, height, settings.tileSpacing, wmWidth, wmHeight);
      } else {
        // 绘制单个水印
        ctx.drawImage(img, position.x, position.y, wmWidth, wmHeight);
      }
    } catch (error) {
      console.error('应用图片水印失败:', error);
    }
  }
  
  /**
   * 绘制平铺图片水印
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {HTMLImageElement} img - 水印图片
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {number} spacing - 平铺间距
   * @param {number} wmWidth - 水印宽度
   * @param {number} wmHeight - 水印高度
   */
  drawTiledImage(ctx, img, width, height, spacing, wmWidth, wmHeight) {
    // 确定行列数
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;
    
    // 计算偏移量使水印均匀分布
    const offsetX = (spacing - wmWidth) / 2;
    const offsetY = (spacing - wmHeight) / 2;
    
    // 绘制水印网格
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing + offsetX;
        const y = row * spacing + offsetY;
        
        // 每隔一行偏移半个单元格，形成错位效果
        const rowOffset = row % 2 === 0 ? 0 : spacing / 2;
        
        ctx.drawImage(img, x + rowOffset, y, wmWidth, wmHeight);
      }
    }
  }
  
  /**
   * 应用平铺水印
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  applyTiledWatermark(ctx, width, height) {
    const settings = this.state.watermarkSettings;
    
    // 平铺水印就是选择了平铺定位的文字或图片水印
    if (settings.type === 'text') {
      this.applyTextWatermark(ctx, width, height);
    } else if (settings.type === 'image') {
      this.applyImageWatermark(ctx, width, height);
    }
  }
  
  /**
   * 计算水印位置
   * @param {string} positionType - 位置类型
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {number} wmWidth - 水印宽度
   * @param {number} wmHeight - 水印高度
   * @returns {Object} 位置坐标 {x, y}
   */
  calculatePosition(positionType, width, height, wmWidth, wmHeight) {
    const settings = this.state.watermarkSettings;
    const margin = {
      x: settings.marginX,
      y: settings.marginY
    };
    
    // 确保水印不会超出边界
    const maxX = width - wmWidth - margin.x;
    const maxY = height - wmHeight - margin.y;
    
    switch (positionType) {
      case 'top-left':
        return {
          x: margin.x,
          y: margin.y + wmHeight
        };
        
      case 'top-right':
        return {
          x: maxX,
          y: margin.y + wmHeight
        };
        
      case 'bottom-left':
        return {
          x: margin.x,
          y: maxY
        };
        
      case 'bottom-right':
        return {
          x: maxX,
          y: maxY
        };
        
      case 'center':
        return {
          x: (width - wmWidth) / 2,
          y: (height + wmHeight) / 2 // 文字基线位置调整
        };
        
      case 'custom':
        // 使用自定义坐标，但确保在边界内
        return {
          x: Math.max(margin.x, Math.min(settings.x, maxX)),
          y: Math.max(margin.y + wmHeight, Math.min(settings.y, maxY))
        };
        
      case 'tile':
        // 平铺模式下返回(0,0)，实际绘制在平铺函数中处理
        return { x: 0, y: 0 };
        
      default:
        return { x: margin.x, y: margin.y + wmHeight };
    }
  }
  
  /**
   * 更新水印元素的位置
   */
  updateWatermarkPosition() {
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const watermarkContainer = document.getElementById('watermark-container');
    
    // 获取显示的元素
    const displayElement = previewImage.style.display !== 'none' ? previewImage : previewCanvas;
    
    if (!displayElement || !watermarkContainer) return;
    
    // 获取水印设置
    const settings = this.state.watermarkSettings;
    
    // 获取拖拽控制点
    const dragHandle = watermarkContainer.querySelector('.watermark-drag-handle');
    
    // 如果是平铺模式或没有拖拽控制点，则隐藏
    if (settings.position === 'tile' || !dragHandle) {
      if (dragHandle) dragHandle.style.display = 'none';
      return;
    }
    
    // 只在自定义定位模式下显示拖拽控制点
    dragHandle.style.display = settings.position === 'custom' ? 'block' : 'none';
    
    // 获取图片在预览区域中的实际尺寸和位置
    const rect = displayElement.getBoundingClientRect();
    const containerRect = watermarkContainer.getBoundingClientRect();
    
    // 计算水印位置
    if (displayElement === previewImage && previewImage.naturalWidth > 0) {
      // 从图片坐标系转换到显示坐标系
      const scaleX = rect.width / previewImage.naturalWidth;
      const scaleY = rect.height / previewImage.naturalHeight;
      
      // 默认使用文字水印位置
      let x, y;
      
      // 计算基于当前水印类型和位置的控制点位置
      if (settings.type === 'text') {
        // 测量文本宽度和高度
        this.ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
        const textMetrics = this.ctx.measureText(settings.text);
        const textWidth = textMetrics.width;
        const textHeight = settings.fontSize;
        
        // 计算文字水印的位置
        const position = this.calculatePosition(
          settings.position, 
          previewImage.naturalWidth, 
          previewImage.naturalHeight, 
          textWidth, 
          textHeight
        );
        
        // 调整Y坐标，使控制点在文字中心
        x = position.x + textWidth / 2;
        y = position.y - textHeight / 2;
      } else if (settings.type === 'image' && settings.imageUrl) {
        // 加载图片并计算尺寸
        const imgElement = new Image();
        imgElement.src = settings.imageUrl;
        
        // 计算水印图片的尺寸
        let wmWidth, wmHeight;
        if (settings.scaleMode === 'relative') {
          const minDimension = Math.min(previewImage.naturalWidth, previewImage.naturalHeight);
          wmWidth = minDimension * settings.scaleRatio;
          wmHeight = imgElement.height ? (imgElement.height / imgElement.width) * wmWidth : wmWidth;
        } else {
          wmWidth = imgElement.width * settings.imageSize;
          wmHeight = imgElement.height * settings.imageSize;
        }
        
        // 如果图片还没加载完，使用近似值
        if (!imgElement.width) {
          wmWidth = 100 * settings.imageSize;
          wmHeight = 100 * settings.imageSize;
        }
        
        // 计算图片水印的位置
        const position = this.calculatePosition(
          settings.position, 
          previewImage.naturalWidth, 
          previewImage.naturalHeight, 
          wmWidth, 
          wmHeight
        );
        
        // 控制点位于图片中心
        x = position.x + wmWidth / 2;
        y = position.y + wmHeight / 2;
      } else {
        // 默认位置
        x = settings.x;
        y = settings.y;
      }
      
      // 应用缩放转换到显示坐标系
      const displayX = x * scaleX + (containerRect.left - rect.left);
      const displayY = y * scaleY + (containerRect.top - rect.top);
      
      // 设置拖拽控制点位置
      dragHandle.style.left = `${displayX}px`;
      dragHandle.style.top = `${displayY}px`;
    }
  }
  
  /**
   * 设置水印图片
   * @param {string} url - 图片URL
   */
  setWatermarkImage(url) {
    this.state.updateWatermarkSettings({
      imageUrl: url,
      type: 'image'
    });
    
    // 更新预览
    this.applyWatermark();
  }
  
  /**
   * 用于将水印应用到帧缓冲区的方法
   * 主要用于GIF处理
   * @param {ImageData} imageData - 图像数据
   * @param {number} width - 图像宽度
   * @param {number} height - 图像高度
   * @returns {ImageData} 加入水印后的图像数据
   */
  applyWatermarkToBuffer(imageData, width, height) {
    // 创建临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const tempCtx = tempCanvas.getContext('2d');
    
    // 绘制原始图像数据
    tempCtx.putImageData(imageData, 0, 0);
    
    // 应用水印
    this.applyWatermarkToCanvas(tempCtx, width, height);
    
    // 获取处理后的图像数据
    return tempCtx.getImageData(0, 0, width, height);
  }
} 