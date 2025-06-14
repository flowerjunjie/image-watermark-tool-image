/**
 * 撤销/重做服务模块
 * 管理操作历史，支持撤销和重做功能
 */

import { EventEmitter } from '../utils/event-emitter.js';

// 创建事件发射器
const historyEvents = new EventEmitter();

// 最大历史记录数量
const MAX_HISTORY_SIZE = 50;

// 历史记录
const history = {
  past: [],    // 过去的操作
  future: [],  // 未来的操作（被撤销的）
  current: null // 当前状态
};

// 是否正在执行撤销/重做操作
let isPerformingAction = false;

/**
 * 添加操作到历史记录
 * @param {Object} action 操作对象
 * @param {Object} state 操作后的状态
 */
export function addHistory(action, state) {
  // 如果正在执行撤销/重做，不记录历史
  if (isPerformingAction) return;
  
  // 保存当前状态到过去
  if (history.current !== null) {
    history.past.push(history.current);
    
    // 限制历史记录大小
    if (history.past.length > MAX_HISTORY_SIZE) {
      history.past.shift();
    }
  }
  
  // 更新当前状态
  history.current = {
    action,
    state: deepClone(state)
  };
  
  // 清空未来
  history.future = [];
  
  // 触发事件
  historyEvents.emit('historyChanged', getHistoryState());
}

/**
 * 撤销操作
 * @returns {Object|null} 撤销后的状态或null
 */
export function undo() {
  // 检查是否可以撤销
  if (!canUndo()) return null;
  
  // 标记正在执行操作
  isPerformingAction = true;
  
  try {
    // 将当前状态移动到未来
    history.future.unshift(history.current);
    
    // 从过去获取新的当前状态
    history.current = history.past.pop();
    
    // 触发事件
    historyEvents.emit('historyChanged', getHistoryState());
    historyEvents.emit('undo', history.current);
    
    // 返回撤销后的状态
    return history.current.state;
  } finally {
    // 重置标记
    isPerformingAction = false;
  }
}

/**
 * 重做操作
 * @returns {Object|null} 重做后的状态或null
 */
export function redo() {
  // 检查是否可以重做
  if (!canRedo()) return null;
  
  // 标记正在执行操作
  isPerformingAction = true;
  
  try {
    // 将当前状态移动到过去
    if (history.current !== null) {
      history.past.push(history.current);
    }
    
    // 从未来获取新的当前状态
    history.current = history.future.shift();
    
    // 触发事件
    historyEvents.emit('historyChanged', getHistoryState());
    historyEvents.emit('redo', history.current);
    
    // 返回重做后的状态
    return history.current.state;
  } finally {
    // 重置标记
    isPerformingAction = false;
  }
}

/**
 * 检查是否可以撤销
 * @returns {boolean} 是否可以撤销
 */
export function canUndo() {
  return history.past.length > 0;
}

/**
 * 检查是否可以重做
 * @returns {boolean} 是否可以重做
 */
export function canRedo() {
  return history.future.length > 0;
}

/**
 * 获取历史记录状态
 * @returns {Object} 历史记录状态
 */
export function getHistoryState() {
  return {
    canUndo: canUndo(),
    canRedo: canRedo(),
    pastCount: history.past.length,
    futureCount: history.future.length,
    current: history.current
  };
}

/**
 * 清空历史记录
 */
export function clearHistory() {
  history.past = [];
  history.future = [];
  history.current = null;
  
  // 触发事件
  historyEvents.emit('historyChanged', getHistoryState());
}

/**
 * 订阅历史记录变化事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onHistoryChanged(callback) {
  return historyEvents.on('historyChanged', callback);
}

/**
 * 订阅撤销事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onUndo(callback) {
  return historyEvents.on('undo', callback);
}

/**
 * 订阅重做事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onRedo(callback) {
  return historyEvents.on('redo', callback);
}

/**
 * 深度克隆对象
 * @param {*} obj 要克隆的对象
 * @returns {*} 克隆后的对象
 */
function deepClone(obj) {
  // 处理基本类型和null/undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // 处理日期
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  // 处理对象
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 跳过不可序列化的属性，如DOM元素、函数等
      if (typeof obj[key] === 'function' || 
          obj[key] instanceof HTMLElement ||
          obj[key] instanceof File ||
          obj[key] instanceof Blob) {
        continue;
      }
      
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
} 