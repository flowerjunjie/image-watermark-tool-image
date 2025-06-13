/**
 * 图片水印工具集成脚本
 * 集成并增强所有功能，解决以下问题：
 * 1. 水印拖动功能
 * 2. 拖拽条功能
 * 3. 鼠标滚轮放大缩小水印
 * 4. 上传文件夹批量上传功能
 * 5. 按钮响应问题
 */

// 全局状态对象
window.watermarkState = {
  type: "text", // 水印类型：text, tiled, image
  text: "仅供验证使用", // 水印文本
  fontSize: 24, // 字体大小
  opacity: 50, // 透明度 (0-100)
  rotation: 0, // 旋转角度
  color: "#ff0000", // 水印颜色
  x: 50, // 水平位置百分比 (0-100)
  y: 50, // 垂直位置百分比 (0-100)
  tileSpacing: 150, // 平铺间距
  watermarkImage: null, // 水印图片
  watermarkImageSize: 30, // 水印图片大小百分比
  scale: 1.0, // 水印缩放比例
  files: [], // 批量处理的文件列表
  currentIndex: 0, // 当前显示的图片索引
  processed: {}, // 已处理图片的缓存
  // 添加相对位置和大小记录
  relativePosition: {
    x: 30,  // 默认相对位置为左侧30%
    y: 50   // 默认相对位置为中间50%
  },
  relativeSize: 1, // 默认相对大小为1
  imageWidth: 0,   // 当前图片宽度
  imageHeight: 0   // 当前图片高度
};

// 等待页面完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印集成脚本已加载');
  
  // 检查是否已初始化，避免重复初始化
  if (window.__WATERMARK_EVENTS_INITIALIZED__) {
    console.log('事件已初始化，跳过集成脚本初始化');
    return;
  }
  
  // 初始化所有功能
  initWatermarkFunctions();
  initEventListeners();
  initInputHandlers();
  initDragAndDrop();
  initWheelZoom();
  
  // 标记为已初始化
  window.__WATERMARK_EVENTS_INITIALIZED__ = true;
  
  console.log('水印集成脚本初始化完成');
});

/**
 * 初始化水印核心功能
 */
