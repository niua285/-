const app = getApp()

Page({
  data: {
    platforms: ['全部', '美团', '饿了么', '京东秒送', '达达', 'UU跑腿', '闪送', '顺丰同城'],
    platformIndex: 0,
    currentDimension: 'hourly',
    location: '',
    rankings: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    userRank: null,
    userRankText: '',
    isFirstVisit: true,
    hasLocationAuth: false,
    hasSubmittedProfile: false,
    currentUserRank: null,
    loading: false,
    userRankInfo: {
      rank: 0,
      averageHourly: '0.00',
      averageDaily: '0.00'
    },
    industryPlatforms: {
      '外卖跑腿': ['美团', '饿了么', '京东秒送', '达达', 'UU跑腿', '闪送', '顺丰同城'],
      '快递物流': ['顺丰', '京东', '中通', '申通', '圆通', '邮政', '极兔', '货拉拉', '滴滴'],
      '网约车': ['滴滴出行', '高德打车', '曹操出行', '哈啰', '美团', 'T3出行', '首汽约车', '神州专车', '花小猪'],
      '共享单车': ['哈啰', '美团', '青桔']
    }
  },

  onLoad: function() {
    // 检查是否首次访问
    const isFirstVisit = wx.getStorageSync('isFirstVisit') === ''
    this.setData({ isFirstVisit })
    
    if (!isFirstVisit) {
      this.checkProfileSubmitted()
      this.loadRankings()
    } else {
      // 设置首次访问标志
      wx.setStorageSync('isFirstVisit', 'false')
      this.setData({ isFirstVisit: false })
      
      // 加载排行榜数据
      this.loadRankings()
    }
  },

  onShow: function() {
    // 每次显示页面时检查是否已提交资料
    this.checkProfileSubmitted()
    
    // 检查是否已完成首次访问设置
    if (this.data.isFirstVisit) {
      // 如果已完成位置授权和资料提交，则完成首次访问设置
      if (this.data.hasLocationAuth && this.data.hasSubmittedProfile) {
        // 设置首次访问标志
        wx.setStorageSync('isFirstVisit', 'false')
        this.setData({ isFirstVisit: false })
        
        // 加载排行榜数据
        this.loadRankings()
      }
    } else {
      // 非首次访问，更新平台列表并加载排行榜数据
      this.updatePlatformList()
    }
  },

  // 加载排行榜数据
  loadRankings: function() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    wx.showLoading({
      title: '加载中...',
    })
    
    // 获取当前选择的平台
    const platform = this.data.platformIndex === 0 ? '' : this.data.platforms[this.data.platformIndex]
    
    // 调用云函数获取排行榜数据
    wx.cloud.callFunction({
      name: 'rankingManager',
      data: {
        action: 'getRankings',
        platform: platform,
        dimension: this.data.currentDimension
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const { rankings, currentUserRank, currentUser } = res.result.data
          
          // 处理城市区域信息
          const processedRankings = rankings.map(item => {
            if (item.location) {
              item.location = this.formatLocation(item.location)
            }
            return item
          })
          
          // 更新排行榜数据
          this.setData({
            rankings: processedRankings,
            currentUserRank: currentUserRank,
            userRankInfo: {
              rank: currentUserRank,
              averageHourly: currentUser ? currentUser.averageHourly : '0.00',
              averageDaily: currentUser ? currentUser.averageDaily : '0.00'
            }
          })
          
          console.log('当前用户信息:', currentUser)
          console.log('用户排名信息:', this.data.userRankInfo)
        } else {
          wx.showToast({
            title: '获取排行榜失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('获取排行榜失败：', err)
        wx.showToast({
          title: '获取排行榜失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 格式化城市区域信息，只显示到"XX城市XX区"或"XX市"
  formatLocation: function(location) {
    if (!location) return '';
    
    // 分割地址信息
    const parts = location.split(' ');
    
    // 如果只有市，直接返回
    if (parts.length === 1) {
      return parts[0];
    }
    
    // 如果有区和市，返回"XX市XX区"
    if (parts.length >= 2) {
      return parts[0] + ' ' + parts[1];
    }
    
    return location;
  },

  // 切换维度
  switchDimension: function(e) {
    const dimension = e.currentTarget.dataset.dimension
    if (dimension !== this.data.currentDimension) {
      this.setData({
        currentDimension: dimension,
        page: 1,
        rankings: [],
        hasMore: true
      })
      this.loadRankings()
    }
  },

  // 平台选择变更
  onPlatformChange: function(e) {
    this.setData({
      platformIndex: e.detail.value,
      page: 1,
      rankings: [],
      hasMore: true
    }, () => {
      this.loadRankings()
    })
  },

  // 更新平台列表
  updatePlatformList: function() {
    // 获取所有行业的平台
    const allPlatforms = ['全部']
    Object.values(this.data.industryPlatforms).forEach(platforms => {
      platforms.forEach(platform => {
        if (!allPlatforms.includes(platform)) {
          allPlatforms.push(platform)
        }
      })
    })
    
    this.setData({
      platforms: allPlatforms
    })
  },

  // 检查是否已提交资料
  checkProfileSubmitted: function() {
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'getUserProfile'
      },
      success: res => {
        if (res.result && res.result.success) {
          const profile = res.result.data
          // 更新本地存储的用户资料
          wx.setStorageSync('userProfile', profile)
          
          // 检查是否已提交资料
          const hasSubmitted = profile && profile.nickName && profile.platform
          this.setData({ 
            hasSubmittedProfile: hasSubmitted
          })
        }
      }
    })
  },

  // 加载更多
  loadMore: function() {
    if (this.data.hasMore) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadRankings()
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      rankings: [],
      hasMore: true
    })
    this.loadRankings()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore) {
      this.loadMore()
    }
  },

  // 检查位置权限
  checkLocationAuth: function() {
    wx.getSetting({
      success: res => {
        const hasLocationAuth = res.authSetting['scope.userLocation']
        this.setData({ hasLocationAuth })
      }
    })
  },
}) 