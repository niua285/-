const app = getApp()

Page({
  data: {
    userInfo: {},
    totalDays: 0,
    totalEarnings: 0,
    averageDaily: 0,
    averageHourly: 0,
    averagePrice: 0,
    platformStats: [],
    isLoggedIn: false
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus()
    
    // 计算统计数据
    this.calculateStatistics()
  },
  
  onShow() {
    // 每次显示页面时重新检查用户信息
    this.checkLoginStatus()
    
    // 每次显示页面时重新计算统计数据
    this.calculateStatistics()
  },
  
  // 检查登录状态
  checkLoginStatus() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const userProfile = wx.getStorageSync('userProfile') || {}
    
    if (userInfo && userInfo.nickName) {
      // 如果本地存储有用户信息，则使用本地存储的信息
      // 合并userProfile中的位置信息
      if (userProfile && userProfile.location) {
        userInfo.location = userProfile.location
      }
      
      this.setData({
        userInfo,
        isLoggedIn: true
      })
    } else {
      // 如果本地存储没有用户信息，则从云数据库获取
      this.getUserInfoFromCloud()
    }
  },
  
  // 从云数据库获取用户信息
  getUserInfoFromCloud() {
    wx.showLoading({
      title: '加载中...',
    })
    
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'getUserInfo'
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const userInfo = res.result.data
          
          // 获取用户资料中的位置信息
          const userProfile = wx.getStorageSync('userProfile') || {}
          if (userProfile && userProfile.location) {
            userInfo.location = userProfile.location
          }
          
          // 验证头像URL是否有效
          if (userInfo.avatarUrl && !userInfo.avatarUrl.includes('example.com')) {
            // 头像URL有效，直接使用
            this.setData({
              userInfo,
              isLoggedIn: true
            })
            // 保存到本地存储
            wx.setStorageSync('userInfo', userInfo)
          } else {
            // 头像URL无效，使用默认头像
            this.setData({
              userInfo: {
                ...userInfo,
                avatarUrl: '/images/default-avatar.svg'
              },
              isLoggedIn: true
            })
            // 保存到本地存储
            wx.setStorageSync('userInfo', {
              ...userInfo,
              avatarUrl: '/images/default-avatar.svg'
            })
          }
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('获取用户信息失败：', err)
      }
    })
  },

  // 登录并获取用户信息
  login() {
    // 检查是否已经尝试过登录
    const lastLoginAttempt = wx.getStorageSync('lastLoginAttempt') || 0
    const now = Date.now()
    
    // 如果距离上次尝试登录不到1分钟，则提示用户稍后再试
    if (now - lastLoginAttempt < 60000) {
      wx.showToast({
        title: '请稍后再试',
        icon: 'none'
      })
      return
    }
    
    // 记录本次登录尝试时间
    wx.setStorageSync('lastLoginAttempt', now)
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        // 保存到云数据库
        wx.showLoading({
          title: '登录中...',
        })
        
        wx.cloud.callFunction({
          name: 'userManager',
          data: {
            action: 'updateUserInfo',
            userInfo: res.userInfo
          },
          success: result => {
            wx.hideLoading()
            if (result.result && result.result.success) {
              this.setData({
                userInfo: res.userInfo,
                isLoggedIn: true
              })
              // 保存到本地存储
              wx.setStorageSync('userInfo', res.userInfo)
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: '登录失败',
                icon: 'none'
              })
            }
          },
          fail: err => {
            wx.hideLoading()
            console.error('保存用户信息失败：', err)
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            })
          }
        })
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err)
        wx.showToast({
          title: '您取消了授权',
          icon: 'none'
        })
      }
    })
  },

  // 编辑用户信息
  editUserInfo() {
    if (!this.data.isLoggedIn) {
      // 不再自动调用login函数，而是提示用户先登录
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 跳转到手动编辑页面
    wx.navigateTo({
      url: '/pages/profile/manual-edit/manual-edit'
    })
  },

  // 计算统计数据
  calculateStatistics() {
    // 从云数据库获取工资记录
    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'getSalaryRecords'
      },
      success: res => {
        if (res.result && res.result.success) {
          const records = res.result.data || []
          
          // 计算总天数和总收入
          const totalDays = records.length
          const totalEarnings = records.reduce((sum, record) => sum + (parseFloat(record.earnings) || 0), 0)
          
          // 计算平均日收入
          const averageDaily = totalDays > 0 ? (totalEarnings / totalDays).toFixed(2) : 0
          
          // 计算平均时薪
          const totalHours = records.reduce((sum, record) => sum + (parseFloat(record.hours) || 0), 0)
          const averageHourly = totalHours > 0 ? (totalEarnings / totalHours).toFixed(2) : 0
          
          // 计算平均单价
          const totalOrders = records.reduce((sum, record) => sum + (parseInt(record.orders) || 0), 0)
          const averagePrice = totalOrders > 0 ? (totalEarnings / totalOrders).toFixed(2) : 0
          
          // 计算平台统计
          const platformStats = this.calculatePlatformStats(records)
          
          this.setData({
            totalDays,
            totalEarnings: totalEarnings.toFixed(2),
            averageDaily,
            averageHourly,
            averagePrice,
            platformStats
          })
        }
      },
      fail: err => {
        console.error('获取工资记录失败：', err)
      }
    })
  },
  
  // 计算平台统计
  calculatePlatformStats(records) {
    const platformMap = {}
    
    // 按平台分组统计
    records.forEach(record => {
      const platform = record.platform || '其他'
      if (!platformMap[platform]) {
        platformMap[platform] = {
          platform,
          days: 0,
          earnings: 0,
          hours: 0,
          orders: 0
        }
      }
      
      platformMap[platform].days++
      platformMap[platform].earnings += parseFloat(record.earnings) || 0
      platformMap[platform].hours += parseFloat(record.hours) || 0
      platformMap[platform].orders += parseInt(record.orders) || 0
    })
    
    // 计算每个平台的平均值
    const platformStats = Object.values(platformMap).map(platform => {
      const average = platform.days > 0 ? (platform.earnings / platform.days).toFixed(2) : 0
      const hourly = platform.hours > 0 ? (platform.earnings / platform.hours).toFixed(2) : 0
      const price = platform.orders > 0 ? (platform.earnings / platform.orders).toFixed(2) : 0
      
      return {
        ...platform,
        earnings: platform.earnings.toFixed(2),
        average,
        hourly,
        price
      }
    })
    
    return platformStats
  },

  // 编辑资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    })
  },

  // 清除数据
  clearData() {
    wx.showModal({
      title: '提示',
      content: '确定要清除所有数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清除中...',
          })
          
          // 调用云函数清除数据
          wx.cloud.callFunction({
            name: 'salaryManager',
            data: {
              action: 'clearSalaryRecords'
            },
            success: res => {
              wx.hideLoading()
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '清除成功',
                  icon: 'success'
                })
                // 重新计算统计数据
                this.calculateStatistics()
              } else {
                wx.showToast({
                  title: '清除失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              wx.hideLoading()
              console.error('清除数据失败：', err)
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '跑单计算器 v1.0.0\n\n一款帮助外卖骑手、快递员等计算收入的工具。',
      showCancel: false
    })
  },

  checkAuth: function() {
    app.checkUserAuth().then(isAuthorized => {
      if (!isAuthorized) {
        wx.navigateTo({
          url: '/pages/auth/auth'
        })
      }
    })
  }
}) 