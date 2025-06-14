/**
 * 事件监听器模块
 * 处理按钮、菜单等DOM元素的事件监听
 */

import { watermarkState, updateState } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';
import { handleImageFiles } from '../utils/drag-drop.js';
import { processImage, batchProcessImages, generateAndDownloadZip } from '../utils/image-processor.js';

/**
 * 初始化事件监听器
 */
export function initEventListeners() {
  console.log('初始化事件监听器');
  
  // 恢复保存的背景色设置
  const savedBackgroundColor = localStorage.getItem('previewBackgroundColor');
  if (savedBackgroundColor) {
    const previewArea = document.querySelector('.preview-area');
    if (previewArea) {
      previewArea.style.backgroundColor = savedBackgroundColor;
      
      // 更新对应按钮的active状态
      const bgColorButtons = document.querySelectorAll('.bg-color-button');
      if (bgColorButtons && bgColorButtons.length > 0) {
        bgColorButtons.forEach(btn => {
          btn.classList.remove('active');
          if (btn.dataset.color === savedBackgroundColor) {
            btn.classList.add('active');
          }
        });
      }
    }
  }
  
  // 上传图片按钮点击事件
  const uploadFilesBtn = document.getElementById('upload-files-btn');
  const fileInput = document.getElementById('file-input');
  
  if (uploadFilesBtn && fileInput) {
    uploadFilesBtn.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        handleImageFiles(this.files);
      }
    });
  }
  
  // 上传文件夹按钮点击事件
  const uploadFolderBtn = document.getElementById('upload-folder-btn');
  const folderInput = document.getElementById('folder-input');
  
  if (uploadFolderBtn && folderInput) {
    uploadFolderBtn.addEventListener('click', function() {
      folderInput.click();
    });
    
    folderInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        // 显示处理模态框
        const processingModal = document.getElementById('processing-modal');
        const modalProgressBar = document.getElementById('modal-progress-bar');
        const processingStatus = document.getElementById('processing-status');
        
        if (processingModal) {
          processingModal.style.display = 'flex';
          const modalTitle = processingModal.querySelector('.modal-title');
          if (modalTitle) modalTitle.textContent = '处理文件夹中...';
          if (processingStatus) processingStatus.textContent = `正在加载文件夹内容...`;
          
          // 重置进度条
          if (modalProgressBar) {
            modalProgressBar.style.width = '0%';
            modalProgressBar.textContent = '0%';
          }
        }
        
        // 延迟一下再处理文件，让进度条有时间显示
        setTimeout(() => {
          handleImageFiles(this.files);
        }, 100);
      }
    });
  }
  
  // 单张下载按钮点击事件
  const downloadBtn = document.getElementById('download-btn');
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      // 检查是否有选择图片
      if (!watermarkState.files || watermarkState.files.length === 0) {
        showStatus('请先上传图片', false);
        return;
      }
      
      const currentFile = watermarkState.files[watermarkState.currentIndex];
      
      if (!currentFile) {
        showStatus('无法加载当前图片', false);
        return;
      }
      
      // 处理图片并下载
      processImage(currentFile, true)
        .then(dataUrl => {
          if (!dataUrl) {
            showStatus('处理图片失败', false);
            return;
          }
          
          // 创建下载链接
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `watermarked_${currentFile.name}`;
          link.style.display = 'none';
          
          // 添加到文档并触发下载
          document.body.appendChild(link);
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            // 显示成功消息
            showStatus('图片下载成功', true);
          }, 100);
        })
        .catch(error => {
          console.error('下载图片时出错:', error);
          showStatus('处理图片时出错', false);
        });
    });
  }
  
  // 批量下载按钮点击事件
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  
  if (batchDownloadBtn) {
    batchDownloadBtn.addEventListener('click', function() {
      // 检查是否有上传的图片
      if (!watermarkState.files || watermarkState.files.length === 0) {
        showStatus('请先上传图片', false);
        return;
      }
      
      // 显示处理模态框
      const processingModal = document.getElementById('processing-modal');
      const modalProgressBar = document.getElementById('modal-progress-bar');
      const processingStatus = document.getElementById('processing-status');
      
      if (processingModal) {
        processingModal.style.display = 'flex';
        if (processingStatus) processingStatus.textContent = '正在处理图片...';
        if (modalProgressBar) {
          modalProgressBar.style.width = '0%';
          modalProgressBar.textContent = '0%';
        }
      }
      
      console.log(`开始批量处理 ${watermarkState.files.length} 张图片`);
      
      // 创建处理队列
      const processQueue = [];
      const totalFiles = watermarkState.files.length;
      const processedImages = [];
      let processedCount = 0;
      
      // 为每个文件创建处理任务
      watermarkState.files.forEach((file, index) => {
        processQueue.push(() => {
          return new Promise((resolve) => {
            // 更新进度
            const progress = (processedCount / totalFiles) * 100;
            if (modalProgressBar) {
              modalProgressBar.style.width = `${progress}%`;
              modalProgressBar.textContent = `${Math.round(progress)}%`;
            }
            if (processingStatus) {
              processingStatus.textContent = `正在处理: ${file.name} (${Math.round(progress)}%)`;
            }
            
            // 处理图片（添加水印）
            processImage(file, true)
              .then(dataUrl => {
                if (dataUrl) {
                  // 将处理后的图片添加到结果数组
                  processedImages.push({
                    name: file.name,
                    dataUrl: dataUrl
                  });
                  console.log(`成功处理图片 ${index + 1}/${totalFiles}: ${file.name}`);
                } else {
                  console.warn(`图片处理失败，跳过: ${file.name}`);
                }
                
                // 更新进度
                processedCount++;
                resolve();
              })
              .catch(error => {
                console.error(`处理图片时出错: ${file.name}`, error);
                processedCount++;
                resolve(); // 即使出错也继续处理下一张
              });
          });
        });
      });
      
      // 按顺序处理图片
      const processSequentially = async () => {
        for (const task of processQueue) {
          await task();
        }
        return processedImages;
      };
      
      // 开始处理
      processSequentially()
        .then(images => {
          if (processingStatus) {
            processingStatus.textContent = '正在生成下载文件...';
          }
          
          // 直接下载处理过的图片
          return generateAndDownloadZip(images);
        })
        .then(() => {
          // 隐藏模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示成功消息
          showStatus('批量下载成功', true);
        })
        .catch(error => {
          // 隐藏模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          console.error('批量下载时出错:', error);
          showStatus('批量下载时出错', false);
        });
    });
  }
  
  // 水印类型选择事件
  const watermarkType = document.getElementById('watermark-type');
  
  if (watermarkType) {
    watermarkType.addEventListener('change', function() {
      const type = this.value;
      
      // 更新状态
      updateState({
        type: type
      });
      
      // 显示对应选项
      const textOptions = document.getElementById('text-options');
      const tiledOptions = document.getElementById('tiled-options');
      const imageOptions = document.getElementById('image-options');
      
      if (textOptions) textOptions.style.display = type === 'text' ? 'block' : 'none';
      if (tiledOptions) tiledOptions.style.display = type === 'tiled' ? 'block' : 'none';
      if (imageOptions) imageOptions.style.display = type === 'image' ? 'block' : 'none';
      
      // 更新水印
      updateWatermark();
    });
  }
  
  // 移除水印图片按钮点击事件
  const removeWatermarkImageBtn = document.getElementById('remove-watermark-image');
  
  if (removeWatermarkImageBtn) {
    removeWatermarkImageBtn.addEventListener('click', function() {
      // 更新状态
      updateState({
        watermarkImage: null,
        type: 'text'
      });
      
      // 更新类型选择框
      const typeSelector = document.getElementById('watermark-type');
      if (typeSelector) {
        typeSelector.value = 'text';
      }
      
      // 隐藏图片预览
      const watermarkImagePreview = document.getElementById('watermark-image-preview');
      if (watermarkImagePreview) {
        watermarkImagePreview.style.display = 'none';
      }
      
      // 显示文字选项
      const textOptions = document.getElementById('text-options');
      const imageOptions = document.getElementById('image-options');
      
      if (textOptions) textOptions.style.display = 'block';
      if (imageOptions) imageOptions.style.display = 'none';
      
      // 更新水印
      updateWatermark();
    });
  }
  
  // 水印图片输入事件
  const watermarkImageInput = document.getElementById('watermark-image-input');
  
  if (watermarkImageInput) {
    watermarkImageInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        const file = this.files[0];
        
        // 确保是图片文件
        if (file.type.startsWith('image/')) {
          // 读取图片
          const reader = new FileReader();
          
          reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
              // 更新状态
              updateState({
                watermarkImage: img,
                type: 'image'
              });
              
              // 更新类型选择框
              const typeSelector = document.getElementById('watermark-type');
              if (typeSelector) {
                typeSelector.value = 'image';
              }
              
              // 显示预览
              const watermarkImagePreview = document.getElementById('watermark-image-preview');
              const watermarkImageThumbnail = document.getElementById('watermark-image-thumbnail');
              
              if (watermarkImagePreview && watermarkImageThumbnail) {
                watermarkImageThumbnail.src = e.target.result;
                watermarkImagePreview.style.display = 'block';
              }
              
              // 显示图片选项
              const imageOptions = document.getElementById('image-options');
              const textOptions = document.getElementById('text-options');
              const tiledOptions = document.getElementById('tiled-options');
              
              if (imageOptions) imageOptions.style.display = 'block';
              if (textOptions) textOptions.style.display = 'none';
              if (tiledOptions) tiledOptions.style.display = 'none';
              
              // 更新水印
              updateWatermark();
            };
            
            img.src = e.target.result;
          };
          
          reader.readAsDataURL(file);
        } else {
          showStatus('请选择有效的图片文件', false);
        }
      }
    });
  }
  
  // 帮助按钮点击事件
  const helpButton = document.getElementById('help-button');
  const helpModal = document.getElementById('help-modal');
  
  if (helpButton && helpModal) {
    helpButton.addEventListener('click', function() {
      helpModal.style.display = 'flex';
      
      // 添加帮助文档内容
      const helpModalContent = document.getElementById('help-modal-content');
      
      if (helpModalContent && !helpModalContent.querySelector('.help-section')) {
        helpModalContent.innerHTML = generateHelpContent();
      }
    });
    
    // 添加关闭按钮的事件监听
    const closeButton = helpModal.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        helpModal.style.display = 'none';
      });
    }
    
    // 点击模态框外部区域关闭
    window.addEventListener('click', function(event) {
      if (event.target === helpModal) {
        helpModal.style.display = 'none';
      }
    });
  }
  
  // 背景色按钮点击事件
  const bgColorButtons = document.querySelectorAll('.bg-color-button');
  
  if (bgColorButtons && bgColorButtons.length > 0) {
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
        
        // 设置预览区域的背景色
        const previewArea = document.querySelector('.preview-area');
        if (previewArea) {
          previewArea.style.backgroundColor = color;
          // 保存设置到本地存储
          localStorage.setItem('previewBackgroundColor', color);
          console.log('已设置预览区域背景色为:', color);
        }
      });
    });
  }
}

