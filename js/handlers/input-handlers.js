/**
 * 输入处理模块
 * 处理表单输入控件的事件和数据更新
 */

import { watermarkState, updateState, undo, redo } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';

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
    });
  }
  
  // 字体大小处理
  const fontSizeInput = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  const fontSizeNumberInput = document.getElementById('font-size-input');
  const fontSizeDecrease = document.getElementById('font-size-decrease');
  const fontSizeIncrease = document.getElementById('font-size-increase');
  
  if (fontSizeInput && fontSizeValue) {
    // 初始化值
    updateState({
      fontSize: parseInt(fontSizeInput.value)
    });
    
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
  }
  
  // 透明度处理
  const opacityInput = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacity-value');
  const opacityNumberInput = document.getElementById('opacity-input');
  const opacityDecrease = document.getElementById('opacity-decrease');
  const opacityIncrease = document.getElementById('opacity-increase');
  
  if (opacityInput && opacityValue) {
    // 初始化值
    updateState({
      opacity: parseInt(opacityInput.value)
    });
    
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
      });
    }
    
    // 添加减小按钮事件
    if (opacityDecrease) {
      opacityDecrease.addEventListener('click', function() {
        const currentValue = parseInt(opacityInput.value);
        const min = parseInt(opacityInput.min);
        const newValue = Math.max(min, currentValue - 5);
        
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
      });
    }
    
    // 添加增大按钮事件
    if (opacityIncrease) {
      opacityIncrease.addEventListener('click', function() {
        const currentValue = parseInt(opacityInput.value);
        const max = parseInt(opacityInput.max);
        const newValue = Math.min(max, currentValue + 5);
        
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
  }
  
  // 旋转角度处理
  const rotationInput = document.getElementById('rotation');
  const rotationValue = document.getElementById('rotation-value');
  const rotationNumberInput = document.getElementById('rotation-input');
  const rotationDecrease = document.getElementById('rotation-decrease');
  const rotationIncrease = document.getElementById('rotation-increase');
  
  if (rotationInput && rotationValue) {
    // 初始化值
    updateState({
      rotation: parseInt(rotationInput.value)
    });
    
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
      });
    }
    
    // 添加减小按钮事件
    if (rotationDecrease) {
      rotationDecrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationInput.value);
        const min = parseInt(rotationInput.min);
        const newValue = Math.max(min, currentValue - 5);
        
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
      });
    }
    
    // 添加增大按钮事件
    if (rotationIncrease) {
      rotationIncrease.addEventListener('click', function() {
        const currentValue = parseInt(rotationInput.value);
        const max = parseInt(rotationInput.max);
        const newValue = Math.min(max, currentValue + 5);
        
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
  }
  
  // 水印颜色处理
  const colorInput = document.getElementById('color');
  
  if (colorInput) {
    // 初始化值
    updateState({
      color: colorInput.value
    });
    
    // 颜色选择事件
    colorInput.addEventListener('input', function() {
      // 更新状态
      updateState({
        color: this.value
      });
      
      // 更新水印
      updateWatermark();
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
    });
  }
  
  // 图片质量处理
  const imageQualityInput = document.getElementById('image-quality');
  const imageQualityValue = document.getElementById('image-quality-value');
  
  if (imageQualityInput && imageQualityValue) {
    // 初始化值
    updateState({
      quality: parseInt(imageQualityInput.value) / 100
    });
    
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
  // 更新水印类型
  const watermarkType = document.getElementById('watermark-type');
  if (watermarkType) {
    watermarkType.value = watermarkState.type;
    
    // 触发change事件以更新相关UI
    const event = new Event('change');
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
  const colorInput = document.getElementById('color');
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