function initWatermarkFunctions() {
  // 更新水印
  window.updateWatermark = function() {
    console.log('执行updateWatermark函数');
    
    try {
      // 获取DOM元素
      const watermarkContainer = document.getElementById('watermark-container');
      const previewImage = document.getElementById('preview-image');
      const previewCanvas = document.getElementById('preview-canvas');
      const watermarkTextInput = document.getElementById('watermark-text');
      
      // 修改条件判断，支持Canvas模式
      if (!previewCanvas && (!previewImage || !previewImage.src || previewImage.style.display === 'none')) {
        if (!window.watermarkState.originalImage) {
          console.log('无法更新水印：缺少必要元素或图片未加载');
          return;
        }
      }
      
      // 清除现有水印
      if (watermarkContainer) {
        watermarkContainer.innerHTML = '';
        // 确保水印容器可以接收鼠标事件
        watermarkContainer.style.pointerEvents = 'auto';
      }
      
      // 获取最新输入的水印文本
      if (watermarkTextInput) {
        window.watermarkState.text = watermarkTextInput.value || '仅供验证使用';
      }
      
      // Canvas渲染模式 - 使用Canvas直接绘制水印
      if (previewCanvas && window.watermarkState.originalImage) {
        // 确保Canvas上下文存在
        if (!window.watermarkState.previewCtx) {
          window.watermarkState.previewCtx = previewCanvas.getContext('2d');
        }
        
        // 获取原始图片
        const originalImage = window.watermarkState.originalImage;
        
        // 设置Canvas尺寸与原始图片一致
        const width = originalImage.width;
        const height = originalImage.height;
        
        // 调整Canvas大小
        previewCanvas.width = width;
        previewCanvas.height = height;
        
        // 获取上下文
        const ctx = window.watermarkState.previewCtx;
        
        // 清除之前的内容
        ctx.clearRect(0, 0, width, height);
        
        // 绘制原始图片
        ctx.drawImage(originalImage, 0, 0);
        
        // 应用水印
        window.renderWatermarkOnCanvas(previewCanvas, ctx);
        
        // 显示Canvas，隐藏图片
        previewCanvas.style.display = 'block';
        if (previewImage) previewImage.style.display = 'none';
        
        // 隐藏水印容器，因为水印已经直接绘制在Canvas上
        if (watermarkContainer) watermarkContainer.style.display = 'none';
        
        console.log('使用Canvas模式显示水印');
        return;
      }
      
      // 传统DOM模式（当Canvas不可用时的后备方案）
      console.log('使用传统DOM模式显示水印');
      
      // 获取图片尺寸
      const imageWidth = previewImage.offsetWidth;
      const imageHeight = previewImage.offsetHeight;
      
      // 记录当前图片尺寸
      window.watermarkState.imageWidth = imageWidth;
      window.watermarkState.imageHeight = imageHeight;
      
      if (window.watermarkState.type === 'text' || window.watermarkState.type === 'tiled') {
        const text = window.watermarkState.text;
        
        if (window.watermarkState.type === 'text') {
          // 创建单个文字水印
          const watermark = document.createElement('div');
          watermark.className = 'draggable-watermark';
          watermark.id = 'watermark-element'; // 添加ID便于后续引用
          watermark.textContent = text;
          watermark.style.fontSize = `${window.watermarkState.fontSize}px`;
          watermark.style.color = window.watermarkState.color;
          watermark.style.opacity = window.watermarkState.opacity / 100;
          
          // 设置位置和变换，确保初始位置正确
          if (typeof window.watermarkState.relativePosition.x === 'undefined' || typeof window.watermarkState.relativePosition.y === 'undefined') {
            // 如果没有位置信息，则显示在左侧位置
            window.watermarkState.relativePosition.x = 30;
            window.watermarkState.relativePosition.y = 50;
          }
          
          // 确保x和y与relativePosition同步
          window.watermarkState.x = window.watermarkState.relativePosition.x;
          window.watermarkState.y = window.watermarkState.relativePosition.y;
          
          // 设置初始位置
          watermark.style.left = `${window.watermarkState.relativePosition.x}%`;
          watermark.style.top = `${window.watermarkState.relativePosition.y}%`;
          
          // 设置旋转和缩放
          const rotation = window.watermarkState.rotation || 0;
          const scale = window.watermarkState.scale || 1;
          watermark.style.transform = `rotate(${rotation}deg) scale(${scale})`;
          watermark.style.transformOrigin = 'center';
          
          watermarkContainer.appendChild(watermark);
          
          // 使水印可拖动
          window.makeDraggable(watermark);
        } else {
          // 平铺水印
          const tileSpacing = parseInt(window.watermarkState.tileSpacing);
          const watermarkStyle = `
            font-size: ${window.watermarkState.fontSize}px;
            color: ${window.watermarkState.color};
            opacity: ${window.watermarkState.opacity / 100};
            transform: rotate(${window.watermarkState.rotation}deg) scale(${window.watermarkState.scale});
            transform-origin: center;
            position: absolute;
            white-space: nowrap;
            user-select: none;
            pointer-events: none;
          `;
          
          // 计算需要的行数和列数
          const rows = Math.ceil(imageHeight / tileSpacing) + 1;
          const cols = Math.ceil(imageWidth / tileSpacing) + 1;
          
          // 创建平铺水印
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const watermark = document.createElement('div');
              watermark.className = 'watermark';
              watermark.textContent = text;
              watermark.style.cssText = watermarkStyle;
              watermark.style.left = `${col * tileSpacing}px`;
              watermark.style.top = `${row * tileSpacing}px`;
              
              watermarkContainer.appendChild(watermark);
            }
          }
        }
      } else if (window.watermarkState.type === 'image' && window.watermarkState.watermarkImage) {
        // 图片水印
        const src = typeof window.watermarkState.watermarkImage === 'string' ? 
                  window.watermarkState.watermarkImage : 
                  window.watermarkState.watermarkImage.src;
                  
        const watermark = document.createElement('img');
        watermark.className = 'draggable-watermark';
        watermark.id = 'watermark-element'; // 添加ID便于后续引用
        watermark.src = src;
        watermark.style.opacity = window.watermarkState.opacity / 100;
        
        // 设置位置和变换，确保初始位置正确
        if (typeof window.watermarkState.relativePosition.x === 'undefined' || typeof window.watermarkState.relativePosition.y === 'undefined') {
          // 如果没有位置信息，则显示在左侧位置
          window.watermarkState.relativePosition.x = 30;
          window.watermarkState.relativePosition.y = 50;
        }
        
        // 确保x和y与relativePosition同步
        window.watermarkState.x = window.watermarkState.relativePosition.x;
        window.watermarkState.y = window.watermarkState.relativePosition.y;
        
        // 设置初始位置
        watermark.style.left = `${window.watermarkState.relativePosition.x}%`;
        watermark.style.top = `${window.watermarkState.relativePosition.y}%`;
        
        // 设置旋转和缩放
        const rotation = window.watermarkState.rotation || 0;
        const scale = window.watermarkState.scale || 1;
        watermark.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        
        watermark.style.maxWidth = `${window.watermarkState.watermarkImageSize}%`;
        watermark.style.maxHeight = `${window.watermarkState.watermarkImageSize}%`;
        watermark.style.transformOrigin = 'center';
        
        watermarkContainer.appendChild(watermark);
        
        // 使水印图片可拖动
        window.makeDraggable(watermark);
      }
      
      console.log('水印已更新');
    } catch (error) {
      console.error('更新水印错误:', error);
    }
  };
  
  // 处理单张图片
  window.processImage = function(file, shouldApplyWatermark = false) {
    return new Promise((resolve, reject) => {
      console.log('执行processImage函数, 是否应用水印:', shouldApplyWatermark);
      
      try {
        if (!file) {
          console.error('无效的图片文件');
          resolve(null);
          return;
        }
        
        // 创建FileReader读取文件
        const reader = new FileReader();
        
        reader.onload = function(e) {
          try {
            const dataUrl = e.target.result;
            
            // 创建图片对象
            const img = new Image();
            
            img.onload = function() {
              try {
                // 保存原始图像对象，用于Canvas渲染
                window.watermarkState.originalImage = img;
                
                // 创建canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 设置canvas尺寸
                canvas.width = img.width;
                canvas.height = img.height;
                
                // 绘制图片
                ctx.drawImage(img, 0, 0);
                
                // 判断是否应用水印
                if (shouldApplyWatermark) {
                  // 应用水印
                  window.renderWatermarkOnCanvas(canvas, ctx)
                    .then(() => {
                      // 转换为数据URL
                      const processedImageUrl = canvas.toDataURL('image/jpeg', 0.92);
                      resolve({
                        original: dataUrl,
                        processed: processedImageUrl,
                        file: file,
                        filename: file.name,
                        hasWatermark: true,
                        originalImage: img // 保存原始图像对象的引用
                      });
                    })
                    .catch(err => {
                      console.error('应用水印时出错:', err);
                      reject(err);
                    });
                } else {
                  // 不应用水印，直接返回原图
                  resolve({
                    original: dataUrl,
                    processed: dataUrl, // 使用原图作为processed
                    file: file,
                    filename: file.name,
                    hasWatermark: false,
                    originalImage: img // 保存原始图像对象的引用
                  });
                }
              } catch (err) {
                console.error('处理图片时出错:', err);
                reject(err);
              }
            };
            
            img.onerror = function() {
              console.error('图片加载失败');
              reject(new Error('图片加载失败'));
            };
            
            img.src = dataUrl;
          } catch (err) {
            console.error('读取图片数据时出错:', err);
            reject(err);
          }
        };
        
        reader.onerror = function() {
          console.error('读取文件失败');
          reject(new Error('读取文件失败'));
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('处理图片异常:', error);
        reject(error);
      }
    });
  };
  
  // 应用水印到Canvas - 保留此函数以兼容旧版调用
  window.applyWatermark = function(canvas, ctx) {
    console.log('执行applyWatermark函数 (调用renderWatermarkOnCanvas)');
    
    // 直接调用renderWatermarkOnCanvas函数
    return window.renderWatermarkOnCanvas(canvas, ctx);
  };
  
  // 下载单张图片
  window.downloadImage = function() {
    console.log('执行downloadImage函数');
    
    try {
      const previewImage = document.getElementById('preview-image');
      const previewCanvas = document.getElementById('preview-canvas');
      
      if (!previewCanvas && (!previewImage || !previewImage.src || previewImage.style.display === 'none')) {
        alert('请先上传图片');
        return;
      }
      
      // 获取当前显示的图片
      const currentImage = window.watermarkState.processed[window.watermarkState.currentIndex];
      if (!currentImage) {
        console.error('没有处理后的图片可供下载');
        alert('没有可下载的图片');
        return;
      }
      
      // 显示处理中模态框
      const processingModal = document.getElementById('processing-modal');
      const statusText = document.getElementById('processing-status');
      
      if (processingModal) {
        statusText.textContent = '正在应用水印...';
        processingModal.style.display = 'flex';
      }
      
      // 创建一个临时Canvas用于处理最终的下载图片
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const img = new Image();
      
      img.onload = function() {
        // 设置Canvas尺寸
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        // 绘制原始图像
        tempCtx.drawImage(img, 0, 0);
        
        // 应用水印
        window.renderWatermarkOnCanvas(tempCanvas, tempCtx)
          .then(() => {
            try {
              // 转换为数据URL
              const dataURL = tempCanvas.toDataURL('image/jpeg', 0.92);
              
              // 创建下载链接
              const link = document.createElement('a');
              const filename = currentImage.filename || 'watermarked-image.jpg';
              link.href = dataURL;
              link.download = 'watermarked-' + filename;
              
              // 模拟点击下载
              document.body.appendChild(link);
              link.click();
              
              // 清理DOM
              setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(dataURL);
              }, 100);
              
              // 隐藏处理中模态框
              if (processingModal) {
                processingModal.style.display = 'none';
              }
              
              // 显示成功消息
              window.showStatusMessage('图片已下载');
            } catch (err) {
              console.error('生成下载链接时出错:', err);
              if (processingModal) {
                processingModal.style.display = 'none';
              }
              window.showStatusMessage('下载失败: ' + err.message);
            }
          })
          .catch(err => {
            console.error('应用水印时出错:', err);
            if (processingModal) {
              processingModal.style.display = 'none';
            }
            window.showStatusMessage('应用水印失败: ' + err.message);
          });
      };
      
      img.onerror = function() {
        console.error('图片加载失败');
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        window.showStatusMessage('图片加载失败');
      };
      
      // 使用原始图片而不是已处理的图片
      img.src = currentImage.original;
    } catch (error) {
      console.error('下载图片时出错:', error);
      alert('下载图片时出错: ' + error.message);
    }
  };
  
  // 批量下载图片
  window.batchDownloadImages = function() {
    console.log('执行batchDownloadImages函数');
    
    try {
      const processedImages = Object.values(window.watermarkState.processed);
      
      if (processedImages.length === 0) {
        alert('没有处理后的图片可供下载');
        return;
      }
      
      // 显示处理中模态框
      const processingModal = document.getElementById('processing-modal');
      const processingStatus = document.getElementById('processing-status');
      const modalProgressBar = document.getElementById('modal-progress-bar');
      
      if (processingModal) {
        processingStatus.textContent = '正在准备下载...';
        modalProgressBar.style.width = '0%';
        modalProgressBar.textContent = '0%';
        processingModal.style.display = 'flex';
      }
      
      // 创建一个JSZip实例
      const zip = new JSZip();
      
      // 处理图片计数
      let processed = 0;
      
      // 应用水印和添加到zip
      const processAndAddToZip = function(index) {
        if (index >= processedImages.length) {
          // 所有图片处理完成，生成并下载zip
          if (processingStatus) {
            processingStatus.textContent = '正在生成ZIP文件...';
          }
          
          zip.generateAsync({ type: 'blob' })
            .then(function(content) {
              // 下载zip文件
              const link = document.createElement('a');
              link.href = URL.createObjectURL(content);
              link.download = 'watermarked_images.zip';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // 关闭模态框
              if (processingModal) {
                processingModal.style.display = 'none';
              }
              
              window.showStatusMessage(`已下载 ${processedImages.length} 张图片`);
            })
            .catch(function(error) {
              console.error('生成ZIP文件时出错:', error);
              if (processingModal) {
                processingModal.style.display = 'none';
              }
              alert('生成ZIP文件失败: ' + error.message);
            });
          
          return;
        }
        
        // 当前处理的图片
        const image = processedImages[index];
        
        if (!image || !image.original) {
          // 跳过无效图片
          processAndAddToZip(index + 1);
          return;
        }
        
        // 更新进度
        if (processingStatus) {
          processingStatus.textContent = `处理图片 ${index + 1}/${processedImages.length}`;
        }
        
        if (modalProgressBar) {
          const percent = Math.floor((index / processedImages.length) * 100);
          modalProgressBar.style.width = `${percent}%`;
          modalProgressBar.textContent = `${percent}%`;
        }
        
        // 创建一个临时Canvas应用水印
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
          // 设置Canvas尺寸
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          
          // 绘制原始图像
          tempCtx.drawImage(img, 0, 0);
          
          // 应用水印
          window.renderWatermarkOnCanvas(tempCanvas, tempCtx)
            .then(() => {
              // 转换为Blob
              tempCanvas.toBlob(function(blob) {
                if (!blob) {
                  console.error('无法创建Blob');
                  processAndAddToZip(index + 1);
                  return;
                }
                
                // 获取文件名
                const originalFilename = image.filename || `image_${index}.jpg`;
                const filenameParts = originalFilename.split('.');
                const extension = filenameParts.pop();
                const basename = filenameParts.join('.');
                
                // 添加到zip
                zip.file(`${basename}_watermarked.${extension}`, blob);
                
                // 处理下一张图片
                processed++;
                setTimeout(() => processAndAddToZip(index + 1), 10);
              }, 'image/jpeg', 0.92);
            })
            .catch(err => {
              console.error('应用水印时出错:', err);
              // 继续处理下一张图片
              processAndAddToZip(index + 1);
            });
        };
        
        img.onerror = function() {
          console.error('加载图片失败:', image.filename);
          // 继续处理下一张图片
          processAndAddToZip(index + 1);
        };
        
        // 设置图片源
        img.src = image.original;
      };
      
      // 开始批量处理
      setTimeout(() => processAndAddToZip(0), 100);
      
    } catch (error) {
      console.error('批量下载图片时出错:', error);
      alert('批量下载失败: ' + error.message);
    }
  };
  
  // 批量处理图片
  window.batchProcessImages = function() {
    console.log('执行批量处理');
    
    const files = window.watermarkState.files;
    
    if (!files || files.length === 0) {
      alert('请先上传图片');
      return;
    }
    
    // 显示处理进度模态框
    const processingModal = document.getElementById('processing-modal');
    const progressBar = document.getElementById('modal-progress-bar');
    const statusText = document.getElementById('processing-status');
    
    if (processingModal) {
      processingModal.style.display = 'flex';
    }
    
    // 保存当前的水印设置，确保所有图片使用相同的相对位置和大小
    const watermarkSettings = {
      text: window.watermarkState.text,
      fontSize: window.watermarkState.fontSize,
      color: window.watermarkState.color,
      opacity: window.watermarkState.opacity,
      rotation: window.watermarkState.rotation,
      scale: window.watermarkState.scale,
      type: window.watermarkState.type,
      tileSpacing: window.watermarkState.tileSpacing,
      watermarkImageSize: window.watermarkState.watermarkImageSize,
      watermarkImage: window.watermarkState.watermarkImage,
      relativePosition: {
        x: window.watermarkState.relativePosition.x,
        y: window.watermarkState.relativePosition.y
      },
      relativeSize: window.watermarkState.relativeSize
    };
    
    // 清空已处理图片
    window.watermarkState.processed = {};
    
    // 递归处理图片
    const processNextImage = function(index) {
      if (index >= files.length) {
        // 处理完成
        if (statusText) {
          statusText.textContent = '处理完成！';
        }
        
        // 更新进度条
        if (progressBar) {
          progressBar.style.width = '100%';
          progressBar.textContent = '100%';
        }
        
        // 延迟关闭模态框
        setTimeout(function() {
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示第一张图片
          window.watermarkState.currentIndex = 0;
          window.showImage(0);
          
          // 更新缩略图
          window.updateThumbnails();
          
          // 显示状态消息
          window.showStatusMessage(`已成功处理 ${files.length} 张图片`);
        }, 1000);
        
        return;
      }
      
      // 更新状态文本
      if (statusText) {
        statusText.textContent = `正在处理图片 ${index + 1}/${files.length}`;
      }
      
      // 更新进度条
      if (progressBar) {
        const progress = Math.round((index / files.length) * 100);
        progressBar.style.width = progress + '%';
        progressBar.textContent = progress + '%';
      }
      
      // 处理当前图片（批量处理时应用水印）
      window.processImage(files[index], true)
        .then(result => {
          if (result) {
            // 存储处理结果
            window.watermarkState.processed[index] = result;
            
            // 处理下一张
            setTimeout(() => processNextImage(index + 1), 10);
          } else {
            console.error('处理图片失败:', files[index].name);
            processNextImage(index + 1);
          }
        })
        .catch(error => {
          console.error('处理图片时出错:', error);
          processNextImage(index + 1);
        });
    };
    
    // 开始处理
    processNextImage(0);
  };
  
  // 辅助函数 - 显示图片
  window.showImage = function(index) {
    console.log('显示图片，索引:', index);
    
    const previewImage = document.getElementById('preview-image');
    const previewCanvas = document.getElementById('preview-canvas');
    const noImageMessage = document.getElementById('no-image-message');
    const watermarkContainer = document.getElementById('watermark-container');
    
    if (!previewImage || !noImageMessage) {
      return;
    }
    
    const processedImage = window.watermarkState.processed[index];
    
    if (!processedImage) {
      noImageMessage.style.display = 'block';
      previewImage.style.display = 'none';
      if (previewCanvas) previewCanvas.style.display = 'none';
      if (watermarkContainer) {
        watermarkContainer.innerHTML = '';
        watermarkContainer.style.display = 'none';
      }
      return;
    }
    
    // 隐藏提示信息
    noImageMessage.style.display = 'none';
    
    // 在Canvas上加载原始图片
    if (processedImage.original) {
      const img = new Image();
      img.onload = function() {
        // 保存原始图像对象
        window.watermarkState.originalImage = img;
        
        // 调用updateWatermark来渲染Canvas
        window.updateWatermark();
      };
      img.src = processedImage.original;
    } else {
      // 传统模式下显示图片
      previewImage.style.display = 'block';
      previewImage.src = processedImage.processed || processedImage.original;
      
      // 更新水印（显示可交互的水印层）
      window.updateWatermark();
    }
    
    console.log('显示图片完成，索引:', index);
  };
  
  // 辅助函数 - 更新缩略图
  window.updateThumbnails = function() {
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    
    if (!thumbnailsContainer) {
      return;
    }
    
    // 清空现有缩略图
    thumbnailsContainer.innerHTML = '';
    
    // 获取处理后的图片
    const processedImages = Object.values(window.watermarkState.processed);
    
    if (processedImages.length === 0) {
      thumbnailsContainer.style.display = 'none';
      return;
    }
    
    // 显示缩略图容器
    thumbnailsContainer.style.display = 'flex';
    
    // 创建缩略图
    processedImages.forEach((item, index) => {
      if (item && item.processed) {
        // 创建缩略图容器
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        if (index === window.watermarkState.currentIndex) {
          thumbnail.classList.add('active');
        }
        thumbnail.setAttribute('data-index', index);
        
        // 创建缩略图
        const img = document.createElement('img');
        img.src = item.processed;
        thumbnail.appendChild(img);
        
        // 添加文件名
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = item.filename || `图片${index + 1}`;
        thumbnail.appendChild(fileName);
        
        // 添加点击事件
        thumbnail.addEventListener('click', function() {
          // 更新当前索引
          window.watermarkState.currentIndex = index;
          
          // 显示选中图片
          window.showImage(index);
          
          // 更新缩略图选中状态
          const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
          thumbnails.forEach(thumb => {
            thumb.classList.remove('active');
          });
          thumbnail.classList.add('active');
        });
        
        // 添加到容器
        thumbnailsContainer.appendChild(thumbnail);
      }
    });
  };
  
  // 状态消息
  window.showStatusMessage = function(message) {
    const statusMessage = document.getElementById('status-message');
    
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.classList.add('show');
      
      setTimeout(function() {
        statusMessage.classList.remove('show');
      }, 3000);
    }
  };
}

