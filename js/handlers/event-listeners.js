/**
 * 事件监听器模块
 * 处理按钮、菜单等DOM元素的事件监听
 */

import { watermarkState, updateState, saveFirstImageSettings, applyFirstImageSettings, saveCurrentImageSettings, applyImageSettings } from '../core/state.js';
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
      
      // 判断是否为GIF
      const isGif = currentFile.type === 'image/gif' || currentFile.name.toLowerCase().endsWith('.gif');
      
      // 显示处理中提示
      if (isGif) {
        showStatus('正在处理GIF动图，请稍候...', true);
      } else {
        showStatus('正在处理图片，请稍候...', true);
      }
      
      console.log('开始处理图片用于下载:', currentFile.name, '是GIF:', isGif);
      
      // 处理图片并下载
      processImage(currentFile, true, {
        isDownload: true, // 标记为下载模式
        quality: isGif ? 5 : (watermarkState.quality || 0.92),
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
      })
        .then(result => {
          console.log('图片处理结果:', result);
          
          if (!result) {
            console.error('图片处理结果为空');
            showStatus('处理图片失败: 结果为空', false);
            return;
          }
          
          if (!result.blobUrl && !result.blob) {
            console.error('图片处理结果没有有效的blob或blobUrl');
            showStatus('处理图片失败: 无有效数据', false);
            return;
          }
          
          let dataUrl = result.blobUrl;
          let fileName = `watermarked_${currentFile.name}`;
          
          console.log('准备下载图片:', fileName, '链接:', dataUrl);
          
          // 创建下载链接
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName;
          link.style.display = 'none';
          
          // 添加到文档并触发下载
          document.body.appendChild(link);
          console.log('触发下载...');
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            // 不要撤销 URL，因为它可能仍在预览中使用
            // 如果是GIF，尤其不要撤销 URL，防止预览消失
            if (!result.isGif) {
              URL.revokeObjectURL(link.href);
            }
            
            // 显示成功消息
            if (isGif) {
              showStatus('GIF动图处理完成并已下载', true);
            } else {
              showStatus('图片下载成功', true);
            }
            console.log('下载完成:', fileName);
          }, 100);
        })
        .catch(error => {
          console.error('下载图片时出错:', error);
          showStatus(`处理图片时出错: ${error.message || '未知错误'}`, false);
        });
    });
  }
  
  // 批量下载按钮点击事件
  const batchDownloadBtn = document.getElementById('batch-download-btn');
  
  if (batchDownloadBtn) {
    // 更新按钮文本，明确表示是ZIP下载
    batchDownloadBtn.textContent = '批量下载(ZIP)';
    
    batchDownloadBtn.addEventListener('click', async function() {
      try {
        // 检查是否有图片被选中
        const selectedFiles = getSelectedFiles();
        
        if (selectedFiles.length === 0) {
          showMessage('请选择要下载的图片');
          return;
        }
        
        console.log(`开始批量下载处理，共 ${selectedFiles.length} 张图片，将打包为ZIP文件`);
        showMessage(`正在准备打包 ${selectedFiles.length} 张图片为ZIP文件...`);
        
        // 显示处理弹窗
        const processingPopup = document.getElementById('processing-popup');
        const processingProgressBar = document.getElementById('processing-progress-bar');
        const processingStatus = document.getElementById('processing-status');
        const processingDetails = document.getElementById('processing-details');
        
        // 获取统计信息元素
        const processingTime = document.querySelector('#processing-time .stats-value');
        const processingRemaining = document.querySelector('#processing-remaining .stats-value');
        const processingSpeed = document.querySelector('#processing-speed .stats-value');
        const processingCount = document.querySelector('#processing-count .stats-value');
        
        if (processingPopup) processingPopup.style.display = 'block';
        if (processingProgressBar) processingProgressBar.style.width = '0%';
        if (processingStatus) processingStatus.textContent = '正在准备批量处理...';
        if (processingDetails) {
          const gifCount = selectedFiles.filter(file => 
            file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
          ).length;
          
          processingDetails.innerHTML = `
            总计: ${selectedFiles.length} 张图片<br>
            普通图片: ${selectedFiles.length - gifCount} 张<br>
            GIF动图: ${gifCount} 张<br>
            <small>注意: GIF处理速度较慢，请耐心等待</small>
          `;
        }
        
        // 初始化统计信息
        if (processingTime) processingTime.textContent = '0秒';
        if (processingRemaining) processingRemaining.textContent = '计算中...';
        if (processingSpeed) processingSpeed.textContent = '0张/秒';
        if (processingCount) processingCount.textContent = `0/${selectedFiles.length}`;
        
        // 记录开始时间
        const startTime = Date.now();
        
        // 批量处理图片并下载
        console.log('开始批量处理图片...');
        const processedImages = await batchProcessImages(selectedFiles, (progress, stats) => {
          // 更新进度条
          if (processingProgressBar) {
            processingProgressBar.style.width = `${Math.round(progress * 100)}%`;
          }
          
          // 更新状态
          if (processingStatus) {
            const percent = Math.round(progress * 100);
            processingStatus.textContent = `已处理: ${stats.processedCount}/${stats.totalFiles} (${percent}%)`;
          }
          
          // 更新统计信息
          if (processingTime) {
            processingTime.textContent = `${stats.elapsedTime.toFixed(1)}秒`;
          }
          
          if (processingRemaining) {
            if (stats.remainingTime > 0) {
              if (stats.remainingTime < 60) {
                processingRemaining.textContent = `${stats.remainingTime.toFixed(1)}秒`;
              } else {
                const minutes = Math.floor(stats.remainingTime / 60);
                const seconds = Math.round(stats.remainingTime % 60);
                processingRemaining.textContent = `${minutes}分${seconds}秒`;
              }
            } else {
              processingRemaining.textContent = '计算中...';
            }
          }
          
          if (processingSpeed) {
            processingSpeed.textContent = `${stats.processingSpeed.toFixed(2)}张/秒`;
          }
          
          if (processingCount) {
            processingCount.textContent = `${stats.processedCount}/${stats.totalFiles}`;
          }
          
          // 更新详细信息
          if (processingDetails && stats) {
            const elapsedTime = stats.elapsedTime.toFixed(1);
            const speed = stats.processingSpeed.toFixed(2);
            let remainingTimeText = '';
            
            if (stats.remainingTime > 0) {
              if (stats.remainingTime < 60) {
                remainingTimeText = `预计剩余时间: ${stats.remainingTime.toFixed(1)} 秒`;
              } else {
                const minutes = Math.floor(stats.remainingTime / 60);
                const seconds = Math.round(stats.remainingTime % 60);
                remainingTimeText = `预计剩余时间: ${minutes}分${seconds}秒`;
              }
            }
            
            processingDetails.innerHTML = `
              总计: ${stats.totalFiles} 张图片<br>
              已处理: ${stats.processedCount} 张 (${Math.round(progress * 100)}%)<br>
              处理速度: ${speed} 张/秒<br>
              已用时间: ${elapsedTime} 秒<br>
              ${remainingTimeText}
            `;
          }
        }, {
          gifQuality: 5, // 优化GIF质量设置
          onFrameProgress: (frameProgress) => {
            // 帧处理进度更新 (GIF专用)
            if (processingDetails) {
              const currentContent = processingDetails.innerHTML;
              // 检查是否已经有GIF进度信息
              if (!currentContent.includes('当前GIF进度')) {
                processingDetails.innerHTML += `<br>当前GIF进度: ${Math.round(frameProgress * 100)}%`;
              } else {
                // 更新现有的GIF进度信息
                const newContent = currentContent.replace(
                  /当前GIF进度: \d+%/,
                  `当前GIF进度: ${Math.round(frameProgress * 100)}%`
                );
                processingDetails.innerHTML = newContent;
              }
            }
          }
        });
        
        console.log(`图片处理完成，共处理 ${processedImages.length} 张图片，准备生成ZIP...`);
        
        // 使用ZIP打包下载
        try {
          // 导入generateAndDownloadZip函数
          const { generateAndDownloadZip } = await import('../utils/image-processor.js');
          
          // 生成ZIP文件名
          const zipFileName = `watermarked_images_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
          
          // 更新状态
          if (processingStatus) processingStatus.textContent = '正在生成ZIP文件...';
          if (processingDetails) processingDetails.innerHTML = '正在将处理后的图片添加到ZIP文件中，请稍候...';
          
          console.log('开始生成ZIP文件...');
          
          // 生成并下载ZIP，传入进度回调
          const addedCount = await generateAndDownloadZip(processedImages, zipFileName, (progress, stats) => {
            // ZIP生成进度已经在函数内部更新
            if (processingProgressBar) {
              processingProgressBar.style.width = `${Math.round(progress * 100)}%`;
            }
            
            // 更新统计信息
            if (processingStatus && stats) {
              processingStatus.textContent = stats.status || '正在生成ZIP文件...';
            }
            
            // 更新进度计数
            if (processingCount && stats) {
              processingCount.textContent = `${stats.processedCount}/${stats.totalCount}`;
            }
            
            // 更新时间
            if (processingTime && stats) {
              processingTime.textContent = `${stats.elapsedTime.toFixed(1)}秒`;
            }
            
            // 更新剩余时间
            if (processingRemaining && stats && stats.remainingTime) {
              if (stats.remainingTime < 60) {
                processingRemaining.textContent = `${stats.remainingTime.toFixed(1)}秒`;
              } else {
                const minutes = Math.floor(stats.remainingTime / 60);
                const seconds = Math.round(stats.remainingTime % 60);
                processingRemaining.textContent = `${minutes}分${seconds}秒`;
              }
            }
          });
          
          console.log(`ZIP生成完成，成功添加 ${addedCount} 张图片到ZIP文件`);
          
          // 隐藏处理弹窗
          if (processingPopup) processingPopup.style.display = 'none';
          
          // 计算总处理时间
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          
          // 显示实际添加到ZIP的图片数量
          showMessage(`已批量下载 ${addedCount} 张图片（共处理 ${processedImages.length} 张，用时 ${totalTime} 秒）`);
        } catch (zipError) {
          console.error('创建ZIP文件时出错:', zipError);
          showMessage('创建ZIP文件时出错: ' + zipError.message);
          
          // 隐藏处理弹窗
          if (processingPopup) processingPopup.style.display = 'none';
          
          // 如果ZIP创建失败，尝试单独下载每张图片
          console.log('ZIP创建失败，尝试单独下载每张图片...');
          processedImages.forEach(imageInfo => {
            if (imageInfo.error) {
              showMessage(`处理 ${imageInfo.fileName} 失败: ${imageInfo.error}`);
              return;
            }
            
            // 下载图片
            const link = document.createElement('a');
            link.download = imageInfo.fileName;
            link.href = imageInfo.result.blobUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
        }
      } catch (error) {
        console.error('批量下载出错:', error);
        showMessage('批量下载出错: ' + error.message);
        
        // 隐藏处理弹窗
        const processingPopup = document.getElementById('processing-popup');
        if (processingPopup) processingPopup.style.display = 'none';
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