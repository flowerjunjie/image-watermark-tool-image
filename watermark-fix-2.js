/**
 * 图片水印工具修复脚本 - 第二部分
 * 用于补充实现缺失的关键函数
 */

// 等待页面完全加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('水印修复脚本2已加载');
  
  // 延迟执行以确保页面元素已加载
  setTimeout(function() {
    implementMissingFunctions();
    console.log('水印修复脚本2已应用');
  }, 500);
});

/**
 * 实现缺失的关键函数
 */
function implementMissingFunctions() {
  // 实现updateWatermark函数
  if (typeof window.updateWatermark !== 'function') {
    window.updateWatermark = function() {
      console.log('执行修复版updateWatermark函数');
      
      try {
        // 获取DOM元素
        const watermarkContainer = document.getElementById('watermark-container');
        const previewImage = document.getElementById('preview-image');
        const watermarkText = document.getElementById('watermark-text');
        
        if (!watermarkContainer || !previewImage || !previewImage.src) {
          console.log('无法更新水印：缺少必要元素');
          return;
        }
        
        // 清除现有水印
        watermarkContainer.innerHTML = '';
        
        // 获取水印状态
        const watermarkState = window.watermarkState || {
          type: 'text',
          text: '仅供验证使用',
          fontSize: 24,
          opacity: 50,
          rotation: -30,
          color: '#ff0000',
          x: 50,
          y: 50,
          tileSpacing: 150,
          watermarkImage: null,
          watermarkImageSize: 30
        };
        
        // 更新水印文本
        if (watermarkText) {
          watermarkState.text = watermarkText.value || '仅供验证使用';
        }
        
        // 获取图片尺寸
        const imageWidth = previewImage.offsetWidth;
        const imageHeight = previewImage.offsetHeight;
        
        if (watermarkState.type === 'text' || watermarkState.type === 'tiled') {
          const text = watermarkState.text;
          
          if (watermarkState.type === 'text') {
            // 单个文字水印
            const watermark = document.createElement('div');
            watermark.className = 'draggable-watermark';
            watermark.textContent = text;
            watermark.style.fontSize = `${watermarkState.fontSize}px`;
            watermark.style.color = watermarkState.color;
            watermark.style.opacity = watermarkState.opacity / 100;
            watermark.style.transform = `rotate(${watermarkState.rotation}deg)`;
            watermark.style.left = `${watermarkState.x}%`;
            watermark.style.top = `${watermarkState.y}%`;
            
            watermarkContainer.appendChild(watermark);
            
            // 添加拖拽功能
            if (typeof makeDraggable === 'function') {
              makeDraggable(watermark);
            } else {
              // 简单的拖拽实现
              watermark.addEventListener('mousedown', function(e) {
                const container = watermarkContainer;
                const containerRect = container.getBoundingClientRect();
                const rect = watermark.getBoundingClientRect();
                
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                
                function moveHandler(e) {
                  const x = e.clientX - containerRect.left - offsetX;
                  const y = e.clientY - containerRect.top - offsetY;
                  
                  const percentX = (x / containerRect.width) * 100;
                  const percentY = (y / containerRect.height) * 100;
                  
                  const boundedX = Math.max(0, Math.min(100, percentX));
                  const boundedY = Math.max(0, Math.min(100, percentY));
                  
                  watermark.style.left = `${boundedX}%`;
                  watermark.style.top = `${boundedY}%`;
                  
                  watermarkState.x = boundedX;
                  watermarkState.y = boundedY;
                }
                
                function upHandler() {
                  document.removeEventListener('mousemove', moveHandler);
                  document.removeEventListener('mouseup', upHandler);
                }
                
                document.addEventListener('mousemove', moveHandler);
                document.addEventListener('mouseup', upHandler);
                
                e.preventDefault();
              });
            }
          } else {
            // 平铺水印
            const tileSpacing = parseInt(watermarkState.tileSpacing);
            const watermarkStyle = `
              font-size: ${watermarkState.fontSize}px;
              color: ${watermarkState.color};
              opacity: ${watermarkState.opacity / 100};
              transform: rotate(${watermarkState.rotation}deg);
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
        } else if (watermarkState.type === 'image' && watermarkState.watermarkImage) {
          // 图片水印
          const src = typeof watermarkState.watermarkImage === 'string' ? 
                      watermarkState.watermarkImage : 
                      watermarkState.watermarkImage.src;
                      
          const watermark = document.createElement('img');
          watermark.className = 'draggable-watermark';
          watermark.src = src;
          watermark.style.opacity = watermarkState.opacity / 100;
          watermark.style.transform = `rotate(${watermarkState.rotation}deg)`;
          watermark.style.left = `${watermarkState.x}%`;
          watermark.style.top = `${watermarkState.y}%`;
          watermark.style.maxWidth = `${watermarkState.watermarkImageSize}%`;
          watermark.style.maxHeight = `${watermarkState.watermarkImageSize}%`;
          
          watermarkContainer.appendChild(watermark);
          
          // 添加拖拽功能
          if (typeof makeDraggable === 'function') {
            makeDraggable(watermark);
          }
        }
        
        console.log('水印已更新');
      } catch (error) {
        console.error('更新水印错误:', error);
      }
    };
    
    console.log('已实现updateWatermark函数');
  }
  
  // 实现processImage函数
  if (typeof window.processImage !== 'function') {
    window.processImage = function(file) {
      return new Promise((resolve, reject) => {
        console.log('执行修复版processImage函数');
        
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
                  if (typeof window.applyWatermarkToCanvas === 'function') {
                    window.applyWatermarkToCanvas(canvas, ctx);
                  } else {
                    // 简单的水印应用
                    const watermarkState = window.watermarkState || {
                      type: 'text',
                      text: '仅供验证使用',
                      fontSize: 24,
                      opacity: 50,
                      rotation: -30,
                      color: '#ff0000',
                      x: 50,
                      y: 50
                    };
                    
                    const watermarkText = document.getElementById('watermark-text');
                    const text = watermarkText ? watermarkText.value : '仅供验证使用';
                    
                    // 设置字体和颜色
                    ctx.font = `${watermarkState.fontSize}px Arial`;
                    ctx.fillStyle = watermarkState.color;
                    ctx.globalAlpha = watermarkState.opacity / 100;
                    
                    // 保存当前状态
                    ctx.save();
                    
                    // 移动到水印位置
                    const x = (canvas.width * watermarkState.x) / 100;
                    const y = (canvas.height * watermarkState.y) / 100;
                    
                    ctx.translate(x, y);
                    ctx.rotate((watermarkState.rotation * Math.PI) / 180);
                    
                    // 绘制文字
                    ctx.fillText(text, 0, 0);
                    
                    // 恢复状态
                    ctx.restore();
                  }
                  
                  // 返回处理后的图片数据
                  resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                  console.error('处理图片错误:', error);
                  resolve(null);
                }
              };
              
              img.onerror = function() {
                console.error('图片加载失败:', file.name);
                resolve(null);
              };
              
              img.src = dataUrl;
            } catch (error) {
              console.error('处理图片数据错误:', error);
              resolve(null);
            }
          };
          
          reader.onerror = function() {
            console.error('读取文件失败:', file.name);
            resolve(null);
          };
          
          // 读取文件
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('处理图片过程错误:', error);
          resolve(null);
        }
      });
    };
    
    console.log('已实现processImage函数');
  }
  
  // 实现applyWatermark函数
  if (typeof window.applyWatermark !== 'function') {
    window.applyWatermark = function(image) {
      console.log('执行修复版applyWatermark函数');
      
      return window.processImage(image);
    };
    
    console.log('已实现applyWatermark函数');
  }
} 