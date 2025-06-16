// 渲染进程脚本 - 与Electron API通信

// 定义全局对象，减少重复引用
const api = window.electronAPI;
let openFilesHandler = null;
let openDirectoryHandler = null;

/**
 * 页面加载完成时初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  // 初始化按钮事件处理
  setupButtonHandlers();
  
  // 设置拖放区域
  setupDragAndDrop();
  
  // 监听文件打开事件
  setupFileOpenListeners();
  
  // 添加版本信息
  setupVersionInfo();
});

/**
 * 设置按钮事件处理
 */
function setupButtonHandlers() {
  // 获取按钮元素，一次性查询减少DOM交互
  const openFileBtn = document.getElementById('open-file-btn');
  const openDirBtn = document.getElementById('open-dir-btn');
  
  // 如果存在打开文件按钮，添加事件监听
  if (openFileBtn) {
    openFileBtn.addEventListener('click', async () => {
      try {
        const filePaths = await api.openFileDialog();
        if (filePaths && filePaths.length > 0) {
          handleSelectedFiles(filePaths);
        }
      } catch (error) {
        console.error('打开文件错误:', error);
      }
    });
  }
  
  // 如果存在打开目录按钮，添加事件监听
  if (openDirBtn) {
    openDirBtn.addEventListener('click', async () => {
      try {
        const dirPath = await api.openDirectoryDialog();
        if (dirPath) {
          handleSelectedDirectory(dirPath);
        }
      } catch (error) {
        console.error('打开目录错误:', error);
      }
    });
  }
}

/**
 * 设置拖放区域
 */
function setupDragAndDrop() {
  const dropArea = document.querySelector('.drop-area') || document.body;
  
  // 优化：使用事件委托减少事件监听器数量
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // 拖拽效果
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('highlight');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('highlight');
    }, false);
  });
  
  // 处理拖放文件
  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      const filePaths = Array.from(files).map(file => file.path);
      handleSelectedFiles(filePaths);
    }
  }, false);
}

/**
 * 设置文件打开监听
 */
function setupFileOpenListeners() {
  // 移除旧的处理程序，防止内存泄漏
  if (openFilesHandler) {
    openFilesHandler();
  }
  if (openDirectoryHandler) {
    openDirectoryHandler();
  }
  
  // 设置新的处理程序
  openFilesHandler = api.onOpenFiles(handleSelectedFiles);
  openDirectoryHandler = api.onOpenDirectory(handleSelectedDirectory);
}

/**
 * 处理选择的文件
 * @param {string[]} filePaths 文件路径数组
 */
function handleSelectedFiles(filePaths) {
  console.log('选择的文件:', filePaths);
  
  // 检查文件是否存在
  const existingFiles = filePaths.filter(file => api.fileExists(file));
  
  if (existingFiles.length > 0) {
    // 调用应用程序的文件加载函数
    if (typeof app !== 'undefined' && app.loadImages) {
      // 批量处理，避免多次DOM刷新
      app.loadImages(existingFiles);
    } else {
      console.warn('应用程序接口未找到，无法加载图片');
    }
  }
}

/**
 * 处理选择的目录
 * @param {string} dirPath 目录路径
 */
function handleSelectedDirectory(dirPath) {
  console.log('选择的目录:', dirPath);
  
  if (dirPath && api.fileExists(dirPath)) {
    // 调用应用程序的目录加载函数
    if (typeof app !== 'undefined' && app.loadDirectory) {
      app.loadDirectory(dirPath);
    } else {
      console.warn('应用程序接口未找到，无法加载目录');
    }
  }
}

/**
 * 设置版本信息
 */
function setupVersionInfo() {
  try {
    const systemInfo = api.getSystemInfo();
    const versionInfo = document.getElementById('version-info');
    
    if (versionInfo) {
      versionInfo.textContent = `Electron v${systemInfo.versions.electron} | Node v${systemInfo.versions.node}`;
    }
  } catch (error) {
    console.error('获取版本信息失败:', error);
  }
}

// 导出API以便应用程序使用
window.electronRenderer = {
  saveFile: async function(fileData, fileName, fileExtension, options = {}) {
    try {
      // 构建保存对话框选项
      const saveOptions = {
        title: options.title || '保存文件',
        defaultPath: fileName,
        filters: [
          { name: options.filterName || '图片文件', extensions: [fileExtension] },
          { name: '所有文件', extensions: ['*'] }
        ]
      };
      
      // 获取保存路径
      const savePath = await api.saveFileDialog(saveOptions);
      
      if (savePath) {
        // 保存文件并返回结果
        await api.writeFile(savePath, fileData);
        return { success: true, path: savePath };
      }
      
      return { success: false, error: '用户取消保存' };
    } catch (error) {
      console.error('保存文件错误:', error);
      return { success: false, error: error.message };
    }
  },
  
  getSystemPath: () => {
    return api.getAppPath();
  }
}; 