/**
 * 水印工具状态管理模块
 * 集中管理应用的状态数据
 */

// 水印应用状态
export const watermarkState = {
  type: "text", // 水印类型：text, tiled, image
  text: "仅供验证使用", // 水印文本
  fontSize: 36, // 字体大小，从24改为36
  opacity: 50, // 透明度 (0-100)
  rotation: 0, // 旋转角度
  color: "#ff0000", // 水印颜色
  x: 50, // 水平位置百分比 (0-100)
  y: 50, // 垂直位置百分比 (0-100)
  tileSpacing: 150, // 平铺间距
  watermarkImage: null, // 水印图片
  watermarkImageSize: 40, // 水印图片大小百分比，从30改为40
  scale: 1.0, // 水印缩放比例
  files: [], // 批量处理的文件列表
  currentIndex: 0, // 当前显示的图片索引
  processed: [], // 已处理图片的列表
  // 相对位置和大小记录
  relativePosition: {
    x: 50,  // 默认相对位置为中间50%，从30改为50
    y: 50   // 默认相对位置为中间50%
  },
  relativeSize: 1, // 默认相对大小为1
  imageWidth: 0,   // 当前图片宽度
  imageHeight: 0,  // 当前图片高度
  previewCtx: null, // Canvas上下文
  originalImage: null, // 原始图片对象
  originalImageWidth: 0, // 原始图片宽度
  originalImageHeight: 0, // 原始图片高度
  sizeAdjusted: false, // 是否已经调整过大小
  
  // 图片质量和格式控制
  quality: 0.92, // 默认图片质量 (0-1)
  format: 'image/jpeg', // 默认输出格式
  
  // 性能监控
  processingTimes: [], // 处理时间记录
  
  // 历史记录，用于撤销/重做
  history: [],
  historyIndex: -1,
  maxHistoryLength: 10
};

// 获取当前状态
export function getState() {
  return watermarkState;
}

// 更新状态
export function updateState(updates) {
  // 记录历史（如果是重要更改）
  const importantKeys = ['text', 'fontSize', 'opacity', 'rotation', 'color', 'relativePosition', 'type'];
  const hasImportantChanges = Object.keys(updates).some(key => importantKeys.includes(key));
  
  if (hasImportantChanges) {
    // 添加当前状态到历史记录
    addToHistory();
  }
  
  // 更新状态
  Object.assign(watermarkState, updates);
  return watermarkState;
}

// 添加当前状态到历史记录
function addToHistory() {
  // 如果当前不在历史记录的最后，则删除之后的记录
  if (watermarkState.historyIndex < watermarkState.history.length - 1) {
    watermarkState.history = watermarkState.history.slice(0, watermarkState.historyIndex + 1);
  }
  
  // 创建当前状态的深拷贝（不包括大型对象如图片数据）
  const stateCopy = {
    type: watermarkState.type,
    text: watermarkState.text,
    fontSize: watermarkState.fontSize,
    opacity: watermarkState.opacity,
    rotation: watermarkState.rotation,
    color: watermarkState.color,
    tileSpacing: watermarkState.tileSpacing,
    watermarkImageSize: watermarkState.watermarkImageSize,
    scale: watermarkState.scale,
    relativePosition: { ...watermarkState.relativePosition },
    relativeSize: watermarkState.relativeSize,
    quality: watermarkState.quality,
    format: watermarkState.format
  };
  
  // 添加到历史记录
  watermarkState.history.push(stateCopy);
  
  // 限制历史记录长度
  if (watermarkState.history.length > watermarkState.maxHistoryLength) {
    watermarkState.history.shift();
  } else {
    watermarkState.historyIndex++;
  }
}

// 撤销操作
export function undo() {
  if (watermarkState.historyIndex > 0) {
    watermarkState.historyIndex--;
    const previousState = watermarkState.history[watermarkState.historyIndex];
    
    // 恢复之前的状态（不触发新的历史记录）
    Object.assign(watermarkState, previousState);
    return true;
  }
  return false;
}

// 重做操作
export function redo() {
  if (watermarkState.historyIndex < watermarkState.history.length - 1) {
    watermarkState.historyIndex++;
    const nextState = watermarkState.history[watermarkState.historyIndex];
    
    // 恢复下一个状态（不触发新的历史记录）
    Object.assign(watermarkState, nextState);
    return true;
  }
  return false;
}

// 重置状态
export function resetState() {
  watermarkState.type = "text";
  watermarkState.text = "仅供验证使用";
  watermarkState.fontSize = 36; // 从24改为36
  watermarkState.opacity = 50;
  watermarkState.rotation = 0;
  watermarkState.color = "#ff0000";
  watermarkState.x = 50;
  watermarkState.y = 50;
  watermarkState.tileSpacing = 150;
  watermarkState.watermarkImage = null;
  watermarkState.watermarkImageSize = 40; // 从30改为40
  watermarkState.scale = 1.0;
  watermarkState.files = [];
  watermarkState.currentIndex = 0;
  watermarkState.processed = [];
  watermarkState.relativePosition = { x: 50, y: 50 }; // x从30改为50
  watermarkState.relativeSize = 1;
  watermarkState.sizeAdjusted = false;
  watermarkState.quality = 0.92;
  watermarkState.format = 'image/jpeg';
  watermarkState.processingTimes = [];
  watermarkState.history = [];
  watermarkState.historyIndex = -1;
  return watermarkState;
}

// 记录处理时间
export function recordProcessingTime(time) {
  watermarkState.processingTimes.push(time);
  
  // 只保留最近的50条记录
  if (watermarkState.processingTimes.length > 50) {
    watermarkState.processingTimes.shift();
  }
  
  // 计算平均处理时间
  const average = watermarkState.processingTimes.reduce((sum, time) => sum + time, 0) / watermarkState.processingTimes.length;
  
  return {
    last: time,
    average: average,
    min: Math.min(...watermarkState.processingTimes),
    max: Math.max(...watermarkState.processingTimes)
  };
} 