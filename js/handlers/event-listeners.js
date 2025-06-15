/**
 * 事件监听器模块
 * 处理按钮、菜单等DOM元素的事件监听
 */

import { watermarkState, updateState, saveFirstImageSettings, applyFirstImageSettings, saveCurrentImageSettings, applyImageSettings } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';
import { handleImageFiles } from '../utils/drag-drop.js';
import { processImage, batchProcessImages, generateAndDownloadZip } from '../utils/image-processor.js';

// 当前选中的文件
let currentFile = null;

/**
 * 初始化事件监听器
 */
export function initEventListeners() {
  console.log('初始化事件监听器');
  
  // 应用到所有按钮点击事件
  const applyToAllBtn = document.getElementById('apply-to-all-btn');
  if (applyToAllBtn) {
    applyToAllBtn.addEventListener('click', function() {
      if (!watermarkState.files || watermarkState.files.length <= 1) {
        showMessage('需要至少两张图片才能应用设置');
        return;
      }
      
      // 显示确认对话框
      if (!confirm('这将覆盖所有其他图片的水印设置，是否继续？')) {
        return;
      }
      
      // 保存当前图片的水印设置
      saveCurrentImageSettings();
      
      // 获取当前图片的文件名
      const currentFileName = watermarkState.files[watermarkState.currentIndex].name;
      const currentSettings = watermarkState.processedSettings[currentFileName];
      
      if (!currentSettings) {
        showMessage('无法获取当前图片的水印设置');
        return;
      }
      
      // 获取当前图片的尺寸（用于相对位置计算）
      const currentImageWidth = watermarkState.imageWidth;
      const currentImageHeight = watermarkState.imageHeight;
      
      // 应用到所有其他图片
      let appliedCount = 0;
      for (let i = 0; i < watermarkState.files.length; i++) {
        if (i !== watermarkState.currentIndex) {
          const fileName = watermarkState.files[i].name;
          
          // 复制当前设置到其他图片，但确保相对位置在有效范围内
          const adjustedSettings = {...currentSettings};
          
          // 确保相对位置在0-100范围内
          if (adjustedSettings.relativePosition) {
            adjustedSettings.relativePosition.x = Math.max(0, Math.min(100, adjustedSettings.relativePosition.x));
            adjustedSettings.relativePosition.y = Math.max(0, Math.min(100, adjustedSettings.relativePosition.y));
          } else {
            adjustedSettings.relativePosition = { x: 50, y: 50 };
          }
          
          // 保存调整后的设置
          watermarkState.processedSettings[fileName] = adjustedSettings;
          appliedCount++;
        }
      }
      
      // 显示成功消息
      showMessage(`已将当前水印设置应用到其他 ${appliedCount} 张图片`);
      
      // 更新水印显示
      updateWatermark();
    });
  }
  
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
  
  // 处理弹窗最小化按钮
  const processingMinimizeBtn = document.getElementById('processing-minimize-btn');
  const processingPopup = document.getElementById('processing-popup');
  
  if (processingMinimizeBtn && processingPopup) {
    processingMinimizeBtn.addEventListener('click', function() {
      if (processingPopup.classList.contains('minimized')) {
        // 已经是最小化状态，恢复
        processingPopup.classList.remove('minimized');
        this.textContent = '最小化';
      } else {
        // 最小化
        processingPopup.classList.add('minimized');
        this.textContent = '展开';
      }
    });
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
        const modalCountdown = document.getElementById('modal-countdown');
        
        if (processingModal) {
          processingModal.style.display = 'flex';
          const modalTitle = processingModal.querySelector('.modal-title');
          if (modalTitle) modalTitle.textContent = '处理文件夹中...';
          if (processingStatus) processingStatus.textContent = `正在加载文件夹内容...共${this.files.length}个文件`;
          
          // 重置进度条
          if (modalProgressBar) {
            modalProgressBar.style.width = '0%';
            modalProgressBar.textContent = '0%';
          }
          
          // 设置倒计时
          if (modalCountdown) {
            modalCountdown.textContent = '自动关闭: 60';
          }
          
          // 设置安全超时，确保模态框最终会关闭
          const safetyTimeout = setTimeout(() => {
            console.log('文件夹处理安全超时触发，强制关闭模态框');
            if (processingModal && processingModal.style.display === 'flex') {
              processingModal.style.display = 'none';
              showStatus('文件夹处理已完成（安全机制触发）');
            }
          }, 60000); // 60秒后强制关闭
          
          // 延迟一下再处理文件，让进度条有时间显示
          setTimeout(() => {
            // 确保显示"正在处理"的状态
            if (modalProgressBar) {
              modalProgressBar.style.width = '10%';
              modalProgressBar.textContent = '10%';
            }
            if (processingStatus) {
              processingStatus.textContent = `正在处理文件夹内容...共${this.files.length}个文件`;
            }
            
            handleImageFiles(this.files)
              .then(() => {
                // 处理完成后清除安全超时
                clearTimeout(safetyTimeout);
                
                // 确保模态框关闭
                if (processingModal && processingModal.style.display === 'flex') {
                  processingModal.style.display = 'none';
                  showStatus('文件夹处理完成', true);
                }
              })
              .catch(error => {
                console.error('处理文件夹内容时出错:', error);
                
                // 出错时也清除安全超时并关闭模态框
                clearTimeout(safetyTimeout);
                
                // 确保模态框关闭
                if (processingModal && processingModal.style.display === 'flex') {
                  processingModal.style.display = 'none';
                }
                
                showStatus('处理文件夹内容时出错: ' + error.message, false);
              });
          }, 100);
        } else {
          // 如果找不到模态框，直接处理文件
          handleImageFiles(this.files);
        }
      }
    });
  }
  
  // 单张下载按钮点击事件
  const downloadBtn = document.getElementById('download-btn');
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      if (!currentFile) {
        showMessage('请先上传图片');
        return;
      }
      
      // 显示状态
      showStatus('正在处理...');
      
      // 检查是否为GIF
      const isGif = 
        currentFile.type === 'image/gif' || 
        currentFile.name.toLowerCase().endsWith('.gif');
      
      // GIF特殊处理选项 - 确保保留动画效果
      const gifOptions = {
        preserveAnimation: true, // 指定保留GIF动画
        quality: 10, // GIF处理质量
        applyWatermark: true // 确保应用水印到GIF
      };
      
      // 普通图片选项
      const imageOptions = {
        quality: watermarkState.quality || 0.92 // 普通图片质量
      };
      
      // 根据文件类型选择适当的选项
      const options = {
        isDownload: true, // 标记为下载模式
        applyWatermark: true, // 明确应用水印
        quality: isGif ? gifOptions.quality : imageOptions.quality,
        // 对于GIF，使用保留动画的选项
        ...(isGif ? gifOptions : {}),
        // 保存当前水印设置
        ...watermarkState,
        // 确保使用当前水印设置
        text: watermarkState.text,
        color: watermarkState.color,
        fontSize: watermarkState.fontSize,
        opacity: watermarkState.opacity,
        rotation: watermarkState.rotation,
        position: watermarkState.relativePosition,
        tileSpacing: watermarkState.tileSpacing
      };
      
      console.log('下载处理选项:', JSON.stringify({
        isGif: isGif,
        applyWatermark: options.applyWatermark,
        isDownload: options.isDownload,
        quality: options.quality
      }));
      
      // 处理图片并下载
      processImage(currentFile, options)
        .then(result => {
          console.log('图片处理结果:', result);
          
          if (!result) {
            console.error('图片处理结果为空');
            showStatus('处理图片失败: 结果为空', false);
            return;
          }
          
          if (!result.blobUrl && !result.blob) {
            console.error('图片处理结果没有有效的blob或blobUrl');
            showStatus('处理图片失败: 无效的处理结果', false);
            return;
          }
          
          // 创建下载链接
          const link = document.createElement('a');
          
          if (result.blob) {
            // 直接使用blob创建URL
            link.href = URL.createObjectURL(result.blob);
          } else {
            // 使用已有的blobUrl
            link.href = result.blobUrl;
          }
          
          // 设置下载文件名
          // 确保保留原始扩展名，特别是对GIF文件
          const fileName = currentFile.name;
          
          // 确保文件扩展名与实际MIME类型匹配
          let downloadFileName = fileName;
          
          // 对于GIF文件特殊处理，确保保留.gif扩展名
          if (isGif) {
            const dotIndex = fileName.lastIndexOf('.');
            if (dotIndex > 0) {
              const baseName = fileName.substring(0, dotIndex);
              downloadFileName = `${baseName}.gif`;
            } else {
              downloadFileName = `${fileName}.gif`;
            }
            console.log(`确保GIF文件下载名称正确: ${downloadFileName}`);
          } else if (result.blob) {
            // 非GIF文件，根据blob的MIME类型确定扩展名
            const mimeType = result.blob.type;
            const dotIndex = fileName.lastIndexOf('.');
            const baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
            
            // 根据MIME类型设置扩展名
            if (mimeType === 'image/jpeg') {
              downloadFileName = `${baseName}.jpg`;
            } else if (mimeType === 'image/png') {
              downloadFileName = `${baseName}.png`;
            } else if (mimeType === 'image/webp') {
              downloadFileName = `${baseName}.webp`;
            }
            // 其他类型保持原始文件名
          }
          
          link.download = downloadFileName;
          
          // 模拟点击下载
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 清理URL
          if (result.blob) {
            setTimeout(() => {
              URL.revokeObjectURL(link.href);
            }, 100);
          }
          
          // 显示成功状态
          showStatus(`已下载 ${downloadFileName}`, true);
        })
        .catch(error => {
          console.error('处理图片出错:', error);
          showStatus('处理图片出错: ' + error.message, false);
        });
    });
  }
  
  // 批量下载按钮点击事件
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  
  if (batchDownloadBtn) {
    batchDownloadBtn.addEventListener('click', function() {
      if (!watermarkState.files || watermarkState.files.length === 0) {
        showMessage('请先上传图片');
        return;
      }
      
      // 显示处理模态框
      const processingModal = document.getElementById('processing-modal');
      const modalProgressBar = document.getElementById('modal-progress-bar');
      const processingStatus = document.getElementById('processing-status');
      const modalCountdown = document.getElementById('modal-countdown');
      
      if (processingModal) {
        processingModal.style.display = 'flex';
        const modalTitle = processingModal.querySelector('.modal-title');
        if (modalTitle) modalTitle.textContent = '批量处理中...';
        if (processingStatus) processingStatus.textContent = '准备批量处理...';
        
        // 重置进度条
        if (modalProgressBar) {
          modalProgressBar.style.width = '0%';
          modalProgressBar.textContent = '0%';
        }
        
        // 设置倒计时
        if (modalCountdown) {
          modalCountdown.textContent = '自动关闭: 60';
        }
        
        // 设置安全超时，确保模态框最终会关闭
        const safetyTimeout = setTimeout(() => {
          console.log('批量处理安全超时触发，强制关闭模态框');
          if (processingModal && processingModal.style.display === 'flex') {
            processingModal.style.display = 'none';
            showStatus('批量处理已完成（安全机制触发）');
          }
        }, 60000); // 60秒后强制关闭
        
        // 获取当前的水印设置
        const currentSettings = {
          text: watermarkState.text,
          color: watermarkState.color,
          fontSize: watermarkState.fontSize,
          opacity: watermarkState.opacity,
          rotation: watermarkState.rotation,
          position: watermarkState.relativePosition,
          tileSpacing: watermarkState.tileSpacing,
          quality: watermarkState.quality || 0.92
        };
        
        // 批量处理图片
        batchProcessImages(watermarkState.files, (progress) => {
          // 更新进度
          if (modalProgressBar && processingStatus) {
            const percent = Math.round(progress.progress * 100);
            modalProgressBar.style.width = `${percent}%`;
            modalProgressBar.textContent = `${percent}%`;
            processingStatus.textContent = `已处理 ${progress.processed}/${progress.total} 张图片，${progress.errors || 0} 张失败`;
          }
        }, currentSettings)
        .then(result => {
          console.log('批量处理完成:', result);
          
          if (processingStatus) {
            processingStatus.textContent = `正在生成ZIP文件...`;
          }
          
          // 清除安全超时
          clearTimeout(safetyTimeout);
          
          // 生成ZIP文件
          return generateAndDownloadZip(result.images, 'watermarked_images.zip', (zipProgress) => {
            // 更新ZIP生成进度
            if (modalProgressBar && processingStatus) {
              const progress = Math.round(zipProgress.progress * 100);
              modalProgressBar.style.width = `${progress}%`;
              modalProgressBar.textContent = `${progress}%`;
              processingStatus.textContent = zipProgress.status;
            }
          });
        })
        .then(zipResult => {
          console.log('ZIP生成完成:', zipResult);
          
          // 关闭处理模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示成功状态
          showStatus(`批量处理完成，已下载ZIP文件`, true);
        })
        .catch(error => {
          console.error('批量处理或ZIP生成失败:', error);
          
          // 清除安全超时
          clearTimeout(safetyTimeout);
          
          // 关闭处理模态框
          if (processingModal) {
            processingModal.style.display = 'none';
          }
          
          // 显示错误状态
          showStatus(`批量处理失败: ${error.message}`, false);
        });
      }
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
 * 显示消息（用于批量下载）
 * @param {string} message - 消息文本
 */
function showMessage(message) {
  // 使用已有的showStatus函数显示消息
  showStatus(message, true);
}

/**
 * 获取选中的文件
 * @returns {Array} - 选中的文件数组
 */
function getSelectedFiles() {
  // 如果有特定的选择机制，在这里实现
  // 确保返回所有已加载的文件
  const files = watermarkState.files || [];
  console.log(`获取选中文件：共 ${files.length} 个文件`);
  return files;
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