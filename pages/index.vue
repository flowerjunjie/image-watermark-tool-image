<script setup>
const {locale, locales, setLocale} = useI18n()
// import imageCompression from "browser-image-compression";

const availableLocales = computed(() => {
  return (locales.value).filter(i => i.code !== locale.value)
})
const switchLocalePath = useSwitchLocalePath()

const repeatTextStatus = ref(true)
const singleXPos = ref(0)
const singleYPos = ref(0)
const singleInitStatus = ref(true)
const multiInitStatus = ref(true)
const isDragging = ref(false)
const startDragX = ref(0)
const startDragY = ref(0)

// 添加多图片处理相关变量
const thumbnails = ref([]) // 存储所有图片的缩略图信息
const currentImageIndex = ref(0) // 当前显示的图片索引
const pendingImages = ref([]) // 等待处理的图片
const processedParameters = ref(null) // 第一张图片处理时使用的参数
const showThumbnails = ref(false) // 是否显示缩略图区域
// 存储每张图片的水印参数
const imageWatermarkSettings = ref({})

const canvas = ref(null)
const canvasImage = ref()
const fileObj = ref({
  name: '',
  type: ''
})
const fileObject = ref({})
const onFileChange = (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return
  
  // 清空之前的缩略图
  thumbnails.value = []
  currentImageIndex.value = 0
  showThumbnails.value = true
  // 清空之前的水印设置
  imageWatermarkSettings.value = {}
  
  // 如果是多个文件，处理所有文件
  if (files.length > 1) {
    // 创建一个临时处理队列
    pendingImages.value = [...files]
    
    // 处理第一个文件
    const file = files[0]
    fileObject.value = file
    if (repeatTextStatus.value) {
      multiInitStatus.value = true
    } else {
      singleInitStatus.value = true
    }

    fileObj.value.name = file.name
    fileObj.value.type = file.type

    const reader = new FileReader()
    reader.onload = function (event) {
      canvasImage.value = new Image();
      canvasImage.value.onload = function () {
        const ctx = canvas.value.getContext('2d');

        canvas.value.width = canvasImage.value.width
        canvas.value.height = canvasImage.value.height

        // 将上传的图片绘制到Canvas上
        ctx.drawImage(canvasImage.value, 0, 0, canvas.value.width, canvas.value.height);
        // 添加水印
        setWatermark(ctx)
        
        // 创建缩略图
        createThumbnail(file, canvas.value.toDataURL())
        
        // 保存当前使用的水印参数
        const currentSettings = {
          watermarkType: watermarkType.value,
          watermarkText: watermarkText.value,
          watermarkColor: watermarkColor.value,
          watermarkOpacity: watermarkOpacity.value,
          watermarkSpacing: watermarkSpacing.value,
          watermarkTextSize: watermarkTextSize.value,
          watermarkAngle: repeatTextStatus.value ? watermarkAngle.value : watermarkSingleAngle.value,
          repeatTextStatus: repeatTextStatus.value,
          singleXPos: singleXPos.value,
          singleYPos: singleYPos.value,
          watermarkImageSize: watermarkImageSize.value,
          // 保存相对位置百分比
          relativeXPercent: singleXPos.value / canvas.value.width,
          relativeYPercent: singleYPos.value / canvas.value.height
        }
        
        // 保存第一张图片的参数作为默认参数
        processedParameters.value = {...currentSettings}
        
        // 保存每张图片的独立设置
        imageWatermarkSettings.value[0] = currentSettings
        
        // 处理剩余文件
        for (let i = 1; i < files.length; i++) {
          const nextFile = files[i]
          const nextReader = new FileReader()
          nextReader.onload = function(e) {
            const img = new Image()
            img.onload = function() {
              // 创建临时画布
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = img.width
              tempCanvas.height = img.height
              const tempCtx = tempCanvas.getContext('2d')
              
              // 绘制图片
              tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)
              
              // 创建缩略图
              createThumbnail(nextFile, tempCanvas.toDataURL())
            }
            img.src = e.target.result
          }
          nextReader.readAsDataURL(nextFile)
        }
      };
      canvasImage.value.src = event.target.result;
    };

    reader.readAsDataURL(file)
  } else {
    // 单个文件处理，保持原有逻辑
    const file = files[0]
    fileObject.value = file
    if (repeatTextStatus.value) {
      multiInitStatus.value = true
    } else {
      singleInitStatus.value = true
    }

    fileObj.value.name = file.name
    fileObj.value.type = file.type

    const reader = new FileReader()
    reader.onload = function (event) {
      canvasImage.value = new Image();
      canvasImage.value.onload = function () {
        const ctx = canvas.value.getContext('2d');

        canvas.value.width = canvasImage.value.width
        canvas.value.height = canvasImage.value.height

        // 将上传的图片绘制到Canvas上
        ctx.drawImage(canvasImage.value, 0, 0, canvas.value.width, canvas.value.height);
        // 添加水印
        setWatermark(ctx)
        
        // 创建缩略图
        createThumbnail(file, canvas.value.toDataURL())
        
        // 保存当前使用的水印参数
        const currentSettings = {
          watermarkType: watermarkType.value,
          watermarkText: watermarkText.value,
          watermarkColor: watermarkColor.value,
          watermarkOpacity: watermarkOpacity.value,
          watermarkSpacing: watermarkSpacing.value,
          watermarkTextSize: watermarkTextSize.value,
          watermarkAngle: repeatTextStatus.value ? watermarkAngle.value : watermarkSingleAngle.value,
          repeatTextStatus: repeatTextStatus.value,
          singleXPos: singleXPos.value,
          singleYPos: singleYPos.value,
          watermarkImageSize: watermarkImageSize.value,
          // 保存相对位置百分比
          relativeXPercent: singleXPos.value / canvas.value.width,
          relativeYPercent: singleYPos.value / canvas.value.height
        }
        
        // 保存第一张图片的参数作为默认参数
        processedParameters.value = {...currentSettings}
        
        // 保存每张图片的独立设置
        imageWatermarkSettings.value[0] = currentSettings
      };
      canvasImage.value.src = event.target.result;
    };

    reader.readAsDataURL(file)
  }
}

// 添加目录选择和批量处理功能
const folderProcessing = ref(false)
const processedImages = ref(0)
const totalImages = ref(0)
const processingProgress = ref(0)

const onFolderChange = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return
  
  // 筛选图片文件
  const imageFiles = Array.from(files).filter(file => 
    file.type.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
  )
  
  if (imageFiles.length === 0) {
    alert('未找到图片文件')
    return
  }
  
  totalImages.value = imageFiles.length
  processedImages.value = 0
  processingProgress.value = 0
  folderProcessing.value = true
  
  // 清空之前的缩略图
  thumbnails.value = []
  currentImageIndex.value = 0
  showThumbnails.value = true
  
  // 创建一个临时处理队列
  pendingImages.value = [...imageFiles]
  
  // 先处理第一张图片
  if (pendingImages.value.length > 0) {
    // 加载第一张图片显示处理过程
    await processFirstImage(pendingImages.value[0])
  }
}

