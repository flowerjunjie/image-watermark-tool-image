/**
 * 全局错误处理工具
 * 提供统一的错误捕获和处理方法
 */

/**
 * 初始化全局错误处理
 */
export function initGlobalErrorHandler() {
  // 保存原始的错误处理函数
  const originalWindowOnError = window.onerror;
  const originalWindowOnUnhandledRejection = window.onunhandledrejection;
  
  // 拦截Chrome扩展API错误
  interceptChromeRuntimeErrors();
  
  // 全局错误处理
  window.onerror = function(message, source, lineno, colno, error) {
    // 忽略某些已知的第三方错误
    if (shouldIgnoreError(message, source)) {
      console.log('已忽略第三方错误:', { message, source });
      return true; // 防止错误传播
    }
    
    // 记录错误
    console.error('全局错误:', { message, source, lineno, colno, error });
    
    // 处理Chrome扩展相关错误
    if (handleChromeExtensionError(message, source, error)) {
      return true; // 已处理
    }
    
    // 调用原始的错误处理函数
    if (originalWindowOnError) {
      return originalWindowOnError(message, source, lineno, colno, error);
    }
  };
  
  // 全局未处理的Promise拒绝处理
  window.onunhandledrejection = function(event) {
    // 忽略某些已知的第三方错误
    if (event && event.reason && shouldIgnorePromiseError(event.reason)) {
      console.log('已忽略未处理的Promise拒绝:', event.reason);
      event.preventDefault();
      return;
    }
    
    // 记录错误
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 处理Chrome扩展相关错误
    if (event && event.reason && handleChromeExtensionPromiseError(event.reason)) {
      event.preventDefault();
      return;
    }
    
    // 调用原始的处理函数
    if (originalWindowOnUnhandledRejection) {
      return originalWindowOnUnhandledRejection(event);
    }
  };
  
  // 监听fetch错误
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(...args) {
      return originalFetch.apply(this, args)
        .catch(error => {
          // 处理fetch错误
          if (shouldIgnoreFetchError(error)) {
            console.log('已忽略fetch错误:', error);
            return Promise.reject(error); // 继续传播错误
          }
          
          console.error('Fetch错误:', { url: args[0], error });
          
          // 处理Chrome扩展相关错误
          if (handleChromeFetchError(error, args[0])) {
            return Promise.reject(new Error('请求被浏览器扩展阻止')); // 提供更明确的错误信息
          }
          
          return Promise.reject(error); // 继续传播错误
        });
    };
  }
  
  console.log('全局错误处理已初始化');
}

/**
 * 判断是否应该忽略特定错误
 * @param {string} message - 错误消息
 * @param {string} source - 错误源
 * @returns {boolean} - 是否应该忽略
 */
function shouldIgnoreError(message, source) {
  // 忽略Chrome扩展相关错误
  if (source && (
      source.includes('chrome-extension://') || 
      source.includes('extension://') ||
      source.includes('content_script.js')
    )) {
    return true;
  }
  
  // 忽略特定的已知错误
  const knownErrorPatterns = [
    'Failed to execute \'postMessage\'',
    'ResizeObserver loop',
    'A listener indicated an asynchronous response',
    'Extension context invalidated',
    'The message port closed before a response was received',
    'Unchecked runtime.lastError',
    'runtime.lastError'
  ];
  
  return knownErrorPatterns.some(pattern => 
    message && typeof message === 'string' && message.includes(pattern)
  );
}

/**
 * 判断是否应该忽略特定Promise错误
 * @param {Error|any} reason - 拒绝原因
 * @returns {boolean} - 是否应该忽略
 */
function shouldIgnorePromiseError(reason) {
  // 检查是否是Chrome扩展相关错误
  if (reason && reason.message && (
      reason.message.includes('extension') || 
      reason.message.includes('Extension') ||
      reason.message.includes('fetchError') ||
      reason.message.includes('content_script')
    )) {
    return true;
  }
  
  // 忽略特定的已知错误
  const knownErrorPatterns = [
    'Failed to fetch',
    'Network request failed',
    'cancelled',
    'canceled',
    'aborted',
    'timeout'
  ];
  
  return reason && reason.message && knownErrorPatterns.some(pattern => 
    reason.message.includes(pattern)
  );
}

