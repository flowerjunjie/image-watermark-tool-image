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
  rotation: -30, // 旋转角度
  color: "#ff0000", // 水印颜色
  x: 50, // 水平位置百分比 (0-100)
  y: 50, // 垂直位置百分比 (0-100)
  tileSpacing: 150, // 平铺间距
  watermarkImage: null, // 水印图片
  watermarkImageSize: 30, // 水印图片大小百分比
  scale: 1.0, // 水印缩放比例
  files: [], // 批量处理的文件列表
  currentIndex: 0, // 当前显示的图片索引
  processed: {} // 已处理图片的缓存
};

// 等待页面完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印集成脚本已加载');
  
  // 初始化所有功能
  initWatermarkFunctions();
  initEventListeners();
  initInputHandlers();
  initDragAndDrop();
  initWheelZoom();
  
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
      const watermarkTextInput = document.getElementById('watermark-text');
      
      if (!watermarkContainer || !previewImage || !previewImage.src) {
        console.log('无法更新水印：缺少必要元素或图片未加载');
        return;
      }
      
      // 清除现有水印
      watermarkContainer.innerHTML = '';
      
      // 获取最新输入的水印文本
      if (watermarkTextInput) {
        window.watermarkState.text = watermarkTextInput.value || '仅供验证使用';
      }
      
      // 获取图片尺寸
      const imageWidth = previewImage.offsetWidth;
      const imageHeight = previewImage.offsetHeight;
      
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
          watermark.style.transform = `rotate(${window.watermarkState.rotation}deg) scale(${window.watermarkState.scale})`;
          watermark.style.left = `${window.watermarkState.x}%`;
          watermark.style.top = `${window.watermarkState.y}%`;
          watermark.style.transformOrigin = 'center';
          
          watermarkContainer.appendChild(watermark);
          
          // 使水印可拖动
          makeDraggable(watermark);
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
        watermark.style.transform = `rotate(${window.watermarkState.rotation}deg) scale(${window.watermarkState.scale})`;
        watermark.style.left = `${window.watermarkState.x}%`;
        watermark.style.top = `${window.watermarkState.y}%`;
        watermark.style.maxWidth = `${window.watermarkState.watermarkImageSize}%`;
        watermark.style.maxHeight = `${window.watermarkState.watermarkImageSize}%`;
        watermark.style.transformOrigin = 'center';
        
        watermarkContainer.appendChild(watermark);
        
        // 使水印图片可拖动
        makeDraggable(watermark);
      }
      
      console.log('水印已更新');
    } catch (error) {
      console.error('更新水印错误:', error);
    }
  };
  
  // 处理单张图片
  window.processImage = function(file) {
    return new Promise((resolve, reject) => {
      console.log('执行processImage函数');
      
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
                // 创建canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 设置canvas尺寸
                canvas.width = img.width;
                canvas.height = img.height;
                
                // 绘制图片
                ctx.drawImage(img, 0, 0);
                
                // 应用水印
                applyWatermark(canvas, ctx);
                
                // 转换为数据URL
                const processedImageUrl = canvas.toDataURL('image/jpeg', 0.92);
                resolve({
                  original: dataUrl,
                  processed: processedImageUrl,
                  file: file,
                  filename: file.name
                });
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
  
  // 应用水印到Canvas
  window.applyWatermark = function(canvas, ctx) {
    console.log('执行applyWatermark函数');
    
    try {
      // 获取画布尺寸
      const width = canvas.width;
      const height = canvas.height;
      
      // 根据水印类型应用不同处理
      if (window.watermarkState.type === 'text' || window.watermarkState.type === 'tiled') {
        const text = window.watermarkState.text || '仅供验证使用';
        
        // 设置字体和颜色
        ctx.font = `${window.watermarkState.fontSize * 2}px Arial`; // 放大字体，因为Canvas和屏幕显示的比例不同
        ctx.fillStyle = window.watermarkState.color;
        ctx.globalAlpha = window.watermarkState.opacity / 100;
        
        if (window.watermarkState.type === 'text') {
          // 单个文字水印
          // 保存当前状态
          ctx.save();
          
          // 移动到水印位置
          const x = width * (window.watermarkState.x / 100);
          const y = height * (window.watermarkState.y / 100);
          ctx.translate(x, y);
          
          // 旋转
          ctx.rotate((window.watermarkState.rotation * Math.PI) / 180);
          
          // 缩放
          ctx.scale(window.watermarkState.scale, window.watermarkState.scale);
          
          // 绘制文本
          ctx.fillText(text, 0, 0);
          
          // 恢复状态
          ctx.restore();
        } else {
          // 平铺水印
          const tileSpacing = parseInt(window.watermarkState.tileSpacing) * 2; // 放大间距
          
          // 计算需要的行数和列数
          const rows = Math.ceil(height / tileSpacing) + 1;
          const cols = Math.ceil(width / tileSpacing) + 1;
          
          // 创建平铺水印
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = col * tileSpacing;
              const y = row * tileSpacing;
              
              // 保存当前状态
              ctx.save();
              
              // 移动到水印位置
              ctx.translate(x, y);
              
              // 旋转
              ctx.rotate((window.watermarkState.rotation * Math.PI) / 180);
              
              // 缩放
              ctx.scale(window.watermarkState.scale, window.watermarkState.scale);
              
              // 绘制文本
              ctx.fillText(text, 0, 0);
              
              // 恢复状态
              ctx.restore();
            }
          }
        }
      } else if (window.watermarkState.type === 'image' && window.watermarkState.watermarkImage) {
        // 图片水印
        const watermarkImage = new Image();
        
        // 等待水印图片加载完成
        return new Promise((resolve, reject) => {
          watermarkImage.onload = function() {
            try {
              // 计算水印图片尺寸
              const maxWidth = width * (window.watermarkState.watermarkImageSize / 100);
              const maxHeight = height * (window.watermarkState.watermarkImageSize / 100);
              
              // 保持宽高比
              let wwidth = watermarkImage.width;
              let wheight = watermarkImage.height;
              
              if (wwidth > maxWidth) {
                const ratio = maxWidth / wwidth;
                wwidth = maxWidth;
                wheight = wheight * ratio;
              }
              
              if (wheight > maxHeight) {
                const ratio = maxHeight / wheight;
                wheight = maxHeight;
                wwidth = wwidth * ratio;
              }
              
              // 调整透明度
              ctx.globalAlpha = window.watermarkState.opacity / 100;
              
              // 保存当前状态
              ctx.save();
              
              // 移动到水印位置
              const x = width * (window.watermarkState.x / 100);
              const y = height * (window.watermarkState.y / 100);
              ctx.translate(x, y);
              
              // 旋转
              ctx.rotate((window.watermarkState.rotation * Math.PI) / 180);
              
              // 缩放
              ctx.scale(window.watermarkState.scale, window.watermarkState.scale);
              
              // 绘制水印图片
              ctx.drawImage(watermarkImage, -wwidth / 2, -wheight / 2, wwidth, wheight);
              
              // 恢复状态
              ctx.restore();
              
              resolve();
            } catch (err) {
              console.error('应用图片水印时出错:', err);
              reject(err);
            }
          };
          
          watermarkImage.onerror = function() {
            console.error('水印图片加载失败');
            reject(new Error('水印图片加载失败'));
          };
          
          watermarkImage.src = typeof window.watermarkState.watermarkImage === 'string' ? 
                            window.watermarkState.watermarkImage : 
                            window.watermarkState.watermarkImage.src;
        });
      }
    } catch (error) {
      console.error('应用水印时出错:', error);
    }
  };
  
  // 下载单张图片
  window.downloadImage = function() {
    console.log('执行downloadImage函数');
    
    try {
      const previewImage = document.getElementById('preview-image');
      
      if (!previewImage || !previewImage.src || previewImage.style.display === 'none') {
        alert('请先上传图片');
        return;
      }
      
      // 获取当前显示的图片
      const currentImage = window.watermarkState.processed[window.watermarkState.currentIndex];
      if (!currentImage || !currentImage.processed) {
        console.error('没有处理后的图片可供下载');
        alert('没有可下载的图片');
        return;
      }
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = currentImage.processed;
      
      // 获取文件名
      const originalFilename = currentImage.filename || 'image.jpg';
      const filenameParts = originalFilename.split('.');
      const extension = filenameParts.pop();
      const basename = filenameParts.join('.');
      
      // 添加水印标识
      const newFilename = `${basename}_watermarked.${extension}`;
      link.download = newFilename;
      
      // 触发点击事件
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 显示状态消息
      showStatusMessage('图片已下载');
    } catch (error) {
      console.error('下载图片时出错:', error);
      alert('下载图片失败: ' + error.message);
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
      
      // 使用JSZip创建ZIP文件
      const zip = new JSZip();
      const folder = zip.folder('watermarked_images');
      
      // 添加所有图片到ZIP
      const promises = [];
      processedImages.forEach((item, index) => {
        if (item && item.processed) {
          // 提取BASE64数据
          const base64Data = item.processed.split(',')[1];
          
          // 获取文件名
          const originalFilename = item.filename || `image_${index + 1}.jpg`;
          const filenameParts = originalFilename.split('.');
          const extension = filenameParts.pop();
          const basename = filenameParts.join('.');
          
          // 添加水印标识
          const newFilename = `${basename}_watermarked.${extension}`;
          
          // 添加到ZIP
          folder.file(newFilename, base64Data, { base64: true });
          
          // 更新进度
          const progress = Math.round(((index + 1) / processedImages.length) * 100);
          if (modalProgressBar) {
            modalProgressBar.style.width = progress + '%';
            modalProgressBar.textContent = progress + '%';
          }
          if (processingStatus) {
            processingStatus.textContent = `正在处理第 ${index + 1}/${processedImages.length} 张图片`;
          }
        }
      });
      
      // 生成ZIP文件并下载
      zip.generateAsync({ type: 'blob' }).then(function(content) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'watermarked_images.zip';
        
        // 触发点击事件
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 隐藏处理中模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
        
        // 显示状态消息
        showStatusMessage('批量下载完成');
      }).catch(function(error) {
        console.error('生成ZIP文件时出错:', error);
        alert('批量下载失败: ' + error.message);
        
        // 隐藏处理中模态框
        if (processingModal) {
          processingModal.style.display = 'none';
        }
      });
    } catch (error) {
      console.error('批量下载时出错:', error);
      alert('批量下载失败: ' + error.message);
      
      // 隐藏处理中模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal) {
        processingModal.style.display = 'none';
      }
    }
  };
  
  // 批量处理图片
  window.batchProcessImages = function() {
    console.log('执行batchProcessImages函数');
    
    try {
      const files = window.watermarkState.files;
      
      if (!files || files.length === 0) {
        alert('请先上传图片');
        return;
      }
      
      // 显示处理中模态框
      const processingModal = document.getElementById('processing-modal');
      const processingStatus = document.getElementById('processing-status');
      const modalProgressBar = document.getElementById('modal-progress-bar');
      
      if (processingModal) {
        processingStatus.textContent = '正在处理图片...';
        modalProgressBar.style.width = '0%';
        modalProgressBar.textContent = '0%';
        processingModal.style.display = 'flex';
      }
      
      // 逐个处理图片
      const processNextImage = function(index) {
        if (index >= files.length) {
          // 处理完成
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示状态消息
          showStatusMessage(`已成功处理 ${files.length} 张图片`);
          
          // 显示缩略图
          updateThumbnails();
          
          return;
        }
        
        // 更新进度
        const progress = Math.round(((index + 1) / files.length) * 100);
        if (modalProgressBar) {
          modalProgressBar.style.width = progress + '%';
          modalProgressBar.textContent = progress + '%';
        }
        if (processingStatus) {
          processingStatus.textContent = `正在处理第 ${index + 1}/${files.length} 张图片`;
        }
        
        // 处理当前图片
        window.processImage(files[index]).then(result => {
          if (result) {
            // 存储处理结果
            window.watermarkState.processed[index] = result;
          }
          
          // 处理下一张
          processNextImage(index + 1);
        }).catch(error => {
          console.error(`处理第 ${index + 1} 张图片时出错:`, error);
          
          // 继续处理下一张
          processNextImage(index + 1);
        });
      };
      
      // 开始处理第一张图片
      processNextImage(0);
    } catch (error) {
      console.error('批量处理时出错:', error);
      alert('批量处理失败: ' + error.message);
      
      // 隐藏处理中模态框
      const processingModal = document.getElementById('processing-modal');
      if (processingModal) {
        processingModal.style.display = 'none';
      }
    }
  };
  
  // 更新缩略图
  function updateThumbnails() {
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
          showImage(index);
          
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
  }
  
  // 显示图片
  function showImage(index) {
    const previewImage = document.getElementById('preview-image');
    const noImageMessage = document.getElementById('no-image-message');
    
    if (!previewImage || !noImageMessage) {
      return;
    }
    
    const processedImage = window.watermarkState.processed[index];
    
    if (!processedImage || !processedImage.processed) {
      noImageMessage.style.display = 'block';
      previewImage.style.display = 'none';
      return;
    }
    
    // 隐藏提示信息，显示图片
    noImageMessage.style.display = 'none';
    previewImage.style.display = 'block';
    
    // 设置图片源
    previewImage.src = processedImage.processed;
    
    // 更新水印
    window.updateWatermark();
  }
  
  // 显示状态消息
  function showStatusMessage(message) {
    const statusMessage = document.getElementById('status-message');
    
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.classList.add('show');
      
      setTimeout(function() {
        statusMessage.classList.remove('show');
      }, 3000);
    }
  }
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
      // 只触发一次文件选择对话框
      newFolderInput.click();
    });
    
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
    
    uploadArea.addEventListener('click', function() {
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
      
      // 同时也设置预览容器的背景色保持一致
      const previewContainer = document.getElementById('preview-container');
      if (previewContainer) {
        console.log('设置预览容器背景色');
        previewContainer.style.backgroundColor = color;
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
  
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.addEventListener('input', function() {
      const value = parseInt(this.value);
      fontSizeValue.textContent = value;
      window.watermarkState.fontSize = value;
      window.updateWatermark();
    });
  }
  
  // 透明度滑块
  const opacitySlider = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacity-value');
  
  if (opacitySlider && opacityValue) {
    console.log('设置透明度滑块事件');
    
    // 确保值同步 
    opacitySlider.value = window.watermarkState.opacity;
    opacityValue.textContent = window.watermarkState.opacity + '%';
    
    // 移除之前可能存在的事件监听器
    opacitySlider.removeEventListener('input', handleOpacityInput);
    
    // 添加新的事件监听器
    opacitySlider.addEventListener('input', handleOpacityInput);
    
    function handleOpacityInput() {
      const value = parseInt(opacitySlider.value);
      console.log('透明度调整为:', value);
      opacityValue.textContent = value + '%';
      window.watermarkState.opacity = value;
      window.updateWatermark();
    }
  }
  
  // 旋转角度滑块
  const rotationSlider = document.getElementById('rotation');
  const rotationValue = document.getElementById('rotation-value');
  
  if (rotationSlider && rotationValue) {
    console.log('设置旋转角度滑块事件');
    
    // 确保值同步
    rotationSlider.value = window.watermarkState.rotation;
    rotationValue.textContent = window.watermarkState.rotation + '°';
    
    // 移除之前可能存在的事件监听器
    rotationSlider.removeEventListener('input', handleRotationInput);
    
    // 添加新的事件监听器
    rotationSlider.addEventListener('input', handleRotationInput);
    
    function handleRotationInput() {
      const value = parseInt(rotationSlider.value);
      console.log('旋转角度调整为:', value);
      rotationValue.textContent = value + '°';
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
    
    // 处理第一张图片
    window.processImage(imageFiles[0]).then(result => {
      if (result) {
        // 存储处理结果
        window.watermarkState.processed[0] = result;
        window.watermarkState.currentIndex = 0;
        
        // 显示图片
        showImage(0);
        
        // 显示状态消息
        showStatusMessage(`已添加 ${imageFiles.length} 张图片`);
        
        // 显示缩略图
        updateThumbnails();
      }
    }).catch(error => {
      console.error('处理图片时出错:', error);
      showError('处理图片失败: ' + error.message);
    });
  };
  
  // 显示错误消息
  function showError(message) {
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
  }
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
function makeDraggable(element) {
  if (!element) return;
  
  console.log('设置元素可拖动:', element);
  
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  // 设置必要的样式确保可拖动
  element.style.cursor = 'move';
  element.style.position = 'absolute'; // 确保元素是绝对定位
  element.style.pointerEvents = 'auto'; // 确保元素可以接收鼠标事件
  
  // 移除旧的事件监听器（避免重复添加）
  element.removeEventListener('mousedown', startDragging);
  
  // 添加新的事件监听器
  element.addEventListener('mousedown', startDragging);
  
  function startDragging(e) {
    console.log('开始拖动');
    // 阻止事件冒泡和默认行为
    e.stopPropagation();
    e.preventDefault();
    
    // 记录鼠标位置
    isDragging = true;
    
    // 获取元素相对于鼠标的偏移量
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // 添加鼠标移动和松开事件监听器
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDragging);
    
    // 添加拖动样式
    element.style.cursor = 'grabbing';
  }
  
  function onDrag(e) {
    if (!isDragging) return;
    
    // 阻止事件冒泡和默认行为
    e.stopPropagation();
    e.preventDefault();
    
    // 获取容器位置
    const container = element.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // 计算新位置（相对于容器）
    const x = e.clientX - containerRect.left - offsetX;
    const y = e.clientY - containerRect.top - offsetY;
    
    // 计算位置百分比
    const percentX = (x / containerRect.width) * 100;
    const percentY = (y / containerRect.height) * 100;
    
    // 限制在容器内
    const boundedX = Math.max(0, Math.min(100, percentX));
    const boundedY = Math.max(0, Math.min(100, percentY));
    
    // 应用新位置
    element.style.left = `${boundedX}%`;
    element.style.top = `${boundedY}%`;
    
    // 输出调试信息
    console.log(`拖动至: x=${boundedX}%, y=${boundedY}%`);
    
    // 更新状态
    window.watermarkState.x = boundedX;
    window.watermarkState.y = boundedY;
  }
  
  function stopDragging() {
    console.log('停止拖动');
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDragging);
    
    // 恢复鼠标样式
    element.style.cursor = 'move';
  }
}

// 辅助函数 - 显示图片
function showImage(index) {
  const previewImage = document.getElementById('preview-image');
  const noImageMessage = document.getElementById('no-image-message');
  
  if (!previewImage || !noImageMessage) {
    return;
  }
  
  const processedImage = window.watermarkState.processed[index];
  
  if (!processedImage || !processedImage.processed) {
    noImageMessage.style.display = 'block';
    previewImage.style.display = 'none';
    return;
  }
  
  // 隐藏提示信息，显示图片
  noImageMessage.style.display = 'none';
  previewImage.style.display = 'block';
  
  // 设置图片源
  previewImage.src = processedImage.processed;
  
  // 更新水印
  window.updateWatermark();
}

// 辅助函数 - 更新缩略图
function updateThumbnails() {
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
        showImage(index);
        
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
}

// 辅助函数 - 显示状态消息
function showStatusMessage(message) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show');
    
    setTimeout(function() {
      statusMessage.classList.remove('show');
    }, 3000);
  }
}