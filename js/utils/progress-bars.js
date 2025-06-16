/**
 * 进度条模块
 * 提供处理进度的UI组件
 */

// 全局进度状态
const progressState = {
  active: false,
  total: 0,
  current: 0,
  message: '',
  processedFiles: [],
  failedFiles: []
};

/**
 * 初始化进度条功能
 */
export function initProgressBars() {
  console.log('初始化进度条功能');
  
  // 创建进度条UI
  createProgressUI();
  
  // 添加事件监听
  document.addEventListener('processStart', handleProcessStart);
  document.addEventListener('processProgress', handleProcessProgress);
  document.addEventListener('processEnd', handleProcessEnd);
  document.addEventListener('processError', handleProcessError);
  
  console.log('进度条初始化完成');
}

/**
 * 创建进度条UI
 */
function createProgressUI() {
  // 检查进度条容器是否已存在
  let progressContainer = document.getElementById('progress-container');
  if (progressContainer) {
    return;
  }
  
  // 创建进度条容器
  progressContainer = document.createElement('div');
  progressContainer.id = 'progress-container';
  progressContainer.className = 'progress-container';
  progressContainer.style.display = 'none';
  progressContainer.innerHTML = `
    <div class="progress-header">
      <h3 id="progress-title">处理中...</h3>
      <button id="cancel-process" class="cancel-button">取消</button>
    </div>
    <div class="progress-bar-container">
      <div id="progress-bar" class="progress-bar"></div>
    </div>
    <div id="progress-status" class="progress-status">
      <span id="progress-percentage">0%</span>
      <span id="progress-count">0/0</span>
    </div>
    <div id="progress-message" class="progress-message"></div>
    <div id="progress-file-list" class="progress-file-list"></div>
  `;
  
  // 添加到文档中
  document.body.appendChild(progressContainer);
  
  // 添加取消按钮事件
  const cancelButton = document.getElementById('cancel-process');
  if (cancelButton) {
    cancelButton.addEventListener('click', cancelProcess);
  }
}

/**
 * 处理处理开始事件
 * @param {CustomEvent} event - 自定义事件
 */
function handleProcessStart(event) {
  const { total, message } = event.detail || {};
  
  // 重置并初始化进度状态
  progressState.active = true;
  progressState.total = total || 0;
  progressState.current = 0;
  progressState.message = message || '准备处理...';
  progressState.processedFiles = [];
  progressState.failedFiles = [];
  
  // 显示进度条
  showProgress();
  
  // 更新UI
  updateProgressUI();
}

/**
 * 处理进度更新事件
 * @param {CustomEvent} event - 自定义事件
 */
function handleProcessProgress(event) {
  const { current, total, file, message, success } = event.detail || {};
  
  // 更新进度状态
  if (total !== undefined) progressState.total = total;
  if (current !== undefined) progressState.current = current;
  if (message !== undefined) progressState.message = message;
  
  // 记录文件处理状态
  if (file) {
    if (success === false) {
      progressState.failedFiles.push(file);
    } else {
      progressState.processedFiles.push(file);
    }
  }
  
  // 更新UI
  updateProgressUI();
}

/**
 * 处理处理完成事件
 * @param {CustomEvent} event - 自定义事件
 */
function handleProcessEnd(event) {
  const { message, summary } = event.detail || {};
  
  // 更新状态
  progressState.active = false;
  progressState.message = message || '处理完成';
  
  // 显示摘要（如果有）
  if (summary) {
    showSummary(summary);
  }
  
  // 更新进度条为100%
  progressState.current = progressState.total;
  
  // 更新UI
  updateProgressUI();
  
  // 设置自动隐藏
  setTimeout(hideProgress, 3000);
}

/**
 * 处理处理错误事件
 * @param {CustomEvent} event - 自定义事件
 */
function handleProcessError(event) {
  const { error, file, message } = event.detail || {};
  
  // 更新状态
  if (file) {
    progressState.failedFiles.push(file);
  }
  
  // 显示错误消息
  progressState.message = message || `处理错误: ${error?.message || '未知错误'}`;
  
  // 更新UI
  updateProgressUI();
  
  // 如果是致命错误，结束处理
  if (event.detail.fatal) {
    progressState.active = false;
    showErrorSummary();
  }
}

/**
 * 更新进度条UI
 */
function updateProgressUI() {
  // 获取UI元素
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const progressCount = document.getElementById('progress-count');
  const progressMessage = document.getElementById('progress-message');
  
  if (!progressBar || !progressPercentage || !progressCount || !progressMessage) {
    console.warn('找不到进度条UI元素');
    return;
  }
  
  // 计算进度百分比
  let percentage = 0;
  if (progressState.total > 0) {
    percentage = Math.round((progressState.current / progressState.total) * 100);
  }
  
  // 更新进度条
  progressBar.style.width = `${percentage}%`;
  progressBar.style.backgroundColor = progressState.active ? '#1976d2' : (percentage === 100 ? '#4caf50' : '#f44336');
  
  // 更新百分比和计数
  progressPercentage.textContent = `${percentage}%`;
  progressCount.textContent = `${progressState.current}/${progressState.total}`;
  
  // 更新消息
  progressMessage.textContent = progressState.message;
  
  // 更新文件列表
  updateFileList();
}

/**
 * 更新文件列表
 */