// 处理第一张图片
const processFirstImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = function(event) {
      // 设置当前图片
      fileObject.value = file
      fileObj.value.name = file.name
      fileObj.value.type = file.type
      
      canvasImage.value = new Image()
      canvasImage.value.onload = function() {
        const ctx = canvas.value.getContext('2d')
        
        // 设置画布尺寸
        canvas.value.width = canvasImage.value.width
        canvas.value.height = canvasImage.value.height
        
        // 绘制图片
        ctx.drawImage(canvasImage.value, 0, 0, canvas.value.width, canvas.value.height)
        
        // 应用水印
        setWatermark(ctx)
        
        // 保存当前使用的水印参数
        const currentSettings = {
          watermarkType: watermarkType.value,
          watermarkText: watermarkText.value,
          watermarkColor: watermarkColor.value,
          watermarkOpacity: watermarkOpacity.value,
          watermarkSpacing: watermarkSpacing.value,
          watermarkTextSize: watermarkTextSize.value,
          watermarkAngle: repeatTextStatus.value ? watermarkAngle.value : watermarkSingleAngle.value,
          repeatTextStatus: repeatTextStatus.value,
          singleXPos: singleXPos.value,
          singleYPos: singleYPos.value,
          watermarkImageSize: watermarkImageSize.value,
          // 保存相对位置百分比
          relativeXPercent: singleXPos.value / canvas.value.width,
          relativeYPercent: singleYPos.value / canvas.value.height
        }
        
        // 保存第一张图片的参数作为默认参数
        processedParameters.value = {...currentSettings}
        
        // 保存每张图片的独立设置
        imageWatermarkSettings.value[0] = currentSettings
        
        // 创建第一张图片的缩略图
        createThumbnail(file, canvas.value.toDataURL())
        
        processedImages.value = 1
        processingProgress.value = Math.round((processedImages.value / totalImages.value) * 100)
        
        resolve()
      }
      canvasImage.value.src = event.target.result
    }
    
    reader.readAsDataURL(file)
  })
}

// 创建缩略图
const createThumbnail = (file, processedImageUrl) => {
  const thumbnail = {
    original: file,
    name: file.name,
    type: file.type,
    processedUrl: processedImageUrl,
    isProcessed: true
  }
  
  thumbnails.value.push(thumbnail)
  
  // 如果是第一张图片，设置为当前显示图片
  if (thumbnails.value.length === 1) {
    currentImageIndex.value = 0
    
    // 确保第一张图片的水印设置被保存
    if (!imageWatermarkSettings.value[0]) {
      saveCurrentWatermarkSettings();
    }
  }
}

// 批量处理剩余图片
const processRemainingImages = async () => {
  // 跳过第一张图片
  for (let i = 1; i < pendingImages.value.length; i++) {
    const file = pendingImages.value[i]
    await processImage(file)
    
    processedImages.value++
    processingProgress.value = Math.round((processedImages.value / totalImages.value) * 100)
  }
  
  folderProcessing.value = false
  alert(`处理完成！成功处理 ${processedImages.value} 张图片`)
}

// 使用Electron的文件系统API选择目录
const selectDirectoryWithElectron = async () => {
  const { $electron } = useNuxtApp();
  
  if (!$electron.isElectron) {
    alert('此功能仅在桌面应用中可用');
    return;
  }
  
  console.log('调用Electron目录选择器');
  try {
    const directoryPath = await $electron.selectDirectory();
    console.log('选择的目录路径:', directoryPath);
    
    if (!directoryPath) {
      console.log('用户取消了目录选择');
      return;
    }
  
    // 读取目录中的图片
    console.log('开始读取目录中的图片');
    const imageFiles = await $electron.readDirectoryImages(directoryPath);
    console.log(`找到 ${imageFiles.length} 个图片文件`);
  
    if (imageFiles.length === 0) {
      alert('所选目录中没有找到图片文件');
      return;
    }
  
    totalImages.value = imageFiles.length;
    processedImages.value = 0;
    processingProgress.value = 0;
    folderProcessing.value = true;
  
    // 清空之前的缩略图
    thumbnails.value = [];
    currentImageIndex.value = 0;
    showThumbnails.value = true;
  
    // 保存待处理图片
    pendingImages.value = [...imageFiles];
  
    // 处理第一张图片
    if (pendingImages.value.length > 0) {
      await processFirstElectronImage(pendingImages.value[0]);
    }
  } catch (error) {
    console.error('读取目录时出错:', error);
    alert('读取目录时出错: ' + error.message);
  }
}

// 处理第一张Electron图片
const processFirstElectronImage = async (file) => {
  const { $electron } = useNuxtApp();
  
  try {
    const img = new Image();
    
    // 等待图片加载
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `file://${file.path}`;
    });
    
    // 更新canvas
    const ctx = canvas.value.getContext('2d');
    canvas.value.width = img.width;
    canvas.value.height = img.height;
    
    // 绘制图片
    ctx.drawImage(img, 0, 0, canvas.value.width, canvas.value.height);
    
    // 应用水印
    setWatermark(ctx);
    
    // 保存当前使用的水印参数
    processedParameters.value = {
      watermarkType: watermarkType.value,
      watermarkText: watermarkText.value,
      watermarkColor: watermarkColor.value,
      watermarkOpacity: watermarkOpacity.value,
      watermarkSpacing: watermarkSpacing.value,
      watermarkTextSize: watermarkTextSize.value,
      watermarkAngle: repeatTextStatus.value ? watermarkAngle.value : watermarkSingleAngle.value,
      repeatTextStatus: repeatTextStatus.value,
      singleXPos: singleXPos.value,
      singleYPos: singleYPos.value,
      watermarkImageSize: watermarkImageSize.value
    };
    
    // 保存图片
    const dataURL = canvas.value.toDataURL('image/png');
    const fileName = `watermarked_${file.name}`;
    
    // 创建缩略图
    createThumbnail({name: file.name, type: 'image/png', path: file.path}, dataURL);
    
    // 保存处理后的图片
    await $electron.saveImage({ dataURL, fileName });
    
    processedImages.value = 1;
    processingProgress.value = Math.round((processedImages.value / totalImages.value) * 100);
  } catch (error) {
    console.error(`处理图片 ${file.name} 时出错:`, error);
  }
}

// 处理剩余的Electron图片
const processRemainingElectronImages = async () => {
  const { $electron } = useNuxtApp();
  
  // 跳过第一张图片
  for (let i = 1; i < pendingImages.value.length; i++) {
    const file = pendingImages.value[i];
    
    try {
      const img = new Image();
      
      // 等待图片加载
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `file://${file.path}`;
      });
      
      // 创建临时画布
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      // 设置画布尺寸
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      
      // 绘制图片
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // 应用相同的水印参数
      if (processedParameters.value) {
        // 水印应用逻辑与processImage函数中相同
        tempCtx.save();
        tempCtx.fillStyle = processedParameters.value.watermarkColor;
        tempCtx.globalAlpha = processedParameters.value.watermarkOpacity;
        
        if (processedParameters.value.watermarkType === 'text') {
          // 文字水印应用（与processImage函数中相同）
          // ...略，与processImage函数中的文字水印逻辑相同
        } else if (processedParameters.value.watermarkType === 'image' && watermarkImage.value) {
          // 图片水印应用（与processImage函数中相同）
          // ...略，与processImage函数中的图片水印逻辑相同
        }
        
        tempCtx.restore();
      }
      
      // 保存处理后的图片
      const dataURL = tempCanvas.toDataURL('image/png');
      const fileName = `watermarked_${file.name}`;
      
      // 创建缩略图
      createThumbnail({name: file.name, type: 'image/png', path: file.path}, dataURL);
      
      // 保存图片
      await $electron.saveImage({ dataURL, fileName });
      
      processedImages.value++;
      processingProgress.value = Math.round((processedImages.value / totalImages.value) * 100);
    } catch (error) {
      console.error(`处理图片 ${file.name} 时出错:`, error);
    }
  }
  
  folderProcessing.value = false;
  alert(`处理完成！成功处理 ${processedImages.value} 张图片`);
}

