/**
 * GIF处理测试模块
 * 用于测试GIF处理功能是否正常工作
 */

import { gifAnimator } from './gif-animator.js';

/**
 * 测试GIF处理功能
 * @returns {Promise<boolean>} - 测试是否成功
 */
export function testGifProcessor() {
  console.log('开始测试GIF处理功能...');
  
  return new Promise((resolve) => {
    // 创建测试消息容器
    const container = document.createElement('div');
    container.id = 'gif-test-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    container.style.color = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.zIndex = '1000';
    container.style.maxWidth = '300px';
    container.style.fontSize = '12px';
    container.style.transition = 'opacity 0.5s';
    
    // 添加到文档
    document.body.appendChild(container);
    
    // 显示测试信息
    function showTestMessage(message, isError = false) {
      const line = document.createElement('div');
      line.style.margin = '3px 0';
      line.style.color = isError ? '#ff6b6b' : '#69f0ae';
      line.textContent = message;
      container.appendChild(line);
      
      // 保持最多10行消息
      while (container.children.length > 10) {
        container.removeChild(container.firstChild);
      }
      
      // 日志输出
      if (isError) {
        console.error(message);
      } else {
        console.log(message);
      }
    }
    
    // 设置一个超时，以便在测试完成后移除容器
    setTimeout(() => {
      container.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }, 1000);
    }, 10000);
    
    // 开始测试
    showTestMessage('开始GIF处理测试...');
    
    // 测试GIF.js库加载
    if (typeof window.GIF === 'function') {
      showTestMessage('✓ GIF.js库已加载');
    } else {
      showTestMessage('✗ GIF.js库未加载', true);
    }
    
    // 测试GIF动画处理器
    if (gifAnimator && typeof gifAnimator.processGif === 'function') {
      showTestMessage('✓ GIF动画处理器已准备就绪');
    } else {
      showTestMessage('✗ GIF动画处理器未就绪', true);
    }
    
    // 测试libgif库
    if (window.SuperGif) {
      showTestMessage('✓ libgif库已加载');
    } else {
      showTestMessage('✗ libgif库未加载', true);
    }
    
    // 测试创建一个小型GIF
    try {
      const testGif = new window.GIF({
        workers: 1,
        quality: 10,
        width: 1,
        height: 1,
        workerScript: undefined // 使用内联worker
      });
      
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1;
      testCanvas.height = 1;
      
      // 添加帧
      testGif.addFrame(testCanvas, { delay: 100 });
      showTestMessage('✓ 成功创建测试GIF并添加帧');
      
      // 监听渲染完成事件
      testGif.on('finished', function() {
        showTestMessage('✓ 测试GIF渲染成功');
        showTestMessage('✓ GIF处理功能测试通过');
        resolve(true);
      });
      
      // 监听错误
      testGif.on('error', function(error) {
        showTestMessage(`✗ 测试GIF渲染失败: ${error}`, true);
        showTestMessage('✗ GIF处理功能测试失败', true);
        resolve(false);
      });
      
      // 渲染
      testGif.render();
      showTestMessage('> 正在渲染测试GIF...');
    } catch (error) {
      showTestMessage(`✗ 创建测试GIF时出错: ${error.message}`, true);
      showTestMessage('✗ GIF处理功能测试失败', true);
      resolve(false);
    }
  });
}

// 当作为独立脚本加载时自动运行测试
if (typeof window !== 'undefined' && window.location && window.location.search.includes('autotest')) {
  window.addEventListener('DOMContentLoaded', function() {
    // 等待GIF.js库加载
    setTimeout(() => {
      testGifProcessor().then(success => {
        console.log(`GIF处理测试${success ? '通过' : '失败'}`);
      });
    }, 1000);
  });
} 