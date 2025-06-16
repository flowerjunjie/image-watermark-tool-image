/**
 * 模块加载器
 * 提供动态加载模块和脚本的功能
 */

/**
 * 动态加载脚本文件
 * @param {string} url - 脚本URL
 * @param {string} [fallbackUrl] - 备用URL，如果主URL加载失败
 * @param {string} [id] - 脚本ID
 * @returns {Promise<HTMLScriptElement>} - 加载完成的Promise
 */
export function loadScript(url, fallbackUrl, id) {
  return new Promise((resolve, reject) => {
    // 处理相对路径
    const resolvedUrl = resolveUrl(url);
    const resolvedFallbackUrl = fallbackUrl ? resolveUrl(fallbackUrl) : fallbackUrl;
    
    // 检查脚本是否已加载
    const existingScript = document.querySelector(`script[src="${resolvedUrl}"]`);
    if (existingScript) {
      console.log(`脚本 ${resolvedUrl} 已加载`);
      resolve(existingScript);
      return;
    }
    
    console.log(`加载脚本: ${resolvedUrl}`);
    const script = document.createElement('script');
    if (id) script.id = id;
    script.src = resolvedUrl;
    script.async = true;
    
    // 加载成功回调
    script.onload = () => {
      console.log(`脚本 ${resolvedUrl} 加载成功`);
      resolve(script);
    };
    
    // 加载失败回调
    script.onerror = (error) => {
      console.warn(`脚本 ${resolvedUrl} 加载失败:`, error);
      
      // 尝试备用URL
      if (resolvedFallbackUrl) {
        console.log(`尝试加载备用脚本: ${resolvedFallbackUrl}`);
        const backupScript = document.createElement('script');
        if (id) backupScript.id = id + '-backup';
        backupScript.src = resolvedFallbackUrl;
        backupScript.async = true;
        
        backupScript.onload = () => {
          console.log(`备用脚本 ${resolvedFallbackUrl} 加载成功`);
          resolve(backupScript);
        };
        
        backupScript.onerror = (backupError) => {
          console.error(`备用脚本 ${resolvedFallbackUrl} 加载失败:`, backupError);
          reject(new Error(`无法加载脚本: ${url} 和备用脚本: ${fallbackUrl}`));
        };
        
        document.head.appendChild(backupScript);
      } else {
        reject(new Error(`无法加载脚本: ${url}`));
      }
    };
    
    document.head.appendChild(script);
  });
}

/**
 * 解析URL，处理相对路径
 * @param {string} url - 要解析的URL
 * @returns {string} - 解析后的URL
 */
function resolveUrl(url) {
  // 如果是绝对URL，直接返回
  if (url.startsWith('http') || url.startsWith('/')) {
    return url;
  }
  
  // 如果是相对路径，根据当前脚本的位置进行解析
  const baseUrl = new URL('.', window.location.href).href;
  
  // 处理以./开头的路径
  if (url.startsWith('./')) {
    url = url.substring(2);
  }
  
  // 修复重复的utils路径
  if (url.includes('utils/utils/')) {
    url = url.replace('utils/utils/', 'utils/');
  }
  
  // 组合URL
  let resolvedUrl = new URL(url, baseUrl).href;
  
  // 检测是否在js目录下，添加正确的前缀
  if (url.startsWith('utils/') && document.currentScript) {
    const scriptSrc = document.currentScript.src;
    if (scriptSrc.includes('/js/')) {
      const jsBasePath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/js/') + 4);
      resolvedUrl = jsBasePath + url;
    }
  }
  
  return resolvedUrl;
}

/**
 * 动态加载CSS文件
 * @param {string} url - CSS文件URL
 * @param {string} [id] - CSS ID
 * @returns {Promise<HTMLLinkElement>} - 加载完成的Promise
 */
export function loadCSS(url, id) {
  return new Promise((resolve, reject) => {
    // 检查CSS是否已加载
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) {
      console.log(`CSS ${url} 已加载`);
      resolve(existingLink);
      return;
    }
    
    console.log(`加载CSS: ${url}`);
    const link = document.createElement('link');
    if (id) link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    
    // 加载成功回调
    link.onload = () => {
      console.log(`CSS ${url} 加载成功`);
      resolve(link);
    };
    
    // 加载失败回调
    link.onerror = (error) => {
      console.error(`CSS ${url} 加载失败:`, error);
      reject(new Error(`无法加载CSS: ${url}`));
    };
    
    document.head.appendChild(link);
  });
}

/**
 * 动态导入模块
 * @param {string} modulePath - 模块路径
 * @returns {Promise<any>} - 模块导出
 */
