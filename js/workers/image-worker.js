/**
 * 图片处理Web Worker
 * 在后台线程中处理图片，避免阻塞主线程
 */

// Worker中没有Image对象，需要导入它
// 注意：在Worker中使用self代替window
self.Image = function() {
  const img = {
    onload: null,
    onerror: null,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    complete: false,
    crossOrigin: null,
    src: null
  };
  
  // 创建一个ImageBitmap来替代Image
  Object.defineProperty(img, 'src', {
    set: function(url) {
      // 使用fetch获取图片数据
      fetch(url)
        .then(response => response.blob())
        .then(blob => createImageBitmap(blob))
        .then(bitmap => {
          img.width = bitmap.width;
          img.height = bitmap.height;
          img.naturalWidth = bitmap.width;
          img.naturalHeight = bitmap.height;
          img._bitmap = bitmap;
          img.complete = true;
          if (img.onload) img.onload();
        })
        .catch(error => {
          console.error('加载图片失败:', error);
          if (img.onerror) img.onerror(error);
        });
      
      return url;
    }
  });
  
  return img;
};

// 监听来自主线程的消息
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'processImage':
      processImage(data);
      break;
    case 'applyWatermark':
      applyWatermark(data);
      break;
    default:
      self.postMessage({
        type: 'error',
        error: `未知的操作类型: ${type}`
      });
  }
};

/**
 * 处理图片
 * @param {Object} data - 图片数据
 */
function processImage(data) {
  const { imageData, id, quality = 0.92, format = 'image/jpeg' } = data;
  
  // 从dataURL中提取base64数据
  let base64Data;
  try {
    base64Data = imageData.split(',')[1];
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: `解析dataURL失败: ${error.message}`
    });
    return;
  }
  
  // 将base64转换为二进制数据
  let binaryData;
  try {
    binaryData = atob(base64Data);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: `Base64解码失败: ${error.message}`
    });
    return;
  }
  
  // 创建ArrayBuffer
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  
  // 创建Blob
  const blob = new Blob([uint8Array], { type: format });
  
  // 使用createImageBitmap处理图片
  createImageBitmap(blob)
    .then(bitmap => {
      // 创建OffscreenCanvas
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      
      // 绘制图片
      ctx.drawImage(bitmap, 0, 0);
      
      // 将Canvas转换为Blob
      return canvas.convertToBlob({ type: format, quality: parseFloat(quality) });
    })
    .then(processedBlob => {
      // 发送处理结果回主线程
      self.postMessage({
        type: 'processImageComplete',
        id: id,
        blob: processedBlob,
        width: processedBlob.width || 0,
        height: processedBlob.height || 0
      }, [processedBlob]);
    })
    .catch(error => {
      self.postMessage({
        type: 'error',
        id: id,
        error: `处理图片时出错: ${error.message}`
      });
    });
}

/**
 * 应用水印
 * @param {Object} data - 水印数据
 */
function applyWatermark(data) {
  const { 
    imageData, 
    id, 
    watermarkOptions, 
    quality = 0.92, 
    format = 'image/jpeg' 
  } = data;
  
  // 从dataURL中提取base64数据
  let base64Data;
  try {
    base64Data = imageData.split(',')[1];
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: `解析dataURL失败: ${error.message}`
    });
    return;
  }
  
  // 将base64转换为二进制数据
  let binaryData;
  try {
    binaryData = atob(base64Data);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: `Base64解码失败: ${error.message}`
    });
    return;
  }
  
  // 创建ArrayBuffer
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }
  
  // 创建Blob
  const blob = new Blob([uint8Array], { type: format });
  
  // 使用createImageBitmap处理图片
  createImageBitmap(blob)
    .then(bitmap => {
      // 创建OffscreenCanvas
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      
      // 绘制原始图片
      ctx.drawImage(bitmap, 0, 0);
      
      // 应用水印
      applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkOptions);
      
      // 将Canvas转换为Blob
      return canvas.convertToBlob({ type: format, quality: parseFloat(quality) });
    })
    .then(processedBlob => {
      // 发送处理结果回主线程
      self.postMessage({
        type: 'applyWatermarkComplete',
        id: id,
        blob: processedBlob
      }, [processedBlob]);
    })
    .catch(error => {
      self.postMessage({
        type: 'error',
        id: id,
        error: `应用水印时出错: ${error.message}`
      });
    });
}

/**
 * 在Canvas上应用水印
 * @param {OffscreenCanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} canvasWidth - Canvas宽度
 * @param {number} canvasHeight - Canvas高度
 * @param {Object} watermarkOptions - 水印选项
 */
function applyWatermarkToCanvas(ctx, canvasWidth, canvasHeight, watermarkOptions) {
  const { 
    type, 
    text, 
    color, 
    fontSize, 
    opacity, 
    rotation, 
    position,
    tileSpacing
  } = watermarkOptions;
  
  // 计算实际位置（基于百分比）
  const actualX = (position.x / 100) * canvasWidth;
  const actualY = (position.y / 100) * canvasHeight;
  
  // 设置透明度
  ctx.globalAlpha = opacity / 100;
  
  // 保存当前的变换状态
  ctx.save();
  
  // 根据水印类型渲染
  switch (type) {
    case 'text':
      renderTextWatermark(ctx, actualX, actualY, text, fontSize, color, rotation);
      break;
      
    case 'tiled':
      renderTiledWatermark(ctx, text, fontSize, color, rotation, tileSpacing, canvasWidth, canvasHeight);
      break;
      
    case 'image':
      // 图片水印在Worker中暂不支持，可以在主线程中处理
      break;
  }
  
  // 恢复变换状态
  ctx.restore();
  
  // 重置透明度
  ctx.globalAlpha = 1.0;
}

/**
 * 渲染文字水印
 */
function renderTextWatermark(ctx, x, y, text, fontSize, color, rotation) {
  // 设置旋转中心点到水印位置
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 设置字体和颜色
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制文字
  ctx.fillText(text, 0, 0);
}

/**
 * 渲染平铺水印
 */
function renderTiledWatermark(ctx, text, fontSize, color, rotation, spacing, width, height) {
  // 设置字体和颜色
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 计算行列数
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  
  // 计算起始偏移，使水印居中分布
  const offsetX = (width - (cols - 1) * spacing) / 2;
  const offsetY = (height - (rows - 1) * spacing) / 2;
  
  // 绘制平铺水印
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * spacing;
      const y = offsetY + row * spacing;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
} 