/**
 * 初始化事件监听器
 */
function initEventListeners() {
  console.log('初始化事件监听器');
  
  // 上传图片按钮
  const uploadFilesBtn = document.getElementById('upload-files-btn');
  const fileInput = document.getElementById('file-input');
  
  if (uploadFilesBtn && fileInput) {
    uploadFilesBtn.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
      handleFiles(this.files);
    });
  }
  
  // 上传文件夹按钮
  const uploadFolderBtn = document.getElementById('upload-folder-btn');
  const folderInput = document.getElementById('folder-input');
  
  if (uploadFolderBtn && folderInput) {
    console.log('设置上传文件夹按钮事件');
    
    // 检查按钮是否已经绑定过事件（使用自定义属性标记）
    if (uploadFolderBtn.getAttribute('data-event-bound') === 'true') {
      console.log('上传文件夹按钮已绑定事件，跳过');
      return;
    }
    
    // 清除所有旧事件监听器
    const newUploadFolderBtn = uploadFolderBtn.cloneNode(true);
    uploadFolderBtn.parentNode.replaceChild(newUploadFolderBtn, uploadFolderBtn);
    
    const newFolderInput = folderInput.cloneNode(true);
    folderInput.parentNode.replaceChild(newFolderInput, folderInput);
    
    // 添加新的事件监听器
    newUploadFolderBtn.addEventListener('click', function handleFolderBtnClick(e) {
      console.log('上传文件夹按钮点击');
      // 阻止可能的事件冒泡
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // 添加这一行，彻底阻止事件传播
      
      console.log('触发文件夹选择对话框');
      // 只触发一次文件选择对话框
      newFolderInput.click();
    });
    
    // 标记按钮已绑定事件
    newUploadFolderBtn.setAttribute('data-event-bound', 'true');
    
    newFolderInput.addEventListener('change', function handleFolderInputChange() {
      console.log('处理文件夹选择，文件数量:', this.files.length);
      
      // 添加调试信息
      if (this.files.length > 0) {
        console.log('已选择文件:');
        for (let i = 0; i < Math.min(5, this.files.length); i++) {
          const file = this.files[i];
          console.log(`- ${file.name} (${file.type || '无类型'}, ${file.size} 字节, 路径: ${file.webkitRelativePath || '无路径信息'})`);
        }
        if (this.files.length > 5) {
          console.log(`... 以及其他 ${this.files.length - 5} 个文件`);
        }
      } else {
        console.warn('未选择任何文件');
      }
      
      handleFiles(this.files);
      // 重置input，确保下次选择相同文件夹时也能触发change事件
      this.value = '';
    });
  }
  
  // 上传区域拖放功能
  const uploadArea = document.getElementById('upload-area');
  
  if (uploadArea) {
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = '#1976d2';
      this.style.backgroundColor = '#f5f8ff';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = '#ccc';
      this.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = '#ccc';
      this.style.backgroundColor = '';
      
      // 处理拖放的文件
      const files = e.dataTransfer.files;
      handleFiles(files);
    });
    
    // 修改上传区域点击处理，避免与上传文件夹按钮冲突
    uploadArea.addEventListener('click', function(e) {
      // 检查事件源是否为上传文件夹按钮或其内部元素
      const uploadFolderBtn = document.getElementById('upload-folder-btn');
      if (e.target === uploadFolderBtn || (uploadFolderBtn && uploadFolderBtn.contains(e.target))) {
        // 如果点击的是上传文件夹按钮，不触发文件选择
        console.log('点击了上传文件夹按钮，不触发普通文件选择');
        return;
      }
      
      // 其他情况下，触发普通文件选择
      console.log('点击上传区域，触发普通文件选择');
      fileInput.click();
    });
  }
  
  // 水印图片上传
  const watermarkImageArea = document.getElementById('watermark-image-area');
  const watermarkImageInput = document.getElementById('watermark-image-input');
  
  if (watermarkImageArea && watermarkImageInput) {
    watermarkImageArea.addEventListener('click', function() {
      watermarkImageInput.click();
    });
    
    watermarkImageInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          // 保存水印图片数据
          window.watermarkState.watermarkImage = e.target.result;
          
          // 显示水印图片预览
          const thumbnail = document.getElementById('watermark-image-thumbnail');
          const preview = document.getElementById('watermark-image-preview');
          
          if (thumbnail && preview) {
            thumbnail.src = e.target.result;
            preview.style.display = 'block';
          }
          
          // 更新水印
          window.updateWatermark();
        };
        
        reader.readAsDataURL(this.files[0]);
      }
    });
  }
  
  // 移除水印图片按钮
  const removeWatermarkImageBtn = document.getElementById('remove-watermark-image');
  
  if (removeWatermarkImageBtn) {
    removeWatermarkImageBtn.addEventListener('click', function() {
      window.watermarkState.watermarkImage = null;
      
      const preview = document.getElementById('watermark-image-preview');
      if (preview) {
        preview.style.display = 'none';
      }
      
      // 更新水印
      window.updateWatermark();
    });
  }
  
  // 下载按钮
  const downloadBtn = document.getElementById('download-btn');
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', window.downloadImage);
  }
  
  // 批量下载按钮
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  
  if (batchDownloadBtn) {
    batchDownloadBtn.addEventListener('click', window.batchDownloadImages);
  }
  
  // 批量处理按钮
  const batchProcessBtn = document.getElementById('batch-process-btn');
  
  if (batchProcessBtn) {
    batchProcessBtn.addEventListener('click', window.batchProcessImages);
  }
  
  // 背景色按钮
  const bgColorButtons = document.querySelectorAll('.bg-color-button');
  
  bgColorButtons.forEach(button => {
    button.addEventListener('click', function() {
      console.log('点击背景色按钮');
      
      // 获取颜色
      const color = this.getAttribute('data-color');
      console.log('选择背景色:', color);
      
      // 移除所有按钮的active类
      bgColorButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 添加active类到当前按钮
      this.classList.add('active');
      
      // 设置整个预览区域的背景色
      const previewArea = document.querySelector('.preview-area');
      if (previewArea) {
        console.log('设置预览区域背景色');
        previewArea.style.backgroundColor = color;
      }
      
      // 不再设置预览容器的背景色，让它保持透明
      const previewContainer = document.getElementById('preview-container');
      if (previewContainer) {
        console.log('设置预览容器背景为透明');
        previewContainer.style.backgroundColor = 'transparent';
      }
    });
  });
  
  // 帮助按钮
  const helpButton = document.getElementById('help-button');
  const helpModal = document.getElementById('help-modal');
  
  if (helpButton && helpModal) {
    helpButton.addEventListener('click', function() {
      helpModal.style.display = 'flex';
      
      // 初始化帮助文档内容
      const helpModalContent = document.getElementById('help-modal-content');
      
      if (helpModalContent) {
        helpModalContent.innerHTML = `
          <h2>图片水印工具使用帮助</h2>
          
          <div class="help-section">
            <h3>1. 上传图片</h3>
            <p>您可以通过以下三种方式上传图片：</p>
            <ul>
              <li>点击"上传图片"按钮选择单张或多张图片</li>
              <li>点击"上传文件夹"按钮选择整个文件夹的图片</li>
              <li>直接将图片拖放到上传区域</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>2. 水印设置</h3>
            <p>您可以选择三种不同类型的水印：</p>
            <ul>
              <li><strong>文字水印</strong>：添加自定义文字作为水印</li>
              <li><strong>平铺水印</strong>：文字水印以平铺方式覆盖整个图片</li>
              <li><strong>图片水印</strong>：上传自定义图片作为水印</li>
            </ul>
            <p>对于任何类型的水印，您都可以调整以下属性：</p>
            <ul>
              <li>字体大小/图片大小</li>
              <li>透明度</li>
              <li>旋转角度</li>
              <li>颜色（仅文字水印）</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>3. 水印位置调整</h3>
            <p>您可以通过以下方式调整水印位置：</p>
            <ul>
              <li>直接用鼠标拖动水印到合适位置</li>
              <li>使用鼠标滚轮调整水印大小</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>4. 批量处理</h3>
            <p>上传多张图片后，点击"开始批量处理"按钮，系统会自动为所有图片添加相同的水印设置。</p>
          </div>
          
          <div class="help-section">
            <h3>5. 下载图片</h3>
            <p>处理完成后，您可以：</p>
            <ul>
              <li>点击"下载单张图片"下载当前显示的图片</li>
              <li>点击"批量下载"将所有处理后的图片打包下载为ZIP文件</li>
            </ul>
          </div>
        `;
      }
    });
    
    // 关闭按钮
    const closeButton = helpModal.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        helpModal.style.display = 'none';
      });
    }
    
    // 点击模态框外部关闭
    helpModal.addEventListener('click', function(e) {
      if (e.target === helpModal) {
        helpModal.style.display = 'none';
      }
    });
  }
}

