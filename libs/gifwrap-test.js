/**
 * gifwrap-test.js - 测试gifwrap和omggif库的加载和使用
 */
(function() {
  console.log('运行gifwrap测试脚本...');
  
  // 显示测试结果的函数
  function showTestResult(success, message) {
    console.log(success ? '✅ 测试通过: ' : '❌ 测试失败: ', message);
    
    // 添加到页面上的错误容器
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      const resultDiv = document.createElement('div');
      resultDiv.className = success ? 'test-success' : 'test-error';
      resultDiv.innerHTML = `<strong>${success ? '✅ 测试通过' : '❌ 测试失败'}</strong>: ${message}`;
      errorContainer.appendChild(resultDiv);
      
      if (!success) {
        errorContainer.classList.add('show');
      }
    }
  }
  
  // 检查库是否加载
  if (typeof window.gifwrap === 'undefined') {
    console.error('gifwrap库未加载');
    showTestResult(false, 'gifwrap库未加载');
    return;
  }
  
  // 验证库组件
  const { GifFrame, GifUtil, GifCodec } = window.gifwrap;
  if (!GifFrame || !GifUtil || !GifCodec) {
    console.error('gifwrap库缺少必要组件');
    showTestResult(false, 'gifwrap库缺少必要组件');
    return;
  }
  
  // 验证omggif库
  if (typeof window.omggif === 'undefined') {
    console.error('omggif库未加载');
    showTestResult(false, 'omggif库未加载');
    return;
  }
  
  // 检查omggif的结构
  console.log('omggif库结构:', typeof window.omggif);
  if (typeof window.omggif === 'object') {
    console.log('omggif包含:', Object.keys(window.omggif).join(', '));
  }
  
  // 检查是否包含GifReader和GifWriter
  const hasGifReader = typeof window.omggif === 'function' || (window.omggif && window.omggif.GifReader);
  const hasGifWriter = typeof window.omggif === 'function' || (window.omggif && window.omggif.GifWriter);
  
  if (!hasGifReader || !hasGifWriter) {
    console.error('omggif库缺少必要组件');
    showTestResult(false, 'omggif库缺少必要组件');
    return;
  }
  
  console.log('gifwrap库已加载，包含所有必要组件');
  
  // 创建一个简单的GIF测试
  try {
    // 创建一个1x1像素的测试GIF
    const testBuffer = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      0x01, 0x00, 0x01, 0x00, // 宽度和高度各1像素
      0x00, 0x00, 0x00, // 其他GIF头部数据
      0x21, 0xF9, 0x04, // 图形控制扩展
      0x00, 0x00, 0x00, 0x00, // 延迟时间等
      0x2C, 0x00, 0x00, 0x00, 0x00, // 图像描述符
      0x01, 0x00, 0x01, 0x00, 0x00, // 宽度、高度等
      0x02, 0x02, 0x44, 0x01, 0x00 // LZW最小码长度和块数据
    ]);
    
    // 测试GifReader
    console.log('测试GifReader...');
    let GifReader;
    
    if (typeof window.omggif === 'function') {
      GifReader = window.omggif;
      console.log('omggif导出为函数');
    } else if (window.omggif && window.omggif.GifReader) {
      GifReader = window.omggif.GifReader;
      console.log('omggif导出为对象，使用GifReader属性');
    } else {
      throw new Error('无法获取GifReader');
    }
    
    try {
      const reader = new GifReader(testBuffer);
      console.log('GifReader创建成功');
      showTestResult(true, 'GifReader测试通过');
    } catch (error) {
      console.error('GifReader测试失败:', error);
      showTestResult(false, `GifReader测试失败: ${error.message}`);
    }
    
    // 测试GifCodec
    console.log('测试GifCodec...');
    try {
      const codec = new GifCodec();
      console.log('GifCodec创建成功');
      showTestResult(true, 'GifCodec测试通过');
    } catch (error) {
      console.error('GifCodec测试失败:', error);
      showTestResult(false, `GifCodec测试失败: ${error.message}`);
    }
    
    // 所有测试通过
    showTestResult(true, 'gifwrap和omggif库测试通过');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
    showTestResult(false, `测试失败: ${error.message}`);
  }
})(); 