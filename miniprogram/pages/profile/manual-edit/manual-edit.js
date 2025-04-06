const app = getApp()

Page({
  data: {
    userInfo: {},
    isEditing: false
  },

  onLoad: function() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({
      userInfo
    })
  },

  // 选择头像
  chooseAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.setData({
          'userInfo.avatarUrl': tempFilePath
        })
      }
    })
  },

  // 输入昵称
  onNicknameInput: function(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  // 保存资料
  saveProfile: function() {
    const { userInfo } = this.data
    
    // 验证必填字段
    if (!userInfo.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    // 显示加载中
    wx.showLoading({
      title: '保存中...',
    })
    
    // 保存到云数据库
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'updateUserInfo',
        userInfo: userInfo
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          // 保存用户信息到本地存储
          wx.setStorageSync('userInfo', userInfo)
          
          // 更新全局数据
          app.globalData.userInfo = userInfo
          
          // 设置已提交资料标志
          wx.setStorageSync('hasSubmittedProfile', true)
          
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                // 返回上一页
                wx.navigateBack()
              }, 2000)
            }
          })
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('保存用户信息失败：', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 退出登录
  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('hasSubmittedProfile')
          
          // 更新全局数据
          app.globalData.userInfo = null
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                wx.navigateBack()
              }, 2000)
            }
          })
        }
      }
    })
  }
}) 