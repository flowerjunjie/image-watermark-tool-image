/**
 * 水印选项组件
 * 处理水印设置和选项控制
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { getWatermarkOptions, updateWatermarkOptions } from '../core/state.js';
import { saveWatermarkOptions, loadWatermarkOptions } from '../services/storage-service.js';
import { addHistory } from '../services/undo-redo-service.js';

// 创建事件发射器
const optionsEvents = new EventEmitter();

// 选项组件状态
const componentState = {
  isInitialized: false,
  isUpdating: false,
  watermarkImageFile: null
};

/**
 * 初始化水印选项组件
 * @param {Object} options 配置选项
 */
export function initWatermarkOptions(options = {}) {
  // 默认选项
  const defaultOptions = {
    watermarkTypeId: 'watermark-type',
    watermarkTextId: 'watermark-text',
    fontSizeId: 'font-size',
    fontSizeValueId: 'font-size-value',
    fontSizeInputId: 'font-size-input',
    opacityId: 'opacity',
    opacityValueId: 'opacity-value',
    opacityInputId: 'opacity-input',
    rotationId: 'rotation',
    rotationValueId: 'rotation-value',
    rotationInputId: 'rotation-input',
    colorId: 'color',
    imageQualityId: 'image-quality',
    imageQualityValueId: 'image-quality-value',
    watermarkImageAreaId: 'watermark-image-area',
    watermarkImageInputId: 'watermark-image-input',
    watermarkImagePreviewId: 'watermark-image-preview',
    watermarkImageThumbnailId: 'watermark-image-thumbnail',
    removeWatermarkImageId: 'remove-watermark-image',
    watermarkImageSizeId: 'watermark-image-size',
    watermarkImageSizeValueId: 'watermark-image-size-value',
    positionRadioName: 'position',
    marginXSliderId: 'margin-x-slider',
    marginXValueId: 'margin-x-value',
    marginYSliderId: 'margin-y-slider',
    marginYValueId: 'margin-y-value',
    tileSpacingSliderId: 'tile-spacing-slider',
    tileSpacingValueId: 'tile-spacing-value',
    scaleModeName: 'scale-mode',
    scaleRatioSliderId: 'scale-ratio-slider',
    scaleRatioValueId: 'scale-ratio-value',
    textOptionsId: 'text-options',
    imageOptionsId: 'image-options',
    tiledOptionsId: 'tiled-options',
    marginControlsId: 'margin-controls',
    tileControlsId: 'tile-controls',
    relativeScaleControlsId: 'relative-scale-controls'
  };
  
  // 合并选项
  const config = { ...defaultOptions, ...options };
  
  // 获取DOM元素
  const watermarkType = document.getElementById(config.watermarkTypeId);
  const watermarkText = document.getElementById(config.watermarkTextId);
  const fontSize = document.getElementById(config.fontSizeId);
  const fontSizeValue = document.getElementById(config.fontSizeValueId);
  const fontSizeInput = document.getElementById(config.fontSizeInputId);
  const opacity = document.getElementById(config.opacityId);
  const opacityValue = document.getElementById(config.opacityValueId);
  const opacityInput = document.getElementById(config.opacityInputId);
  const rotation = document.getElementById(config.rotationId);
  const rotationValue = document.getElementById(config.rotationValueId);
  const rotationInput = document.getElementById(config.rotationInputId);
  const color = document.getElementById(config.colorId);
  const imageQuality = document.getElementById(config.imageQualityId);
  const imageQualityValue = document.getElementById(config.imageQualityValueId);
  
  // 检查必要元素是否存在
  if (!watermarkType || !watermarkText || !fontSize || !opacity || !rotation || !color) {
    console.error('水印选项组件初始化失败：找不到必要的DOM元素');
    return;
  }
  
  // 加载保存的选项
  loadSavedOptions();
  
  // 设置事件监听器
  setupEventListeners(config);
  
  // 设置水印图片上传
  setupWatermarkImageUpload(config);
  
  // 设置位置控制
  setupPositionControls(config);
  
  // 设置缩放控制
  setupScaleControls(config);
  
  // 标记为已初始化
  componentState.isInitialized = true;
  
  console.log('水印选项组件初始化完成');
}