/**
 * 初始化输入处理器
 */
function initInputHandlers() {
  console.log('初始化输入处理器');
  
  // 水印文字输入
  const watermarkText = document.getElementById('watermark-text');
  
  if (watermarkText) {
    watermarkText.addEventListener('input', function() {
      window.watermarkState.text = this.value;
      window.updateWatermark();
    });
  }
  
  // 字体大小滑块
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const fontSizeInput = document.getElementById('font-size-input');
  const fontSizeDecrease = document.getElementById('font-size-decrease');
  const fontSizeIncrease = document.getElementById('font-size-increase');
  
  if (fontSizeSlider && fontSizeValue) {
    console.log('设置字体大小滑块事件');
    
    // 确保值同步
    fontSizeSlider.value = window.watermarkState.fontSize;
    fontSizeValue.textContent = window.watermarkState.fontSize;
    if (fontSizeInput) fontSizeInput.value = window.watermarkState.fontSize;
    
    // 移除之前可能存在的事件监听器
    const oldHandler = fontSizeSlider._fontSizeHandler;
    if (oldHandler) {
      fontSizeSlider.removeEventListener('input', oldHandler);
    }
    
    // 创建新的事件处理函数
    const handleFontSizeInput = function() {
      const value = parseInt(fontSizeSlider.value);
      console.log('字体大小调整为:', value);
      fontSizeValue.textContent = value;
      if (fontSizeInput) fontSizeInput.value = value;
      window.watermarkState.fontSize = value;
      window.updateWatermark();
    };
    
    // 保存事件处理函数引用
    fontSizeSlider._fontSizeHandler = handleFontSizeInput;
    
    // 添加新的事件监听器
    fontSizeSlider.addEventListener('input', handleFontSizeInput);
    
    // 添加数字输入框事件
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const boundedValue = Math.max(10, Math.min(100, value));
        this.value = boundedValue;
        fontSizeSlider.value = boundedValue;
        fontSizeValue.textContent = boundedValue;
        window.watermarkState.fontSize = boundedValue;
        window.updateWatermark();
      });
    }
    
    // 添加增减按钮事件
    if (fontSizeDecrease) {
      fontSizeDecrease.addEventListener('click', function() {
        const currentValue = parseInt(fontSizeSlider.value);
        const newValue = Math.max(10, currentValue - 2);
        fontSizeSlider.value = newValue;
        fontSizeValue.textContent = newValue;
        if (fontSizeInput) fontSizeInput.value = newValue;
        window.watermarkState.fontSize = newValue;
        window.updateWatermark();
      });
    }
    
    if (fontSizeIncrease) {
      fontSizeIncrease.addEventListener('click', function() {
        const currentValue = parseInt(fontSizeSlider.value);
        const newValue = Math.min(100, currentValue + 2);
        fontSizeSlider.value = newValue;
        fontSizeValue.textContent = newValue;
        if (fontSizeInput) fontSizeInput.value = newValue;
        window.watermarkState.fontSize = newValue;
        window.updateWatermark();
      });
    }
  }
  
  // 透明度滑块
  const opacitySlider = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacity-value');
  const opacityInput = document.getElementById('opacity-input');
  const opacityDecrease = document.getElementById('opacity-decrease');
  const opacityIncrease = document.getElementById('opacity-increase');
  
  if (opacitySlider && opacityValue) {
    console.log('设置透明度滑块事件');
    
    // 确保值同步 
    opacitySlider.value = window.watermarkState.opacity;
    opacityValue.textContent = window.watermarkState.opacity + '%';
    if (opacityInput) opacityInput.value = window.watermarkState.opacity;
    
    // 移除之前可能存在的事件监听器
    opacitySlider.removeEventListener('input', handleOpacityInput);
    
    // 添加新的事件监听器
    opacitySlider.addEventListener('input', handleOpacityInput);
    
    // 添加数字输入框事件
    if (opacityInput) {
      opacityInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const boundedValue = Math.max(0, Math.min(100, value));
        this.value = boundedValue;
        opacitySlider.value = boundedValue;
        opacityValue.textContent = boundedValue + '%';
        window.watermarkState.opacity = boundedValue;
        window.updateWatermark();
      });
    }
    
    // 添加增减按钮事件
    if (opacityDecrease) {
      opacityDecrease.addEventListener('click', function() {
        const currentValue = parseInt(opacitySlider.value);
        const newValue = Math.max(0, currentValue - 5);
        opacitySlider.value = newValue;
        opacityValue.textContent = newValue + '%';
        if (opacityInput) opacityInput.value = newValue;
        window.watermarkState.opacity = newValue;
        window.updateWatermark();
      });
    }
    
    if (opacityIncrease) {
      opacityIncrease.addEventListener('click', function() {
        const currentValue = parseInt(opacitySlider.value);
        const newValue = Math.min(100, currentValue + 5);
        opacitySlider.value = newValue;
        opacityValue.textContent = newValue + '%';
        if (opacityInput) opacityInput.value = newValue;
        window.watermarkState.opacity = newValue;
        window.updateWatermark();
      });
    }
    
    function handleOpacityInput() {
      const value = parseInt(opacitySlider.value);
      console.log('透明度调整为:', value);
      opacityValue.textContent = value + '%';
      if (opacityInput) opacityInput.value = value;
      window.watermarkState.opacity = value;
      window.updateWatermark();
    }
  }
  
  // 旋转角度滑块
  const rotationSlider = document.getElementById('rotation');
  const rotationValue = document.getElementById('rotation-value');
  const rotationInput = document.getElementById('rotation-input');
  const rotationDecrease = document.getElementById('rotation-decrease');
  const rotationIncrease = document.getElementById('rotation-increase');
  
  if (rotationSlider && rotationValue) {
    console.log('设置旋转角度滑块事件');
    
    // 确保值同步
    rotationSlider.value = window.watermarkState.rotation;
    rotationValue.textContent = window.watermarkState.rotation + '°';
    if (rotationInput) rotationInput.value = window.watermarkState.rotation;
    
    // 移除之前可能存在的事件监听器
    rotationSlider.removeEventListener('input', handleRotationInput);
    
    // 添加新的事件监听器
    rotationSlider.addEventListener('input', handleRotationInput);
    
    // 添加数字输入框事件
    if (rotationInput) {
      rotationInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const boundedValue = Math.max(-180, Math.min(180, value));
        this.value = boundedValue;
        rotationSlider.value = boundedValue;
        rotationValue.textContent = boundedValue + '°';
        window.watermarkState.rotation = boundedValue;
        window.updateWatermark();
      });
    }
    
    // 添加增减按钮事件
    if (rotationDecrease) {
      rotationDecrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationSlider.value);
        const newValue = Math.max(-180, currentValue - 5);
        rotationSlider.value = newValue;
        rotationValue.textContent = newValue + '°';
        if (rotationInput) rotationInput.value = newValue;
        window.watermarkState.rotation = newValue;
        window.updateWatermark();
      });
    }
    
    if (rotationIncrease) {
      rotationIncrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationSlider.value);
        const newValue = Math.min(180, currentValue + 5);
        rotationSlider.value = newValue;
        rotationValue.textContent = newValue + '°';
        if (rotationInput) rotationInput.value = newValue;
        window.watermarkState.rotation = newValue;
        window.updateWatermark();
      });
    }
    
    function handleRotationInput() {
      const value = parseInt(rotationSlider.value);
      console.log('旋转角度调整为:', value);
      rotationValue.textContent = value + '°';
      if (rotationInput) rotationInput.value = value;
      window.watermarkState.rotation = value;
      window.updateWatermark();
    }
  }
  
  // 水印颜色选择器
  const colorPicker = document.getElementById('color');
  
  if (colorPicker) {
    colorPicker.addEventListener('input', function() {
      window.watermarkState.color = this.value;
      window.updateWatermark();
    });
  }
  
  // 平铺间距滑块
  const tileSpacingSlider = document.getElementById('tile-spacing');
  const tileSpacingValue = document.getElementById('tile-spacing-value');
  
  if (tileSpacingSlider && tileSpacingValue) {
    tileSpacingSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      tileSpacingValue.textContent = value + 'px';
      window.watermarkState.tileSpacing = value;
      window.updateWatermark();
    });
  }
  
  // 水印图片大小滑块
  const watermarkImageSizeSlider = document.getElementById('watermark-image-size');
  const watermarkImageSizeValue = document.getElementById('watermark-image-size-value');
  
  if (watermarkImageSizeSlider && watermarkImageSizeValue) {
    watermarkImageSizeSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      watermarkImageSizeValue.textContent = value + '%';
      window.watermarkState.watermarkImageSize = value;
      window.updateWatermark();
    });
  }
  
  // 水印类型选择
  const watermarkType = document.getElementById('watermark-type');
  const textOptions = document.getElementById('text-options');
  const tiledOptions = document.getElementById('tiled-options');
  const imageOptions = document.getElementById('image-options');
  
  if (watermarkType && textOptions && tiledOptions && imageOptions) {
    watermarkType.addEventListener('change', function() {
      const value = this.value;
      window.watermarkState.type = value;
      
      // 显示/隐藏相应选项
      if (value === 'text') {
        textOptions.style.display = 'block';
        tiledOptions.style.display = 'none';
        imageOptions.style.display = 'none';
      } else if (value === 'tiled') {
        textOptions.style.display = 'block';
        tiledOptions.style.display = 'block';
        imageOptions.style.display = 'none';
      } else if (value === 'image') {
        textOptions.style.display = 'none';
        tiledOptions.style.display = 'none';
        imageOptions.style.display = 'block';
      }
      
      // 更新水印
      window.updateWatermark();
    });
  }
}

