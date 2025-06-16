/**
 * 显示指定索引的图片（增强版，支持错误恢复）
 * @param {number} index - 图片索引
 */
window.showImage = function(index) {
  try {
    // 首先清除所有缩略图状态
    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.classList.remove('processing', 'selected');
    });
    
    // 获取文件数组
    const files = window.globalFileList || [];
    
    if (!files.length || index < 0 || index >= files.length) {
      console.error(`无效的图片索引: ${index}, 文件总数: ${files.length}`);
      return false;
    }
    
    // 获取对应文件
    const file = files[index];
    if (!file) {
      console.error(`索引 ${index} 处的文件不存在`);
      return false;
    }
    
    // 选中对应的缩略图
    const thumbnail = document.querySelector(`.thumbnail[data-index="${index}"]`);
    if (thumbnail) {
      thumbnail.classList.add('selected');
    }
    
    console.log(`新系统正在显示索引 ${index} 的图片: ${file.name}`);
    
    // 清除旧系统可能的锁
    if (typeof window.thumbnailClickLock !== 'undefined') {
      window.thumbnailClickLock = false;
    }
    if (typeof window.currentlySwitchingImage !== 'undefined') {
      window.currentlySwitchingImage = false;
    }
    if (typeof window.imageProcessingQueue !== 'undefined' && 
        typeof window.imageProcessingQueue.clear === 'function') {
      window.imageProcessingQueue.clear();
    }
    
    // 保存当前水印设置
    let savedSettings = null;
    try {
      if (window.watermarkState && window.watermarkState.currentSettings) {
        savedSettings = { ...window.watermarkState.currentSettings };
        console.log('已保存水印设置:', JSON.stringify(savedSettings));
      }
    } catch (e) {
      console.warn('保存水印设置失败:', e);
    }
    
    // 使用现有功能展示图片
    processSelectedFile(file, index);
    
    // 尝试恢复水印设置
    if (savedSettings) {
      setTimeout(() => {
        try {
          applyWatermarkSettings(savedSettings);
        } catch (e) {
          console.warn('恢复水印设置失败:', e);
        }
      }, 300);
    }
    
    return true;
  } catch (error) {
    console.error('显示图片失败:', error);
    
    // 错误恢复: 清除所有缩略图状态
    try {
      document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('processing');
      });
    } catch (e) {}
    
    return false;
  }
}; 