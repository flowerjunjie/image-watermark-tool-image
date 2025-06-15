/**
 * UI消息模块
 * 处理各种类型的用户界面消息显示
 */

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
export function showError(message) {
  const errorContainer = document.getElementById('error-container');
  
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
      errorContainer.classList.remove('show');
    }, 3000);
  } else {
    console.error(message);
  }
}

/**
 * 显示普通消息
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长(ms)，默认2000ms
 */
export function showMessage(message, duration = 2000) {
  const statusMessage = document.getElementById('status-message');
  
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    
    // 指定时间后自动隐藏
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, duration);
  } else {
    console.log(message);
  }
}

/**
 * 显示状态消息（通常用于进度提示）
 * @param {string} status - 状态消息
 */
export function showStatus(status) {
  const processingStatus = document.getElementById('processing-status');
  
  if (processingStatus) {
    processingStatus.textContent = status;
    processingStatus.style.display = 'block';
  } else {
    console.log('状态:', status);
  }
} 