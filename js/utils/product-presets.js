/**
 * 产品预设模块
 * 提供各种常用的水印预设配置
 */

import { updateState, watermarkState } from '../core/state.js';
import { updateWatermark } from '../core/watermark.js';

// 预设配置
const presets = {
  default: {
    text: '仅供验证使用',
    font: 'Arial',
    fontSize: 24,
    color: '#ff0000',
    opacity: 50,
    rotation: -30,
    pattern: 'tile',
    relativePosition: { x: 50, y: 50 },
    scale: 1.0
  },
  corner: {
    text: '机密文件',
    font: 'Times New Roman',
    fontSize: 18,
    color: '#000000',
    opacity: 30,
    rotation: 0,
    pattern: 'single',
    relativePosition: { x: 90, y: 90 },
    scale: 0.8
  },
  draft: {
    text: '草稿',
    font: 'Arial',
    fontSize: 72,
    color: '#cccccc',
    opacity: 20,
    rotation: -30,
    pattern: 'tile',
    relativePosition: { x: 50, y: 50 },
    scale: 2.0
  },
  confidential: {
    text: '绝密',
    font: 'SimHei',
    fontSize: 36,
    color: '#ff0000',
    opacity: 40,
    rotation: -45,
    pattern: 'tile',
    relativePosition: { x: 50, y: 50 },
    scale: 1.5
  }
};

/**
 * 初始化产品预设功能
 */
export function initProductPresets() {
  console.log('初始化产品预设功能');
  
  // 创建预设选择器
  createPresetSelector();
  
  // 添加预设应用事件监听
  document.addEventListener('presetSelected', handlePresetSelected);
}

/**
 * 创建预设选择器
 */
function createPresetSelector() {
  // 检查是否已有预设选择器
  let presetSelector = document.getElementById('preset-selector');
  if (presetSelector) {
    return;
  }
  
  // 查找放置预设选择器的位置
  const watermarkTextGroup = document.querySelector('.watermark-text-group');
  if (!watermarkTextGroup) {
    console.warn('无法找到放置预设选择器的位置');
    return;
  }
  
  // 创建预设选择器容器
  const presetContainer = document.createElement('div');
  presetContainer.className = 'preset-container';
  presetContainer.innerHTML = `
    <label for="preset-selector">应用预设:</label>
    <select id="preset-selector" class="preset-selector">
      <option value="">-- 选择预设 --</option>
      <option value="default">默认水印</option>
      <option value="corner">右下角标记</option>
      <option value="draft">草稿水印</option>
      <option value="confidential">机密文件</option>
    </select>
  `;
  
  // 插入到DOM中
  watermarkTextGroup.parentNode.insertBefore(presetContainer, watermarkTextGroup);
  
  // 添加事件监听
  presetSelector = document.getElementById('preset-selector');
  presetSelector.addEventListener('change', function() {
    const selectedPreset = this.value;
    if (selectedPreset) {
      applyPreset(selectedPreset);
    }
  });
}

/**
 * 处理预设选择事件
 * @param {CustomEvent} event - 自定义事件
 */
function handlePresetSelected(event) {
  if (event.detail && event.detail.presetName) {
    applyPreset(event.detail.presetName);
  }
}

/**
 * 应用预设
 * @param {string} presetName - 预设名称
 */
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) {
    console.warn(`找不到预设: ${presetName}`);
    return;
  }
  
  console.log(`应用预设: ${presetName}`, preset);
  
  // 更新水印状态
  updateState(preset);
  
  // 更新UI
  updatePresetUI(preset);
  
  // 更新水印
  updateWatermark();
}

/**
 * 更新UI以匹配预设
 * @param {Object} preset - 预设配置
 */
function updatePresetUI(preset) {
  // 更新文本输入
  const textInput = document.getElementById('watermark-text');
  if (textInput && preset.text) {
    textInput.value = preset.text;
  }
  
  // 更新字体选择
  const fontSelect = document.getElementById('watermark-font');
  if (fontSelect && preset.font) {
    fontSelect.value = preset.font;
  }
  
  // 更新字体大小
  const fontSizeInput = document.getElementById('watermark-font-size');
  if (fontSizeInput && preset.fontSize) {
    fontSizeInput.value = preset.fontSize;
  }
  
  // 更新颜色
  const colorInput = document.getElementById('watermark-color');
  if (colorInput && preset.color) {
    colorInput.value = preset.color;
  }
  
  // 更新透明度
  const opacityInput = document.getElementById('watermark-opacity');
  if (opacityInput && preset.opacity) {
    opacityInput.value = preset.opacity;
  }
  
  // 更新旋转角度
  const rotationInput = document.getElementById('watermark-rotation');
  if (rotationInput && preset.rotation !== undefined) {
    rotationInput.value = preset.rotation;
  }
  
  // 更新模式
  const patternSelect = document.getElementById('watermark-pattern');
  if (patternSelect && preset.pattern) {
    patternSelect.value = preset.pattern;
  }
}

/**
 * 获取当前设置作为预设
 * @returns {Object} - 当前水印设置
 */
export function getCurrentSettingsAsPreset() {
  return {
    text: watermarkState.text || '仅供验证使用',
    font: watermarkState.font || 'Arial',
    fontSize: watermarkState.fontSize || 24,
    color: watermarkState.color || '#ff0000',
    opacity: watermarkState.opacity || 50,
    rotation: watermarkState.rotation || 0,
    pattern: watermarkState.pattern || 'tile',
    relativePosition: watermarkState.relativePosition || { x: 50, y: 50 },
    scale: watermarkState.scale || 1.0
  };
}

/**
 * 保存当前设置为自定义预设
 * @param {string} presetName - 预设名称
 */
export function saveCurrentSettingsAsPreset(presetName) {
  const currentSettings = getCurrentSettingsAsPreset();
  presets[presetName] = currentSettings;
  
  console.log(`已保存自定义预设: ${presetName}`, currentSettings);
  
  // 可以在这里添加持久化存储逻辑，例如使用localStorage
  try {
    const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
    customPresets[presetName] = currentSettings;
    localStorage.setItem('customPresets', JSON.stringify(customPresets));
  } catch (error) {
    console.error('保存自定义预设到localStorage失败:', error);
  }
  
  return currentSettings;
} 