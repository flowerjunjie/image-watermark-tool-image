/**
 * GifWrap测试脚本
 * 检测gifwrap库是否正确加载
 */

console.log('gifwrap-test.js 已加载');

// 检查gifwrap库是否已加载
(function() {
  if (typeof window.gifwrap !== 'undefined') {
    console.log('GifWrap库检测: 成功');
    window.gifwrapLoaded = true;
  } else {
    console.warn('GifWrap库检测: 失败');
    window.gifwrapLoaded = false;
  }
  
  // 检查omggif库
  if (typeof window.omggif !== 'undefined') {
    console.log('OmgGif库检测: 成功');
    window.omggifLoaded = true;
  } else {
    console.warn('OmgGif库检测: 失败');
    window.omggifLoaded = false;
  }
})(); 