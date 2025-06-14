/**
 * GIF Worker管理器
 * 负责创建和管理GIF处理的Web Worker
 */

// 存储Worker实例
let gifWorker = null;
let isInitialized = false;
let pendingTasks = new Map();
let taskIdCounter = 0;

/**
 * GIF Worker处理器
 * 统一管理GIF处理任务和Worker生命周期
 */
export const GifWorkerProcessor = {
  /**
   * 初始化Worker
   * @returns {Promise} - 初始化成功的Promise
   */
  init() {
    return new Promise((resolve, reject) => {
      if (isInitialized && gifWorker) {
        console.log('GIF Worker已经初始化');
        resolve(true);
        return;
      }
      
      try {
        // 检查Worker API是否可用
        if (typeof Worker === 'undefined') {
          console.warn('浏览器不支持Web Worker，将使用同步处理');
          reject(new Error('浏览器不支持Web Worker'));
          return;
        }
        
        // 获取正确的worker脚本路径
        let workerPath;
        
        // 检测环境并设置合适的路径
        if (window.location.href.includes('file://')) {
          // 本地文件系统模式
          workerPath = 'js/utils/gif/gif-worker.js';
        } else if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
          // 本地服务器模式
          workerPath = '/js/utils/gif/gif-worker.js';
        } else {
          // 生产服务器模式 - 尝试相对路径
          workerPath = './js/utils/gif/gif-worker.js';
        }

        console.log('使用GIF Worker路径:', workerPath);
        
        // 创建Worker
        gifWorker = new Worker(workerPath);
        
        // 设置超时
        const initTimeout = setTimeout(() => {
          console.error('GIF Worker初始化超时');
          reject(new Error('GIF Worker初始化超时'));
        }, 5000);
        
        // 监听消息
        gifWorker.onmessage = function(event) {
          const data = event.data;
          
          if (!data || !data.type) {
            console.error('从GIF Worker收到无效消息:', data);
            return;
          }
          
          // 处理初始化状态
          if (data.type === 'ready') {
            clearTimeout(initTimeout);
            isInitialized = true;
            console.log('GIF Worker初始化成功');
            resolve(true);
            return;
          }
          
          // 处理任务相关消息
          if (data.taskId !== undefined && pendingTasks.has(data.taskId)) {
            const task = pendingTasks.get(data.taskId);
            
            switch (data.type) {
              case 'start':
                // 任务开始
                if (task.onStart) task.onStart(data);
                break;
                
              case 'progress':
                // 处理进度
                if (task.onProgress) task.onProgress(data.progress);
                break;
                
              case 'frameProgress':
                // 帧处理进度
                if (task.onFrameProgress) {
                  task.onFrameProgress(data.progress, {
                    current: data.current,
                    total: data.total
                  });
                }
                break;
                
              case 'result':
                // 处理成功
                if (data.error) {
                  // 如果有错误，调用错误处理
                  if (task.onError) task.onError(data.error);
                } else if (data.buffer) {
                  // 如果收到ArrayBuffer，创建Blob
                  try {
                    const blob = new Blob([data.buffer], { type: data.mimeType || 'image/gif' });
                    if (task.onComplete) task.onComplete(blob);
                  } catch (error) {
                    console.error('创建Blob时出错:', error);
                    if (task.onError) task.onError('创建Blob时出错: ' + error.message);
                  }
                } else if (data.blob) {
                  // 兼容旧版本，直接使用blob
                  if (task.onComplete) task.onComplete(data.blob);
                } else {
                  // 没有有效数据
                  if (task.onError) task.onError('Worker未返回有效数据');
                }
                pendingTasks.delete(data.taskId);
                break;
                
              case 'error':
                // 处理错误
                if (task.onError) task.onError(data.error);
                pendingTasks.delete(data.taskId);
                break;
                
              case 'cancelled':
                // 任务取消
                if (task.onCancel) task.onCancel();
                pendingTasks.delete(data.taskId);
                break;
            }
            
            return;
          }
          
          console.log('从GIF Worker收到未处理的消息:', data);
        };
        
        // 错误处理
        gifWorker.onerror = function(error) {
          console.error('GIF Worker发生错误:', error);
          
          // 初始化期间的错误
          if (!isInitialized) {
            clearTimeout(initTimeout);
            reject(error);
            return;
          }
          
          // 通知所有未完成任务出错
          pendingTasks.forEach(task => {
            if (task.onError) {
              task.onError('Worker发生错误: ' + (error.message || '未知错误'));
            }
          });
          
          // 清理所有任务
          pendingTasks.clear();
          
          // 尝试重新初始化
          this.terminateAndReset();
        }.bind(this);
        
        // 发送初始化消息
        gifWorker.postMessage({ type: 'init' });
        
      } catch (error) {
        console.error('初始化GIF Worker时出错:', error);
        reject(error);
      }
    });
  },
  
  /**
   * 处理GIF帧
   * @param {Array} frames - GIF帧数据
   * @param {Object} options - 处理选项
   * @param {Object} callbacks - 回调函数对象
   * @returns {Promise} - 处理结果的Promise
   */
  processGifFrames(frames, options, callbacks = {}) {
    return new Promise((resolve, reject) => {
      if (!isInitialized || !gifWorker) {
        // 尝试初始化
        this.init()
          .then(() => {
            // 初始化成功后再处理
            this.processGifFrames(frames, options, callbacks)
              .then(resolve)
              .catch(reject);
          })
          .catch(error => {
            console.error('GIF Worker初始化失败，无法处理GIF:', error);
            reject(new Error('GIF Worker不可用: ' + error.message));
          });
        
        return;
      }
      
      // 创建任务ID
      const taskId = taskIdCounter++;
      
      // 创建任务
      const task = {
        frames,
        options,
        startTime: Date.now(),
        onStart: callbacks.onStart,
        onProgress: callbacks.onProgress,
        onFrameProgress: callbacks.onFrameProgress,
        onComplete: (blob) => {
          console.log(`GIF任务 ${taskId} 完成，耗时: ${(Date.now() - task.startTime) / 1000}秒`);
          resolve(blob);
          
          if (callbacks.onComplete) {
            callbacks.onComplete(blob);
          }
        },
        onError: (error) => {
          console.error(`GIF任务 ${taskId} 失败:`, error);
          reject(new Error(error));
          
          if (callbacks.onError) {
            callbacks.onError(error);
          }
        },
        onCancel: callbacks.onCancel
      };
      
      // 保存任务
      pendingTasks.set(taskId, task);
      
      try {
        // 准备可传输的帧数据
        const transferableFrames = frames.map(frame => {
          // 创建一个不包含不可克隆对象的帧副本
          const cleanFrame = {
            delay: frame.delay || 100,
            width: frame.width || (frame.dims ? frame.dims.width : 0),
            height: frame.height || (frame.dims ? frame.dims.height : 0),
            dims: frame.dims || { width: frame.width || 0, height: frame.height || 0 }
          };
          
          // 如果有data属性，使用它
          if (frame.data) {
            cleanFrame.data = frame.data;
          }
          
          return cleanFrame;
        });
        
        console.log('准备发送到Worker的帧数据:', transferableFrames.length, '帧');
        
        // 发送处理请求
        gifWorker.postMessage({
          type: 'process',
          taskId,
          frames: transferableFrames,
          options: {
            ...options,
            // 确保正确传递位置信息
            position: typeof options.position === 'object' ? 
              { 
                x: parseFloat(options.position.x), 
                y: parseFloat(options.position.y) 
              } : options.position,
            positionX: parseFloat(options.positionX || 50),
            positionY: parseFloat(options.positionY || 50)
          }
        });
      } catch (error) {
        console.error('准备Worker数据时出错:', error);
        task.onError('准备Worker数据时出错: ' + error.message);
        pendingTasks.delete(taskId);
      }
      
      console.log(`GIF任务 ${taskId} 已提交，${frames.length}帧`);
    });
  },
  
  /**
   * 取消任务
   * @param {number} taskId - 任务ID
   * @returns {boolean} - 是否成功取消
   */
  cancelTask(taskId) {
    if (!pendingTasks.has(taskId) || !gifWorker) {
      return false;
    }
    
    try {
      // 发送取消消息
      gifWorker.postMessage({
        type: 'cancel',
        taskId
      });
      
      return true;
    } catch (error) {
      console.error(`取消GIF任务 ${taskId} 时出错:`, error);
      return false;
    }
  },
  
  /**
   * 终止Worker并重置状态
   */
  terminateAndReset() {
    try {
      // 终止Worker
      if (gifWorker) {
        gifWorker.terminate();
        gifWorker = null;
      }
      
      // 重置状态
      isInitialized = false;
      
      console.log('GIF Worker已终止，状态已重置');
    } catch (error) {
      console.error('终止GIF Worker时出错:', error);
    }
  },
  
  /**
   * 获取是否初始化状态
   * @returns {boolean} - 是否已初始化
   */
  isReady() {
    return isInitialized && gifWorker !== null;
  },
  
  /**
   * 获取等待中的任务数量
   * @returns {number} - 等待中的任务数量
   */
  getPendingTaskCount() {
    return pendingTasks.size;
  }
}; 