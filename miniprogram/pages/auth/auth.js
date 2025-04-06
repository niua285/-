const app = getApp()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    canIUseChooseAvatar: false,
    avatarUrl: '',
    nickName: '',
    region: [],
    workType: '',
    experience: '',
    workTypes: ['外卖骑手', '快递员', '跑腿员', '其他'],
    experiences: ['新手', '1-3个月', '3-6个月', '6个月以上'],
    workTypeIndex: 0,
    experienceIndex: 0
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    if (wx.chooseAvatar) {
      this.setData({
        canIUseChooseAvatar: true
      })
    }
    
    // 从云数据库获取用户信息
    this.getUserInfoFromCloud()
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
          this.setData({
            userInfo,
            hasUserInfo: true,
            avatarUrl: userInfo.avatarUrl || '',
            nickName: userInfo.nickName || '',
            region: userInfo.region || [],
            workType: userInfo.workType || '',
            experience: userInfo.experience || '',
            workTypeIndex: this.data.workTypes.indexOf(userInfo.workType) || 0,
            experienceIndex: this.data.experiences.indexOf(userInfo.experience) || 0
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('获取用户信息失败：', err)
      }
    })
  },

  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true,
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName
        })
        
        // 保存到云数据库
        this.saveUserInfoToCloud()
      }
    })
  },
  
  // 保存用户信息到云数据库
  saveUserInfoToCloud() {
    const { userInfo, avatarUrl, nickName, region, workType, experience } = this.data
    
    wx.showLoading({
      title: '保存中...',
    })
    
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'updateUserInfo',
        userInfo: {
          ...userInfo,
          avatarUrl: avatarUrl || userInfo.avatarUrl,
          nickName: nickName || userInfo.nickName,
          region: region || userInfo.region,
          workType: workType || userInfo.workType,
          experience: experience || userInfo.experience
        }
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
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

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail 
    
    // 验证头像URL是否有效
    if (avatarUrl && !avatarUrl.includes('example.com')) {
      this.setData({
        avatarUrl,
      })
    } else {
      // 使用默认头像
      this.setData({
        avatarUrl: '/images/default-avatar.svg',
      })
    }
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [field]: e.detail.value
    })
  },

  onWorkTypeChange(e) {
    const index = e.detail.value
    this.setData({
      workTypeIndex: index,
      workType: this.data.workTypes[index]
    })
  },

  onExperienceChange(e) {
    const index = e.detail.value
    this.setData({
      experienceIndex: index,
      experience: this.data.experiences[index]
    })
  },

  onRegionChange(e) {
    this.setData({
      region: e.detail.value
    })
  },

  saveProfile() {
    const { userInfo, avatarUrl, nickName, region, workType, experience } = this.data
    
    // 验证必填字段
    if (!nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    // 更新本地数据
    this.setData({
      userInfo: {
        ...userInfo,
        avatarUrl: avatarUrl || userInfo.avatarUrl,
        nickName: nickName || userInfo.nickName,
        region: region || userInfo.region,
        workType: workType || userInfo.workType,
        experience: experience || userInfo.experience
      }
    })
    
    // 保存到云数据库
    this.saveUserInfoToCloud()
    
    // 返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  }
}) 