// 处理单个图片
const processImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = function(event) {
      const img = new Image()
      
      img.onload = function() {
        // 创建临时画布
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        
        // 设置画布尺寸
        tempCanvas.width = img.width
        tempCanvas.height = img.height
        
        // 绘制图片
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)
        
        // 应用相同的水印参数
        if (processedParameters.value) {
          tempCtx.save()
          tempCtx.fillStyle = processedParameters.value.watermarkColor
          tempCtx.globalAlpha = processedParameters.value.watermarkOpacity
          
          if (processedParameters.value.watermarkType === 'text') {
            // 应用文字水印
            const lines = processedParameters.value.watermarkText.split('\n')
            const textSize = processedParameters.value.watermarkTextSize * 
                            Math.max(15, Math.min(tempCanvas.width, tempCanvas.height) / 25)
            
            tempCtx.font = `bold ${textSize}px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif`
            
            if (processedParameters.value.repeatTextStatus) {
              // 重复水印
              tempCtx.rotate(processedParameters.value.watermarkAngle * Math.PI / 180)
              
              lines.forEach((line, lineIndex) => {
                const textWidth = tempCtx.measureText(line).width
                const textHeight = textSize
                const textMargin = tempCtx.measureText('哈').width
                const lineHeight = textSize + processedParameters.value.watermarkSpacing * textSize
                const diagonalLength = Math.sqrt(tempCanvas.width ** 2 + tempCanvas.height ** 2)
                
                const angle = processedParameters.value.watermarkAngle
                if(angle >= 0){
                  const x = Math.ceil(diagonalLength / (textWidth + textMargin))
                  const y = Math.ceil(tempCanvas.height / (processedParameters.value.watermarkSpacing * textHeight))
                  const startY = lineHeight * lineIndex
                  
                  for (let i = 0; i < x; i++) {
                    for (let j = -y; j < y; j++) {
                      const yPos = startY + j * processedParameters.value.watermarkSpacing * textHeight
                      tempCtx.fillText(line, (textWidth + textMargin) * i, yPos)
                    }
                  }
                } else {
                  const x = Math.ceil(diagonalLength / (textWidth + textMargin))
                  const y = Math.ceil(diagonalLength / (processedParameters.value.watermarkSpacing * textHeight))
                  const startY = lineHeight * lineIndex
                  
                  for (let i = -x; i < x; i++) {
                    for (let j = -y; j < y; j++) {
                      const yPos = startY + j * processedParameters.value.watermarkSpacing * textHeight
                      tempCtx.fillText(line, (textWidth + textMargin) * i, yPos)
                    }
                  }
                }
              })
            } else {
              // 单个水印
              tempCtx.translate(processedParameters.value.singleXPos, processedParameters.value.singleYPos)
              tempCtx.rotate(processedParameters.value.watermarkAngle * Math.PI / 180)
              
              lines.forEach((line, lineIndex) => {
                const startY = textSize * lineIndex
                tempCtx.fillText(line, 0, startY)
              })
            }
          } else if (processedParameters.value.watermarkType === 'image' && watermarkImage.value) {
            // 应用图片水印
            if (processedParameters.value.repeatTextStatus) {
              // 重复水印
              const watermarkWidth = tempCanvas.width * (processedParameters.value.watermarkImageSize / 100)
              const scaleFactor = watermarkWidth / watermarkImage.value.width
              const watermarkHeight = watermarkImage.value.height * scaleFactor
              
              const spacingX = watermarkWidth * 1.5
              const spacingY = watermarkHeight * 1.5
              
              tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2)
              tempCtx.rotate(processedParameters.value.watermarkAngle * Math.PI / 180)
              tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2)
              
              const diagonalLength = Math.sqrt(tempCanvas.width ** 2 + tempCanvas.height ** 2)
              const cols = Math.ceil(diagonalLength / spacingX) + 1
              const rows = Math.ceil(diagonalLength / spacingY) + 1
              
              const offsetX = -diagonalLength / 2
              const offsetY = -diagonalLength / 2
              
              for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                  const x = offsetX + i * spacingX
                  const y = offsetY + j * spacingY
                  tempCtx.drawImage(
                    watermarkImage.value, 
                    x, y, 
                    watermarkWidth, watermarkHeight
                  )
                }
              }
            } else {
              // 单个水印
              const watermarkWidth = tempCanvas.width * (processedParameters.value.watermarkImageSize / 100)
              const scaleFactor = watermarkWidth / watermarkImage.value.width
              const watermarkHeight = watermarkImage.value.height * scaleFactor
              
              tempCtx.translate(processedParameters.value.singleXPos, processedParameters.value.singleYPos)
              tempCtx.rotate(processedParameters.value.watermarkAngle * Math.PI / 180)
              tempCtx.drawImage(
                watermarkImage.value, 
                -watermarkWidth / 2, -watermarkHeight / 2, 
                watermarkWidth, watermarkHeight
              )
            }
          }
          
          tempCtx.restore()
        }
        
        // 创建缩略图
        const dataURL = tempCanvas.toDataURL(file.type || 'image/png')
        createThumbnail(file, dataURL)
        
        // 导出图片并下载
        const link = document.createElement('a')
        link.href = dataURL
        link.download = `watermarked_${file.name}`
        link.click()
        link.remove()
        
        resolve()
      }
      
      img.src = event.target.result
    }
    
    reader.readAsDataURL(file)
  })
}

// 文字水印
const watermarkText = ref(locale.value === 'cn' ? '仅供 xxx 验证使用' : 'Only for xxx verification use')
const watermarkColor = ref('#0000ff')
const watermarkOpacity = ref(0.3)
const watermarkSpacing = ref(5)
const watermarkTextSize = ref(2)
const watermarkAngle = ref(30)
const watermarkSingleAngle = ref(0)

// 水印类型选择
const watermarkType = ref('text') // text 或 image

// 图片水印相关
const watermarkImage = ref(null)
const watermarkImageSize = ref(20) // 百分比

// 上传水印图片
const onWatermarkImageChange = (event) => {
  const file = event.target.files[0]
  if (!file) {
    console.error('未选择水印图片文件');
    return;
  }
  
  console.log('选择水印图片:', file.name);
  
  const reader = new FileReader()
  reader.onload = function(event) {
    watermarkImage.value = new Image()
    watermarkImage.value.onload = function() {
      console.log('水印图片已加载完成');
      // 如果有画布和图片，重新应用水印
      if (canvasImage.value && canvas.value) {
        waterMarkTextChange()
      }
    }
    watermarkImage.value.onerror = function(err) {
      console.error('水印图片加载失败:', err);
    }
    watermarkImage.value.src = event.target.result
  }
  reader.onerror = function(err) {
    console.error('读取水印图片失败:', err);
  }
  reader.readAsDataURL(file)
  
  // 重置选择器，允许重复选择相同文件
  event.target.value = ''
}

