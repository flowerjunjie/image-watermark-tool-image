/**
 * GIF Worker管理器
 * 管理与GIF Worker的通信，处理GIF图像
 */

import { getWatermarkOptions } from '../../core/state.js';

// 任务ID计数器
let taskIdCounter = 0;

// 任务映射表
const tasks = new Map();

// Worker实例
let worker = null;

// Worker就绪状态
let workerReady = false;

/**
 * 初始化GIF Worker
 * @returns {Promise<void>}
 */
export async function initGifWorker() {
  return new Promise((resolve, reject) => {
    try {
      // 创建Worker
      worker = new Worker(new URL('./gif-worker.js', import.meta.url), { type: 'module' });
      
      // 设置消息处理
      worker.onmessage = (event) => {
        const { type, id, result, error, progress } = event.data;
        
        switch (type) {
          case 'ready':
            // Worker已准备就绪
            console.log('GIF Worker已准备就绪');
            workerReady = true;
            resolve();
            break;
            
          case 'result':
            // 处理结果
            if (tasks.has(id)) {
              const task = tasks.get(id);
              tasks.delete(id);
              task.resolve(result);
            }
            break;
            
          case 'error':
            // 处理错误
            console.error('GIF Worker错误:', error);
            if (tasks.has(id)) {
              const task = tasks.get(id);
              tasks.delete(id);
              task.reject(new Error(error));
            } else {
              // 全局错误
              console.error('未关联任务的GIF Worker错误:', error);
            }
            break;
            
          case 'progress':
            // 处理进度
            if (tasks.has(id) && tasks.get(id).onProgress) {
              tasks.get(id).onProgress(progress);
            }
            break;
            
          case 'frameProgress':
            // 帧处理进度
            if (tasks.has(id) && tasks.get(id).onFrameProgress) {
              const { frameIndex, totalFrames, progress } = event.data;
              tasks.get(id).onFrameProgress(frameIndex, totalFrames, progress);
            }
            break;
            
          default:
            console.warn('未知的GIF Worker消息类型:', type);
        }
      };
      
      // 错误处理
      worker.onerror = (error) => {
        console.error('GIF Worker错误:', error);
        workerReady = false;
        reject(error);
      };
      
    } catch (error) {
      console.error('初始化GIF Worker失败:', error);
      reject(error);
    }
  });
}

/**
 * 处理GIF
 * @param {Blob|File|ArrayBuffer} gifSource GIF源
 * @param {Object} options 水印选项
 * @param {Function} onProgress 进度回调
 * @param {Function} onFrameProgress 帧进度回调
 * @returns {Promise<Blob>} 处理后的GIF
 */
export async function processGifWithWorker(gifSource, options = null, onProgress = null, onFrameProgress = null) {
  // 确保Worker已初始化
  if (!worker || !workerReady) {
    await initGifWorker();
  }
  
  // 使用传入的选项或获取默认选项
  const watermarkOptions = options || getWatermarkOptions();
  
  // 转换输入为ArrayBuffer
  const buffer = await readGifSource(gifSource);
  
  // 创建任务ID
  const taskId = ++taskIdCounter;
  
  // 创建任务Promise
  const taskPromise = new Promise((resolve, reject) => {
    // 添加到任务映射表
    tasks.set(taskId, {
      resolve,
      reject,
      onProgress,
      onFrameProgress
    });
    
    // 发送处理请求到Worker
    worker.postMessage({
      type: 'process',
      id: taskId,
      data: buffer,
      options: watermarkOptions
    }, [buffer]);
  });
  
  // 等待处理结果
  const result = await taskPromise;
  
  // 转换为Blob
  return new Blob([result], { type: 'image/gif' });
}

/**
 * 解码GIF
 * @param {Blob|File|ArrayBuffer} gifSource GIF源
 * @returns {Promise<{frames: Object[], options: Object}>} 解码后的GIF帧和选项
 */
export async function decodeGifWithWorker(gifSource) {
  // 确保Worker已初始化
  if (!worker || !workerReady) {
    await initGifWorker();
  }
  
  // 转换输入为ArrayBuffer
  const buffer = await readGifSource(gifSource);
  
  // 创建任务ID
  const taskId = ++taskIdCounter;
  
  // 创建任务Promise
  return new Promise((resolve, reject) => {
    // 添加到任务映射表
    tasks.set(taskId, {
      resolve,
      reject
    });
    
    // 发送解码请求到Worker
    worker.postMessage({
      type: 'decode',
      id: taskId,
      data: buffer
    }, [buffer]);
  });
}

/**
 * 编码GIF
 * @param {Object[]} frames GIF帧
 * @param {Object} options GIF选项
 * @returns {Promise<Blob>} 编码后的GIF
 */
export async function encodeGifWithWorker(frames, options) {
  // 确保Worker已初始化
  if (!worker || !workerReady) {
    await initGifWorker();
  }
  
  // 创建任务ID
  const taskId = ++taskIdCounter;
  
  // 创建任务Promise
  const taskPromise = new Promise((resolve, reject) => {
    // 添加到任务映射表
    tasks.set(taskId, {
      resolve,
      reject
    });
    
    // 发送编码请求到Worker
    worker.postMessage({
      type: 'encode',
      id: taskId,
      data: {
        frames,
        options
      }
    });
  });
  
  // 等待处理结果
  const result = await taskPromise;
  
  // 转换为Blob
  return new Blob([result], { type: 'image/gif' });
}

/**
 * 终止Worker
 */
export function terminateGifWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    workerReady = false;
    
    // 拒绝所有待处理任务
    for (const [id, task] of tasks.entries()) {
      task.reject(new Error('GIF Worker已终止'));
      tasks.delete(id);
    }
    
    console.log('GIF Worker已终止');
  }
}

/**
 * 读取GIF源
 * @param {Blob|File|ArrayBuffer} source GIF源
 * @returns {Promise<ArrayBuffer>} GIF数据的ArrayBuffer
 */
async function readGifSource(source) {
  if (source instanceof ArrayBuffer) {
    return source;
  } else if (source instanceof Blob || source instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(source);
    });
  } else {
    throw new Error('不支持的GIF源类型');
  }
} 