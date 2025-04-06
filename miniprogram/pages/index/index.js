const app = getApp()

Page({
  data: {
    userInfo: {},
    todayHours: 0,
    todayEarnings: 0,
    todayOrders: 0,
    todayHourlyRate: 0,
    platformStats: []
  },

  onLoad: function() {
    this.loadUserInfo()
    this.loadTodayData()
    this.calculatePlatformStats()
  },

  onShow: function() {
    this.loadTodayData()
    this.calculatePlatformStats()
    this.drawTrendChart()
    this.checkAuth()
  },

  // 加载用户信息
  loadUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo
      })
    }
  },

  // 获取用户信息
  getUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        })
        wx.setStorageSync('userInfo', res.userInfo)
      }
    })
  },

  // 加载今日数据
  loadTodayData: function() {
    const records = wx.getStorageSync('salaryRecords') || []
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = records.filter(record => record.date === today)

    if (todayRecords.length > 0) {
      // 合并同一天的所有记录
      const totalHours = todayRecords.reduce((sum, record) => sum + parseFloat(record.totalHours), 0)
      const totalEarnings = todayRecords.reduce((sum, record) => sum + parseFloat(record.totalSalary), 0)
      const totalOrders = todayRecords.reduce((sum, record) => sum + (parseInt(record.orders) || 0), 0)
      const hourlyRate = totalHours > 0 ? (totalEarnings / totalHours).toFixed(2) : 0

      this.setData({
        todayHours: totalHours.toFixed(2),
        todayEarnings: totalEarnings.toFixed(2),
        todayOrders: totalOrders,
        todayHourlyRate: hourlyRate
      })
    } else {
      this.setData({
        todayHours: '0.00',
        todayEarnings: '0.00',
        todayOrders: 0,
        todayHourlyRate: '0.00'
      })
    }
  },

  // 计算平台统计数据
  calculatePlatformStats: function() {
    const records = wx.getStorageSync('salaryRecords') || []
    const platformData = {}
    
    records.forEach(record => {
      if (!platformData[record.platform]) {
        platformData[record.platform] = {
          platform: record.platform,
          days: 0,
          earnings: 0,
          average: 0
        }
      }
      
      platformData[record.platform].days++
      platformData[record.platform].earnings += parseFloat(record.totalSalary)
    })

    // 计算每个平台的平均值
    Object.values(platformData).forEach(platform => {
      platform.average = (platform.earnings / platform.days).toFixed(2)
      platform.earnings = platform.earnings.toFixed(2)
    })

    this.setData({
      platformStats: Object.values(platformData)
    })
  },

  // 绘制趋势图表
  drawTrendChart: function() {
    const ctx = wx.createCanvasContext('trendChart')
    const records = wx.getStorageSync('salaryRecords') || []
    
    // 获取最近7天的数据
    const dates = []
    const earnings = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
      
      const dayRecords = records.filter(record => record.date === dateStr)
      const dayEarnings = dayRecords.reduce((sum, record) => sum + parseFloat(record.totalSalary), 0)
      earnings.push(dayEarnings)
    }

    if (earnings.length === 0) {
      ctx.draw()
      return
    }

    // 设置图表参数
    const width = 300
    const height = 200
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // 绘制坐标轴
    ctx.beginPath()
    ctx.setLineWidth(1)
    ctx.setStrokeStyle('#ddd')
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // 绘制数据线
    const maxValue = Math.max(...earnings)
    const minValue = Math.min(...earnings)
    const valueRange = maxValue - minValue

    ctx.beginPath()
    ctx.setLineWidth(2)
    ctx.setStrokeStyle('#1296db')
    
    earnings.forEach((value, index) => {
      const x = padding + (index / (earnings.length - 1)) * chartWidth
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()

    // 绘制数据点
    earnings.forEach((value, index) => {
      const x = padding + (index / (earnings.length - 1)) * chartWidth
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight
      
      ctx.beginPath()
      ctx.setFillStyle('#1296db')
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    ctx.draw()
  },

  // 页面导航
  navigateToSalary: function() {
    wx.switchTab({
      url: '/pages/salary/salary'
    })
  },

  navigateToAnalysis: function() {
    wx.switchTab({
      url: '/pages/analysis/analysis'
    })
  },

  navigateToRanking: function() {
    wx.switchTab({
      url: '/pages/ranking/ranking'
    })
  },

  navigateToProfile: function() {
    wx.switchTab({
      url: '/pages/profile/profile'
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