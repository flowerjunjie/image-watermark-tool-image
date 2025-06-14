/**
 * GIF解码器Worker
 * 用于在后台线程中解码GIF动图
 */

// 导入libgif-js库
importScripts('https://cdn.jsdelivr.net/gh/buzzfeed/libgif-js@master/libgif.js');

// 接收消息
self.onmessage = async function(e) {
  const { type, url } = e.data;
  
  if (type === 'extract') {
    try {
      // 提取帧
      const frames = await extractFrames(url);
      
      // 返回帧数据
      self.postMessage({
        type: 'frames',
        data: {
          frames
        }
      });
    } catch (error) {
      // 报告错误
      self.postMessage({
        type: 'error',
        data: {
          error: error.message
        }
      });
    }
  }
};

/**
 * 提取GIF帧
 * @param {string} url - GIF的URL
 * @returns {Promise<Array>} - 帧数组
 */
async function extractFrames(url) {
  return new Promise((resolve, reject) => {
    // 创建一个虚拟的img元素
    const img = new Image();
    img.src = url;
    
    img.onload = function() {
      try {
        // 创建一个离屏canvas
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        
        // 创建SuperGif实例
        const superGif = new SuperGif({
          gif: img,
          auto_play: false
        });
        
        superGif.load(() => {
          try {
            // 获取总帧数
            const frameCount = superGif.get_length();
            
            // 报告进度
            self.postMessage({
              type: 'progress',
              data: {
                progress: 10,
                message: `开始提取 ${frameCount} 帧`
              }
            });
            
            // 提取所有帧
            const frames = [];
            
            for (let i = 0; i < frameCount; i++) {
              // 移动到指定帧
              superGif.move_to(i);
              
              // 获取当前帧的canvas
              const frameCanvas = superGif.get_canvas();
              
              // 绘制到我们的canvas上
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
              
              // 获取帧的ImageData
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // 获取帧延迟（毫秒）
              const delay = superGif.get_frames()[i].delay * 10; // libgif-js的延迟单位是1/100秒
              
              // 添加到帧列表
              frames.push({
                imageData,
                delay,
                width: canvas.width,
                height: canvas.height
              });
              
              // 报告进度
              if (i % 5 === 0 || i === frameCount - 1) {
                self.postMessage({
                  type: 'progress',
                  data: {
                    progress: 10 + Math.round((i / frameCount) * 90),
                    message: `已提取 ${i + 1}/${frameCount} 帧`
                  }
                });
              }
            }
            
            resolve(frames);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = function() {
      reject(new Error('加载GIF图片失败'));
    };
  });
} 