/**
 * 存储服务模块
 * 处理应用设置的持久化存储
 */

// 存储键
const STORAGE_KEYS = {
  SETTINGS: 'watermark-tool-settings',
  WATERMARK_OPTIONS: 'watermark-tool-options',
  RECENT_FILES: 'watermark-tool-recent-files',
  EXPORT_HISTORY: 'watermark-tool-export-history'
};

// 最大存储项数量
const MAX_RECENT_FILES = 10;
const MAX_EXPORT_HISTORY = 20;

/**
 * 保存设置到本地存储
 * @param {Object} settings 设置对象
 * @returns {boolean} 是否成功保存
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

/**
 * 加载设置
 * @returns {Object|null} 设置对象或null
 */
export function loadSettings() {
  try {
    const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settingsJson ? JSON.parse(settingsJson) : null;
  } catch (error) {
    console.error('加载设置失败:', error);
    return null;
  }
}

/**
 * 保存水印选项
 * @param {Object} options 水印选项
 * @returns {boolean} 是否成功保存
 */
export function saveWatermarkOptions(options) {
  try {
    localStorage.setItem(STORAGE_KEYS.WATERMARK_OPTIONS, JSON.stringify(options));
    return true;
  } catch (error) {
    console.error('保存水印选项失败:', error);
    return false;
  }
}

/**
 * 加载水印选项
 * @returns {Object|null} 水印选项或null
 */
export function loadWatermarkOptions() {
  try {
    const optionsJson = localStorage.getItem(STORAGE_KEYS.WATERMARK_OPTIONS);
    return optionsJson ? JSON.parse(optionsJson) : null;
  } catch (error) {
    console.error('加载水印选项失败:', error);
    return null;
  }
}

/**
 * 添加最近文件
 * @param {Object} fileInfo 文件信息
 * @returns {boolean} 是否成功保存
 */
export function addRecentFile(fileInfo) {
  try {
    // 加载现有记录
    let recentFiles = loadRecentFiles() || [];
    
    // 检查是否已存在
    const existingIndex = recentFiles.findIndex(item => 
      item.name === fileInfo.name && item.size === fileInfo.size
    );
    
    // 如果已存在，移除旧记录
    if (existingIndex !== -1) {
      recentFiles.splice(existingIndex, 1);
    }
    
    // 添加到开头
    recentFiles.unshift({
      ...fileInfo,
      timestamp: Date.now()
    });
    
    // 限制数量
    if (recentFiles.length > MAX_RECENT_FILES) {
      recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
    }
    
    // 保存
    localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles));
    return true;
  } catch (error) {
    console.error('添加最近文件失败:', error);
    return false;
  }
}

/**
 * 加载最近文件
 * @returns {Array|null} 最近文件列表或null
 */
export function loadRecentFiles() {
  try {
    const filesJson = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
    return filesJson ? JSON.parse(filesJson) : [];
  } catch (error) {
    console.error('加载最近文件失败:', error);
    return [];
  }
}

/**
 * 清除最近文件
 * @returns {boolean} 是否成功清除
 */
export function clearRecentFiles() {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_FILES);
    return true;
  } catch (error) {
    console.error('清除最近文件失败:', error);
    return false;
  }
}

/**
 * 添加导出历史
 * @param {Object} exportInfo 导出信息
 * @returns {boolean} 是否成功保存
 */
export function addExportHistory(exportInfo) {
  try {
    // 加载现有记录
    let exportHistory = loadExportHistory() || [];
    
    // 添加到开头
    exportHistory.unshift({
      ...exportInfo,
      timestamp: Date.now()
    });
    
    // 限制数量
    if (exportHistory.length > MAX_EXPORT_HISTORY) {
      exportHistory = exportHistory.slice(0, MAX_EXPORT_HISTORY);
    }
    
    // 保存
    localStorage.setItem(STORAGE_KEYS.EXPORT_HISTORY, JSON.stringify(exportHistory));
    return true;
  } catch (error) {
    console.error('添加导出历史失败:', error);
    return false;
  }
}

/**
 * 加载导出历史
 * @returns {Array|null} 导出历史列表或null
 */
export function loadExportHistory() {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEYS.EXPORT_HISTORY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('加载导出历史失败:', error);
    return [];
  }
}

/**
 * 清除导出历史
 * @returns {boolean} 是否成功清除
 */
export function clearExportHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.EXPORT_HISTORY);
    return true;
  } catch (error) {
    console.error('清除导出历史失败:', error);
    return false;
  }
}

/**
 * 清除所有存储数据
 * @returns {boolean} 是否成功清除
 */
export function clearAllStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.WATERMARK_OPTIONS);
    localStorage.removeItem(STORAGE_KEYS.RECENT_FILES);
    localStorage.removeItem(STORAGE_KEYS.EXPORT_HISTORY);
    return true;
  } catch (error) {
    console.error('清除所有存储数据失败:', error);
    return false;
  }
}

/**
 * 检查存储可用性
 * @returns {boolean} 存储是否可用
 */
export function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
} 