/**
 * 判断是否应该忽略特定fetch错误
 * @param {Error} error - Fetch错误
 * @returns {boolean} - 是否应该忽略
 */
function shouldIgnoreFetchError(error) {
  // 忽略特定的已知fetch错误
  return error && error.message && (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Network request failed') ||
    error.message.includes('aborted') ||
    error.message.includes('interrupted')
  );
}

/**
 * 处理Chrome扩展相关错误
 * @param {string} message - 错误消息
 * @param {string} source - 错误源
 * @param {Error} error - 错误对象
 * @returns {boolean} - 是否已处理
 */
function handleChromeExtensionError(message, source, error) {
  // 处理消息端口关闭错误
  if (message && message.includes('message port closed')) {
    console.warn('检测到Chrome扩展消息端口关闭错误，这是正常情况');
    return true;
  }
  
  // 处理扩展上下文失效错误
  if (message && message.includes('Extension context invalidated')) {
    console.warn('检测到Chrome扩展上下文失效错误，这通常发生在扩展更新或重载时');
    return true;
  }
  
  return false;
}

/**
 * 处理Chrome扩展相关Promise错误
 * @param {Error|any} reason - 拒绝原因
 * @returns {boolean} - 是否已处理
 */
function handleChromeExtensionPromiseError(reason) {
  // 处理fetchError错误
  if (reason && reason.message && reason.message.includes('fetchError')) {
    console.warn('检测到fetchError错误，这可能是由Chrome扩展引起的');
    return true;
  }
  
  return false;
}

/**
 * 处理Chrome扩展相关fetch错误
 * @param {Error} error - Fetch错误
 * @param {string|Request} resource - 请求资源
 * @returns {boolean} - 是否已处理
 */
function handleChromeFetchError(error, resource) {
  // 处理特定资源的fetch错误
  const url = resource instanceof Request ? resource.url : String(resource);
  
  // 检查是否是扩展资源
  if (url.includes('chrome-extension://') || url.includes('extension://')) {
    console.warn('检测到对扩展资源的fetch请求失败，这是预期的行为');
    return true;
  }
  
  return false;
}

/**
 * 拦截Chrome Runtime错误
 * 主要针对Chrome扩展引起的错误
 */
function interceptChromeRuntimeErrors() {
  // 检查是否在Chrome浏览器环境中
  if (typeof chrome !== 'undefined') {
    try {
      // 重写chrome.runtime对象（如果存在）
      if (chrome.runtime) {
        // 保存原始的lastError getter（如果有）
        const originalLastErrorGetter = Object.getOwnPropertyDescriptor(chrome.runtime, 'lastError');
        
        // 尝试重新定义lastError属性
        try {
          Object.defineProperty(chrome.runtime, 'lastError', {
            get: function() {
              // 获取实际的错误
              const error = originalLastErrorGetter ? originalLastErrorGetter.get.call(chrome.runtime) : null;
              
              // 如果有错误，记录它但不让它成为未检查的错误
              if (error) {
                console.log('Chrome扩展错误已被拦截:', error);
                // 记录堆栈以帮助调试
                console.debug('Chrome扩展错误堆栈:', new Error().stack);
              }
              
              return error;
            },
            configurable: true
          });
          
          console.log('Chrome扩展错误拦截器已安装');
        } catch (defineError) {
          console.warn('无法重写chrome.runtime.lastError:', defineError);
        }
      }
    } catch (chromeError) {
      console.warn('访问Chrome API时出错:', chromeError);
    }
  }
  
  // 处理可能的Chrome扩展消息事件
  window.addEventListener('message', function(event) {
    try {
      // 检查消息是否来自Chrome扩展
      if (event.source === window && 
          event.data && 
          (event.data.type === 'FROM_EXTENSION' || 
           event.data.source === 'chrome-extension')) {
        console.log('拦截到Chrome扩展消息:', event.data);
        // 这里可以添加特定的处理逻辑
        event.stopImmediatePropagation();
        return;
      }
    } catch (messageError) {
      // 忽略消息处理错误
      console.debug('处理Chrome扩展消息时出错:', messageError);
    }
  }, true); // 使用捕获阶段
} 