/**
 * 初始化拖放功能
 */
function initDragAndDrop() {
  console.log('初始化拖放功能');
  
  // 处理上传的文件
  window.handleFiles = function(files) {
    if (!files || files.length === 0) return;
    
    console.log('处理文件，数量:', files.length);
    
    // 过滤非图片文件
    const imageFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/');
    });
    
    if (imageFiles.length === 0) {
      alert('未选择有效的图片文件');
      return;
    }
    
    // 保存文件列表
    window.watermarkState.files = imageFiles;
    
    // 显示处理进度模态框
    const processingModal = document.getElementById('processing-modal');
    const progressBar = document.getElementById('modal-progress-bar');
    const statusText = document.getElementById('processing-status');
    
    if (processingModal) {
      processingModal.style.display = 'flex';
    }
    
    // 清空已处理图片
    window.watermarkState.processed = {};
    
    // 递归处理图片
    const processNextImage = function(index) {
      if (index >= imageFiles.length) {
        // 处理完成
        if (statusText) {
          statusText.textContent = '处理完成！';
        }
        
        // 更新进度条
        if (progressBar) {
          progressBar.style.width = '100%';
          progressBar.textContent = '100%';
        }
        
        // 延迟关闭模态框
        setTimeout(function() {
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示第一张图片
          window.watermarkState.currentIndex = 0;
          window.showImage(0);
          
          // 更新缩略图
          window.updateThumbnails();
          
          // 显示状态消息
          window.showStatusMessage(`已成功处理 ${imageFiles.length} 张图片`);
        }, 1000);
        
        return;
      }
      
      // 更新状态文本
      if (statusText) {
        statusText.textContent = `正在处理图片 ${index + 1}/${imageFiles.length}`;
      }
      
      // 更新进度条
      if (progressBar) {
        const progress = Math.round((index / imageFiles.length) * 100);
        progressBar.style.width = progress + '%';
        progressBar.textContent = progress + '%';
      }
      
      // 处理当前图片
      window.processImage(imageFiles[index], false)
        .then(result => {
          if (result) {
            // 存储处理结果
            window.watermarkState.processed[index] = result;
            
            // 处理下一张
            setTimeout(() => processNextImage(index + 1), 10);
          } else {
            console.error('处理图片失败:', imageFiles[index].name);
            processNextImage(index + 1);
          }
        })
        .catch(error => {
          console.error('处理图片时出错:', error);
          processNextImage(index + 1);
        });
    };
    
    // 开始处理
    processNextImage(0);
  };
  
  // 显示错误消息
  window.showError = function(message) {
    const errorContainer = document.getElementById('error-container');
    
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.add('show');
      
      setTimeout(function() {
        errorContainer.classList.remove('show');
      }, 5000);
    } else {
      alert(message);
    }
  };
}