/**
 * 加载保存的选项
 */
function loadSavedOptions() {
  // 从本地存储加载选项
  const savedOptions = loadWatermarkOptions();
  
  if (savedOptions) {
    // 更新应用状态
    updateWatermarkOptions(savedOptions);
  }
  
  // 更新UI
  updateUI();
}

/**
 * 设置事件监听器
 * @param {Object} config 配置选项
 */
function setupEventListeners(config) {
  // 水印类型变化
  const watermarkType = document.getElementById(config.watermarkTypeId);
  if (watermarkType) {
    watermarkType.addEventListener('change', () => {
      const type = watermarkType.value;
      updateOption('type', type);
      toggleOptionSections(type, config);
    });
  }
  
  // 水印文本变化
  const watermarkText = document.getElementById(config.watermarkTextId);
  if (watermarkText) {
    watermarkText.addEventListener('input', () => {
      updateOption('text', watermarkText.value);
    });
  }
  
  // 字体大小变化
  setupRangeInput(
    config.fontSizeId,
    config.fontSizeValueId,
    config.fontSizeInputId,
    'size',
    (value) => `${value}`,
    (value) => parseInt(value, 10)
  );
  
  // 透明度变化
  setupRangeInput(
    config.opacityId,
    config.opacityValueId,
    config.opacityInputId,
    'opacity',
    (value) => `${value}%`,
    (value) => parseInt(value, 10) / 100
  );
  
  // 旋转角度变化
  setupRangeInput(
    config.rotationId,
    config.rotationValueId,
    config.rotationInputId,
    'rotation',
    (value) => `${value}°`,
    (value) => parseInt(value, 10)
  );
  
  // 颜色变化
  const color = document.getElementById(config.colorId);
  if (color) {
    color.addEventListener('input', () => {
      updateOption('color', color.value);
    });
  }
  
  // 图片质量变化
  const imageQuality = document.getElementById(config.imageQualityId);
  const imageQualityValue = document.getElementById(config.imageQualityValueId);
  if (imageQuality && imageQualityValue) {
    imageQuality.addEventListener('input', () => {
      const quality = parseInt(imageQuality.value, 10);
      imageQualityValue.textContent = `${quality}%`;
      updateOption('imageQuality', quality / 100);
    });
  }
}

/**
 * 设置范围输入控件
 * @param {string} sliderId 滑块ID
 * @param {string} valueId 值显示ID
 * @param {string} inputId 输入框ID
 * @param {string} optionName 选项名称
 * @param {Function} formatValue 格式化值的函数
 * @param {Function} parseValue 解析值的函数
 */
function setupRangeInput(sliderId, valueId, inputId, optionName, formatValue, parseValue) {
  const slider = document.getElementById(sliderId);
  const valueDisplay = document.getElementById(valueId);
  const input = document.getElementById(inputId);
  
  if (slider && valueDisplay) {
    // 滑块变化
    slider.addEventListener('input', () => {
      const value = slider.value;
      valueDisplay.textContent = formatValue(value);
      
      if (input) {
        input.value = value;
      }
      
      updateOption(optionName, parseValue(value));
    });
    
    // 输入框变化
    if (input) {
      input.addEventListener('input', () => {
        const value = input.value;
        const min = parseInt(slider.min, 10);
        const max = parseInt(slider.max, 10);
        
        // 限制范围
        const constrainedValue = Math.max(min, Math.min(max, parseInt(value, 10) || 0));
        
        // 更新滑块和显示
        slider.value = constrainedValue;
        valueDisplay.textContent = formatValue(constrainedValue);
        
        updateOption(optionName, parseValue(constrainedValue));
      });
      
      // 增减按钮
      const decreaseBtn = document.getElementById(`${optionName}-decrease`);
      const increaseBtn = document.getElementById(`${optionName}-increase`);
      
      if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
          const value = parseInt(input.value, 10) - 1;
          const min = parseInt(slider.min, 10);
          if (value >= min) {
            input.value = value;
            slider.value = value;
            valueDisplay.textContent = formatValue(value);
            updateOption(optionName, parseValue(value));
          }
        });
      }
      
      if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
          const value = parseInt(input.value, 10) + 1;
          const max = parseInt(slider.max, 10);
          if (value <= max) {
            input.value = value;
            slider.value = value;
            valueDisplay.textContent = formatValue(value);
            updateOption(optionName, parseValue(value));
          }
        });
      }
    }
  }
}

