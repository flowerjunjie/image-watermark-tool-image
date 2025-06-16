/**
 * GIF处理器更新工具
 * 此文件用于在运行时动态替换GIF处理实现，解决兼容性问题
 */

// 标记旧版本失效
window.isGifFileProcessingBroken = true;

// 尝试清除可能的浏览器缓存
function clearGifProcessorCache() {
  console.log('尝试清除GIF处理器缓存...');
  
  // 清除代码缓存 (如果浏览器支持)
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE',
      urls: ['/js/utils/gif/gif-processor.js', '/js/utils/gif/gif-processor-new.js']
    });
  }
  
  // 检查缓存API是否可用
  if (window.caches) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        console.log('清除缓存:', cacheName);
        caches.delete(cacheName);
      });
    });
  }
  
  // 标记模块已加载
  window.gifProcessorModuleReloaded = true;
  console.log('GIF处理缓存清除完毕');
}

// 动态替换GIF处理器的实现
function switchToNewGifProcessor() {
  try {
    console.log('切换到新的GIF处理器实现...');
    
    // 导入新的GIF处理器
    import('../gifwrap/gif-processor.js').then(module => {
      console.log('成功导入新的GIF处理器');
      
      // 替换全局函数
      if (module.isGif) window.isGif = module.isGif;
      if (module.processGif) window.processGif = module.processGif;
      if (module.initGifProcessor) window.initGifProcessor = module.initGifProcessor;
      
      console.log('GIF处理器函数已替换为新实现');
      
      // 将状态反馈到UI
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = 'GIF处理器已更新到新版本';
        statusMessage.style.display = 'block';
        setTimeout(() => {
          statusMessage.style.display = 'none';
        }, 3000);
      }
    }).catch(error => {
      console.error('导入新GIF处理器失败:', error);
    });
  } catch (error) {
    console.error('替换GIF处理器时出错:', error);
  }
}

// 导出更新函数
export function updateGifProcessor() {
  clearGifProcessorCache();
  switchToNewGifProcessor();
}

// 检测205行错误并恢复
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('Cannot read properties of undefined (reading \'fromArrayBuffer\')')) {
    console.error('检测到GIF处理器205行错误，尝试恢复:', e);
    
    // 显示错误ui
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '8px';
    errorDiv.style.zIndex = '999999';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.maxWidth = '80%';
    errorDiv.innerHTML = `
      <h3>GIF处理错误</h3>
      <p>系统检测到GIF处理异常，可能是由于浏览器缓存问题导致。</p>
      <p>请尝试以下操作:</p>
      <ol style="text-align: left; margin-left: 20px;">
        <li>强制刷新页面 (Ctrl+F5)</li>
        <li>清除浏览器缓存</li>
        <li>使用其他浏览器</li>
      </ol>
      <div style="margin-top: 15px;">
        <button id="fix-btn" style="padding: 8px 15px; background: white; color: red; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">尝试修复</button>
        <button id="refresh-btn" style="padding: 8px 15px; background: white; color: black; border: none; border-radius: 4px; cursor: pointer;">强制刷新</button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 添加修复按钮事件
    document.getElementById('fix-btn').addEventListener('click', function() {
      updateGifProcessor();
      errorDiv.innerHTML = '<p>正在尝试修复...</p>';
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 2000);
    });
    
    // 添加刷新按钮事件
    document.getElementById('refresh-btn').addEventListener('click', function() {
      // 强制绕过缓存刷新
      window.location.reload(true);
    });
    
    // 自动尝试修复
    setTimeout(updateGifProcessor, 100);
  }
});

// 自动执行更新
updateGifProcessor(); 