function updateFileList() {
  const fileList = document.getElementById('progress-file-list');
  if (!fileList) return;
  
  // 只显示最近处理的文件（最多5个）
  const recentFiles = progressState.processedFiles.slice(-5);
  let html = '';
  
  // 添加成功处理的文件
  if (recentFiles.length > 0) {
    html += '<div class="file-list-section">';
    html += '<h4>最近处理文件:</h4>';
    html += '<ul>';
    
    recentFiles.forEach(file => {
      html += `<li class="success">${file.name || '未命名文件'}</li>`;
    });
    
    html += '</ul>';
    html += '</div>';
  }
  
  // 添加失败的文件
  if (progressState.failedFiles.length > 0) {
    html += '<div class="file-list-section error">';
    html += '<h4>处理失败文件:</h4>';
    html += '<ul>';
    
    progressState.failedFiles.forEach(file => {
      html += `<li>${file.name || '未命名文件'}</li>`;
    });
    
    html += '</ul>';
    html += '</div>';
  }
  
  fileList.innerHTML = html;
}

/**
 * 显示摘要信息
 * @param {Object} summary - 摘要信息
 */
function showSummary(summary) {
  const { total, success, failed, processingTime } = summary;
  
  // 创建摘要消息
  let summaryMsg = `处理完成: 共${total}个文件，`;
  summaryMsg += `${success}个成功，${failed}个失败`;
  
  if (processingTime) {
    summaryMsg += `，用时${(processingTime / 1000).toFixed(1)}秒`;
  }
  
  // 更新消息
  progressState.message = summaryMsg;
  
  // 创建摘要弹窗
  const summaryDialog = document.createElement('div');
  summaryDialog.className = 'summary-dialog';
  summaryDialog.innerHTML = `
    <div class="summary-content">
      <h3>处理完成</h3>
      <div class="summary-stats">
        <div class="stat-item total">
          <span class="stat-value">${total}</span>
          <span class="stat-label">总数</span>
        </div>
        <div class="stat-item success">
          <span class="stat-value">${success}</span>
          <span class="stat-label">成功</span>
        </div>
        <div class="stat-item failed">
          <span class="stat-value">${failed}</span>
          <span class="stat-label">失败</span>
        </div>
      </div>
      <p>${summaryMsg}</p>
      <button id="summary-close" class="close-button">关闭</button>
    </div>
  `;
  
  // 添加到文档中
  document.body.appendChild(summaryDialog);
  
  // 添加关闭按钮事件
  const closeButton = summaryDialog.querySelector('#summary-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(summaryDialog);
    });
  }
  
  // 自动关闭
  setTimeout(() => {
    if (summaryDialog.parentNode) {
      document.body.removeChild(summaryDialog);
    }
  }, 5000);
}

/**
 * 显示错误摘要
 */
function showErrorSummary() {
  const errorDialog = document.createElement('div');
  errorDialog.className = 'error-dialog';
  errorDialog.innerHTML = `
    <div class="error-content">
      <h3>处理错误</h3>
      <p>${progressState.message}</p>
      <p>失败文件数: ${progressState.failedFiles.length}</p>
      <button id="error-close" class="close-button">关闭</button>
    </div>
  `;
  
  // 添加到文档中
  document.body.appendChild(errorDialog);
  
  // 添加关闭按钮事件
  const closeButton = errorDialog.querySelector('#error-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(errorDialog);
    });
  }
}

/**
 * 显示进度条
 */
function showProgress() {
  const progressContainer = document.getElementById('progress-container');
  if (progressContainer) {
    progressContainer.style.display = 'block';
  }
}

/**
 * 隐藏进度条
 */
function hideProgress() {
  // 只有非活动状态才自动隐藏
  if (!progressState.active) {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
}

/**
 * 取消处理
 */
function cancelProcess() {
  console.log('取消处理');
  
  // 设置取消标志
  window.processingCancelled = true;
  
  // 更新状态
  progressState.active = false;
  progressState.message = '处理已取消';
  
  // 更新UI
  updateProgressUI();
  
  // 派发取消事件
  const cancelEvent = new CustomEvent('processCancel', {
    detail: {
      processed: progressState.current,
      total: progressState.total
    }
  });
  document.dispatchEvent(cancelEvent);
  
  // 延迟隐藏进度条
  setTimeout(hideProgress, 2000);
}

/**
 * 开始进度追踪
 * @param {Object} options - 选项
 * @param {number} options.total - 总项目数
 * @param {string} options.message - 初始消息
 */
export function startProgress(options = {}) {
  const { total, message } = options;
  
  // 创建并派发事件
  const startEvent = new CustomEvent('processStart', {
    detail: {
      total: total || 0,
      message: message || '开始处理...'
    }
  });
  document.dispatchEvent(startEvent);
  
  return {
    update: updateProgress,
    complete: completeProgress,
    error: reportError
  };
}

/**
 * 更新进度
 * @param {Object} update - 更新对象
 */
export function updateProgress(update = {}) {
  const { current, file, message, success } = update;
  
  // 创建并派发事件
  const progressEvent = new CustomEvent('processProgress', {
    detail: {
      current,
      file,
      message,
      success
    }
  });
  document.dispatchEvent(progressEvent);
}

/**
 * 完成进度
 * @param {Object} result - 结果对象
 */
export function completeProgress(result = {}) {
  const { message, summary } = result;
  
  // 创建并派发事件
  const endEvent = new CustomEvent('processEnd', {
    detail: {
      message,
      summary
    }
  });
  document.dispatchEvent(endEvent);
}

/**
 * 报告错误
 * @param {Object} errorInfo - 错误信息
 */
export function reportError(errorInfo = {}) {
  const { error, file, message, fatal } = errorInfo;
  
  // 创建并派发事件
  const errorEvent = new CustomEvent('processError', {
    detail: {
      error,
      file,
      message: message || (error ? error.message : '未知错误'),
      fatal: !!fatal
    }
  });
  document.dispatchEvent(errorEvent);
} 