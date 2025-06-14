/**
 * 简单的事件发布订阅系统
 */

export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  /**
   * 订阅事件
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @returns {Function} 取消订阅的函数
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    this.events[eventName].push(callback);
    
    // 返回取消订阅的函数
    return () => this.off(eventName, callback);
  }
  
  /**
   * 取消订阅事件
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    
    // 如果没有订阅者了，删除事件
    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }
  
  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {...any} args 传递给回调函数的参数
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) return;
    
    // 复制一份回调数组，避免在回调中取消订阅导致的问题
    const callbacks = [...this.events[eventName]];
    
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event ${eventName} callback:`, error);
      }
    });
  }
  
  /**
   * 只订阅一次事件
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   */
  once(eventName, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(eventName, onceCallback);
    };
    
    return this.on(eventName, onceCallback);
  }
  
  /**
   * 清除所有事件订阅
   */
  clear() {
    this.events = {};
  }
  
  /**
   * 获取事件订阅者数量
   * @param {string} eventName 事件名称
   * @returns {number} 订阅者数量
   */
  listenerCount(eventName) {
    return this.events[eventName]?.length || 0;
  }
} 