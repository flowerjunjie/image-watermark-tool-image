/**
 * 应用状态管理模块
 * 管理整个应用的状态和状态更新
 */

// 导入事件发布订阅系统
import { EventEmitter } from '../utils/event-emitter.js';

// 创建状态事件发射器
const stateEvents = new EventEmitter();

// 默认水印设置
const DEFAULT_WATERMARK_OPTIONS = {
  type: 'text',                // 水印类型: 'text' 或 'image'
  text: '仅供验证使用',        // 水印文本
  font: 'Arial',              // 字体
  color: '#0000ff',           // 颜色
  size: 2,                    // 大小倍数 (基础大小 * 倍数)
  opacity: 0.3,               // 透明度 (0-1)
  rotation: 30,               // 旋转角度
  position: 'center',         // 水印位置: 'center', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'custom'
  customPosition: { x: 0, y: 0 }, // 自定义位置坐标
  repeat: true,               // 是否重复铺满
  spacing: 5,                 // 重复水印间距
  margin: 10,                 // 边距
  adaptSize: true,            // 是否自适应大小
  minSize: 0.5,               // 最小大小倍数
  maxSize: 5,                 // 最大大小倍数
  preserveTransparency: true, // 保留透明度
  imageUrl: null,             // 图片水印URL
  imageScale: 1,              // 图片水印缩放比例
  shadow: false,              // 是否添加阴影
  shadowColor: 'rgba(0,0,0,0.5)', // 阴影颜色
  shadowBlur: 3,              // 阴影模糊度
  shadowOffsetX: 2,           // 阴影X偏移
  shadowOffsetY: 2,           // 阴影Y偏移
  border: false,              // 是否添加边框
  borderColor: '#ffffff',     // 边框颜色
  borderWidth: 1,             // 边框宽度
  quality: 10,                // GIF输出质量 (1-30, 1为最高质量)
};

// 应用状态
const appState = {
  // 文件和图像状态
  files: [],                  // 所有上传的文件
  currentFileIndex: -1,       // 当前选中的文件索引
  currentImage: null,         // 当前图像对象
  processedImages: new Map(), // 处理后的图像缓存 (key: 文件ID, value: 处理后的图像)
  
  // 水印设置
  watermarkOptions: { ...DEFAULT_WATERMARK_OPTIONS },
  
  // UI状态
  isProcessing: false,        // 是否正在处理中
  processingProgress: 0,      // 处理进度 (0-1)
  previewMode: 'single',      // 预览模式: 'single' 或 'grid'
  showOriginal: false,        // 是否显示原图
  
  // 导出设置
  exportFormat: 'original',   // 导出格式: 'original', 'png', 'jpg'
  exportQuality: 0.9,         // 导出质量 (0-1)
  preserveFolderStructure: true, // 是否保留文件夹结构
  
  // 历史记录
  history: [],                // 操作历史
  historyIndex: -1,           // 当前历史记录索引
  
  // 应用设置
  settings: {
    language: 'zh-CN',        // 语言
    theme: 'light',           // 主题: 'light' 或 'dark'
    autoSave: false,          // 是否自动保存
    autoSaveInterval: 5,      // 自动保存间隔 (分钟)
    maxCacheSize: 100,        // 最大缓存大小 (MB)
    showTips: true,           // 是否显示提示
  }
};

/**
 * 获取当前应用状态
 * @returns {Object} 当前应用状态的副本
 */
export function getState() {
  return { ...appState };
}

/**
 * 获取当前水印选项
 * @returns {Object} 当前水印选项的副本
 */
export function getWatermarkOptions() {
  return { ...appState.watermarkOptions };
}

/**
 * 获取当前选中的文件
 * @returns {File|null} 当前选中的文件或null
 */
export function getCurrentFile() {
  if (appState.currentFileIndex >= 0 && appState.currentFileIndex < appState.files.length) {
    return appState.files[appState.currentFileIndex];
  }
  return null;
}

/**
 * 更新应用状态
 * @param {Object} newState 要更新的状态对象
 */
export function updateState(newState) {
  // 保存当前状态到历史记录
  if (!appState.isProcessing) {
    saveToHistory();
  }
  
  // 更新状态
  Object.assign(appState, newState);
  
  // 触发状态更新事件
  stateEvents.emit('stateChanged', appState);
}

/**
 * 更新水印选项
 * @param {Object} options 要更新的水印选项
 */
export function updateWatermarkOptions(options) {
  // 保存当前状态到历史记录
  if (!appState.isProcessing) {
    saveToHistory();
  }
  
  // 更新水印选项
  Object.assign(appState.watermarkOptions, options);
  
  // 触发水印选项更新事件
  stateEvents.emit('watermarkOptionsChanged', appState.watermarkOptions);
}

/**
 * 重置水印选项为默认值
 */
export function resetWatermarkOptions() {
  // 保存当前状态到历史记录
  saveToHistory();
  
  // 重置为默认值
  appState.watermarkOptions = { ...DEFAULT_WATERMARK_OPTIONS };
  
  // 触发水印选项更新事件
  stateEvents.emit('watermarkOptionsChanged', appState.watermarkOptions);
}

/**
 * 添加文件到应用
 * @param {File|Array<File>} files 要添加的文件或文件数组
 */