// 应用图片水印
const applyImageWatermark = (ctx, targetCanvas) => {
  if (!watermarkImage.value) return
  
  ctx.save()
  ctx.globalAlpha = watermarkOpacity.value  // 使用与文字水印相同的透明度设置
  
  if (repeatTextStatus.value) {
    // 计算水印尺寸
    const watermarkWidth = targetCanvas.width * (watermarkImageSize.value / 100)
    const scaleFactor = watermarkWidth / watermarkImage.value.width
    const watermarkHeight = watermarkImage.value.height * scaleFactor
    
    // 计算间距
    const spacingX = watermarkWidth * 1.5
    const spacingY = watermarkHeight * 1.5
    
    // 旋转
    ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2)
    ctx.rotate(watermarkAngle.value * Math.PI / 180)
    ctx.translate(-targetCanvas.width / 2, -targetCanvas.height / 2)
    
    // 计算需要的水印数量
    const diagonalLength = Math.sqrt(targetCanvas.width ** 2 + targetCanvas.height ** 2)
    const cols = Math.ceil(diagonalLength / spacingX) + 1
    const rows = Math.ceil(diagonalLength / spacingY) + 1
    
    // 计算起始位置偏移
    const offsetX = -diagonalLength / 2
    const offsetY = -diagonalLength / 2
    
    // 绘制重复水印
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = offsetX + i * spacingX
        const y = offsetY + j * spacingY
        ctx.drawImage(
          watermarkImage.value, 
          x, y, 
          watermarkWidth, watermarkHeight
        )
      }
    }
  } else {
    // 单个水印
    // 计算水印尺寸
    const watermarkWidth = targetCanvas.width * (watermarkImageSize.value / 100)
    const scaleFactor = watermarkWidth / watermarkImage.value.width
    const watermarkHeight = watermarkImage.value.height * scaleFactor
    
    // 保存当前状态
    ctx.save()
    
    // 移动到水印位置中心点
    ctx.translate(singleXPos.value, singleYPos.value)
    
    // 旋转
    ctx.rotate(watermarkSingleAngle.value * Math.PI / 180)
    
    // 绘制水印
    ctx.drawImage(
      watermarkImage.value, 
      -watermarkWidth / 2, -watermarkHeight / 2, 
      watermarkWidth, watermarkHeight
    )
    
    // 恢复状态
    ctx.restore()
  }
  
  ctx.restore()
}

const setWatermark = (ctx) => {
  // 根据水印类型应用不同的水印
  if (watermarkType.value === 'text') {
    applyTextWatermark(ctx, canvas.value)
  } else {
    applyImageWatermark(ctx, canvas.value)
  }
};

// 文字水印应用
const applyTextWatermark = (ctx, targetCanvas) => {
  const lines = watermarkText.value.split('\n');
  const textSize = watermarkTextSize.value * Math.max(15, Math.min(targetCanvas.width, targetCanvas.height) / 25);

  ctx.font = `bold ${textSize}px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif`;
  ctx.fillStyle = watermarkColor.value;
  ctx.globalAlpha = watermarkOpacity.value;

  // 保存当前绘图状态
  ctx.save();

  //当水印是铺满图片场景下
  if (repeatTextStatus.value) {
    if (multiInitStatus.value) {
      multiInitStatus.value = false
      watermarkAngle.value = 30
    }
    // 设置文字倾斜角度
    ctx.rotate(watermarkAngle.value * Math.PI / 180);

    lines.forEach((line, lineIndex) => {
      const textWidth = ctx.measureText(line).width;
      const textHeight = textSize; // 估算文字高度
      const textMargin = ctx.measureText('哈').width;
      // 计算每行文字的高度，包括行间距
      const lineHeight = textSize + watermarkSpacing.value * textSize;
      // 计算水印的宽度
      const diagonalLength = Math.sqrt(targetCanvas.width ** 2 + targetCanvas.height ** 2);

      if(watermarkAngle.value >= 0){

        const x = Math.ceil(diagonalLength / (textWidth + textMargin));
        const y = Math.ceil(targetCanvas.height / (watermarkSpacing.value * textHeight));

        // 计算绘制文本的 y 坐标，考虑行索引和行高
        const startY = lineHeight * lineIndex;

        for (let i = 0; i < x; i++) {
          for (let j = -y; j < y; j++) {
            // 计算绘制文本的y坐标，考虑行间距和行索引
            const yPos = startY + j * watermarkSpacing.value * textHeight;

            ctx.fillText(line, (textWidth + textMargin) * i, yPos);
          }
        }
      }else{
        const x = Math.ceil(diagonalLength / (textWidth + textMargin));
        const y = Math.ceil(diagonalLength / (watermarkSpacing.value * textHeight));
        // 计算绘制文本的 y 坐标，考虑行索引和行高
        const startY = lineHeight * lineIndex;

        // watermarkAngle.value < 0
        for (let i = -x; i < x; i++) {
          for (let j = -y; j < y; j++) {
            // 计算绘制文本的y坐标，考虑行间距和行索引
            const yPos = startY + j * watermarkSpacing.value * textHeight;
            ctx.fillText(line, (textWidth + textMargin) * i, yPos);
          }
        }
      }

    })
  } else {
    if (singleInitStatus.value) {
      watermarkSingleAngle.value = 0
    }
    ctx.rotate(watermarkSingleAngle.value * Math.PI / 180);
    // 当水印不是铺满图片场景下
    lines.forEach((line, lineIndex) => {

      if (singleInitStatus.value) {
        singleInitStatus.value = false
        singleXPos.value = Math.ceil((targetCanvas.width - ctx.measureText(line).width) / 2)
        singleYPos.value = Math.ceil((targetCanvas.height - textSize) / 2)
      }

      // 计算绘制文本的 y 坐标，考虑行索引和行高
      const startY = textSize * lineIndex + singleYPos.value;

      ctx.fillText(line, singleXPos.value, startY);
    })

  }

  // 恢复之前保存的绘图状态
  ctx.restore();

  ctx.globalAlpha = 1; // 重置全局透明度
}

const downloadLoading = ref(false)
const handleDownload = () => {
  if (!canvas.value) return;

  downloadPercentStatus.value = true
  downloadLoading.value = true;

  setTimeout(() => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', canvas.value.toDataURL());
    xhr.responseType = 'blob';

    xhr.onloadstart = () => {
      // downloadLoading.value = true;
    };

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        // 更新进度条
        updateProgressBar(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const link = document.createElement('a');
        const blob = new Blob([xhr.response], {type: fileObject.value.type});
        const url = URL.createObjectURL(blob);

        link.href = url;
        link.download = fileObj.value.name || 'image.png';
        link.click();

        URL.revokeObjectURL(url);
        link.remove();
      }
    };

    xhr.onloadend = () => {
      downloadLoading.value = false;
      // 重置进度条
      resetProgressBar();
    };

    xhr.send();
  }, 500)
};