/**
 * 初始化鼠标滚轮缩放功能
 */
function initWheelZoom() {
  console.log('初始化鼠标滚轮缩放功能');
  
  // 预览容器添加鼠标滚轮事件
  const previewContainer = document.getElementById('preview-container');
  
  if (previewContainer) {
    // 先移除任何可能已存在的事件处理器
    previewContainer.removeEventListener('wheel', handleWheel);
    
    // 添加新的事件处理器
    previewContainer.addEventListener('wheel', handleWheel);
  }
  
  // 滚轮事件处理函数
  function handleWheel(e) {
    console.log('滚轮事件触发');
    
    // 阻止默认行为（页面滚动）
    e.preventDefault();
    e.stopPropagation();
    
    // 检查图片是否已加载
    const previewImage = document.getElementById('preview-image');
    if (!previewImage || previewImage.style.display === 'none') {
      console.log('没有图片，无法缩放水印');
      return;
    }
    
    // 获取当前水印元素
    const watermarkElement = document.getElementById('watermark-element');
    
    if (!watermarkElement) {
      console.log('找不到水印元素');
      return;
    }
    
    // 判断滚轮方向 (normalizing across browsers)
    const delta = e.deltaY || e.detail || (e.wheelDelta * -1);
    
    console.log('滚轮增量:', delta, '当前缩放:', window.watermarkState.scale);
    
    // 计算缩放因子
    let scale = window.watermarkState.scale;
    
    if (delta < 0) {
      // 放大
      scale *= 1.1;
      console.log('放大水印');
    } else {
      // 缩小
      scale /= 1.1;
      console.log('缩小水印');
    }
    
    // 限制缩放范围
    scale = Math.max(0.1, Math.min(5, scale));
    
    // 更新缩放比例
    window.watermarkState.scale = scale;
    console.log('新的缩放比例:', scale);
    
    // 应用缩放
    updateWatermarkTransform(watermarkElement);
    
    // 触发全局更新
    // 注意：此处不调用window.updateWatermark避免重新创建水印元素
    console.log('水印缩放已更新');
  }
  
  // 更新水印变换
  function updateWatermarkTransform(element) {
    if (!element) return;
    
    const rotation = window.watermarkState.rotation;
    const scale = window.watermarkState.scale;
    element.style.transform = `rotate(${rotation}deg) scale(${scale})`;
  }
}

