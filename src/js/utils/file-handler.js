/**
 * 文件处理模块
 * 处理文件上传、批量处理和文件夹结构维护
 */

import { isGif } from './gif/gif-processor.js';
import { addFiles, setCurrentFileIndex } from '../core/state.js';

// 存储文件夹结构
const folderStructure = new Map();

/**
 * 处理文件上传
 * @param {FileList|File[]} files 上传的文件列表
 * @param {boolean} preserveStructure 是否保留文件夹结构
 * @returns {Promise<{files: File[], folderPaths: Map<File, string>}>} 处理后的文件和文件夹路径
 */
export async function handleFileUpload(files, preserveStructure = true) {
  // 转换FileList为数组
  const fileArray = Array.from(files);
  
  // 过滤出图片文件
  const imageFiles = fileArray.filter(file => 
    file.type.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
  );
  
  if (imageFiles.length === 0) {
    throw new Error('未找到图片文件');
  }
  
  // 处理文件夹结构
  const filePaths = new Map();
  
  if (preserveStructure) {
    imageFiles.forEach(file => {
      // 获取相对路径（webkitRelativePath仅在使用directory属性时可用）
      const path = file.webkitRelativePath || '';
      
      if (path) {
        // 提取文件夹路径（去除文件名）
        const folderPath = path.split('/').slice(0, -1).join('/');
        filePaths.set(file, folderPath);
        folderStructure.set(file, folderPath);
      }
    });
  }
  
  // 添加文件到应用状态
  addFiles(imageFiles);
  
  // 如果有文件，设置当前索引为0
  if (imageFiles.length > 0) {
    setCurrentFileIndex(0);
  }
  
  return {
    files: imageFiles,
    folderPaths: filePaths
  };
}

/**
 * 获取文件的文件夹路径
 * @param {File} file 文件
 * @returns {string} 文件夹路径
 */
export function getFileFolderPath(file) {
  return folderStructure.get(file) || '';
}

/**
 * 按文件夹组织文件
 * @param {File[]} files 文件列表
 * @returns {Object} 按文件夹组织的文件
 */
export function organizeFilesByFolder(files) {
  const folders = {};
  
  files.forEach(file => {
    const folderPath = getFileFolderPath(file) || '根目录';
    
    if (!folders[folderPath]) {
      folders[folderPath] = [];
    }
    
    folders[folderPath].push(file);
  });
  
  return folders;
}

/**
 * 创建文件ID
 * @param {File} file 文件
 * @returns {string} 文件ID
 */
export function createFileId(file) {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

/**
 * 读取图片文件
 * @param {File} file 图片文件
 * @returns {Promise<HTMLImageElement>} 图片元素
 */
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const img = new Image();
      
      img.onload = function() {
        resolve(img);
      };
      
      img.onerror = function() {
        reject(new Error(`无法加载图片: ${file.name}`));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = function() {
      reject(new Error(`无法读取文件: ${file.name}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * 批量读取图片文件
 * @param {File[]} files 图片文件列表
 * @param {Function} progressCallback 进度回调
 * @returns {Promise<HTMLImageElement[]>} 图片元素数组
 */
export async function batchReadImageFiles(files, progressCallback = null) {
  const images = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const img = await readImageFile(files[i]);
      images.push(img);
      
      // 报告进度
      if (progressCallback) {
        progressCallback(i / files.length);
      }
    } catch (error) {
      console.error(`读取图片失败: ${files[i].name}`, error);
      // 继续处理其他图片
    }
  }
  
  // 最终进度
  if (progressCallback) {
    progressCallback(1);
  }
  
  return images;
}

/**
 * 获取文件扩展名
 * @param {File|string} file 文件或文件名
 * @returns {string} 扩展名（小写，不含点）
 */
export function getFileExtension(file) {
  const fileName = typeof file === 'string' ? file : file.name;
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * 检查文件是否为图片
 * @param {File} file 文件
 * @returns {boolean} 是否为图片
 */
export function isImageFile(file) {
  // 检查MIME类型
  if (file.type.startsWith('image/')) {
    return true;
  }
  
  // 检查扩展名
  const ext = getFileExtension(file);
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
}

/**
 * 获取文件的MIME类型
 * @param {File|string} file 文件或文件名
 * @returns {string} MIME类型
 */
export function getFileMimeType(file) {
  if (file instanceof File) {
    return file.type || getMimeTypeFromExtension(getFileExtension(file));
  }
  
  return getMimeTypeFromExtension(getFileExtension(file));
}

/**
 * 根据扩展名获取MIME类型
 * @param {string} extension 扩展名
 * @returns {string} MIME类型
 */
function getMimeTypeFromExtension(extension) {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