export async function importModule(modulePath) {
  try {
    console.log(`尝试动态导入模块: ${modulePath}`);
    // 解析正确的模块路径，避免路径拼接错误
    const normalizedPath = modulePath.startsWith('./utils/') ? 
      modulePath.replace('./utils/', '../utils/') : modulePath;
    
    return await import(normalizedPath);
  } catch (error) {
    console.error(`导入模块 ${modulePath} 失败:`, error);
    
    // 尝试降级处理 - 将ES模块路径转换为传统脚本路径
    const isLocalPath = !modulePath.startsWith('http');
    // 移除路径中可能出现的重复utils部分
    let scriptPath = modulePath;
    if (scriptPath.includes('utils/utils/')) {
      scriptPath = scriptPath.replace('utils/utils/', 'utils/');
    }
    
    console.warn(`尝试使用传统脚本方式加载: ${scriptPath}`);
    
    // 尝试使用传统方式加载脚本
    return new Promise((resolve, reject) => {
      loadScript(scriptPath)
        .then(() => {
          console.log(`使用传统方式加载 ${scriptPath} 成功`);
          
          // 假设模块已经注册到全局作用域
          // 提取模块名并返回一个模拟的导出对象
          const moduleName = modulePath.split('/').pop().replace('.js', '');
          const moduleObject = {};
          
          // 尝试从全局对象获取相应的属性
          if (window[moduleName]) {
            moduleObject[moduleName] = window[moduleName];
            console.log(`已找到全局模块: ${moduleName}`);
          } else {
            console.warn(`无法在全局找到模块: ${moduleName}`);
          }
          
          resolve(moduleObject);
        })
        .catch(scriptError => {
          console.error(`传统脚本加载方式也失败: ${scriptPath}`, scriptError);
          reject(new Error(`无法加载模块 ${modulePath}: ${error.message}`));
        });
    });
  }
}

/**
 * 动态导入模块并获取特定导出
 * @param {string} modulePath - 模块路径
 * @param {string} exportName - 导出名称
 * @returns {Promise<any>} - 特定导出值
 */
export async function importExport(modulePath, exportName) {
  try {
    console.log(`尝试从 ${modulePath} 导入 ${exportName}`);
    const module = await importModule(modulePath);
    
    if (exportName in module) {
      console.log(`成功从 ${modulePath} 导入 ${exportName}`);
      return module[exportName];
    }
    
    // 尝试在返回的对象中查找导出
    for (const key in module) {
      if (module[key] && exportName in module[key]) {
        console.log(`在子对象 ${key} 中找到 ${exportName}`);
        return module[key][exportName];
      }
    }
    
    // 尝试在全局对象中查找
    if (window[exportName]) {
      console.log(`在全局对象中找到 ${exportName}`);
      return window[exportName];
    }
    
    throw new Error(`模块 ${modulePath} 不存在导出 ${exportName}`);
  } catch (error) {
    console.error(`导入模块 ${modulePath} 的导出 ${exportName} 失败:`, error);
    
    // 尝试从全局对象获取
    if (window[exportName]) {
      console.warn(`从全局对象返回 ${exportName} 作为降级处理`);
      return window[exportName];
    }
    
    // 创建一个空函数作为最后的降级处理
    console.warn(`为 ${exportName} 创建空函数作为降级处理`);
    return function() {
      console.warn(`调用了降级的 ${exportName} 函数`);
      return null;
    };
  }
}

/**
 * 加载所有GIF相关库
 * @returns {Promise<void>} - 加载完成的Promise
 */
export function loadAllGifLibs() {
  const libPaths = {
    gif: '/public/libs/gif.js',
    gifWorker: '/public/libs/gif.worker.js',
    omggif: '/public/libs/omggif.min.js',
    imageQ: '/public/libs/image-q.min.js',
    gifwrap: '/public/libs/gifwrap.min.js',
    libgif: '/public/libs/libgif.js'
  };

  // 备用CDN路径
  const cdnPaths = {
    gif: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js',
    gifWorker: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
    omggif: 'https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.min.js',
    imageQ: 'https://cdn.jsdelivr.net/npm/image-q@4.0.0/dist/umd/image-q.min.js',
    gifwrap: 'https://cdn.jsdelivr.net/npm/gifwrap@0.10.1/umd/gifwrap.min.js',
    libgif: 'https://cdn.jsdelivr.net/npm/libgif@0.0.2/libgif.min.js'
  };

  // 检测当前URL是否是本地开发环境
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

  // 调整路径
  if (isLocalDev) {
    // 本地开发环境可能需要不同的路径
    Object.keys(libPaths).forEach(key => {
      libPaths[key] = libPaths[key].replace('/public/', '/');
    });
  }
  
  // 加载所有库
  return Promise.all([
    loadScript(libPaths.gif, cdnPaths.gif, 'gif-js'),
    loadScript(libPaths.gifWorker, cdnPaths.gifWorker, 'gif-worker'),
    loadScript(libPaths.omggif, cdnPaths.omggif, 'omggif-js'),
    loadScript(libPaths.imageQ, cdnPaths.imageQ, 'image-q-js'),
    loadScript(libPaths.gifwrap, cdnPaths.gifwrap, 'gifwrap-js'),
    loadScript(libPaths.libgif, cdnPaths.libgif, 'libgif-js')
  ])
  .then(() => {
    console.log('所有GIF相关库加载完成');
    
    // 验证库是否正确加载
    const libraryStatus = {
      gif: typeof window.GIF === 'function',
      omggif: typeof window.omggif !== 'undefined',
      imageQ: typeof window.imageQ !== 'undefined',
      gifwrap: typeof window.gifwrap !== 'undefined',
      libgif: typeof window.SuperGif === 'function'
    };
    
    console.log('库加载状态:', libraryStatus);
    return libraryStatus;
  });
} 