/**
 * 使元素可拖动
 */
window.makeDraggable = function(el) {
  console.log('设置元素可拖动:', el);
  
  // 判断是Canvas模式还是DOM模式
  const isCanvasMode = !!window.watermarkState.previewCanvas && window.watermarkState.previewCanvas.style.display !== 'none';
  const canvasElement = document.getElementById('preview-canvas');
  
  if (isCanvasMode && canvasElement) {
    // Canvas模式下的拖拽处理
    console.log('初始化Canvas上的拖拽');
    
    let isDragging = false;
    let startX, startY;
    
    canvasElement.addEventListener('mousedown', function(e) {
      const rect = canvasElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 计算点击位置是否在水印区域内
      // 粗略估计水印区域在中心位置的一定范围内
      const watermarkX = canvasElement.width * (window.watermarkState.relativePosition.x / 100);
      const watermarkY = canvasElement.height * (window.watermarkState.relativePosition.y / 100);
      const tolerance = Math.max(50, window.watermarkState.fontSize * 2); // 点击容忍范围
      
      if (Math.abs(x - watermarkX) < tolerance && Math.abs(y - watermarkY) < tolerance) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // 转换为百分比移动
      const percentX = (deltaX / canvasElement.offsetWidth) * 100;
      const percentY = (deltaY / canvasElement.offsetHeight) * 100;
      
      // 更新水印位置
      window.watermarkState.relativePosition.x = Math.max(-20, Math.min(120, window.watermarkState.relativePosition.x + percentX));
      window.watermarkState.relativePosition.y = Math.max(-20, Math.min(120, window.watermarkState.relativePosition.y + percentY));
      
      // 同步x和y值
      window.watermarkState.x = window.watermarkState.relativePosition.x;
      window.watermarkState.y = window.watermarkState.relativePosition.y;
      
      // 重新绘制水印
      window.updateWatermark();
      
      // 更新起始位置
      startX = e.clientX;
      startY = e.clientY;
    });
    
    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        console.log('水印拖拽结束，位置:', window.watermarkState.relativePosition);
      }
    });
    
    return;
  }
  
  // 传统DOM元素拖拽模式
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  // 防止重复添加事件
  if (el._draggable) {
    console.log('元素已经具有拖拽功能，跳过');
    return;
  }
  
  el._draggable = true;
  el.style.cursor = 'move';
  
  el.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    
    // 记录初始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // 获取父容器尺寸
    const container = document.getElementById('preview-container');
    const containerWidth = container ? container.offsetWidth : window.innerWidth;
    const containerHeight = container ? container.offsetHeight : window.innerHeight;
    
    // 计算新的位置（以百分比表示）
    const oldLeft = parseFloat(el.style.left || '50%');
    const oldTop = parseFloat(el.style.top || '50%');
    const newLeft = oldLeft - (pos1 / containerWidth * 100);
    const newTop = oldTop - (pos2 / containerHeight * 100);
    
    // 更新位置，允许适当超出边界
    const boundedLeft = Math.max(-20, Math.min(120, newLeft));
    const boundedTop = Math.max(-20, Math.min(120, newTop));
    
    // 设置元素位置
    el.style.left = boundedLeft + '%';
    el.style.top = boundedTop + '%';
    
    // 更新状态
    window.onDrag(boundedLeft, boundedTop);
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
  }
};