/**
 * 设置水印图片上传
 * @param {Object} config 配置选项
 */
function setupWatermarkImageUpload(config) {
  const watermarkImageArea = document.getElementById(config.watermarkImageAreaId);
  const watermarkImageInput = document.getElementById(config.watermarkImageInputId);
  const watermarkImagePreview = document.getElementById(config.watermarkImagePreviewId);
  const watermarkImageThumbnail = document.getElementById(config.watermarkImageThumbnailId);
  const removeWatermarkImage = document.getElementById(config.removeWatermarkImageId);
  const watermarkImageSize = document.getElementById(config.watermarkImageSizeId);
  const watermarkImageSizeValue = document.getElementById(config.watermarkImageSizeValueId);
  
  if (!watermarkImageArea || !watermarkImageInput || !watermarkImagePreview || !watermarkImageThumbnail) {
    return;
  }
  
  // 点击上传区域触发文件选择
  watermarkImageArea.addEventListener('click', () => {
    watermarkImageInput.click();
  });
  
  // 处理拖放
  watermarkImageArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    watermarkImageArea.classList.add('highlight');
  });
  
  watermarkImageArea.addEventListener('dragleave', () => {
    watermarkImageArea.classList.remove('highlight');
  });
  
  watermarkImageArea.addEventListener('drop', (event) => {
    event.preventDefault();
    watermarkImageArea.classList.remove('highlight');
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleWatermarkImageUpload(event.dataTransfer.files[0]);
    }
  });
  
  // 文件选择变化
  watermarkImageInput.addEventListener('change', (event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleWatermarkImageUpload(event.target.files[0]);
    }
  });
  
  // 移除水印图片
  if (removeWatermarkImage) {
    removeWatermarkImage.addEventListener('click', () => {
      // 清除水印图片
      componentState.watermarkImageFile = null;
      
      // 隐藏预览
      watermarkImagePreview.style.display = 'none';
      
      // 更新选项
      updateOption('image', null);
    });
  }
  
  // 水印图片大小变化
  if (watermarkImageSize && watermarkImageSizeValue) {
    watermarkImageSize.addEventListener('input', () => {
      const size = parseInt(watermarkImageSize.value, 10);
      watermarkImageSizeValue.textContent = `${size}%`;
      updateOption('imageScale', size / 100);
    });
  }
  
  // 处理水印图片上传
  function handleWatermarkImageUpload(file) {
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    
    // 保存文件
    componentState.watermarkImageFile = file;
    
    // 读取文件并显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      // 显示预览
      watermarkImageThumbnail.src = e.target.result;
      watermarkImagePreview.style.display = 'block';
      
      // 更新选项
      updateOption('image', e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

/**
 * 设置位置控制
 * @param {Object} config 配置选项
 */
function setupPositionControls(config) {
  // 位置单选按钮
  const positionRadios = document.getElementsByName(config.positionRadioName);
  const marginControls = document.getElementById(config.marginControlsId);
  const tileControls = document.getElementById(config.tileControlsId);
  
  // 边距滑块
  const marginXSlider = document.getElementById(config.marginXSliderId);
  const marginXValue = document.getElementById(config.marginXValueId);
  const marginYSlider = document.getElementById(config.marginYSliderId);
  const marginYValue = document.getElementById(config.marginYValueId);
  
  // 平铺间距滑块
  const tileSpacingSlider = document.getElementById(config.tileSpacingSliderId);
  const tileSpacingValue = document.getElementById(config.tileSpacingValueId);
  
  // 设置位置单选按钮事件
  positionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        const position = radio.value;
        updateOption('position', position);
        
        // 显示/隐藏相关控件
        if (marginControls) {
          marginControls.style.display = position === 'tile' ? 'none' : 'block';
        }
        
        if (tileControls) {
          tileControls.style.display = position === 'tile' ? 'block' : 'none';
        }
      }
    });
  });
  
  // 设置边距滑块
  if (marginXSlider && marginXValue) {
    marginXSlider.addEventListener('input', () => {
      const value = parseInt(marginXSlider.value, 10);
      marginXValue.value = value;
      updateOption('marginX', value);
    });
    
    if (marginXValue) {
      marginXValue.addEventListener('input', () => {
        const value = parseInt(marginXValue.value, 10) || 0;
        marginXSlider.value = value;
        updateOption('marginX', value);
      });
    }
  }
  
  if (marginYSlider && marginYValue) {
    marginYSlider.addEventListener('input', () => {
      const value = parseInt(marginYSlider.value, 10);
      marginYValue.value = value;
      updateOption('marginY', value);
    });
    
    if (marginYValue) {
      marginYValue.addEventListener('input', () => {
        const value = parseInt(marginYValue.value, 10) || 0;
        marginYSlider.value = value;
        updateOption('marginY', value);
      });
    }
  }
  
  // 设置平铺间距滑块
  if (tileSpacingSlider && tileSpacingValue) {
    tileSpacingSlider.addEventListener('input', () => {
      const value = parseInt(tileSpacingSlider.value, 10);
      tileSpacingValue.value = value;
      updateOption('spacing', value);
    });
    
    if (tileSpacingValue) {
      tileSpacingValue.addEventListener('input', () => {
        const value = parseInt(tileSpacingValue.value, 10) || 0;
        tileSpacingSlider.value = value;
        updateOption('spacing', value);
      });
    }
  }
}