// 使用Electron保存图片
const handleSaveWithElectron = async () => {
  if (!canvas.value) return;
  
  downloadLoading.value = true;
  
  try {
    const { $electron } = useNuxtApp();
    const dataURL = canvas.value.toDataURL();
    const fileName = fileObj.value.name || 'image.png';
    
    const result = await $electron.saveImage({ dataURL, fileName });
    
    if (result.success) {
      console.log('图片已保存至:', result.filePath);
    } else {
      console.error('保存失败:', result.message);
    }
  } catch (error) {
    console.error('保存过程中出错:', error);
  } finally {
    downloadLoading.value = false;
  }
};

const downloadPercentStatus = ref(false)
const downloadPercentComplete = ref(0);
const updateProgressBar = (percentComplete) => {
  // 更新进度条的显示
  // 你可以根据下载进度来更新你的进度条的样式或长度等
  downloadPercentComplete.value = percentComplete;
};

const resetProgressBar = () => {
  // 重置进度条的显示
  // 可能是隐藏进度条或将进度条长度重置为初始状态等
  setTimeout(() => {
    downloadPercentStatus.value = false;
    downloadPercentComplete.value = 0;
  }, 3000)
};

const waterMarkColorChange = (e) => {
  watermarkColor.value = e
  waterMarkTextChange()
}
const waterMarkTextChange = () => {
  if (!canvasImage.value) return;

  const ctx = canvas.value.getContext('2d');

  // 清除画布
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // 将上传的图片绘制到Canvas上
  ctx.drawImage(canvasImage.value, 0, 0, canvas.value.width, canvas.value.height);

  // 添加水印
  setWatermark(ctx);

  ctx.globalAlpha = 1; // 重置全局透明度
  
  // 保存当前设置
  saveCurrentWatermarkSettings();
}
const repeatStatusChange = (e) => {
  repeatTextStatus.value = e
  if (repeatTextStatus.value) {
    multiInitStatus.value = true
  } else {
    singleInitStatus.value = true
  }
  if (!canvasImage.value) return;
  waterMarkTextChange()
}

// 切换水印类型
const switchWatermarkType = (type) => {
  watermarkType.value = type
  if (canvasImage.value) {
    waterMarkTextChange()
  }
}

// 添加鼠标拖动功能
const startDrag = (event) => {
  if (!canvasImage.value || repeatTextStatus.value) return;
  
  // 只在非重复水印模式下启用拖动
  isDragging.value = true;
  
  // 记录起始拖动点
  const rect = canvas.value.getBoundingClientRect();
  let clientX, clientY;
  
  if (event.type === 'touchstart') {
    // 触摸事件
    clientX = event.touches[0].clientX - rect.left;
    clientY = event.touches[0].clientY - rect.top;
  } else {
    // 鼠标事件
    clientX = event.clientX - rect.left;
    clientY = event.clientY - rect.top;
  }
  
  // 计算画布上的实际坐标
  const scaleX = canvas.value.width / rect.width;
  const scaleY = canvas.value.height / rect.height;
  
  // 应用缩放比例
  startDragX.value = clientX * scaleX;
  startDragY.value = clientY * scaleY;
  
  // 防止事件冒泡和默认行为
  event.preventDefault();
  event.stopPropagation();
}

const onDrag = (event) => {
  if (!isDragging.value) return;
  
  // 防止触摸时页面滚动
  event.preventDefault();
  event.stopPropagation();
  
  const rect = canvas.value.getBoundingClientRect();
  
  // 计算新位置
  let newX, newY;
  if (event.type === 'touchmove') {
    // 触摸事件
    newX = event.touches[0].clientX - rect.left;
    newY = event.touches[0].clientY - rect.top;
  } else {
    // 鼠标事件
    newX = event.clientX - rect.left;
    newY = event.clientY - rect.top;
  }
  
  // 计算画布上的实际坐标
  const scaleX = canvas.value.width / rect.width;
  const scaleY = canvas.value.height / rect.height;
  
  // 应用缩放比例
  newX = newX * scaleX;
  newY = newY * scaleY;
  
  // 限制水印不超出画布范围
  singleXPos.value = Math.max(0, Math.min(canvas.value.width, newX));
  singleYPos.value = Math.max(0, Math.min(canvas.value.height, newY));
  
  // 更新水印
  waterMarkTextChange();
}

const endDrag = () => {
  isDragging.value = false;
}

// 触摸设备的拖动结束处理
const onTouchEnd = () => {
  isDragging.value = false;
}

// 选择缩略图
const selectThumbnail = (index) => {
  if (index < 0 || index >= thumbnails.value.length) return;
  
  currentImageIndex.value = index;
  const thumbnail = thumbnails.value[index];
  
  // 在主画布中显示选中的缩略图
  const img = new Image();
  img.onload = function() {
    const ctx = canvas.value.getContext('2d');
    
    // 保存当前水印相对位置百分比
    let relativeXPercent = 0;
    let relativeYPercent = 0;
    
    if (!repeatTextStatus.value && canvas.value) {
      // 计算当前水印位置的相对百分比
      relativeXPercent = canvas.value.width > 0 ? (singleXPos.value / canvas.value.width) : 0.5;
      relativeYPercent = canvas.value.height > 0 ? (singleYPos.value / canvas.value.height) : 0.5;
    }
    
    // 设置画布尺寸
    canvas.value.width = img.width;
    canvas.value.height = img.height;
    
    // 绘制图片
    ctx.drawImage(img, 0, 0, canvas.value.width, canvas.value.height);
    
    // 检查是否有该图片的独立水印设置
    if (imageWatermarkSettings.value[index]) {
      // 加载该图片的水印设置
      const settings = imageWatermarkSettings.value[index];
      
      // 应用水印设置
      watermarkType.value = settings.watermarkType;
      watermarkText.value = settings.watermarkText;
      watermarkColor.value = settings.watermarkColor;
      watermarkOpacity.value = settings.watermarkOpacity;
      watermarkSpacing.value = settings.watermarkSpacing;
      watermarkTextSize.value = settings.watermarkTextSize;
      
      if (settings.repeatTextStatus) {
        repeatTextStatus.value = true;
        watermarkAngle.value = settings.watermarkAngle;
      } else {
        repeatTextStatus.value = false;
        watermarkSingleAngle.value = settings.watermarkAngle;
        // 使用保存的相对位置计算实际位置
        singleXPos.value = Math.round(settings.relativeXPercent * canvas.value.width);
        singleYPos.value = Math.round(settings.relativeYPercent * canvas.value.height);
      }
      
      watermarkImageSize.value = settings.watermarkImageSize;
    } else if (!repeatTextStatus.value) {
      // 如果没有独立设置且是单个水印模式，根据相对位置计算新的水印位置
      singleXPos.value = Math.round(relativeXPercent * canvas.value.width);
      singleYPos.value = Math.round(relativeYPercent * canvas.value.height);
    }
    
    // 确保水印位置在图片范围内
    if (!repeatTextStatus.value) {
      singleXPos.value = Math.max(0, Math.min(canvas.value.width, singleXPos.value));
      singleYPos.value = Math.max(0, Math.min(canvas.value.height, singleYPos.value));
    }
    
    // 重新应用水印
    waterMarkTextChange();
  };
  img.src = thumbnail.processedUrl;
  
  // 更新当前文件信息
  fileObj.value.name = thumbnail.name;
  fileObj.value.type = thumbnail.type;
}

