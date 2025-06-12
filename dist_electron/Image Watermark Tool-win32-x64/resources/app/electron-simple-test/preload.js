const { contextBridge } = require('electron');

// 在控制台输出日志
console.log('预加载脚本执行中...');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  appInfo: {
    name: '图片水印工具',
    version: '1.0.0'
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容已加载，开始渲染页面');
}); 