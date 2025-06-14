/**
 * 输入处理模块
 * 处理表单输入控件的事件和数据更新
 */

import { watermarkState, updateState, undo, redo, saveFirstImageSettings, saveCurrentImageSettings } from '../core/state.js';
import { updateWatermark, WatermarkPosition, WatermarkScaleMode } from '../core/watermark.js';

/**
 * 检查并更新当前图片的设置
 * 同时如果当前显示的是第一张图片，则更新保存的第一张图片设置
 */
function updateFirstImageSettingsIfNeeded() {
  // 先保存当前图片的设置
  saveCurrentImageSettings();
  
  // 检查是否有多张图片且当前显示的是第一张
  if (watermarkState.files && 
      watermarkState.files.length > 1 && 
      watermarkState.currentIndex === 0) {
    // 更新第一张图片的设置
    saveFirstImageSettings();
    console.log('已更新第一张图片的水印设置');
  }
}

/**
 * 初始化输入处理器
 */
export function initInputHandlers() {
  console.log('初始化输入处理器');
  
  // 水印文字输入处理
  const watermarkTextInput = document.getElementById('watermark-text');
  if (watermarkTextInput) {
    watermarkTextInput.addEventListener('input', function() {
      // 更新状态
      updateState({
        text: this.value || '仅供验证使用'
      });
      
      // 更新水印
      updateWatermark();
      
      // 如果是第一张图片，更新保存的设置
      updateFirstImageSettingsIfNeeded();
    });
  }
  
  // 平铺间距处理
  const tileSpacingInput = document.getElementById('tile-spacing');
  const tileSpacingValue = document.getElementById('tile-spacing-value');
  
  if (tileSpacingInput && tileSpacingValue) {
    tileSpacingInput.addEventListener('input', function() {
      const value = parseInt(this.value);
      
      // 更新状态
      updateState({
        tileSpacing: value
      });
      
      // 更新显示值
      tileSpacingValue.textContent = `${value}px`;
      
      // 更新水印
      updateWatermark();
      
      // 如果是第一张图片，更新保存的设置
      updateFirstImageSettingsIfNeeded();
    });
  }
  
  // 字体大小处理
  const fontSizeInput = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const fontSizeNumberInput = document.getElementById('font-size-input');
  const fontSizeDecrease = document.getElementById('font-size-decrease');
  const fontSizeIncrease = document.getElementById('font-size-increase');
  
  if (fontSizeInput && fontSizeValue) {
    // 使用状态中的值初始化界面元素，而不是从界面元素获取值
    const stateValue = watermarkState.fontSize || 36;
    fontSizeInput.value = stateValue;
    fontSizeValue.textContent = stateValue;
    if (fontSizeNumberInput) fontSizeNumberInput.value = stateValue;
    
    // 滑动条事件
    fontSizeInput.addEventListener('input', handleFontSizeInput);
    
    // 如果存在数字输入框
    if (fontSizeNumberInput) {
      fontSizeNumberInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const min = parseInt(fontSizeInput.min);
        const max = parseInt(fontSizeInput.max);
        
        // 确保值在有效范围内
        const validValue = Math.max(min, Math.min(max, value));
        this.value = validValue;
        
        // 更新滑动条
        fontSizeInput.value = validValue;
        
        // 更新状态并更新水印
        updateState({
          fontSize: validValue
        });
        
        // 更新显示值
        fontSizeValue.textContent = validValue;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加减小按钮事件
    if (fontSizeDecrease) {
      fontSizeDecrease.addEventListener('click', function() {
        const currentValue = parseInt(fontSizeInput.value);
        const min = parseInt(fontSizeInput.min);
        const newValue = Math.max(min, currentValue - 1);
        
        // 更新滑动条和输入框
        fontSizeInput.value = newValue;
        if (fontSizeNumberInput) fontSizeNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          fontSize: newValue
        });
        
        // 更新显示值
        fontSizeValue.textContent = newValue;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加增大按钮事件
    if (fontSizeIncrease) {
      fontSizeIncrease.addEventListener('click', function() {
        const currentValue = parseInt(fontSizeInput.value);
        const max = parseInt(fontSizeInput.max);
        const newValue = Math.min(max, currentValue + 1);
        
        // 更新滑动条和输入框
        fontSizeInput.value = newValue;
        if (fontSizeNumberInput) fontSizeNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          fontSize: newValue
        });
        
        // 更新显示值
        fontSizeValue.textContent = newValue;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
  }
  
  // 字体大小输入处理函数
  function handleFontSizeInput() {
    const value = parseInt(this.value);
    
    // 更新状态
    updateState({
      fontSize: value
    });
    
    // 更新显示值
    if (fontSizeValue) {
      fontSizeValue.textContent = value;
    }
    
    // 更新输入框值
    if (fontSizeNumberInput) {
      fontSizeNumberInput.value = value;
    }
    
    // 更新水印
    updateWatermark();
    
    // 如果是第一张图片，更新保存的设置
    updateFirstImageSettingsIfNeeded();
  }
  
  // 透明度处理
  const opacityInput = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacity-value');
  const opacityNumberInput = document.getElementById('opacity-input');
  const opacityDecrease = document.getElementById('opacity-decrease');
  const opacityIncrease = document.getElementById('opacity-increase');
  
  if (opacityInput && opacityValue) {
    // 使用状态中的值初始化界面元素
    const stateValue = watermarkState.opacity || 50;
    opacityInput.value = stateValue;
    opacityValue.textContent = `${stateValue}%`;
    if (opacityNumberInput) opacityNumberInput.value = stateValue;
    
    // 滑动条事件
    opacityInput.addEventListener('input', handleOpacityInput);
    
    // 如果存在数字输入框
    if (opacityNumberInput) {
      opacityNumberInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const min = parseInt(opacityInput.min);
        const max = parseInt(opacityInput.max);
        
        // 确保值在有效范围内
        const validValue = Math.max(min, Math.min(max, value));
        this.value = validValue;
        
        // 更新滑动条
        opacityInput.value = validValue;
        
        // 更新状态
        updateState({
          opacity: validValue
        });
        
        // 更新显示值
        opacityValue.textContent = `${validValue}%`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加减小按钮事件
    if (opacityDecrease) {
      opacityDecrease.addEventListener('click', function() {
        const currentValue = parseInt(opacityInput.value);
        const min = parseInt(opacityInput.min);
        const newValue = Math.max(min, currentValue - 1);
        
        // 更新滑动条和输入框
        opacityInput.value = newValue;
        if (opacityNumberInput) opacityNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          opacity: newValue
        });
        
        // 更新显示值
        opacityValue.textContent = `${newValue}%`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加增大按钮事件
    if (opacityIncrease) {
      opacityIncrease.addEventListener('click', function() {
        const currentValue = parseInt(opacityInput.value);
        const max = parseInt(opacityInput.max);
        const newValue = Math.min(max, currentValue + 1);
        
        // 更新滑动条和输入框
        opacityInput.value = newValue;
        if (opacityNumberInput) opacityNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          opacity: newValue
        });
        
        // 更新显示值
        opacityValue.textContent = `${newValue}%`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
  }
  
  // 透明度输入处理函数
  function handleOpacityInput() {
    const value = parseInt(this.value);
    
    // 更新状态
    updateState({
      opacity: value
    });
    
    // 更新显示值
    if (opacityValue) {
      opacityValue.textContent = `${value}%`;
    }
    
    // 更新输入框值
    if (opacityNumberInput) {
      opacityNumberInput.value = value;
    }
    
    // 更新水印
    updateWatermark();
    
    // 如果是第一张图片，更新保存的设置
    updateFirstImageSettingsIfNeeded();
  }
  
  // 旋转角度处理
  const rotationInput = document.getElementById('rotation');
  const rotationValue = document.getElementById('rotation-value');
  const rotationNumberInput = document.getElementById('rotation-input');
  const rotationDecrease = document.getElementById('rotation-decrease');
  const rotationIncrease = document.getElementById('rotation-increase');
  
  if (rotationInput && rotationValue) {
    // 使用状态中的值初始化界面元素
    const stateValue = watermarkState.rotation || 0;
    rotationInput.value = stateValue;
    rotationValue.textContent = `${stateValue}°`;
    if (rotationNumberInput) rotationNumberInput.value = stateValue;
    
    // 滑动条事件
    rotationInput.addEventListener('input', handleRotationInput);
    
    // 如果存在数字输入框
    if (rotationNumberInput) {
      rotationNumberInput.addEventListener('change', function() {
        const value = parseInt(this.value);
        const min = parseInt(rotationInput.min);
        const max = parseInt(rotationInput.max);
        
        // 确保值在有效范围内
        const validValue = Math.max(min, Math.min(max, value));
        this.value = validValue;
        
        // 更新滑动条
        rotationInput.value = validValue;
        
        // 更新状态
        updateState({
          rotation: validValue
        });
        
        // 更新显示值
        rotationValue.textContent = `${validValue}°`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加减小按钮事件
    if (rotationDecrease) {
      rotationDecrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationInput.value);
        const min = parseInt(rotationInput.min);
        const newValue = Math.max(min, currentValue - 1);
        
        // 更新滑动条和输入框
        rotationInput.value = newValue;
        if (rotationNumberInput) rotationNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          rotation: newValue
        });
        
        // 更新显示值
        rotationValue.textContent = `${newValue}°`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
    
    // 添加增大按钮事件
    if (rotationIncrease) {
      rotationIncrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationInput.value);
        const max = parseInt(rotationInput.max);
        const newValue = Math.min(max, currentValue + 1);
        
        // 更新滑动条和输入框
        rotationInput.value = newValue;
        if (rotationNumberInput) rotationNumberInput.value = newValue;
        
        // 更新状态
        updateState({
          rotation: newValue
        });
        
        // 更新显示值
        rotationValue.textContent = `${newValue}°`;
        
        // 更新水印
        updateWatermark();
        
        // 如果是第一张图片，更新保存的设置
        updateFirstImageSettingsIfNeeded();
      });
    }
  }
  
  // 旋转角度输入处理函数
  function handleRotationInput() {
    const value = parseInt(this.value);
    
    // 更新状态
    updateState({
      rotation: value
    });
    
    // 更新显示值
    if (rotationValue) {
      rotationValue.textContent = `${value}°`;
    }
    
    // 更新输入框值
    if (rotationNumberInput) {
      rotationNumberInput.value = value;
    }
    
    // 更新水印
    updateWatermark();
    
    // 如果是第一张图片，更新保存的设置
    updateFirstImageSettingsIfNeeded();
  }
  
  // 水印类型选择
  const watermarkTypeSelect = document.getElementById('watermark-type');
  
  if (watermarkTypeSelect) {
    watermarkTypeSelect.addEventListener('change', function() {
      // 更新状态
      updateState({
        type: this.value
      });
      
      // 直接更新UI显示/隐藏相关控制项，而不是调用updateUIFromState
      const type = this.value;
      const textOptions = document.getElementById('text-options');
      const imageOptions = document.getElementById('image-options');
      const tiledOptions = document.getElementById('tiled-options');
      
      // 根据类型显示/隐藏相关选项
      if (textOptions) textOptions.style.display = type === 'text' ? 'block' : 'none';
      if (imageOptions) imageOptions.style.display = type === 'image' ? 'block' : 'none';
      if (tiledOptions) tiledOptions.style.display = type === 'tiled' ? 'block' : 'none';
      
      // 更新水印
      updateWatermark();
      
      // 如果是第一张图片，更新保存的设置
      updateFirstImageSettingsIfNeeded();
    });
  }
  
  // 水印颜色选择
  const colorInput = document.getElementById('watermark-color');
  
  if (colorInput) {
    colorInput.addEventListener('input', function() {
      // 更新状态
      updateState({
        color: this.value
      });
      
      // 更新水印
      updateWatermark();
      
      // 如果是第一张图片，更新保存的设置
      updateFirstImageSettingsIfNeeded();
    });
  }
  
  // 水印图片大小处理
  const watermarkImageSizeInput = document.getElementById('watermark-image-size');
  const watermarkImageSizeValue = document.getElementById('watermark-image-size-value');
  
  if (watermarkImageSizeInput && watermarkImageSizeValue) {
    watermarkImageSizeInput.addEventListener('input', function() {
      const value = parseInt(this.value);
      
      // 更新状态
      updateState({
        watermarkImageSize: value
      });
      
      // 更新显示值
      watermarkImageSizeValue.textContent = `${value}%`;
      
      // 更新水印
      updateWatermark();
      
      // 如果是第一张图片，更新保存的设置
      updateFirstImageSettingsIfNeeded();
    });
  }
  
  // 图片质量处理
  const imageQualityInput = document.getElementById('image-quality');
  const imageQualityValue = document.getElementById('image-quality-value');
  
  if (imageQualityInput && imageQualityValue) {
    // 使用状态中的值初始化界面元素
    const qualityPercent = Math.round((watermarkState.quality || 0.92) * 100);
    imageQualityInput.value = qualityPercent;
    imageQualityValue.textContent = `${qualityPercent}%`;
    
    // 滑动条事件
    imageQualityInput.addEventListener('input', function() {
      const value = parseInt(this.value);
      
      // 更新状态
      updateState({
        quality: value / 100
      });
      
      // 更新显示值
      imageQualityValue.textContent = `${value}%`;
    });
  }
  
  // 输出格式处理
  /* 暂时注释掉输出格式处理
  const imageFormatSelect = document.getElementById('image-format');
  
  if (imageFormatSelect) {
    // 初始化值
    updateState({
      format: imageFormatSelect.value
    });
    
    // 选择事件
    imageFormatSelect.addEventListener('change', function() {
      // 更新状态
      updateState({
        format: this.value
      });
    });
  }
  */
  
  // 设置默认格式为JPEG
  updateState({
    format: 'image/jpeg'
  });
  
  // 撤销/重做按钮处理
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  
  if (undoBtn) {
    undoBtn.addEventListener('click', function() {
      if (undo()) {
        // 更新水印
        updateWatermark();
        
        // 更新UI控件
        updateUIFromState();
      }
    });
  }
  
  if (redoBtn) {
    redoBtn.addEventListener('click', function() {
      if (redo()) {
        // 更新水印
        updateWatermark();
        
        // 更新UI控件
        updateUIFromState();
      }
    });
  }
  
  // 更新撤销/重做按钮状态
  updateUndoRedoButtons();
}

/**
 * 根据当前状态更新UI控件
 */
function updateUIFromState() {
  // 防止递归调用
  if (window._isUpdatingUI) {
    console.log('防止递归调用updateUIFromState');
    return;
  }
  
  // 设置更新标志
  window._isUpdatingUI = true;
  
  try {
    // 更新水印类型
    const watermarkType = document.getElementById('watermark-type');
    if (watermarkType) {
      watermarkType.value = watermarkState.type;
      
      // 触发change事件以更新相关UI
      const event = new Event('change', { bubbles: false });
      watermarkType.dispatchEvent(event);
    }
    
    // 更新水印文字
    const watermarkTextInput = document.getElementById('watermark-text');
    if (watermarkTextInput) {
      watermarkTextInput.value = watermarkState.text;
    }
    
    // 更新字体大小
    const fontSizeInput = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    const fontSizeNumberInput = document.getElementById('font-size-input');
    
    if (fontSizeInput) {
      fontSizeInput.value = watermarkState.fontSize;
      
      if (fontSizeValue) {
        fontSizeValue.textContent = watermarkState.fontSize;
      }
      
      if (fontSizeNumberInput) {
        fontSizeNumberInput.value = watermarkState.fontSize;
      }
    }
    
    // 更新透明度
    const opacityInput = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    const opacityNumberInput = document.getElementById('opacity-input');
    
    if (opacityInput) {
      opacityInput.value = watermarkState.opacity;
      
      if (opacityValue) {
        opacityValue.textContent = `${watermarkState.opacity}%`;
      }
      
      if (opacityNumberInput) {
        opacityNumberInput.value = watermarkState.opacity;
      }
    }
    
    // 更新旋转角度
    const rotationInput = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotation-value');
    const rotationNumberInput = document.getElementById('rotation-input');
    
    if (rotationInput) {
      rotationInput.value = watermarkState.rotation;
      
      if (rotationValue) {
        rotationValue.textContent = `${watermarkState.rotation}°`;
      }
      
      if (rotationNumberInput) {
        rotationNumberInput.value = watermarkState.rotation;
      }
    }
    
    // 更新颜色
    const colorInput = document.getElementById('watermark-color');
    if (colorInput) {
      colorInput.value = watermarkState.color;
    }
    
    // 更新平铺间距
    const tileSpacingInput = document.getElementById('tile-spacing');
    const tileSpacingValue = document.getElementById('tile-spacing-value');
    
    if (tileSpacingInput && watermarkState.type === 'tiled') {
      tileSpacingInput.value = watermarkState.tileSpacing;
      
      if (tileSpacingValue) {
        tileSpacingValue.textContent = `${watermarkState.tileSpacing}px`;
      }
    }
    
    // 更新图片质量
    const imageQualityInput = document.getElementById('image-quality');
    const imageQualityValue = document.getElementById('image-quality-value');
    
    if (imageQualityInput) {
      const qualityPercent = Math.round(watermarkState.quality * 100);
      imageQualityInput.value = qualityPercent;
      
      if (imageQualityValue) {
        imageQualityValue.textContent = `${qualityPercent}%`;
      }
    }
    
    // 更新输出格式
    const imageFormatSelect = document.getElementById('image-format');
    if (imageFormatSelect) {
      imageFormatSelect.value = watermarkState.format;
    }
    
    // 更新撤销/重做按钮状态
    updateUndoRedoButtons();
  } finally {
    // 无论如何都要清除标志
    window._isUpdatingUI = false;
  }
}

/**
 * 更新撤销/重做按钮状态
 */
function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  
  if (undoBtn) {
    undoBtn.disabled = watermarkState.historyIndex <= 0;
  }
  
  if (redoBtn) {
    redoBtn.disabled = watermarkState.historyIndex >= watermarkState.history.length - 1;
  }
}

/**
 * 水印位置和缩放控制事件处理
 */

// 初始化水印位置控制
export function initPositionControls() {
  // 位置选择单选按钮
  const positionRadios = document.querySelectorAll('input[name="position"]');
  positionRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const position = this.value;
      updateState({ position });
      
      // 根据选择的位置类型显示/隐藏相应控制项
      const marginControls = document.getElementById('margin-controls');
      const tileControls = document.getElementById('tile-controls');
      
      if (position === WatermarkPosition.TILE) {
        marginControls.style.display = 'none';
        tileControls.style.display = 'block';
      } else if (position === WatermarkPosition.CUSTOM) {
        marginControls.style.display = 'none';
        tileControls.style.display = 'none';
      } else {
        marginControls.style.display = 'block';
        tileControls.style.display = 'none';
      }
      
      // 更新预览
      updatePreview();
    });
  });
  
  // 水平边距滑块
  const marginXSlider = document.getElementById('margin-x-slider');
  const marginXValue = document.getElementById('margin-x-value');
  
  if (marginXSlider && marginXValue) {
    // 同步滑块和数值输入框
    marginXSlider.addEventListener('input', function() {
      marginXValue.value = this.value;
      updateState({ marginX: parseInt(this.value) });
      updatePreview();
    });
    
    marginXValue.addEventListener('change', function() {
      marginXSlider.value = this.value;
      updateState({ marginX: parseInt(this.value) });
      updatePreview();
    });
  }
  
  // 垂直边距滑块
  const marginYSlider = document.getElementById('margin-y-slider');
  const marginYValue = document.getElementById('margin-y-value');
  
  if (marginYSlider && marginYValue) {
    // 同步滑块和数值输入框
    marginYSlider.addEventListener('input', function() {
      marginYValue.value = this.value;
      updateState({ marginY: parseInt(this.value) });
      updatePreview();
    });
    
    marginYValue.addEventListener('change', function() {
      marginYSlider.value = this.value;
      updateState({ marginY: parseInt(this.value) });
      updatePreview();
    });
  }
  
  // 平铺间距滑块
  const tileSpacingSlider = document.getElementById('tile-spacing-slider');
  const tileSpacingValue = document.getElementById('tile-spacing-value');
  
  if (tileSpacingSlider && tileSpacingValue) {
    // 同步滑块和数值输入框
    tileSpacingSlider.addEventListener('input', function() {
      tileSpacingValue.value = this.value;
      updateState({ tileSpacing: parseInt(this.value) });
      updatePreview();
    });
    
    tileSpacingValue.addEventListener('change', function() {
      tileSpacingSlider.value = this.value;
      updateState({ tileSpacing: parseInt(this.value) });
      updatePreview();
    });
  }
}

