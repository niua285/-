App({
  globalData: {
    userInfo: null,
    isFirstLaunch: true,
    hasCheckedAuth: false
  },

  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-4gt28sqled0de1fe',
        traceUser: true,
      })

      // 初始化数据库
      this.initDatabase()
    }

    // 检查是否首次启动
    const isFirstLaunch = wx.getStorageSync('isFirstLaunch')
    if (isFirstLaunch === '') {
      // 首次启动，跳转到收入页面
      wx.switchTab({
        url: '/pages/salary/salary'
      })
      wx.setStorageSync('isFirstLaunch', 'false')
    }
  },

  // 初始化数据库
  initDatabase: function() {
    wx.cloud.callFunction({
      name: 'initDatabase',
      success: res => {
        console.log('数据库初始化成功：', res)
      },
      fail: err => {
        console.error('数据库初始化失败：', err)
        // 添加重试机制
        setTimeout(() => {
          this.initDatabase()
        }, 3000)
      }
    })
  },

  // 检查用户是否已授权
  checkUserAuth: function() {
    if (this.globalData.hasCheckedAuth) {
      return Promise.resolve(this.globalData.userInfo !== null)
    }
    
    this.globalData.hasCheckedAuth = true
    
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getUserInfo'
        },
        success: res => {
          if (res.result.success && res.result.data) {
            this.globalData.userInfo = res.result.data
            resolve(true)
          } else {
            resolve(false)
          }
        },
        fail: err => {
          console.error('获取用户信息失败：', err)
          resolve(false)
        }
      })
    })
  },

  // 处理手机号登录
  handlePhoneLogin: function() {
    return new Promise((resolve, reject) => {
      // 获取手机号
      wx.getPhoneNumber({
        success: async (res) => {
          try {
            // 调用云函数获取手机号
            const cloudRes = await wx.cloud.callFunction({
              name: 'getPhoneNumber',
              data: {
                code: res.code
              }
            })
            
            // 更新用户信息到云数据库
            await wx.cloud.callFunction({
              name: 'userManager',
              data: {
                action: 'updateUserInfo',
                userInfo: {
                  phoneNumber: cloudRes.result.phoneNumber
                }
              }
            })
            
            resolve(cloudRes)
          } catch (err) {
            console.error('获取手机号失败：', err)
            reject(err)
          }
        },
        fail: (err) => {
          console.error('获取手机号失败：', err)
          reject(err)
        }
      })
    })
  },

  // 获取位置信息的方法
  getLocation: function() {
    return new Promise((resolve, reject) => {
      wx.chooseLocation({
        success: res => {
          this.globalData.location = {
            latitude: res.latitude,
            longitude: res.longitude,
            address: res.address
          }
          resolve(res)
        },
        fail: err => {
          console.error('选择位置信息失败：', err)
          reject(err)
        }
      })
    })
  }
}) 