/**
 * 设置缩放控制
 * @param {Object} config 配置选项
 */
function setupScaleControls(config) {
  // 缩放模式单选按钮
  const scaleModeRadios = document.getElementsByName(config.scaleModeName);
  const relativeScaleControls = document.getElementById(config.relativeScaleControlsId);
  
  // 缩放比例滑块
  const scaleRatioSlider = document.getElementById(config.scaleRatioSliderId);
  const scaleRatioValue = document.getElementById(config.scaleRatioValueId);
  
  // 设置缩放模式单选按钮事件
  scaleModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        const mode = radio.value;
        updateOption('scaleMode', mode);
        
        // 显示/隐藏相关控件
        if (relativeScaleControls) {
          relativeScaleControls.style.display = mode === 'relative' ? 'block' : 'none';
        }
      }
    });
  });
  
  // 设置缩放比例滑块
  if (scaleRatioSlider && scaleRatioValue) {
    scaleRatioSlider.addEventListener('input', () => {
      const value = parseInt(scaleRatioSlider.value, 10);
      scaleRatioValue.value = value;
      updateOption('scaleRatio', value / 100);
    });
    
    if (scaleRatioValue) {
      scaleRatioValue.addEventListener('input', () => {
        const value = parseInt(scaleRatioValue.value, 10) || 0;
        scaleRatioSlider.value = value;
        updateOption('scaleRatio', value / 100);
      });
    }
  }
}

/**
 * 切换选项区域显示
 * @param {string} type 水印类型
 * @param {Object} config 配置选项
 */
function toggleOptionSections(type, config) {
  const textOptions = document.getElementById(config.textOptionsId);
  const imageOptions = document.getElementById(config.imageOptionsId);
  const tiledOptions = document.getElementById(config.tiledOptionsId);
  
  if (textOptions) {
    textOptions.style.display = type === 'text' ? 'block' : 'none';
  }
  
  if (imageOptions) {
    imageOptions.style.display = type === 'image' ? 'block' : 'none';
  }
  
  if (tiledOptions) {
    tiledOptions.style.display = type === 'tiled' ? 'block' : 'none';
  }
}

/**
 * 更新选项
 * @param {string} name 选项名称
 * @param {*} value 选项值
 */