/**
 * 显示状态消息
 * @param {string} message - 消息文本
 * @param {boolean} isSuccess - 是否成功消息
 */
function showStatus(message, isSuccess) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    // 设置消息样式
    statusMessage.style.backgroundColor = isSuccess ? '#4caf50' : '#f44336';
    statusMessage.textContent = message;
    
    // 显示消息
    statusMessage.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  } else {
    console.log(message);
  }
}

/**
 * 生成帮助文档内容
 * @returns {string} - 帮助文档HTML内容
 */
function generateHelpContent() {
  return `
    <h2 class="modal-title">图片水印工具使用帮助</h2>
    
    <div class="help-section">
      <h3>基本操作</h3>
      <p>本工具可以为图片添加文字、平铺或图片水印，并支持批量处理多张图片。</p>
      <ul>
        <li>点击"上传图片"按钮或将图片拖放到上传区域，可以选择单张或多张图片上传。</li>
        <li>点击"上传文件夹"按钮可以整个文件夹的图片上传，保留目录结构。</li>
        <li>上传后，可以在底部缩略图区域选择不同的图片进行编辑。</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>水印设置</h3>
      <ul>
        <li><strong>水印类型</strong>：可选择文字水印、平铺水印或图片水印。</li>
        <li><strong>文字水印</strong>：输入水印文字，调整大小、颜色、透明度和旋转角度。</li>
        <li><strong>平铺水印</strong>：设置文字内容，调整大小、颜色、透明度、旋转角度和平铺间距。</li>
        <li><strong>图片水印</strong>：上传一张图片作为水印，调整大小、透明度和旋转角度。</li>
        <li>默认水印大小已优化为36px，提供更好的可见性。</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>水印定位</h3>
      <p>水印可以通过以下方式调整位置和大小：</p>
      <ul>
        <li><strong>拖动定位</strong>：直接用鼠标拖动水印到需要的位置。</li>
        <li><strong>鼠标滚轮缩放</strong>：在水印上滚动鼠标滚轮可以调整水印大小。</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>批量处理</h3>
      <p>批量处理多张图片的步骤：</p>
      <ol>
        <li>上传多张图片或一个图片文件夹。</li>
        <li>设置好水印的类型、内容和样式。</li>
        <li>点击"开始批量处理"按钮，等待处理完成。</li>
        <li>处理完成后，点击"批量下载"按钮，将会下载包含所有处理后图片的ZIP文件。</li>
        <li>批量处理时会显示"处理中..."进度提示，请耐心等待完成。</li>
      </ol>
    </div>
    
    <div class="help-section">
      <h3>图片背景设置</h3>
      <p>为减轻眼睛疲劳，可以选择不同的预览背景色：</p>
      <ul>
        <li><strong>白色背景</strong>：默认背景色，适合大多数图片。</li>
        <li><strong>浅灰背景</strong>：中性背景色，减少眼部疲劳。</li>
        <li><strong>浅蓝背景</strong>：冷色调背景，适合长时间查看。</li>
        <li><strong>浅绿背景</strong>：护眼色，减少屏幕蓝光。</li>
        <li><strong>浅黄背景</strong>：暖色调背景，适合夜间使用。</li>
      </ul>
    </div>
    
    <div class="help-section">
      <h3>图片质量设置</h3>
      <p>可以调整输出图片的质量，默认为92%的高质量设置。质量越高，图片越清晰但文件体积越大。</p>
    </div>
    
    <div class="help-section">
      <h3>注意事项</h3>
      <ul>
        <li>对于小图片（宽度或高度小于300像素），水印大小会自动调整。</li>
        <li>批量处理大量图片可能需要一些时间，请耐心等待。</li>
        <li>本工具在本地处理图片，不会上传到服务器，保证您的图片隐私安全。</li>
        <li>批量下载功能会保留原始图片格式，不进行格式转换。</li>
      </ul>
    </div>
  `;
} 