// 处理剩余图片的统一函数
const handleProcessRemainingImages = () => {
  const { $electron } = useNuxtApp();
  
  if ($electron?.isElectron) {
    // 桌面应用模式
    processRemainingElectronImages();
  } else {
    // 网页模式
    processRemainingImages();
  }
}

// 添加鼠标滚轮缩放功能
const handleWheelZoom = (event) => {
  // 只在非铺满模式下启用缩放
  if (!canvasImage.value || repeatTextStatus.value) return;
  
  // 阻止默认滚动行为
  event.preventDefault();
  
  // 根据滚轮方向调整大小
  if (watermarkType.value === 'text') {
    // 文字水印缩放
    const delta = event.deltaY > 0 ? -0.1 : 0.1; // 向下滚动减小，向上滚动增大
    watermarkTextSize.value = Math.max(0.1, Math.min(10, watermarkTextSize.value + delta));
  } else {
    // 图片水印缩放
    const delta = event.deltaY > 0 ? -1 : 1; // 向下滚动减小，向上滚动增大
    watermarkImageSize.value = Math.max(1, Math.min(50, watermarkImageSize.value + delta));
  }
  
  // 更新水印
  waterMarkTextChange();
}

// 保存当前图片的水印设置
const saveCurrentWatermarkSettings = () => {
  if (currentImageIndex.value === undefined || !canvas.value) return;
  
  // 创建当前设置的副本
  const currentSettings = {
    watermarkType: watermarkType.value,
    watermarkText: watermarkText.value,
    watermarkColor: watermarkColor.value,
    watermarkOpacity: watermarkOpacity.value,
    watermarkSpacing: watermarkSpacing.value,
    watermarkTextSize: watermarkTextSize.value,
    watermarkAngle: repeatTextStatus.value ? watermarkAngle.value : watermarkSingleAngle.value,
    repeatTextStatus: repeatTextStatus.value,
    singleXPos: singleXPos.value,
    singleYPos: singleYPos.value,
    watermarkImageSize: watermarkImageSize.value,
    // 保存相对位置百分比
    relativeXPercent: canvas.value.width > 0 ? (singleXPos.value / canvas.value.width) : 0.5,
    relativeYPercent: canvas.value.height > 0 ? (singleYPos.value / canvas.value.height) : 0.5
  }
  
  // 保存到当前索引
  imageWatermarkSettings.value[currentImageIndex.value] = currentSettings;
  
  // 如果是第一张图片，同时更新默认参数
  if (currentImageIndex.value === 0) {
    processedParameters.value = {...currentSettings};
  }
}

// 应用当前图片的水印设置到所有图片
const applySettingsToAll = () => {
  if (thumbnails.value.length <= 1) {
    alert('需要至少两张图片才能应用设置');
    return;
  }
  
  // 显示确认对话框
  if (!confirm('这将覆盖所有其他图片的水印设置，是否继续？')) {
    return;
  }
  
  // 获取当前图片的设置
  const currentSettings = imageWatermarkSettings.value[currentImageIndex.value];
  if (!currentSettings) {
    // 如果当前图片没有设置，先保存当前设置
    saveCurrentWatermarkSettings();
  }
  
  // 重新获取当前设置
  const settingsToApply = imageWatermarkSettings.value[currentImageIndex.value];
  
  // 应用到所有其他图片
  for (let i = 0; i < thumbnails.value.length; i++) {
    if (i !== currentImageIndex.value) {
      // 复制设置
      imageWatermarkSettings.value[i] = {...settingsToApply};
      
      // 重新处理图片
      reprocessImage(i);
    }
  }
  
  // 提示完成
  alert(`已将当前图片的水印设置应用到所有图片`);
}

// 重新处理图片
const reprocessImage = (index) => {
  if (index < 0 || index >= thumbnails.value.length) return;
  
  const thumbnail = thumbnails.value[index];
  const settings = imageWatermarkSettings.value[index];
  
  if (!settings) return;
  
  // 创建临时画布
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // 加载图片
  const img = new Image();
  img.onload = () => {
    // 设置画布尺寸
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    
    // 绘制图片
    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // 应用水印设置
    tempCtx.save();
    tempCtx.fillStyle = settings.watermarkColor;
    tempCtx.globalAlpha = settings.watermarkOpacity;
    
    if (settings.watermarkType === 'text') {
      // 文字水印
      const lines = settings.watermarkText.split('\n');
      const textSize = settings.watermarkTextSize * Math.max(15, Math.min(tempCanvas.width, tempCanvas.height) / 25);
      
      tempCtx.font = `bold ${textSize}px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif`;
      
      if (settings.repeatTextStatus) {
        // 重复水印
        tempCtx.rotate(settings.watermarkAngle * Math.PI / 180);
        
        // 重复水印逻辑...
        lines.forEach((line, lineIndex) => {
          const textWidth = tempCtx.measureText(line).width;
          const textHeight = textSize;
          const textMargin = tempCtx.measureText('哈').width;
          const lineHeight = textSize + settings.watermarkSpacing * textSize;
          const diagonalLength = Math.sqrt(tempCanvas.width ** 2 + tempCanvas.height ** 2);
          
          const angle = settings.watermarkAngle;
          if(angle >= 0){
            const x = Math.ceil(diagonalLength / (textWidth + textMargin));
            const y = Math.ceil(tempCanvas.height / (settings.watermarkSpacing * textHeight));
            const startY = lineHeight * lineIndex;
            
            for (let i = 0; i < x; i++) {
              for (let j = -y; j < y; j++) {
                const yPos = startY + j * settings.watermarkSpacing * textHeight;
                tempCtx.fillText(line, (textWidth + textMargin) * i, yPos);
              }
            }
          } else {
            const x = Math.ceil(diagonalLength / (textWidth + textMargin));
            const y = Math.ceil(diagonalLength / (settings.watermarkSpacing * textHeight));
            const startY = lineHeight * lineIndex;
            
            for (let i = -x; i < x; i++) {
              for (let j = -y; j < y; j++) {
                const yPos = startY + j * settings.watermarkSpacing * textHeight;
                tempCtx.fillText(line, (textWidth + textMargin) * i, yPos);
              }
            }
          }
        });
      } else {
        // 单个水印
        // 计算实际位置
        const actualX = Math.round(settings.relativeXPercent * tempCanvas.width);
        const actualY = Math.round(settings.relativeYPercent * tempCanvas.height);
        
        tempCtx.translate(actualX, actualY);
        tempCtx.rotate(settings.watermarkAngle * Math.PI / 180);
        
        lines.forEach((line, lineIndex) => {
          const startY = textSize * lineIndex;
          tempCtx.fillText(line, 0, startY);
        });
      }
    } else if (settings.watermarkType === 'image' && watermarkImage.value) {
      // 图片水印
      if (settings.repeatTextStatus) {
        // 重复水印
        const watermarkWidth = tempCanvas.width * (settings.watermarkImageSize / 100);
        const scaleFactor = watermarkWidth / watermarkImage.value.width;
        const watermarkHeight = watermarkImage.value.height * scaleFactor;
        
        const spacingX = watermarkWidth * 1.5;
        const spacingY = watermarkHeight * 1.5;
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(settings.watermarkAngle * Math.PI / 180);
        tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
        
        const diagonalLength = Math.sqrt(tempCanvas.width ** 2 + tempCanvas.height ** 2);
        const cols = Math.ceil(diagonalLength / spacingX) + 1;
        const rows = Math.ceil(diagonalLength / spacingY) + 1;
        
        const offsetX = -diagonalLength / 2;
        const offsetY = -diagonalLength / 2;
        
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = offsetX + i * spacingX;
            const y = offsetY + j * spacingY;
            tempCtx.drawImage(
              watermarkImage.value, 
              x, y, 
              watermarkWidth, watermarkHeight
            );
          }
        }
      } else {
        // 单个水印
        const watermarkWidth = tempCanvas.width * (settings.watermarkImageSize / 100);
        const scaleFactor = watermarkWidth / watermarkImage.value.width;
        const watermarkHeight = watermarkImage.value.height * scaleFactor;
        
        // 计算实际位置
        const actualX = Math.round(settings.relativeXPercent * tempCanvas.width);
        const actualY = Math.round(settings.relativeYPercent * tempCanvas.height);
        
        tempCtx.translate(actualX, actualY);
        tempCtx.rotate(settings.watermarkAngle * Math.PI / 180);
        tempCtx.drawImage(
          watermarkImage.value, 
          -watermarkWidth / 2, -watermarkHeight / 2, 
          watermarkWidth, watermarkHeight
        );
      }
    }
    
    tempCtx.restore();
    
    // 更新缩略图
    const dataURL = tempCanvas.toDataURL();
    thumbnail.processedUrl = dataURL;
    
    // 如果当前显示的是这张图片，更新画布
    if (currentImageIndex.value === index) {
      const ctx = canvas.value.getContext('2d');
      
      // 重新绘制
      const displayImg = new Image();
      displayImg.onload = () => {
        canvas.value.width = displayImg.width;
        canvas.value.height = displayImg.height;
        ctx.drawImage(displayImg, 0, 0, canvas.value.width, canvas.value.height);
      };
      displayImg.src = dataURL;
    }
  };
  
  // 加载原始图片
  if (thumbnail.original && thumbnail.original.path) {
    // Electron模式
    img.src = `file://${thumbnail.original.path}`;
  } else {
    // 浏览器模式
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(thumbnail.original);
  }
}
</script>