// 初始化水印缩放控制
export function initScaleControls() {
  // 缩放模式单选按钮
  const scaleModeRadios = document.querySelectorAll('input[name="scale-mode"]');
  scaleModeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const scaleMode = this.value;
      updateState({ scaleMode });
      
      // 根据选择的缩放模式显示/隐藏相应控制项
      const relativeScaleControls = document.getElementById('relative-scale-controls');
      
      if (scaleMode === WatermarkScaleMode.RELATIVE) {
        relativeScaleControls.style.display = 'block';
      } else {
        relativeScaleControls.style.display = 'none';
      }
      
      // 更新预览
      updatePreview();
    });
  });
  
  // 缩放比例滑块
  const scaleRatioSlider = document.getElementById('scale-ratio-slider');
  const scaleRatioValue = document.getElementById('scale-ratio-value');
  
  if (scaleRatioSlider && scaleRatioValue) {
    // 同步滑块和数值输入框
    scaleRatioSlider.addEventListener('input', function() {
      scaleRatioValue.value = this.value;
      updateState({ scaleRatio: parseInt(this.value) / 100 });
      updatePreview();
    });
    
    scaleRatioValue.addEventListener('change', function() {
      scaleRatioSlider.value = this.value;
      updateState({ scaleRatio: parseInt(this.value) / 100 });
      updatePreview();
    });
  }
}

