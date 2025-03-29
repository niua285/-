Page({
  data: {
    content: '',
    fontSize: 32,
    lineHeight: 1.5,
    textAlign: 'left',
    isBold: false,
    isItalic: false,
    textColor: '#000000',
    fontFamily: 'sans-serif',
    imgWidth: 500,
    imgHeight: 500,
    canvasWidth: 500,
    canvasHeight: 500,
    canvasContext: null,
    canvasQuery: null,
    hasPhotoAlbumAuth: false,  // 是否已授权相册
    showAuthButton: false      // 是否显示授权按钮
  },

  onLoad(options) {
    if (options.content) {
      this.setData({
        content: decodeURIComponent(options.content),
        fontSize: parseInt(options.fontSize) || 32,
        textAlign: options.textAlign || 'left',
        isBold: options.isBold === 'true',
        isItalic: options.isItalic === 'true',
        textColor: options.textColor || '#000000',
        fontFamily: options.fontFamily || 'sans-serif'
      });
      
      // 根据文字数量自动计算推荐的画布大小
      this.calculateRecommendedCanvasSize();
    }
    this.initCanvasQuery();
    this.checkPhotoAlbumAuth();
  },

  initCanvasQuery() {
    const query = wx.createSelectorQuery();
    query.select('#textCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置 canvas 的实际尺寸，将分辨率提高为原来的2倍
          canvas.width = this.data.imgWidth * 2;
          canvas.height = this.data.imgHeight * 2;
          ctx.scale(2, 2); // 缩放画布以匹配高分辨率
          
          this.setData({
            canvasQuery: query,
            canvasContext: ctx
          }, () => {
            this.drawText(); // 确保在context设置完成后再绘制
          });
        } else {
          console.error('Canvas initialization failed');
          wx.showToast({
            title: '画布初始化失败',
            icon: 'none'
          });
        }
      });
  },

  drawText() {
    const ctx = this.data.canvasContext;
    if (!ctx) return;

    const content = this.data.content;
    const fontSize = this.data.fontSize;
    const textAlign = this.data.textAlign;
    const isBold = this.data.isBold;
    const isItalic = this.data.isItalic;
    const textColor = this.data.textColor;
    const fontFamily = this.data.fontFamily;

    // 清空画布并设置白色背景
    ctx.clearRect(0, 0, this.data.imgWidth * 2, this.data.imgHeight * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.data.imgWidth * 2, this.data.imgHeight * 2);

    // 设置文字样式
    ctx.fillStyle = textColor;
    let fontStyle = '';
    if (isBold) fontStyle += 'bold ';
    if (isItalic) fontStyle += 'italic ';
    if (!fontStyle) fontStyle = 'normal ';
    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';

    // 计算文字换行
    const maxWidth = this.data.imgWidth * 0.9; // 使用90%的宽度
    // 按换行符分割文本
    const linesByNewline = content.split('\n');
    let lines = [];

    for (let i = 0; i < linesByNewline.length; i++) {
      const lineContent = linesByNewline[i];
      if (lineContent === '') {
        // 空行处理
        lines.push('');
        continue;
      }
      
      const words = lineContent.split('');
      let line = '';
      
      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && line !== '') {
          lines.push(line);
          line = words[j];
        } else {
          line = testLine;
        }
      }
      
      if (line) {
        lines.push(line);
      }
    }

    // 计算总高度和起始Y坐标
    const lineHeight = fontSize * 1.5; // 使用1.5倍行高
    const totalHeight = lines.length * lineHeight;
    let startY = (this.data.imgHeight - totalHeight) / 2;
    if (startY < 0) startY = 10; // 防止文字超出上边界

    // 绘制每一行文字
    lines.forEach((line, index) => {
      let x;
      switch (textAlign) {
        case 'left':
          x = this.data.imgWidth * 0.05; // 左边距为5%
          break;
        case 'right':
          x = this.data.imgWidth * 0.95; // 右边距为5%
          break;
        default: // center
          x = this.data.imgWidth / 2;
      }
      const y = startY + (index * lineHeight) + (lineHeight / 2);
      ctx.fillText(line, x, y);
    });

    console.log(`绘制完成: ${lines.length}行文字`);
  },

  adjustSizeInput(e) {
    const type = e.currentTarget.dataset.type;
    const value = e.detail.value;
    this.setData({
      [type]: value
    });
  },

  adjustSizeBlur(e) {
    const type = e.currentTarget.dataset.type;
    let value = e.detail.value;
    
    if (!value) {
      value = 500;
    } else {
      value = parseInt(value);
      if (isNaN(value) || value < 100) value = 100;
      if (value > 2000) value = 2000;
    }
    
    this.setData({
      [type]: value
    }, () => {
      this.reinitCanvas();
    });
  },

  reinitCanvas() {
    if (this.data.canvasQuery) {
      this.data.canvasQuery.select('#textCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 设置 canvas 的实际尺寸
            canvas.width = this.data.imgWidth * 2;
            canvas.height = this.data.imgHeight * 2;
            ctx.scale(2, 2); // 缩放画布以匹配高分辨率
            
            // 更新画布上下文和尺寸
            this.setData({
              canvasContext: ctx,
              canvasWidth: this.data.imgWidth,
              canvasHeight: this.data.imgHeight
            }, () => {
              // 重新绘制文本
              this.drawText();
            });
          } else {
            console.error('Canvas reinitialization failed');
            wx.showToast({
              title: '画布重新初始化失败',
              icon: 'none'
            });
          }
        });
    }
  },

  checkPhotoAlbumAuth() {
    wx.getSetting({
      success: (res) => {
        const authSetting = res.authSetting;
        if (authSetting['scope.writePhotosAlbum'] === true) {
          // 已授权
          this.setData({
            hasPhotoAlbumAuth: true,
            showAuthButton: false
          });
        } else if (authSetting['scope.writePhotosAlbum'] === false) {
          // 已拒绝授权
          this.setData({
            hasPhotoAlbumAuth: false,
            showAuthButton: true
          });
        } else {
          // 未询问过授权
          this.setData({
            hasPhotoAlbumAuth: false,
            showAuthButton: false
          });
        }
      },
      fail: (err) => {
        console.error('获取授权设置失败:', err);
      }
    });
  },
  
  requestAlbumAuth() {
    console.log('使用授权按钮请求授权');
    // 直接打开设置页面
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum']) {
          this.setData({
            hasPhotoAlbumAuth: true,
            showAuthButton: false
          });
          
          // 授权成功后可以提示用户
          wx.showToast({
            title: '授权成功',
            icon: 'success'
          });
        } else {
          this.setData({
            hasPhotoAlbumAuth: false,
            showAuthButton: true
          });
        }
      }
    });
  },

  saveImage() {
    if (!this.data.canvasContext) {
      wx.showToast({
        title: '画布未初始化',
        icon: 'none'
      });
      return;
    }

    // 先请求权限，在正式环境中这是必要的第一步
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => {
        // 授权成功，直接进行保存
        this.startSaveImageProcess();
      },
      fail: (err) => {
        console.log('授权请求失败', err);
        // 如果授权失败，再检查当前授权状态
        wx.getSetting({
          success: (setting) => {
            if (setting.authSetting['scope.writePhotosAlbum']) {
              // 已经有权限，直接保存
              this.startSaveImageProcess();
            } else {
              // 显示授权按钮
              this.setData({
                showAuthButton: true
              });
              
              // 引导用户去授权
              wx.showModal({
                title: '提示',
                content: '需要授权保存图片到相册',
                confirmText: '去授权',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                          // 用户授权成功
                          this.setData({
                            hasPhotoAlbumAuth: true,
                            showAuthButton: false
                          });
                          // 延迟执行保存流程，避免授权后立即操作的问题
                          setTimeout(() => {
                            this.startSaveImageProcess();
                          }, 300);
                        }
                      }
                    });
                  }
                }
              });
            }
          }
        });
      }
    });
  },
  
  // 开始保存图片的流程
  startSaveImageProcess() {
    // 重新绘制文本以确保最新状态
    this.drawText();

    // 显示加载提示
    wx.showLoading({
      title: '正在生成图片...',
      mask: true
    });

    const query = wx.createSelectorQuery();
    query.select('#textCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          
          try {
            // 确保传递正确的canvas参数，使用最高质量和PNG格式
            wx.canvasToTempFilePath({
              canvas: canvas,
              destWidth: this.data.imgWidth * 2,
              destHeight: this.data.imgHeight * 2,
              fileType: 'png',
              quality: 1,
              success: (res) => {
                console.log('临时文件路径生成成功');
                
                // 验证临时文件路径是否有效
                if (!res.tempFilePath || typeof res.tempFilePath !== 'string') {
                  wx.hideLoading();
                  console.error('临时文件路径无效');
                  wx.showToast({
                    title: '生成图片失败',
                    icon: 'none'
                  });
                  return;
                }
                
                // 直接使用临时文件保存，不进行额外的文件系统操作
                this.doSaveImage(res.tempFilePath);
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('生成临时图片失败:', err);
                // 失败后尝试使用其他方式获取图片
                this.tryDirectCanvasSave(canvas);
              }
            });
          } catch (error) {
            wx.hideLoading();
            console.error('保存过程出错:', error);
            wx.showToast({
              title: '保存过程发生错误',
              icon: 'none'
            });
          }
        } else {
          wx.hideLoading();
          console.error('获取Canvas失败');
          wx.showToast({
            title: '画布获取失败',
            icon: 'none'
          });
        }
      });
  },
  
  // 尝试直接从Canvas获取图片数据并保存
  tryDirectCanvasSave(canvas) {
    try {
      // 直接创建临时图片文件
      const tempFilePath = `${wx.env.USER_DATA_PATH}/canvas_image_${Date.now()}.png`;
      const fs = wx.getFileSystemManager();
      
      // 从Canvas获取数据URL
      const dataURL = canvas.toDataURL('image/png');
      // 提取BASE64数据
      const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
      
      // 写入临时文件
      fs.writeFileSync(tempFilePath, base64Data, 'base64');
      console.log('Canvas直接写入临时文件成功');
      
      // 使用临时文件保存
      this.doSaveImage(tempFilePath);
    } catch (err) {
      console.error('Canvas直接保存失败:', err);
      wx.showToast({
        title: '图片生成失败',
        icon: 'none'
      });
    }
  },

  // 添加一个新方法处理实际的保存操作
  doSaveImage(filePath) {
    // 确保文件路径有效
    if (!filePath || typeof filePath !== 'string') {
      wx.hideLoading();
      console.error('文件路径无效:', filePath);
      wx.showToast({
        title: '文件路径无效',
        icon: 'none'
      });
      return;
    }
    
    console.log('准备保存图片...');
    
    // 判断是否为自定义路径（需要后续清理）
    const isCustomPath = filePath.indexOf(wx.env.USER_DATA_PATH) === 0;
    
    // 直接执行保存，不再检查授权（因为在saveImage函数中已经检查过）
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: (res) => {
        wx.hideLoading();
        console.log('图片保存成功:', res);
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 如果是自定义临时文件，保存后删除它
        if (isCustomPath) {
          this.cleanupTempFile(filePath);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('保存到相册失败:', err);
        
        // 如果是自定义临时文件，发生错误也要清理
        if (isCustomPath) {
          this.cleanupTempFile(filePath);
        }
        
        if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
          // 授权被拒绝
          wx.showModal({
            title: '保存失败',
            content: '请授权保存到相册的权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else if (err.errMsg && err.errMsg.indexOf('file not exist') > -1) {
          // 文件不存在错误
          this.handleFileNotExistError();
        } else {
          // 其他错误
          wx.showToast({
            title: '保存失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },
  
  // 处理文件不存在的错误
  handleFileNotExistError() {
    console.error('临时文件不存在，重新尝试');
    // 提示用户重试
    wx.showModal({
      title: '提示',
      content: '保存图片失败，请重新尝试',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          this.startSaveImageProcess();
        }
      }
    });
  },
  
  // 清理临时文件
  cleanupTempFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    
    try {
      const fs = wx.getFileSystemManager();
      fs.unlink({
        filePath: filePath,
        success: () => {
          console.log('临时文件清理成功:', filePath);
        },
        fail: (err) => {
          console.error('临时文件清理失败:', err);
        }
      });
    } catch (err) {
      console.error('清理临时文件过程出错:', err);
    }
  },

  // 计算推荐的画布大小
  calculateRecommendedCanvasSize() {
    const content = this.data.content;
    const fontSize = this.data.fontSize;
    
    if (!content || content.length === 0) return;
    
    // 计算文字数量
    const charCount = content.length;
    
    // 基于字体大小和文字数量的简单算法
    // 假设一行能容纳的平均字符数 = 画布宽度 / (fontSize * 0.6)
    // 宽度基准值
    let baseWidth = 500;
    // 初始高度与宽度相同
    let baseHeight = 500;
    
    // 根据文字数量调整
    if (charCount > 100 && charCount <= 300) {
      baseWidth = 600;
      baseHeight = 700;
    } else if (charCount > 300 && charCount <= 500) {
      baseWidth = 700;
      baseHeight = 800;
    } else if (charCount > 500) {
      baseWidth = 800;
      baseHeight = 1000;
    }
    
    // 根据字体大小进行额外调整
    const sizeFactor = fontSize / 32;  // 32是默认字体大小
    baseWidth = Math.max(500, Math.round(baseWidth * sizeFactor));
    baseHeight = Math.max(500, Math.round(baseHeight * sizeFactor));
    
    // 限制最大尺寸
    baseWidth = Math.min(baseWidth, 1500);
    baseHeight = Math.min(baseHeight, 2000);
    
    // 询问用户是否使用推荐尺寸
    this.showSizeRecommendation(baseWidth, baseHeight);
  },
  
  // 显示尺寸推荐对话框
  showSizeRecommendation(width, height) {
    wx.showModal({
      title: '画布尺寸推荐',
      content: `根据您的文字数量，推荐画布尺寸为 ${width}×${height}px。是否应用此尺寸？`,
      confirmText: '应用',
      cancelText: '保持当前',
      success: (res) => {
        if (res.confirm) {
          // 用户确认使用推荐尺寸
          this.setData({
            imgWidth: width,
            imgHeight: height
          }, () => {
            // 重新初始化画布
            this.reinitCanvas();
          });
        }
      }
    });
  }
});