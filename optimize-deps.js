/**
 * 依赖项优化脚本 - 移除不必要的文件以减小最终构建大小
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 需要保留的核心依赖
const ESSENTIAL_DEPS = [
  'canvas',
  'file-saver',
  'image-q',
  'jszip',
  'omggif',
  'pixelmatch',
  'electron',
  'electron-builder',
  'gifwrap'
];

// 要移除的文件/文件夹模式
const REMOVE_PATTERNS = [
  // 文档和示例
  'README.md', 'readme.md', 'README', 'CHANGELOG.md', 'HISTORY.md', 'LICENSE', 
  'LICENSE.md', 'LICENSE.txt', 'license', 'docs', 'doc', 'examples', 'example', 'demo',
  // 测试和开发文件
  'test', 'tests', '__tests__', 'testing', 'powered-test', 'mocha.opts', '.nyc_output',
  'coverage', 'coveralls', '.coveralls.yml', 'fixtures', 'tap-snapshots',
  // 源代码和构建文件
  'src', '.bin', 'flow-typed', 'flow', '.flowconfig',
  // 配置、元数据和VCS相关文件
  '.npmignore', '.gitignore', '.gitattributes', '.editorconfig',
  '.eslintignore', '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs',
  '.prettierrc', '.prettierignore', 'tsconfig.json', 'tslint.json',
  'package-lock.json', 'yarn.lock', 'bower.json', '.npmrc', 'AUTHORS',
  // 其他类型文件
  'benchmark', 'benchmarks', '*.d.ts', '*.map', '*.min.map',
  '*.ts', '*.coffee', '.babelrc', 'babel.config.js', 'rollup.config.js',
  'webpack.config.js', 'karma.conf.js', 'Gruntfile.js', 'Gulpfile.js'
];

// 要保留的特定路径
const KEEP_PATHS = [
  'node_modules/canvas',  // Canvas是关键依赖，需要完整保留
  'node_modules/jszip/dist',  // 只保留构建后的文件
  'node_modules/file-saver/dist', // 只保留dist目录
  'node_modules/electron',  // 保留electron
  'node_modules/electron-builder' // 保留electron-builder
];

/**
 * 检查路径是否需要保留
 */
function shouldKeepPath(pathToCheck) {
  return KEEP_PATHS.some(keepPath => pathToCheck.includes(keepPath)) ||
         ESSENTIAL_DEPS.some(dep => pathToCheck === path.join(__dirname, 'node_modules', dep));
}

/**
 * 递归删除特定模式的文件
 */
function cleanNodeModules(dir) {
  if (!fs.existsSync(dir)) return;

  try {
    const items = fs.readdirSync(dir);
    let removedBytes = 0;

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      // 检查是否是要保留的路径
      if (shouldKeepPath(fullPath)) {
        console.log(`保留关键依赖: ${fullPath}`);
        continue;
      }

      if (stat.isDirectory()) {
        // 检查是否是包含模式的目录
        if (REMOVE_PATTERNS.includes(item)) {
          const bytes = getDirSize(fullPath);
          removedBytes += bytes;
          removeDirRecursive(fullPath);
          console.log(`删除目录: ${fullPath} (${formatSize(bytes)})`);
        } else {
          // 继续递归
          removedBytes += cleanNodeModules(fullPath);
        }
      } else {
        // 检查是否是要移除的文件模式
        if (REMOVE_PATTERNS.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(item);
          }
          return pattern === item;
        })) {
          removedBytes += stat.size;
          fs.unlinkSync(fullPath);
          console.log(`删除文件: ${fullPath} (${formatSize(stat.size)})`);
        }
      }
    }

    return removedBytes;
  } catch (error) {
    console.error(`处理 ${dir} 时出错:`, error);
    return 0;
  }
}

/**
 * 计算目录大小
 */
function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;

  let totalSize = 0;
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isFile()) {
      totalSize += stat.size;
    } else if (stat.isDirectory()) {
      totalSize += getDirSize(itemPath);
    }
  }

  return totalSize;
}

/**
 * 递归删除目录及其内容
 */
function removeDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isFile()) {
      fs.unlinkSync(itemPath);
    } else if (stat.isDirectory()) {
      removeDirRecursive(itemPath);
    }
  }
  
  fs.rmdirSync(dirPath);
}

/**
 * 格式化字节大小为人类可读形式
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * 主函数：优化依赖项并清理不必要的文件
 */
function optimizeDependencies() {
  console.log('开始优化依赖...');
  const startTime = Date.now();
  
  // 只清理非核心依赖的文档和测试文件，保留开发依赖
  console.log('清理不必要的依赖文件...');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  const bytesRemoved = cleanNodeModules(nodeModulesPath) || 0;
  
  // 显示结果
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\n优化完成! 用时: ${duration} 秒`);
  console.log(`清理了约 ${formatSize(bytesRemoved)} 的空间`);
  console.log('现在可以执行 npm run pack-small 来创建更小的安装包');
}

// 执行优化
optimizeDependencies(); 