// 拖动处理
window.onDrag = function(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') {
    console.error('onDrag 接收到无效坐标:', x, y);
    return;
  }
  
  console.log('水印被拖动到:', x, y);
  
  // 同时更新相对位置和普通位置
  window.watermarkState.relativePosition.x = x;
  window.watermarkState.relativePosition.y = y;
  
  // 同步 x 和 y 属性
  window.watermarkState.x = x;
  window.watermarkState.y = y;
};

// 渲染水印到Canvas
window.renderWatermarkOnCanvas = function(canvas, ctx) {
  console.log('执行renderWatermarkOnCanvas函数');
  
  return new Promise((resolve, reject) => {
    try {
      const width = canvas.width;
      const height = canvas.height;
      
      // 如果是文字水印
      if (window.watermarkState.type === 'text') {
        // 获取水印文本
        const text = window.watermarkState.text;
        if (!text) {
          resolve(); // 没有文字，不添加水印
          return;
        }
        
        // 设置字体样式
        const fontSize = window.watermarkState.fontSize;
        const fontFamily = 'Arial, sans-serif';
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        // 设置填充颜色和透明度
        ctx.fillStyle = window.watermarkState.color;
        ctx.globalAlpha = window.watermarkState.opacity / 100;
        
        // 获取水印位置（相对百分比转换为像素）
        const x = (window.watermarkState.relativePosition.x / 100) * width;
        const y = (window.watermarkState.relativePosition.y / 100) * height;
        
        // 保存当前上下文状态
        ctx.save();
        
        // 移动到水印位置
        ctx.translate(x, y);
        
        // 旋转
        const rotation = window.watermarkState.rotation || 0;
        ctx.rotate((rotation * Math.PI) / 180);
        
        // 应用缩放
        const scale = window.watermarkState.scale || 1;
        ctx.scale(scale, scale);
        
        // 绘制文本
        ctx.fillText(text, 0, 0);
        
        // 恢复上下文状态
        ctx.restore();
      } 
      // 如果是平铺文字水印
      else if (window.watermarkState.type === 'tiled') {
        const text = window.watermarkState.text;
        if (!text) {
          resolve(); // 没有文字，不添加水印
          return;
        }
        
        // 设置字体样式
        const fontSize = window.watermarkState.fontSize;
        const fontFamily = 'Arial, sans-serif';
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        // 设置填充颜色和透明度
        ctx.fillStyle = window.watermarkState.color;
        ctx.globalAlpha = window.watermarkState.opacity / 100;
        
        // 获取平铺间距
        const tileSpacing = parseInt(window.watermarkState.tileSpacing) || 100;
        
        // 计算需要的行数和列数
        const rows = Math.ceil(height / tileSpacing) + 1;
        const cols = Math.ceil(width / tileSpacing) + 1;
        
        // 保存当前上下文状态
        ctx.save();
        
        // 应用旋转
        const rotation = window.watermarkState.rotation || 0;
        const scale = window.watermarkState.scale || 1;
        
        // 绘制平铺水印
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * tileSpacing;
            const y = row * tileSpacing;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale, scale);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
        
        // 恢复上下文状态
        ctx.restore();
      }
      // 如果是图片水印
      else if (window.watermarkState.type === 'image' && window.watermarkState.watermarkImage) {
        const watermarkImage = typeof window.watermarkState.watermarkImage === 'string' ?
                           window.watermarkState.watermarkImage :
                           window.watermarkState.watermarkImage.src;
        
        // 创建图片对象
        const img = new Image();
        
        img.onload = function() {
          // 获取水印位置（相对百分比转换为像素）
          const x = (window.watermarkState.relativePosition.x / 100) * width;
          const y = (window.watermarkState.relativePosition.y / 100) * height;
          
          // 计算水印图片大小
          const sizePercent = window.watermarkState.watermarkImageSize || 30;
          const maxWidth = (width * sizePercent) / 100;
          const maxHeight = (height * sizePercent) / 100;
          
          // 保持纵横比的图片尺寸计算
          let watermarkWidth = img.width;
          let watermarkHeight = img.height;
          
          if (watermarkWidth > maxWidth) {
            const ratio = maxWidth / watermarkWidth;
            watermarkWidth = maxWidth;
            watermarkHeight *= ratio;
          }
          
          if (watermarkHeight > maxHeight) {
            const ratio = maxHeight / watermarkHeight;
            watermarkHeight = maxHeight;
            watermarkWidth *= ratio;
          }
          
          // 保存当前上下文状态
          ctx.save();
          
          // 设置透明度
          ctx.globalAlpha = window.watermarkState.opacity / 100;
          
          // 移动到水印位置
          ctx.translate(x, y);
          
          // 旋转
          const rotation = window.watermarkState.rotation || 0;
          ctx.rotate((rotation * Math.PI) / 180);
          
          // 应用缩放
          const scale = window.watermarkState.scale || 1;
          ctx.scale(scale, scale);
          
          // 绘制居中的水印图片
          ctx.drawImage(
            img, 
            -watermarkWidth / 2, 
            -watermarkHeight / 2, 
            watermarkWidth, 
            watermarkHeight
          );
          
          // 恢复上下文状态
          ctx.restore();
          
          resolve();
        };
        
        img.onerror = function() {
          console.error('加载水印图片失败');
          reject(new Error('加载水印图片失败'));
        };
        
        img.src = watermarkImage;
        return; // 等待图片加载，不立即解析
      }
      
      // 完成
      resolve();
    } catch (error) {
      console.error('应用水印到Canvas时出错:', error);
      reject(error);
    }
  });
};