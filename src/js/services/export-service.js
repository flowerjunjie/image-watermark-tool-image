/**
 * 导出服务模块
 * 处理图片导出和批量下载
 */

import { canvasToBlob } from '../core/watermark-core.js';
import { getFileFolderPath, getFileExtension, getFileMimeType } from '../utils/file-handler.js';
import { isGif } from '../utils/gif/gif-processor.js';

// 导入JSZip库（确保已安装）
import JSZip from 'jszip';

/**
 * 导出单张图片
 * @param {HTMLCanvasElement} canvas 处理后的画布
 * @param {File} originalFile 原始文件
 * @param {Object} options 导出选项
 * @returns {Promise<Blob>} 导出的图片Blob
 */
export async function exportImage(canvas, originalFile, options = {}) {
  // 默认选项
  const defaultOptions = {
    format: 'original', // 'original', 'png', 'jpg', 'webp'
    quality: 0.9,       // 0-1
    fileName: null      // 自定义文件名
  };
  
  // 合并选项
  const exportOptions = { ...defaultOptions, ...options };
  
  // 确定导出格式
  let format = exportOptions.format;
  let mimeType;
  
  if (format === 'original') {
    // 使用原始文件格式
    mimeType = originalFile.type;
    
    // 如果原始类型未知，使用扩展名判断
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = getFileExtension(originalFile);
      mimeType = getFileMimeType(ext);
    }
    
    // 如果仍然无法确定，默认为PNG
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = 'image/png';
    }
  } else {
    // 使用指定格式
    mimeType = `image/${format}`;
  }
  
  // 转换画布为Blob
  const blob = await canvasToBlob(canvas, mimeType, exportOptions.quality);
  
  // 生成文件名
  const fileName = exportOptions.fileName || generateExportFileName(originalFile, format);
  
  return {
    blob,
    fileName,
    mimeType
  };
}

/**
 * 批量导出图片
 * @param {Map<File, HTMLCanvasElement|Blob>} processedImages 处理后的图片映射
 * @param {Object} options 导出选项
 * @param {Function} progressCallback 进度回调
 * @returns {Promise<Blob>} ZIP文件Blob
 */
export async function batchExportImages(processedImages, options = {}, progressCallback = null) {
  // 默认选项
  const defaultOptions = {
    format: 'original',            // 'original', 'png', 'jpg', 'webp'
    quality: 0.9,                  // 0-1
    preserveFolderStructure: true, // 是否保留文件夹结构
    zipFileName: 'watermarked-images.zip'
  };
  
  // 合并选项
  const exportOptions = { ...defaultOptions, ...options };
  
  // 创建ZIP文件
  const zip = new JSZip();
  
  // 处理的文件总数
  const totalFiles = processedImages.size;
  let processedCount = 0;
  
  // 处理每个图片
  for (const [originalFile, processedImage] of processedImages.entries()) {
    try {
      // 获取文件夹路径
      let folderPath = '';
      if (exportOptions.preserveFolderStructure) {
        folderPath = getFileFolderPath(originalFile);
      }
      
      // 生成文件名
      const fileName = generateExportFileName(originalFile, exportOptions.format);
      
      // 完整路径
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      // 获取Blob
      let blob;
      if (processedImage instanceof HTMLCanvasElement) {
        // 确定导出格式
        let mimeType;
        if (exportOptions.format === 'original') {
          mimeType = originalFile.type || 'image/png';
        } else {
          mimeType = `image/${exportOptions.format}`;
        }
        
        // 转换画布为Blob
        blob = await canvasToBlob(processedImage, mimeType, exportOptions.quality);
      } else {
        // 已经是Blob
        blob = processedImage;
      }
      
      // 添加到ZIP
      zip.file(filePath, blob);
      
      // 更新进度
      processedCount++;
      if (progressCallback) {
        progressCallback(processedCount / totalFiles);
      }
    } catch (error) {
      console.error(`导出图片失败: ${originalFile.name}`, error);
      // 继续处理其他图片
    }
  }
  
  // 生成ZIP文件
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6 // 压缩级别 1-9，9为最高压缩率
    }
  }, (metadata) => {
    // 压缩进度
    if (progressCallback) {
      progressCallback(0.9 + metadata.percent / 1000); // 90%-100%
    }
  });
  
  return {
    blob: zipBlob,
    fileName: exportOptions.zipFileName
  };
}

/**
 * 下载文件
 * @param {Blob} blob 文件Blob
 * @param {string} fileName 文件名
 */
export function downloadFile(blob, fileName) {
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 释放URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * 生成导出文件名
 * @param {File} originalFile 原始文件
 * @param {string} format 导出格式
 * @returns {string} 文件名
 */
function generateExportFileName(originalFile, format) {
  // 获取原始文件名（不含扩展名）
  const originalName = originalFile.name.replace(/\.[^.]+$/, '');
  
  // 确定扩展名
  let extension;
  if (format === 'original') {
    // 使用原始文件扩展名
    extension = getFileExtension(originalFile);
    
    // 如果无法获取扩展名，根据MIME类型判断
    if (!extension) {
      if (originalFile.type === 'image/jpeg') extension = 'jpg';
      else if (originalFile.type === 'image/png') extension = 'png';
      else if (originalFile.type === 'image/gif') extension = 'gif';
      else if (originalFile.type === 'image/webp') extension = 'webp';
      else extension = 'png'; // 默认
    }
  } else {
    // 使用指定格式
    extension = format;
  }
  
  // 返回完整文件名
  return `${originalName}_watermarked.${extension}`;
} 