function updateOption(name, value) {
  // 防止初始化时触发更新
  if (!componentState.isInitialized) return;
  
  // 防止重复更新
  if (componentState.isUpdating) return;
  
  // 标记正在更新
  componentState.isUpdating = true;
  
  try {
    // 获取当前选项
    const currentOptions = getWatermarkOptions();
    
    // 创建更新选项
    const updatedOptions = {
      ...currentOptions,
      [name]: value
    };
    
    // 更新应用状态
    updateWatermarkOptions(updatedOptions);
    
    // 保存到本地存储
    saveWatermarkOptions(updatedOptions);
    
    // 添加到历史记录
    addHistory(
      { type: 'watermarkOptions', name },
      { watermarkOptions: updatedOptions }
    );
    
    // 触发选项变化事件
    optionsEvents.emit('optionsChanged', { name, value, options: updatedOptions });
  } finally {
    // 重置更新标记
    componentState.isUpdating = false;
  }
}

/**
 * 更新UI
 */
export function updateUI() {
  // 获取当前选项
  const options = getWatermarkOptions();
  
  // 水印类型
  const watermarkType = document.getElementById('watermark-type');
  if (watermarkType) {
    watermarkType.value = options.type;
    toggleOptionSections(options.type, {
      textOptionsId: 'text-options',
      imageOptionsId: 'image-options',
      tiledOptionsId: 'tiled-options'
    });
  }
  
  // 水印文本
  const watermarkText = document.getElementById('watermark-text');
  if (watermarkText) {
    watermarkText.value = options.text || '';
  }
  
  // 字体大小
  updateRangeInput('font-size', 'font-size-value', 'font-size-input', options.size * 10);
  
  // 透明度
  updateRangeInput('opacity', 'opacity-value', 'opacity-input', options.opacity * 100, '%');
  
  // 旋转角度
  updateRangeInput('rotation', 'rotation-value', 'rotation-input', options.rotation, '°');
  
  // 颜色
  const color = document.getElementById('color');
  if (color) {
    color.value = options.color;
  }
  
  // 图片质量
  updateRangeInput('image-quality', 'image-quality-value', null, options.imageQuality * 100, '%');
  
  // 位置
  const positionRadios = document.getElementsByName('position');
  positionRadios.forEach(radio => {
    radio.checked = radio.value === options.position;
  });
  
  // 边距
  updateRangeInput('margin-x-slider', null, 'margin-x-value', options.marginX);
  updateRangeInput('margin-y-slider', null, 'margin-y-value', options.marginY);
  
  // 平铺间距
  updateRangeInput('tile-spacing-slider', null, 'tile-spacing-value', options.spacing);
  
  // 缩放模式
  const scaleModeRadios = document.getElementsByName('scale-mode');
  scaleModeRadios.forEach(radio => {
    radio.checked = radio.value === options.scaleMode;
  });
  
  // 缩放比例
  updateRangeInput('scale-ratio-slider', null, 'scale-ratio-value', options.scaleRatio * 100);
  
  // 显示/隐藏相关控件
  const marginControls = document.getElementById('margin-controls');
  const tileControls = document.getElementById('tile-controls');
  const relativeScaleControls = document.getElementById('relative-scale-controls');
  
  if (marginControls) {
    marginControls.style.display = options.position === 'tile' ? 'none' : 'block';
  }
  
  if (tileControls) {
    tileControls.style.display = options.position === 'tile' ? 'block' : 'none';
  }
  
  if (relativeScaleControls) {
    relativeScaleControls.style.display = options.scaleMode === 'relative' ? 'block' : 'none';
  }
}

/**
 * 更新范围输入控件
 * @param {string} sliderId 滑块ID
 * @param {string} valueId 值显示ID
 * @param {string} inputId 输入框ID
 * @param {number} value 值
 * @param {string} suffix 后缀
 */
function updateRangeInput(sliderId, valueId, inputId, value, suffix = '') {
  const slider = document.getElementById(sliderId);
  if (slider) {
    slider.value = value;
  }
  
  const valueDisplay = document.getElementById(valueId);
  if (valueDisplay) {
    valueDisplay.textContent = `${value}${suffix}`;
  }
  
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
  }
}

/**
 * 订阅选项变化事件
 * @param {Function} callback 回调函数
 * @returns {Function} 取消订阅的函数
 */
export function onOptionsChanged(callback) {
  return optionsEvents.on('optionsChanged', callback);
}

/**
 * 获取水印图片文件
 * @returns {File|null} 水印图片文件
 */
export function getWatermarkImageFile() {
  return componentState.watermarkImageFile;
}

