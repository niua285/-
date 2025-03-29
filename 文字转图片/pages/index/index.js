Page({
  data: {
    content: '',
    fontSize: 32,
    textAlign: 'left',
    isBold: false,
    isItalic: false,
    textColor: '#000000',
    showColorPicker: false,
    showFontPicker: false,
    selectedFont: 'sans-serif',
    maxCharacterCount: 800,  // 添加最大字符数限制
    currentCharCount: 0,     // 当前字符数
    colors: [
      '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
      '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#00CCFF', '#0000FF',
      '#9900FF', '#FF00FF', '#FF0099', '#FF6600', '#FFCC00', '#00FF00'
    ],
    fonts: [
      'sans-serif',
      'serif',
      'monospace',
      'Arial',
      'Times New Roman',
      'Courier New',
      'Georgia',
      'Verdana',
      'Tahoma',
      'Trebuchet MS',
      'Impact',
      'Comic Sans MS'
    ]
  },
  onInput(e) {
    // 获取输入的内容
    let value = e.detail.value;
    
    // 检查字符数是否超过限制
    if (value.length > this.data.maxCharacterCount) {
      // 截取到最大字符数
      value = value.substring(0, this.data.maxCharacterCount);
      // 提示用户已达到字数限制
      wx.showToast({
        title: `最多输入${this.data.maxCharacterCount}字`,
        icon: 'none',
        duration: 1500
      });
    }
    
    // 更新内容和当前字符数
    this.setData({
      content: value,
      currentCharCount: value.length
    });
  },
  onFontSizeChange(e) {
    this.setData({
      fontSize: e.detail.value
    });
  },
  onFontSizeInput(e) {
    const value = e.detail.value;
    // 如果输入为空，保持原值
    if (value === '') {
      return;
    }
    // 转换为数字
    const numValue = parseInt(value);
    // 如果转换失败，保持原值
    if (isNaN(numValue)) {
      return;
    }
    // 限制范围并更新
    if (numValue >= 12 && numValue <= 72) {
      this.setData({
        fontSize: numValue
      });
    }
  },
  setTextAlign(e) {
    const align = e.currentTarget.dataset.align;
    this.setData({
      textAlign: align
    });
  },
  onTextSelect: function (e) {
    this.setData({
      selectedText: e.detail.value.slice(e.detail.start, e.detail.end),
      selectedStart: e.detail.start,
      selectedEnd: e.detail.end
    });
  },
  toggleBold: function () {
    this.setData({
      isBold: !this.data.isBold
    });
  },
  toggleItalic: function () {
    this.setData({
      isItalic: !this.data.isItalic
    });
  },
  selectColor: function (e) {
    var color = e.currentTarget.dataset.color;
    var content = this.data.content;
    var start = this.data.selectedStart;
    var end = this.data.selectedEnd;
    var newContent = content.slice(0, start) + '<span style="color:' + color + '">' + content.slice(start, end) + '</span>' + content.slice(end);
    const query = wx.createSelectorQuery();
    query.select('#textInput').fields({ node: true, size: true }).exec((res) => {
      if (res[0]) {
        const textInput = res[0].node;
        textInput.value = newContent;
        this.setData({ content: newContent });
      }
    });
  },
  insertNewline() {
    const content = this.data.content;
    const cursorPosition = content.length;
    const newContent = content.slice(0, cursorPosition) + '\n' + content.slice(cursorPosition);
    this.setData({
      content: newContent
    });
  },
  showColorPicker() {
    this.setData({
      showColorPicker: true
    });
  },
  hideColorPicker() {
    this.setData({
      showColorPicker: false
    });
  },
  showFontPicker() {
    this.setData({
      showFontPicker: true
    });
  },
  hideFontPicker() {
    this.setData({
      showFontPicker: false
    });
  },
  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      textColor: color,
      showColorPicker: false
    });
  },
  selectFont(e) {
    const font = e.currentTarget.dataset.font;
    this.setData({
      selectedFont: font,
      showFontPicker: false
    });
  },
  generateImage() {
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入文字内容',
        icon: 'none'
      });
      return;
    }
    
    try {
      const params = {
        content: encodeURIComponent(this.data.content),
        fontSize: this.data.fontSize,
        textAlign: this.data.textAlign,
        isBold: this.data.isBold,
        isItalic: this.data.isItalic,
        textColor: this.data.textColor,
        fontFamily: this.data.selectedFont
      };
      
      const url = `/pages/generate/generate?${Object.keys(params).map(key => `${key}=${params[key]}`).join('&')}`;
      console.log('导航到:', url);
      
      wx.navigateTo({
        url: url,
        fail: function(err) {
          console.error('导航失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    } catch(e) {
      console.error('生成参数失败:', e);
      wx.showToast({
        title: '生成参数失败',
        icon: 'none'
      });
    }
  }
})