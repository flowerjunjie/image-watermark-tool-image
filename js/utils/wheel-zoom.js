/**
 * 滚轮缩放模块
 * 处理鼠标滚轮事件，实现水印缩放功能
 */

import { watermarkState, updateState } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';

/**
 * 初始化滚轮缩放功能
 */
export function initWheelZoom() {
  console.log('初始化滚轮缩放');
  
  // 获取水印容器
  const watermarkContainer = document.getElementById('watermark-container');
  
  if (watermarkContainer) {
    // 添加鼠标滚轮事件监听器
    watermarkContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // 添加触摸手势事件（如果浏览器支持）
    if ('GestureEvent' in window) {
      watermarkContainer.addEventListener('gesturestart', handleGestureStart);
      watermarkContainer.addEventListener('gesturechange', handleGestureChange);
      watermarkContainer.addEventListener('gestureend', handleGestureEnd);
    }
  }
}

/**
 * 处理鼠标滚轮事件
 * @param {WheelEvent} e - 滚轮事件对象
 */
function handleWheel(e) {
  // 阻止默认行为
  e.preventDefault();
  
  // 获取水印元素
  const watermarkElement = document.getElementById('watermark-element');
  
  if (watermarkElement) {
    // 获取鼠标滚轮方向（向上为正，向下为负）
    const delta = Math.sign(e.deltaY) * -1;
    
    // 确定缩放因子（每次缩放10%）
    const scaleFactor = 1 + (delta * 0.1);
    
    // 应用缩放
    const newScale = Math.max(0.1, Math.min(5.0, watermarkState.scale * scaleFactor));
    
    // 更新状态
    updateState({
      scale: newScale,
      relativeSize: newScale
    });
    
    console.log('水印缩放比例更新为:', newScale);
    
    // 更新水印
    updateWatermark();
  }
}

/**
 * 处理触摸手势开始事件
 * @param {GestureEvent} e - 手势事件对象
 */
function handleGestureStart(e) {
  e.preventDefault();
  
  // 记录初始缩放值
  watermarkState.initialScale = watermarkState.scale;
}

/**
 * 处理触摸手势变化事件
 * @param {GestureEvent} e - 手势事件对象
 */
function handleGestureChange(e) {
  e.preventDefault();
  
  // 获取水印元素
  const watermarkElement = document.getElementById('watermark-element');
  
  if (watermarkElement && watermarkState.initialScale) {
    // 计算新的缩放值
    const newScale = Math.max(0.1, Math.min(5.0, watermarkState.initialScale * e.scale));
    
    // 更新状态
    updateState({
      scale: newScale,
      relativeSize: newScale
    });
    
    // 更新水印
    updateWatermark();
  }
}

/**
 * 处理触摸手势结束事件
 * @param {GestureEvent} e - 手势事件对象
 */
function handleGestureEnd(e) {
  e.preventDefault();
  
  // 清除初始缩放值
  watermarkState.initialScale = null;
} 