export function addFiles(files) {
  if (!files) return;
  
  // 转换为数组
  const fileArray = Array.isArray(files) ? files : [files];
  if (fileArray.length === 0) return;
  
  // 添加文件到状态
  appState.files = [...appState.files, ...fileArray];
  
  // 如果是第一次添加文件，设置当前索引为0
  if (appState.currentFileIndex === -1 && appState.files.length > 0) {
    appState.currentFileIndex = 0;
  }
  
  // 触发文件更新事件
  stateEvents.emit('filesChanged', appState.files);
}

/**
 * 清除所有文件
 */
export function clearFiles() {
  // 保存当前状态到历史记录
  saveToHistory();
  
  // 清除文件和相关状态
  appState.files = [];
  appState.currentFileIndex = -1;
  appState.currentImage = null;
  appState.processedImages.clear();
  
  // 触发文件更新事件
  stateEvents.emit('filesChanged', appState.files);
}

/**
 * 设置当前文件索引
 * @param {number} index 文件索引
 */
export function setCurrentFileIndex(index) {
  if (index >= -1 && index < appState.files.length) {
    appState.currentFileIndex = index;
    
    // 触发当前文件更改事件
    stateEvents.emit('currentFileChanged', getCurrentFile());
  }
}

/**
 * 设置当前图像
 * @param {HTMLImageElement|null} image 图像对象
 */
export function setCurrentImage(image) {
  appState.currentImage = image;
  
  // 触发当前图像更改事件
  stateEvents.emit('currentImageChanged', image);
}

/**
 * 缓存处理后的图像
 * @param {string} fileId 文件ID
 * @param {Blob|string} processedImage 处理后的图像
 */
export function cacheProcessedImage(fileId, processedImage) {
  appState.processedImages.set(fileId, processedImage);
}

/**
 * 获取缓存的处理后图像
 * @param {string} fileId 文件ID
 * @returns {Blob|string|null} 处理后的图像或null
 */
export function getProcessedImage(fileId) {
  return appState.processedImages.get(fileId) || null;
}

/**
 * 保存当前状态到历史记录
 */
function saveToHistory() {
  // 创建当前状态的深拷贝
  const currentState = JSON.parse(JSON.stringify({
    watermarkOptions: appState.watermarkOptions,
    currentFileIndex: appState.currentFileIndex
  }));
  
  // 如果不是在历史记录的最后，删除之后的历史
  if (appState.historyIndex < appState.history.length - 1) {
    appState.history = appState.history.slice(0, appState.historyIndex + 1);
  }
  
  // 添加到历史记录
  appState.history.push(currentState);
  appState.historyIndex = appState.history.length - 1;
  
  // 限制历史记录长度
  const MAX_HISTORY = 50;
  if (appState.history.length > MAX_HISTORY) {
    appState.history = appState.history.slice(appState.history.length - MAX_HISTORY);
    appState.historyIndex = appState.history.length - 1;
  }
}

/**
 * 撤销操作
 * @returns {boolean} 是否成功撤销
 */
export function undo() {
  if (appState.historyIndex > 0) {
    appState.historyIndex--;
    const prevState = appState.history[appState.historyIndex];
    
    // 恢复之前的状态
    appState.watermarkOptions = { ...prevState.watermarkOptions };
    appState.currentFileIndex = prevState.currentFileIndex;
    
    // 触发事件
    stateEvents.emit('watermarkOptionsChanged', appState.watermarkOptions);
    stateEvents.emit('currentFileChanged', getCurrentFile());
    
    return true;
  }
  return false;
}

/**
 * 重做操作
 * @returns {boolean} 是否成功重做
 */
export function redo() {
  if (appState.historyIndex < appState.history.length - 1) {
    appState.historyIndex++;
    const nextState = appState.history[appState.historyIndex];
    
    // 恢复之后的状态
    appState.watermarkOptions = { ...nextState.watermarkOptions };
    appState.currentFileIndex = nextState.currentFileIndex;
    
    // 触发事件
    stateEvents.emit('watermarkOptionsChanged', appState.watermarkOptions);
    stateEvents.emit('currentFileChanged', getCurrentFile());
    
    return true;
  }
  return false;
}

/**
 * 订阅状态更改事件
 * @param {string} eventName 事件名称
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function subscribe(eventName, callback) {
  return stateEvents.on(eventName, callback);
}

/**
 * 取消订阅状态更改事件
 * @param {string} eventName 事件名称
 * @param {Function} callback 回调函数
 */
export function unsubscribe(eventName, callback) {
  stateEvents.off(eventName, callback);
}

/**
 * 初始化应用状态
 * 从本地存储加载设置等
 */
export function initState() {
  // 尝试从本地存储加载设置
  try {
    const savedSettings = localStorage.getItem('watermark-tool-settings');
    if (savedSettings) {
      appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
    }
    
    const savedWatermarkOptions = localStorage.getItem('watermark-tool-options');
    if (savedWatermarkOptions) {
      appState.watermarkOptions = { ...appState.watermarkOptions, ...JSON.parse(savedWatermarkOptions) };
    }
  } catch (error) {
    console.error('加载本地存储设置失败:', error);
  }
}

/**
 * 保存设置到本地存储
 */
export function saveSettings() {
  try {
    localStorage.setItem('watermark-tool-settings', JSON.stringify(appState.settings));
    localStorage.setItem('watermark-tool-options', JSON.stringify(appState.watermarkOptions));
  } catch (error) {
    console.error('保存设置到本地存储失败:', error);
  }
} 