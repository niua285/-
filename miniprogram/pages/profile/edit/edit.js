const app = getApp()

Page({
  data: {
    userInfo: {},
    workTypes: ['外卖配送', '快递配送', '跑腿代购', '其他'],
    workTypeIndex: 0,
    experiences: ['1年以下', '1-2年', '2-3年', '3-5年', '5年以上'],
    experienceIndex: 0
  },

  onLoad: function() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const userProfile = wx.getStorageSync('userProfile') || {}
    
    // 确保region是数组
    if (userInfo.region && !Array.isArray(userInfo.region)) {
      userInfo.region = [userInfo.region]
    }
    
    // 合并userProfile中的位置信息
    if (userProfile && userProfile.location) {
      userInfo.location = userProfile.location
    }
    
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

  // 选择性别
  onGenderChange: function(e) {
    this.setData({
      'userInfo.gender': parseInt(e.detail.value)
    })
  },

  // 选择生日
  onBirthdayChange: function(e) {
    this.setData({
      'userInfo.birthday': e.detail.value
    })
  },

  // 选择工作类型
  onWorkTypeChange: function(e) {
    this.setData({
      workTypeIndex: e.detail.value,
      'userInfo.workType': this.data.workTypes[e.detail.value]
    })
  },

  // 选择工作经验
  onExperienceChange: function(e) {
    this.setData({
      experienceIndex: e.detail.value,
      'userInfo.experience': this.data.experiences[e.detail.value]
    })
  },

  // 选择位置
  chooseLocation: function() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.getUserLocation();
            },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '需要获取您的地理位置，请确认授权',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          this.getUserLocation();
        }
      }
    });
  },

  // 获取用户位置
  getUserLocation: function() {
    wx.showLoading({
      title: '选择位置中...',
    });
    
    wx.chooseLocation({
      success: (res) => {
        wx.hideLoading();
        const location = `${res.address}`;
        
        // 更新本地数据
        this.setData({
          'userInfo.location': location
        });
        
        // 同步到用户资料
        this.updateUserLocation(location);
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '选择位置失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 更新用户位置信息到个人资料
  updateUserLocation: function(location) {
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'updateUserProfile',
        profile: {
          location: location
        }
      },
      success: res => {
        if (res.result && res.result.success) {
          console.log('位置信息更新成功');
          // 更新本地存储的用户资料
          const userProfile = wx.getStorageSync('userProfile') || {};
          userProfile.location = location;
          wx.setStorageSync('userProfile', userProfile);
          
          // 同时更新userInfo中的位置信息
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.location = location;
          wx.setStorageSync('userInfo', userInfo);
          
          // 显示成功提示
          wx.showToast({
            title: '位置已更新',
            icon: 'success',
            duration: 2000
          });
        } else {
          console.error('位置信息更新失败:', res.result);
        }
      },
      fail: err => {
        console.error('更新位置信息失败:', err);
      }
    });
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
    
    // 确保region是数组
    if (userInfo.region && !Array.isArray(userInfo.region)) {
      userInfo.region = [userInfo.region]
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
          
          // 显示成功提示
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          })
          
          // 延迟返回，避免回调问题
          setTimeout(() => {
            // 直接返回上一页
            wx.navigateBack()
          }, 2000)
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
  }
}) 