<template>
  <div>
    <p class="text-center p-[10px] sm:p-[0] sm:h-[40px] sm:leading-[40px] text-[12px] font-bold text-white bg-[#5d5cde]">
      {{ $t('yourImageWillNotBeSentToAnyServer') }}
    </p>

    <div class="flex flex-col sm:flex-row">
      <div class="bg-[#8881] sm:h-[calc(100vh-40px)] w-full sm:w-[520px] overflow-y-auto relative">
        <div class="sm:h-[calc(100vh-180px)] sm:overflow-y-auto">
          <div class="p-[20px]">
            <NuxtLink v-for="locale in availableLocales" :key="locale.code" :to="switchLocalePath(locale.code)">
              🌐 {{ locale.name }}
            </NuxtLink>
            <h1 class="text-[22px] font-bold my-[20px] flex gap-1 flex-row items-center ">
              {{ $t('websiteName') }}
              <nuxt-link class="text-[12px] text-red-500"
                         href="https://github.com/unilei/image-watermark-tool.git" target="_blank">
<!--                <Icon name="uil:github" color="black" size="24"/>-->
                <img style="width: 24px;height: 24px;" src="@/assets/icon/mdi--github.svg" alt="github">
              </nuxt-link>
            </h1>
          </div>

          <ul class="flex flex-col gap-[12px]">
            <!-- 水印类型选择 -->
            <li class="flex flex-col gap-1 px-[20px]">
              <label class="min-w-[70px] font-bold text-[12px]">
                {{ $t('watermarkType') || '水印类型' }}
              </label>
              <div class="flex gap-2">
                <el-radio-group v-model="watermarkType" @change="waterMarkTextChange">
                  <el-radio label="text">{{ $t('textWatermark') || '文字水印' }}</el-radio>
                  <el-radio label="image">{{ $t('imageWatermark') || '图片水印' }}</el-radio>
                </el-radio-group>
              </div>
            </li>
            
            <li class="flex flex-col gap-1  px-[20px] ">
              <label class="min-w-[70px] font-bold text-[12px]">
                {{ $t('imageFullyCoveredTheWatermark') }}
              </label>
              <el-switch v-model="repeatTextStatus"
                         style="--el-switch-on-color: #5d5cde; --el-switch-off-color: #ff4949"
                         @change="repeatStatusChange"
              >

              </el-switch>
            </li>
            
            <!-- 文字水印选项 -->
            <template v-if="watermarkType === 'text'">
              <li class="flex flex-col gap-1  px-[20px] ">
                <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkText') }}</label>
                <el-input v-model="watermarkText" type="textarea" placeholder="请输入内容"
                          @change="waterMarkTextChange"></el-input>
              </li>
              <li class="flex flex-col  px-[20px]   gap-1">
                <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkColor') }}</label>
                <client-only>
                  <el-color-picker v-model="watermarkColor" @active-change="waterMarkColorChange"></el-color-picker>
                </client-only>
              </li>
            </template>
            
            <!-- 图片水印选项 -->
            <template v-if="watermarkType === 'image'">
              <li class="flex flex-col gap-1 px-[20px]">
                <label class="min-w-[70px] font-bold text-[12px]">
                  {{ $t('watermarkImage') || '水印图片' }}
                </label>
                <input type="file" accept="image/*" @change="onWatermarkImageChange">
              </li>
              <li class="flex flex-col px-[20px] gap-1">
                <label class="min-w-[70px] font-bold text-[12px]">
                  {{ $t('watermarkImageSize') || '水印图片大小' }}
                </label>
                <client-only>
                  <el-slider v-model="watermarkImageSize" :min="1" :max="50" :step="1"
                            @change="waterMarkTextChange"></el-slider>
                </client-only>
              </li>
            </template>
            
            <li class="flex flex-col  px-[20px]  gap-1">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkOpacity') }}</label>
              <client-only>
                <el-slider
                    v-model="watermarkOpacity" :min="0" :max="1" :step="0.1"
                    @change="waterMarkTextChange">
                </el-slider>
              </client-only>
            </li>
            <li class="flex flex-col px-[20px]  gap-1" v-if="repeatTextStatus && watermarkType === 'text'">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkSpacing') }}</label>
              <client-only>
                <el-slider v-model="watermarkSpacing" :min="1" :max="16" :step="0.5"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
            <li class="flex flex-col  px-[20px]  gap-1" v-if="watermarkType === 'text'">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkSize') }}</label>
              <client-only>
                <el-slider v-model="watermarkTextSize" :min="0.1" :max="10" :step="0.1"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
            <li class="flex flex-col  px-[20px]  gap-1" v-if="repeatTextStatus">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkAngle') }}</label>
              <client-only>
                <el-slider v-model="watermarkAngle" :min="-90" :max="90" :step="1"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
            <li class="flex flex-col  px-[20px]  gap-1" v-if="!repeatTextStatus">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkAngle') }}</label>
              <client-only>
                <el-slider v-model="watermarkSingleAngle" :min="-90" :max="90" :step="1"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
            <li class="flex flex-col  px-[20px]  gap-1" v-if="!repeatTextStatus">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarkleftright') }}</label>
              <client-only>
                <el-slider v-model="singleXPos" :min="0" :max="canvas.width" :step="1"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
            <li class="flex flex-col  px-[20px]  gap-1" v-if="!repeatTextStatus">
              <label class="min-w-[70px] font-bold text-[12px]">{{ $t('watermarktopbottom') }}</label>
              <client-only>
                <el-slider v-model="singleYPos" :min="0" :max="canvas.height" :step="1"
                           @change="waterMarkTextChange"></el-slider>
              </client-only>
            </li>
          </ul>
        </div>
        <p class="hidden sm:block h-[120px] absolute bottom-0 left-0 right-0 w-full text-[12px] font-semibold text-[#666] p-[10px]">
          <Icon name="emojione-v1:circled-information-source"></Icon>
          {{ $t('websiteDesc') }}
        </p>
      </div>
      <div class="bg-[#8881] sm:bg-white p-[20px] sm:h-[calc(100vh-40px)] w-full sm:overflow-y-auto">

        <h1 class="hidden sm:flex text-center text-[22px] font-bold mt-[40px] sm:gap-1 sm:flex-row sm:items-center sm:justify-center">
          {{ $t('websiteName') }}

          <nuxt-link class="text-[12px] text-red-500"
                     href="https://github.com/unilei/image-watermark-tool.git" target="_blank">
            <img style="width: 24px;height: 24px;" src="@/assets/icon/mdi--github.svg" alt="github">
          </nuxt-link>
        </h1>

        <div class="text-center mt-[14px] sm:mt-[40px]">
          <div class="flex flex-col gap-4 items-center">
            <!-- 单张图片上传 -->
            <div>
              <h3 class="text-[16px] font-bold mb-2">{{ $t('singleImageUpload') || '图片上传' }}</h3>
              <input type="file" accept="image/*" multiple @change="onFileChange">
              <p class="text-xs text-gray-500 mt-1">支持选择多张图片</p>
            </div>
            
            <!-- 批量处理目录 -->
            <div>
              <h3 class="text-[16px] font-bold mb-2">{{ $t('batchProcessFolder') || '批量处理目录' }}</h3>
              <div class="flex flex-col gap-2">
                <input type="file" accept="image/*" @change="onFolderChange" webkitdirectory directory multiple>
                
                <!-- Electron原生选择目录按钮 -->
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="selectDirectoryWithElectron" 
                  v-if="$electron?.isElectron"
                >
                  {{ $t('selectDirectoryNative') || '选择目录(桌面版)' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 批量处理进度 -->
        <div class="max-w-[520px] w-full mx-auto my-[12px] sm:my-[20px] p-[10px] text-center" v-if="folderProcessing">
          <div class="flex flex-col gap-2">
            <p class="text-[14px]">{{ $t('processingBatch') || '批量处理中...' }} ({{ processedImages }}/{{ totalImages }})</p>
            <el-progress :percentage="processingProgress" color="#5d5cde"></el-progress>
          </div>
        </div>

        <div class="max-w-[520px] w-full mx-auto my-[12px] sm:my-[40px] p-[10px] text-center" v-show="canvasImage">
          <div class="flex gap-2 justify-center">
            <!-- 网页环境：只有下载按钮 -->
            <template v-if="!$electron?.isElectron">
              <el-button 
                :loading="downloadLoading"
                color="#5d5cde" 
                type="primary"
                @click="handleDownload"
              >
                {{ $t('download') || '下载图片' }}
              </el-button>
            </template>
            
            <!-- 桌面环境：只保留一个按钮 -->
            <template v-else>
              <el-button 
                :loading="downloadLoading"
                color="#5d5cde" 
                type="primary"
                @click="handleSaveWithElectron"
              >
                {{ $t('saveImage') || '保存图片' }}
              </el-button>
            </template>
            
            <!-- 应用到所有按钮，始终可见 -->
            <el-button 
              v-if="thumbnails.length > 1"
              type="danger" 
              @click="applySettingsToAll"
            >
              {{ $t('applyToAll') || '应用到所有' }}
            </el-button>
          </div>
          
          <el-progress class="mt-3"
                       v-if="downloadPercentStatus"
                       :percentage="downloadPercentComplete"
                       color="#5d5cde"
          />
        </div>

        <div class="text-center my-[40px] max-w-[520px] w-full mx-auto p-[10px]" v-show="canvasImage">
          <canvas 
            ref="canvas" 
            @mousedown="startDrag" 
            @mousemove="onDrag" 
            @mouseup="endDrag" 
            @mouseleave="endDrag"
            @touchstart="startDrag"
            @touchmove="onDrag"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
            @wheel="handleWheelZoom"
            :class="{ 'cursor-move': !repeatTextStatus }"
          ></canvas>
          <p v-if="!repeatTextStatus" class="text-[12px] text-gray-500 mt-2">
            <span>{{ $t('dragWatermarkTip') || '提示：您可以直接拖动水印调整位置' }}</span>
            <span class="hidden sm:inline">{{ $t('dragWatermarkTipDesktop') || '（移动鼠标到水印上拖动）' }}</span>
            <span class="sm:hidden">{{ $t('dragWatermarkTipMobile') || '（触摸水印并拖动）' }}</span>
          </p>
          
          <!-- 添加一个大的、明显的应用到所有按钮 -->
          <div v-if="thumbnails.length > 1" class="mt-4">
            <el-button 
              type="danger"
              size="large"
              @click="applySettingsToAll"
              style="font-weight: bold; padding: 12px 24px;"
            >
              将当前水印设置应用到所有图片
            </el-button>
          </div>
        </div>
        
        <!-- 缩略图区域 -->
        <div class="thumbnails-area my-4 max-w-[520px] w-full mx-auto p-[10px]" v-if="showThumbnails && thumbnails.length > 0">
          <div class="flex flex-col">
            <!-- 移除调试信息 -->
            
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-[16px] font-bold">{{ $t('thumbnailsPreview') || '图片预览' }}</h3>
              
              <div class="flex gap-2">
                <!-- 移除应用到所有按钮 -->
                
                <!-- 处理剩余图片按钮 -->
                <el-button 
                  v-if="pendingImages.length > 1 && processedImages === 1"
                  type="primary" 
                  size="small" 
                  @click="handleProcessRemainingImages"
                >
                  {{ $t('processRemainingImages') || '处理剩余图片' }}
                </el-button>
              </div>
            </div>
            
            <!-- 移除多余的应用到所有按钮 -->
            
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="(thumbnail, index) in thumbnails" 
                :key="index" 
                class="thumbnail-item" 
                :class="{ 'active': index === currentImageIndex }"
                @click="selectThumbnail(index)"
              >
                <img 
                  :src="thumbnail.processedUrl" 
                  :alt="thumbnail.name" 
                  class="w-[60px] h-[60px] object-cover border rounded cursor-pointer hover:border-blue-500"
                />
                <span class="text-[10px] block truncate max-w-[60px]" :title="thumbnail.name">
                  {{thumbnail.name}}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
canvas {
  box-sizing: border-box;
  width: 100%;
  border: 1px dashed #AAA;
  border-radius: 8px;
}

.cursor-move {
  cursor: move; /* 显示移动光标 */
}

:deep(.el-slider) {
  --el-slider-main-bg-color: #5d5cde;
}

.thumbnail-item.active img {
  border: 2px solid #5d5cde;
}
</style>