// 更新预览
function updatePreview() {
  // 触发预览更新事件
  const event = new CustomEvent('update-preview');
  window.dispatchEvent(event);
}

// 初始化工具提示
export function initTooltips() {
  const tooltips = document.querySelectorAll('.tooltip-icon');
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', function() {
      const title = this.getAttribute('title');
      if (!title) return;
      
      // 创建工具提示元素
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip';
      tooltipEl.textContent = title;
      
      // 清除title属性，避免浏览器默认提示
      this.setAttribute('data-title', title);
      this.removeAttribute('title');
      
      // 添加到页面
      document.body.appendChild(tooltipEl);
      
      // 定位工具提示
      const rect = this.getBoundingClientRect();
      tooltipEl.style.left = `${rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2}px`;
      tooltipEl.style.top = `${rect.top - tooltipEl.offsetHeight - 5}px`;
      
      // 保存引用
      this._tooltip = tooltipEl;
    });
    
    tooltip.addEventListener('mouseleave', function() {
      if (this._tooltip) {
        document.body.removeChild(this._tooltip);
        this._tooltip = null;
        
        // 恢复title属性
        const title = this.getAttribute('data-title');
        if (title) {
          this.setAttribute('title', title);
          this.removeAttribute('data-title');
        }
      }
    });
  });
}

// 导出初始化函数
export function initWatermarkControls() {
  // 设置初始状态
  const customRadio = document.querySelector('input[name="position"][value="custom"]');
  if (customRadio) {
    customRadio.checked = true;
    
    // 确保正确显示/隐藏控件
    const marginControls = document.getElementById('margin-controls');
    const tileControls = document.getElementById('tile-controls');
    
    if (marginControls) marginControls.style.display = 'none';
    if (tileControls) tileControls.style.display = 'none';
  }
  
  const fixedRadio = document.querySelector('input[name="scale-mode"][value="fixed"]');
  if (fixedRadio) {
    fixedRadio.checked = true;
    
    // 确保相对缩放控件最初是隐藏的
    const relativeScaleControls = document.getElementById('relative-scale-controls');
    if (relativeScaleControls) relativeScaleControls.style.display = 'none';
  }
  
  // 初始化所有控件
  initPositionControls();
  initScaleControls();
  initTooltips();
  
  console.log('水印位置和缩放控件初始化完成');
} 