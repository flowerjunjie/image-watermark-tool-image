/**
 * 水印工具状态管理模块
 * 集中管理应用的状态数据
 */

// 定义水印定位方式枚举
export const WatermarkPosition = {
  CUSTOM: 'custom',      // 自定义位置（拖拽）
  TOP_LEFT: 'top-left',  // 左上角
  TOP_RIGHT: 'top-right', // 右上角
  BOTTOM_LEFT: 'bottom-left', // 左下角
  BOTTOM_RIGHT: 'bottom-right', // 右下角
  CENTER: 'center',      // 居中
  TILE: 'tile'           // 平铺
};

// 定义水印缩放模式枚举
export const WatermarkScaleMode = {
  FIXED: 'fixed',        // 固定大小
  RELATIVE: 'relative'   // 相对图片大小的百分比
};

// 水印应用状态
export const watermarkState = {
  type: "text", // 水印类型：text, tiled, image
  text: "仅供验证使用", // 水印文本
  fontSize: 24, // 字体大小
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
  maxHistoryLength: 10,
  
  // 第一张图片的水印设置，用于多图联动
  firstImageSettings: null,
  
  // 标记是否已经应用了初始设置
  initialSettingsApplied: false,
  
  // 标记每张图片是否已经应用了水印设置
  processedSettings: {},
  
  // 水印位置
  position: WatermarkPosition.CUSTOM, // 定位方式
  marginX: 20,                   // 水平边距
  marginY: 20,                   // 垂直边距
  
  // 水印缩放
  scaleMode: WatermarkScaleMode.FIXED, // 缩放模式
  scaleRatio: 0.2,               // 缩放比例（相对于图片大小的百分比）
  
  // 预览相关
  previewMode: 'original',       // 预览模式：original, watermark
  
  // 其他设置
  isDragging: false,             // 是否正在拖拽水印
  isProcessing: false,           // 是否正在处理图片
  isGif: false,                  // 当前图片是否是GIF
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
  
  // 触发状态更新事件
  const event = new CustomEvent('watermark-state-updated', { detail: watermarkState });
  window.dispatchEvent(event);
  
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
  watermarkState.fontSize = 24;
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
  watermarkState.firstImageSettings = null;
  watermarkState.initialSettingsApplied = false;
  watermarkState.processedSettings = {};
  watermarkState.position = WatermarkPosition.CUSTOM;
  watermarkState.marginX = 20;
  watermarkState.marginY = 20;
  watermarkState.scaleMode = WatermarkScaleMode.FIXED;
  watermarkState.scaleRatio = 0.2;
  watermarkState.previewMode = 'original';
  watermarkState.isDragging = false;
  watermarkState.isProcessing = false;
  watermarkState.isGif = false;
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

// 保存第一张图片的水印设置
export function saveFirstImageSettings() {
  watermarkState.firstImageSettings = {
    type: watermarkState.type,
    text: watermarkState.text,
    fontSize: watermarkState.fontSize,
    opacity: watermarkState.opacity,
    rotation: watermarkState.rotation,
    color: watermarkState.color,
    watermarkImage: watermarkState.watermarkImage,
    position: watermarkState.position,
    relativePosition: { ...watermarkState.relativePosition },
    marginX: watermarkState.marginX,
    marginY: watermarkState.marginY,
    scaleMode: watermarkState.scaleMode,
    scaleRatio: watermarkState.scaleRatio,
    tileSpacing: watermarkState.tileSpacing
  };
  
  // 同时保存到当前图片的设置记录中
  if (watermarkState.files && watermarkState.files.length > 0) {
    // 使用文件名作为键，确保唯一性
    const currentFileName = watermarkState.files[watermarkState.currentIndex].name;
    watermarkState.processedSettings[currentFileName] = {...watermarkState.firstImageSettings};
  }
  
  console.log('已保存第一张图片的水印设置:', watermarkState.firstImageSettings);
  return watermarkState.firstImageSettings;
}

// 应用第一张图片的水印设置
export function applyFirstImageSettings() {
  // 确保有保存的设置
  if (!watermarkState.firstImageSettings) {
    console.warn('没有保存第一张图片的水印设置，无法应用');
    return false;
  }
  
  // 应用设置，但保留当前图片的原始图像对象和尺寸
  const originalImage = watermarkState.originalImage;
  const originalImageWidth = watermarkState.originalImageWidth;
  const originalImageHeight = watermarkState.originalImageHeight;
  const previewCtx = watermarkState.previewCtx;
  const files = watermarkState.files;
  const currentIndex = watermarkState.currentIndex;
  const processed = watermarkState.processed;
  const processedSettings = watermarkState.processedSettings;
  const initialSettingsApplied = watermarkState.initialSettingsApplied;
  
  // 应用设置
  Object.assign(watermarkState, watermarkState.firstImageSettings);
  
  // 恢复当前图片的原始图像对象和尺寸
  watermarkState.originalImage = originalImage;
  watermarkState.originalImageWidth = originalImageWidth;
  watermarkState.originalImageHeight = originalImageHeight;
  watermarkState.previewCtx = previewCtx;
  watermarkState.files = files;
  watermarkState.currentIndex = currentIndex;
  watermarkState.processed = processed;
  watermarkState.processedSettings = processedSettings;
  watermarkState.initialSettingsApplied = initialSettingsApplied;
  
  // 记录当前图片已应用设置
  if (watermarkState.files && watermarkState.files.length > 0) {
    const currentFileName = watermarkState.files[watermarkState.currentIndex].name;
    watermarkState.processedSettings[currentFileName] = {...watermarkState.firstImageSettings};
  }
  
  console.log('已应用第一张图片的水印设置');
  return true;
}

// 保存当前图片的水印设置
export function saveCurrentImageSettings() {
  if (watermarkState.files && watermarkState.files.length > 0) {
    const currentFileName = watermarkState.files[watermarkState.currentIndex].name;
    
    // 创建设置的深拷贝
    const settings = {
      type: watermarkState.type,
      text: watermarkState.text,
      fontSize: watermarkState.fontSize,
      opacity: watermarkState.opacity,
      rotation: watermarkState.rotation,
      color: watermarkState.color,
      watermarkImage: watermarkState.watermarkImage,
      position: watermarkState.position,
      relativePosition: { ...watermarkState.relativePosition },
      marginX: watermarkState.marginX,
      marginY: watermarkState.marginY,
      scaleMode: watermarkState.scaleMode,
      scaleRatio: watermarkState.scaleRatio,
      tileSpacing: watermarkState.tileSpacing
    };
    
    // 保存到当前图片的设置记录中
    watermarkState.processedSettings[currentFileName] = settings;
    
    // 如果是第一张图片，同时更新firstImageSettings
    if (watermarkState.currentIndex === 0) {
      watermarkState.firstImageSettings = {...settings};
    }
    
    console.log(`已保存图片 ${currentFileName} 的水印设置:`, 
      JSON.stringify({
        position: settings.relativePosition,
        scale: settings.scale,
        fontSize: settings.fontSize
      })
    );
    return settings;
  }
  
  console.warn('无法保存当前图片设置：没有加载图片或图片索引无效');
  return null;
}

// 应用特定图片的水印设置
export function applyImageSettings(fileName) {
  if (!watermarkState.processedSettings[fileName]) {
    console.warn(`没有找到图片 ${fileName} 的水印设置`);
    return false;
  }
  
  // 应用设置，但保留当前图片的原始图像对象和尺寸
  const originalImage = watermarkState.originalImage;
  const originalImageWidth = watermarkState.originalImageWidth;
  const originalImageHeight = watermarkState.originalImageHeight;
  const previewCtx = watermarkState.previewCtx;
  const files = watermarkState.files;
  const currentIndex = watermarkState.currentIndex;
  const processed = watermarkState.processed;
  const processedSettings = watermarkState.processedSettings;
  const initialSettingsApplied = watermarkState.initialSettingsApplied;
  const firstImageSettings = watermarkState.firstImageSettings;
  
  const savedSettings = watermarkState.processedSettings[fileName];
  console.log(`正在应用图片 ${fileName} 的水印设置:`, 
    JSON.stringify({
      position: savedSettings.relativePosition,
      scale: savedSettings.scale,
      fontSize: savedSettings.fontSize
    })
  );
  
  // 应用设置
  Object.assign(watermarkState, savedSettings);
  
  // 恢复当前图片的原始图像对象和尺寸
  watermarkState.originalImage = originalImage;
  watermarkState.originalImageWidth = originalImageWidth;
  watermarkState.originalImageHeight = originalImageHeight;
  watermarkState.previewCtx = previewCtx;
  watermarkState.files = files;
  watermarkState.currentIndex = currentIndex;
  watermarkState.processed = processed;
  watermarkState.processedSettings = processedSettings;
  watermarkState.initialSettingsApplied = initialSettingsApplied;
  watermarkState.firstImageSettings = firstImageSettings;
  
  console.log(`已应用图片 ${fileName} 的水印设置`);
  return true;
}

// 保存图片设置
export function saveImageSettings(fileName) {
  if (!fileName) return;
  
  if (!watermarkState.processedSettings[fileName]) {
    console.warn(`没有找到图片 ${fileName} 的水印设置`);
    return;
  }
  
  const settings = watermarkState.processedSettings[fileName];
  
  // 保存到当前图片的设置记录中
  watermarkState.processedSettings[fileName] = {
    type: settings.type,
    text: settings.text,
    fontSize: settings.fontSize,
    opacity: settings.opacity,
    rotation: settings.rotation,
    color: settings.color,
    watermarkImage: settings.watermarkImage,
    position: settings.position,
    relativePosition: { ...settings.relativePosition },
    marginX: settings.marginX,
    marginY: settings.marginY,
    scaleMode: settings.scaleMode,
    scaleRatio: settings.scaleRatio,
    tileSpacing: settings.tileSpacing
  };
  
  console.log(`已保存图片 ${fileName} 的水印设置:`, 
    JSON.stringify({
      position: settings.relativePosition,
      scale: settings.scale,
      fontSize: settings.fontSize
    })
  );
}

// 加载图片设置
export function loadImageSettings(fileName) {
  if (!fileName || !watermarkState.processedSettings[fileName]) return;
  
  const settings = watermarkState.processedSettings[fileName];
  
  updateState({
    type: settings.type,
    text: settings.text,
    fontSize: settings.fontSize,
    opacity: settings.opacity,
    rotation: settings.rotation,
    color: settings.color,
    watermarkImage: settings.watermarkImage,
    position: settings.position,
    relativePosition: { ...settings.relativePosition },
    marginX: settings.marginX,
    marginY: settings.marginY,
    scaleMode: settings.scaleMode,
    scaleRatio: settings.scaleRatio,
    tileSpacing: settings.tileSpacing
  });
} 