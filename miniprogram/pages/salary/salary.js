const app = getApp()

Page({
  data: {
    industries: ['外卖跑腿', '快递物流', '网约车', '共享单车'],
    industryIndex: 0,
    platforms: ['美团', '饿了么', '京东秒送', '达达', 'UU跑腿', '闪送', '顺丰同城'],
    platformIndex: 0,
    date: '',
    timeSlots: [],
    totalHours: 0,
    totalIncome: 0,
    averageHourlyRate: 0,
    totalOrders: 0,
    averageOrderPrice: 0,
    historyRecords: [],
    isEditing: false,
    editingIndex: -1,
    currentRecord: null,
    salaryRecords: [],
    showAddModal: false,
    showEditModal: false,
    showIndustryApplyModal: false,
    newIndustryName: '',
    newIndustryDescription: '',
    newPlatformNames: '',
    newRecord: {
      date: '',
      platform: '',
      hours: '',
      earnings: '',
      price: '',
      notes: ''
    },
    isFirstVisit: true,
    hasLocationAuth: false,
    hasSubmittedProfile: false
  },

  onLoad: function() {
    // 设置默认日期为今天
    const today = new Date()
    const date = today.toISOString().split('T')[0]
    
    // 获取当前时间
    const currentTime = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`
    
    // 初始化一个空的时段
    const timeSlots = [{
      startTime: currentTime,
      endTime: currentTime,
      income: '',
      orders: ''
    }]

    this.setData({ 
      date,
      timeSlots
    })

    // 加载历史记录
    this.loadHistoryRecords()
    
    // 检查是否首次访问
    const isFirstVisit = wx.getStorageSync('isFirstVisit') === ''
    this.setData({ isFirstVisit })
    
    if (!isFirstVisit) {
      this.checkLocationAuth()
      this.checkProfileSubmitted()
      this.loadSalaryRecords()
    }
  },

  onShow: function() {
    // 每次显示页面时重新加载历史记录
    this.loadHistoryRecords()
  },

  // 日期变更
  onDateChange: function(e) {
    const date = e.detail.value
    this.setData({ date }, () => {
      // 加载新日期的历史记录
      this.loadHistoryRecords()
      // 重置当前记录
      this.resetForm()
    })
  },

  // 加载历史记录
  loadHistoryRecords: function() {
    // 使用云数据库加载记录，而不是本地存储
    wx.showLoading({
      title: '加载中...',
    })

    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'getSalaryRecords'
      },
      success: res => {
        console.log('获取工资记录成功：', res)
        if (res.result && res.result.data) {
          // 按日期降序排序
          const allRecords = res.result.data.sort((a, b) => {
            return new Date(b.date) - new Date(a.date)
          })
          
          // 只显示当前选择日期的记录
          const todayRecords = allRecords.filter(record => record.date === this.data.date)
          
          // 按时间段排序
          const sortedRecords = this.sortRecordsByTime(todayRecords)
          
          this.setData({ 
            historyRecords: sortedRecords,
            salaryRecords: allRecords
          }, () => {
            // 加载历史记录后计算当天总和
            this.calculateDailyTotal()
          })
        } else {
          // 如果没有记录，设置为空数组
          this.setData({
            historyRecords: [],
            salaryRecords: []
          })
        }
      },
      fail: err => {
        console.error('获取工资记录失败：', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        // 加载失败时，设置为空数组
        this.setData({
          historyRecords: [],
          salaryRecords: []
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 计算当前记录的结果
  calculateCurrentRecord: function() {
    let totalHours = 0
    let totalIncome = 0
    let totalOrders = 0

    this.data.timeSlots.forEach(slot => {
      if (slot.income && this.validateTimeSlot(slot)) {
        const hours = this.calculateHours(slot.startTime, slot.endTime)
        totalHours += hours
        totalIncome += parseFloat(slot.income) || 0
        totalOrders += parseInt(slot.orders) || 0
      }
    })

    const averageHourlyRate = totalHours > 0 ? (totalIncome / totalHours).toFixed(2) : 0
    const averageOrderPrice = totalOrders > 0 ? (totalIncome / totalOrders).toFixed(2) : 0

    this.setData({
      totalHours: totalHours.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      averageHourlyRate: averageHourlyRate,
      totalOrders: totalOrders,
      averageOrderPrice: averageOrderPrice
    })
  },

  // 计算当天所有记录的总和
  calculateDailyTotal: function() {
    const records = this.data.historyRecords
    let totalHours = 0
    let totalIncome = 0
    let totalOrders = 0

    records.forEach(record => {
      record.timeSlots.forEach(slot => {
        if (slot.income && this.validateTimeSlot(slot)) {
          const hours = this.calculateHours(slot.startTime, slot.endTime)
          totalHours += hours
          totalIncome += parseFloat(slot.income) || 0
          totalOrders += parseInt(slot.orders) || 0
        }
      })
    })

    const averageHourlyRate = totalHours > 0 ? (totalIncome / totalHours).toFixed(2) : 0
    const averageOrderPrice = totalOrders > 0 ? (totalIncome / totalOrders).toFixed(2) : 0

    this.setData({
      totalHours: totalHours.toFixed(2),
      totalIncome: totalIncome.toFixed(2),
      averageHourlyRate: averageHourlyRate,
      totalOrders: totalOrders,
      averageOrderPrice: averageOrderPrice
    })
  },

  // 收入输入
  onIncomeInput: function(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    // 只允许输入数字和小数点
    if (!/^\d*\.?\d*$/.test(value)) return

    const timeSlots = [...this.data.timeSlots]
    timeSlots[index].income = value
    
    this.setData({ timeSlots }, () => {
      this.calculateCurrentRecord()
    })
  },

  // 跑单数输入
  onOrdersInput: function(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    // 只允许输入正整数
    if (!/^\d*$/.test(value)) return

    const timeSlots = [...this.data.timeSlots]
    timeSlots[index].orders = value
    
    this.setData({ timeSlots }, () => {
      this.calculateCurrentRecord()
    })
  },

  // 编辑历史记录
  editHistoryRecord: function(e) {
    const index = e.currentTarget.dataset.index
    const record = this.data.historyRecords[index]
    
    // 保存原始数据用于比较
    this.setData({
      isEditing: true,
      editingIndex: index,
      industryIndex: this.data.industries.indexOf(record.industry) >= 0 ? this.data.industries.indexOf(record.industry) : 0,
      platformIndex: this.data.platforms.indexOf(record.platform) >= 0 ? this.data.platforms.indexOf(record.platform) : 0,
      timeSlots: record.timeSlots,
      currentRecord: record // 保存原始记录用于比较
    }, () => {
      this.calculateCurrentRecord()
    })
  },

  // 保存记录
  saveRecord: function() {
    // 验证必填字段
    if (!this.data.date || this.data.timeSlots.length === 0) {
      wx.showToast({
        title: '请填写日期和时间段',
        icon: 'none'
      })
      return
    }
    
    // 验证时间段
    let isValid = true
    let totalIncome = 0
    let totalOrders = 0
    let totalHours = 0
    
    this.data.timeSlots.forEach(slot => {
      if (slot.income && this.validateTimeSlot(slot)) {
        const income = parseFloat(slot.income) || 0
        const orders = parseInt(slot.orders) || 0
        const hours = this.calculateHours(slot.startTime, slot.endTime)
        
        totalIncome += income
        totalOrders += orders
        totalHours += hours
      } else if (slot.income) {
        isValid = false
      }
    })
    
    if (!isValid) {
      wx.showToast({
        title: '时间段填写有误',
        icon: 'none'
      })
      return
    }
    
    // 显示加载中
    wx.showLoading({
      title: '保存中...',
    })
    
    // 获取当前选择的行业和平台
    const industry = this.data.industries[this.data.industryIndex]
    const platform = this.data.platforms[this.data.platformIndex]
    
    console.log('保存记录 - 行业:', industry, '平台:', platform)
    
    // 准备记录数据
    const record = {
      date: this.data.date,
      platform: platform,
      industry: industry,
      timeSlots: this.data.timeSlots,
      totalIncome: totalIncome.toFixed(2),
      totalOrders: totalOrders,
      orders: totalOrders,
      averageHourlyRate: totalHours > 0 ? (totalIncome / totalHours).toFixed(2) : '0.00',
      averageOrderPrice: totalOrders > 0 ? (totalIncome / totalOrders).toFixed(2) : '0.00',
      totalHours: totalHours.toFixed(2),
      hours: totalHours.toFixed(2)
    }
    
    console.log('准备保存的记录数据:', record)
    
    // 如果是编辑模式，需要更新现有记录
    if (this.data.isEditing && this.data.currentRecord && this.data.currentRecord._id) {
      console.log('更新现有记录，ID:', this.data.currentRecord._id)
      const recordId = this.data.currentRecord._id
      this.updateExistingRecord(record, recordId)
      return
    }
    
    // 如果是新记录，则添加
    this.addNewRecord(record)
  },

  // 更新现有记录
  updateExistingRecord: function(record, recordId) {
    // 添加更新时间
    record.updateTime = new Date()
    
    console.log('准备更新记录:', record)
    console.log('记录ID:', recordId)
    
    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'updateSalaryRecord',
        recordId: recordId,
        record: record
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          })
          
          // 重置表单
          this.resetForm()
          
          // 重新加载历史记录
          this.loadHistoryRecords()
        } else {
          console.error('更新失败:', res.result)
          wx.showToast({
            title: res.result?.message || '更新失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('更新工资记录失败：', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    })
  },

  // 添加新记录
  addNewRecord: function(record) {
    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'addSalaryRecord',
        record: record
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          
          // 重置表单
          this.resetForm()
          
          // 重新加载历史记录
          this.loadHistoryRecords()
        } else {
          console.error('保存失败:', res.result)
          wx.showToast({
            title: res.result?.message || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('保存工资记录失败：', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 检查记录是否有修改
  checkRecordChanges: function(original, current) {
    // 检查平台是否改变
    if (original.platform !== current.platform) return true
    
    // 检查时间段是否改变
    if (original.timeSlots.length !== current.timeSlots.length) return true
    for (let i = 0; i < original.timeSlots.length; i++) {
      if (original.timeSlots[i].startTime !== current.timeSlots[i].startTime ||
          original.timeSlots[i].endTime !== current.timeSlots[i].endTime ||
          original.timeSlots[i].income !== current.timeSlots[i].income ||
          original.timeSlots[i].orders !== current.timeSlots[i].orders) {
        return true
      }
    }
    
    return false
  },

  // 按时间段排序记录
  sortRecordsByTime: function(records) {
    return records.sort((a, b) => {
      // 首先按日期排序
      if (a.date !== b.date) {
        return new Date(a.date) - new Date(b.date)
      }
      
      // 同一天内的记录按第一个时间段的开始时间排序
      const aStartTime = a.timeSlots[0].startTime
      const bStartTime = b.timeSlots[0].startTime
      return aStartTime.localeCompare(bStartTime)
    })
  },

  // 删除历史记录
  deleteHistoryRecord: function(e) {
    const index = e.currentTarget.dataset.index
    const record = this.data.historyRecords[index]
    
    if (!record || !record._id) {
      wx.showToast({
        title: '记录ID无效',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...',
          })
          
          // 调用云函数删除记录
          wx.cloud.callFunction({
            name: 'salaryManager',
            data: {
              action: 'deleteSalaryRecord',
              recordId: record._id
            },
            success: res => {
              if (res.result && res.result.success) {
                // 更新本地数据
                const historyRecords = [...this.data.historyRecords]
                historyRecords.splice(index, 1)
                
                this.setData({ historyRecords }, () => {
                  this.calculateDailyTotal()
                })
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } else {
                console.error('删除失败：', res.result)
                wx.showToast({
                  title: res.result?.message || '删除失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('删除工资记录失败：', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            },
            complete: () => {
              wx.hideLoading()
            }
          })
        }
      }
    })
  },

  // 添加时间段
  addTimeSlot: function() {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const timeSlots = [...this.data.timeSlots]
    timeSlots.push({
      startTime: currentTime,
      endTime: currentTime,
      income: '',
      orders: ''
    })
    
    this.setData({ timeSlots })
  },

  // 删除时间段
  deleteTimeSlot: function(e) {
    const index = e.currentTarget.dataset.index
    const timeSlots = [...this.data.timeSlots]
    timeSlots.splice(index, 1)
    
    // 如果是编辑模式且删除所有时间段，则取消编辑
    if (this.data.isEditing && timeSlots.length === 0) {
      this.cancelEdit()
      return
    }
    
    this.setData({ timeSlots }, () => {
      this.calculateCurrentRecord()
    })
  },

  // 取消编辑
  cancelEdit: function() {
    this.setData({
      isEditing: false,
      editingIndex: -1,
      currentRecord: null
    }, () => {
      this.resetForm()
    })
  },

  // 开始时间变更
  onStartTimeChange: function(e) {
    const index = e.currentTarget.dataset.index
    const timeSlots = [...this.data.timeSlots]
    timeSlots[index].startTime = e.detail.value
    
    // 验证时间
    if (this.validateTimeSlot(timeSlots[index])) {
      this.setData({ timeSlots }, () => {
        this.calculateCurrentRecord()
      })
    } else {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      })
    }
  },

  // 结束时间变更
  onEndTimeChange: function(e) {
    const index = e.currentTarget.dataset.index
    const timeSlots = [...this.data.timeSlots]
    timeSlots[index].endTime = e.detail.value
    
    // 验证时间
    if (this.validateTimeSlot(timeSlots[index])) {
      this.setData({ timeSlots }, () => {
        this.calculateCurrentRecord()
      })
    } else {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      })
    }
  },

  // 验证时间段
  validateTimeSlot: function(slot) {
    if (!slot.startTime || !slot.endTime) return false
    const start = new Date(`2000-01-01T${slot.startTime}`)
    const end = new Date(`2000-01-01T${slot.endTime}`)
    return end > start
  },

  // 计算总时长（小时）
  calculateHours: function(startTime, endTime) {
    if (!startTime || !endTime) return 0
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return (end - start) / (1000 * 60 * 60)
  },

  // 重置表单
  resetForm: function() {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    this.setData({
      isEditing: false,
      editingIndex: -1,
      currentRecord: null,
      timeSlots: [{
        startTime: currentTime,
        endTime: currentTime,
        income: '',
        orders: ''
      }],
      totalHours: 0,
      totalIncome: 0,
      averageHourlyRate: 0,
      totalOrders: 0,
      averageOrderPrice: 0
    })
  },

  // 行业选择
  onIndustryChange: function(e) {
    const index = e.detail.value
    const industry = this.data.industries[index]
    console.log('选择行业:', industry, '索引:', index)
    
    // 根据选择的行业更新平台列表
    let platforms = []
    switch(industry) {
      case '外卖跑腿':
        platforms = ['美团', '饿了么', '京东秒送', '达达', 'UU跑腿', '闪送', '顺丰同城']
        break
      case '快递物流':
        platforms = ['顺丰', '京东', '中通', '申通', '圆通', '邮政', '极兔', '货拉拉', '滴滴']
        break
      case '网约车':
        platforms = ['滴滴出行', '高德打车', '曹操出行', '哈啰', '美团', 'T3出行', '首汽约车', '神州专车', '花小猪']
        break
      case '共享单车':
        platforms = ['哈啰', '美团', '青桔']
        break
      default:
        platforms = ['其他平台']
    }
    
    // 如果是编辑模式，尝试保留当前平台
    let platformIndex = 0
    if (this.data.isEditing && this.data.currentRecord) {
      const currentPlatform = this.data.currentRecord.platform
      const newPlatformIndex = platforms.indexOf(currentPlatform)
      if (newPlatformIndex !== -1) {
        platformIndex = newPlatformIndex
        console.log('保留当前平台:', currentPlatform, '索引:', platformIndex)
      } else {
        console.log('当前平台不在新行业列表中，使用默认平台')
      }
    }
    
    this.setData({
      industryIndex: index,
      platforms: platforms,
      platformIndex: platformIndex
    })
  },

  // 平台选择
  onPlatformChange: function(e) {
    this.setData({
      platformIndex: e.detail.value
    })
  },

  // 显示添加记录弹窗
  showAddModal: function() {
    this.setData({
      showAddModal: true,
      newRecord: {
        date: this.formatDate(new Date()),
        platform: '',
        hours: '',
        earnings: '',
        price: '',
        notes: ''
      }
    })
  },

  // 显示编辑记录弹窗
  showEditModal: function(e) {
    const record = e.currentTarget.dataset.record
    this.setData({
      showEditModal: true,
      currentRecord: { ...record }
    })
  },

  // 隐藏弹窗
  hideModal: function() {
    this.setData({
      showAddModal: false,
      showEditModal: false,
      currentRecord: null
    })
  },

  // 处理输入变化
  handleInput: function(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    const { newRecord, currentRecord, showAddModal } = this.data

    if (showAddModal) {
      this.setData({
        newRecord: {
          ...newRecord,
          [field]: value
        }
      })
    } else {
      this.setData({
        currentRecord: {
          ...currentRecord,
          [field]: value
        }
      })
    }
  },

  // 处理平台选择
  handlePlatformChange: function(e) {
    const { value } = e.detail
    const { newRecord, currentRecord, showAddModal } = this.data

    if (showAddModal) {
      this.setData({
        newRecord: {
          ...newRecord,
          platform: this.data.platforms[value]
        }
      })
    } else {
      this.setData({
        currentRecord: {
          ...currentRecord,
          platform: this.data.platforms[value]
        }
      })
    }
  },

  // 处理日期选择
  handleDateChange: function(e) {
    const { value } = e.detail
    const { newRecord, currentRecord, showAddModal } = this.data

    if (showAddModal) {
      this.setData({
        newRecord: {
          ...newRecord,
          date: value
        }
      })
    } else {
      this.setData({
        currentRecord: {
          ...currentRecord,
          date: value
        }
      })
    }
  },

  // 保存新记录
  saveNewRecord: function() {
    const { newRecord } = this.data
    
    // 验证必填字段
    if (!newRecord.date || !newRecord.platform || !newRecord.hours || !newRecord.earnings) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 计算单价
    const price = (parseFloat(newRecord.earnings) / parseFloat(newRecord.hours)).toFixed(2)
    
    wx.showLoading({
      title: '保存中...',
    })

    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'addSalaryRecord',
        record: {
          ...newRecord,
          price,
          createTime: new Date()
        }
      },
      success: res => {
        console.log('添加工资记录成功：', res)
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        this.hideModal()
        this.loadSalaryRecords()
      },
      fail: err => {
        console.error('添加工资记录失败：', err)
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 保存编辑记录
  saveEditRecord: function() {
    const { currentRecord } = this.data
    
    // 验证必填字段
    if (!currentRecord.date || !currentRecord.platform || !currentRecord.hours || !currentRecord.earnings) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 计算单价
    const price = (parseFloat(currentRecord.earnings) / parseFloat(currentRecord.hours)).toFixed(2)
    
    wx.showLoading({
      title: '保存中...',
    })

    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'updateSalaryRecord',
        record: {
          ...currentRecord,
          price,
          updateTime: new Date()
        }
      },
      success: res => {
        console.log('更新工资记录成功：', res)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        this.hideModal()
        this.loadSalaryRecords()
      },
      fail: err => {
        console.error('更新工资记录失败：', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 删除记录
  deleteRecord: function(e) {
    const recordId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 显示加载中
          wx.showLoading({
            title: '删除中...',
          })
          
          // 调用云函数删除记录
          wx.cloud.callFunction({
            name: 'salaryManager',
            data: {
              action: 'deleteSalaryRecord',
              recordId: recordId
            },
            success: res => {
              wx.hideLoading()
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
                // 重新加载工资记录
                this.loadSalaryRecords()
              } else {
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              wx.hideLoading()
              console.error('删除工资记录失败：', err)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 格式化日期
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
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

  // 检查是否已提交个人信息
  checkProfileSubmitted: function() {
    wx.cloud.callFunction({
      name: 'userManager',
      data: {
        action: 'getUserInfo'
      },
      success: res => {
        const hasSubmittedProfile = res.result && res.result.data && res.result.data.nickName
        this.setData({ hasSubmittedProfile })
      }
    })
  },

  // 请求位置权限
  requestLocationAuth: function() {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => {
        this.setData({ hasLocationAuth: true })
        wx.showToast({
          title: '授权成功',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要位置权限',
          content: '为了提供更好的服务，需要获取您的位置信息。是否前往设置？',
          success: res => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  // 跳转到编辑个人信息页面
  goToEditProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    })
  },

  // 完成首次访问设置
  completeFirstVisit: function() {
    if (!this.data.hasLocationAuth) {
      this.requestLocationAuth()
      return
    }
    
    if (!this.data.hasSubmittedProfile) {
      this.goToEditProfile()
      return
    }
    
    // 设置首次访问标志
    wx.setStorageSync('isFirstVisit', 'false')
    this.setData({ isFirstVisit: false })
    
    // 加载排行榜数据
    this.loadSalaryRecords()
  },

  // 更新记录
  updateRecord: function() {
    const { editingRecord } = this.data
    
    // 验证必填字段
    if (!editingRecord.date || !editingRecord.earnings) {
      wx.showToast({
        title: '请填写日期和收入',
        icon: 'none'
      })
      return
    }
    
    // 显示加载中
    wx.showLoading({
      title: '更新中...',
    })
    
    // 调用云函数更新记录
    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'updateSalaryRecord',
        record: editingRecord
      },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          })
          this.setData({
            showEditModal: false,
            editingRecord: null
          })
          // 重新加载工资记录
          this.loadSalaryRecords()
        } else {
          wx.showToast({
            title: '更新失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('更新工资记录失败：', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    })
  },

  // 清除数据
  clearData: function() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清除中...',
          })
          
          wx.cloud.callFunction({
            name: 'salaryManager',
            data: {
              action: 'clearSalaryRecords'
            },
            success: res => {
              console.log('清除数据成功：', res)
              
              // 重置本地数据
              this.setData({
                historyRecords: [],
                salaryRecords: []
              })
              
              wx.showToast({
                title: '清除成功',
                icon: 'success'
              })
              
              // 刷新其他页面
              const pages = getCurrentPages()
              pages.forEach(page => {
                if (page.route === 'pages/analysis/analysis') {
                  page.loadData()
                } else if (page.route === 'pages/ranking/ranking') {
                  page.loadRankings()
                } else if (page.route === 'pages/profile/profile') {
                  page.calculateStatistics()
                }
              })
            },
            fail: err => {
              console.error('清除数据失败：', err)
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              })
            },
            complete: () => {
              wx.hideLoading()
            }
          })
        }
      }
    })
  },

  // 显示申请新行业弹窗
  showIndustryApply: function() {
    this.setData({
      showIndustryApplyModal: true,
      newIndustryName: '',
      newIndustryDescription: '',
      newPlatformNames: ''
    })
  },

  // 关闭申请新行业弹窗
  closeIndustryApply: function() {
    this.setData({
      showIndustryApplyModal: false
    })
  },

  // 输入新行业名称
  onNewIndustryNameInput: function(e) {
    this.setData({
      newIndustryName: e.detail.value
    })
  },

  // 输入新行业描述
  onNewIndustryDescriptionInput: function(e) {
    this.setData({
      newIndustryDescription: e.detail.value
    })
  },

  // 输入平台名称
  onNewPlatformNamesInput: function(e) {
    this.setData({
      newPlatformNames: e.detail.value
    })
  },

  // 提交新行业申请
  submitIndustryApply: function() {
    const { newIndustryName, newIndustryDescription, newPlatformNames } = this.data
    
    if (!newIndustryName.trim()) {
      wx.showToast({
        title: '请输入行业名称',
        icon: 'none'
      })
      return
    }
    
    if (!newIndustryDescription.trim()) {
      wx.showToast({
        title: '请输入行业描述',
        icon: 'none'
      })
      return
    }

    if (!newPlatformNames.trim()) {
      wx.showToast({
        title: '请输入平台名称',
        icon: 'none'
      })
      return
    }
    
    // 调用云函数提交申请
    wx.cloud.callFunction({
      name: 'industryManager',
      data: {
        action: 'applyNewIndustry',
        industryName: newIndustryName,
        industryDescription: newIndustryDescription,
        platformNames: newPlatformNames.split('、').map(name => name.trim())
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: '申请已提交',
            icon: 'success'
          })
          this.setData({
            showIndustryApplyModal: false
          })
        } else {
          wx.showToast({
            title: res.result.message || '申请提交失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('提交行业申请失败：', err)
        wx.showToast({
          title: '申请提交失败',
          icon: 'none'
        })
      }
    })
  },

  // 加载工资记录
  loadSalaryRecords: function() {
    // 实现加载工资记录的逻辑
  },

  // 编辑记录
  editRecord: function(e) {
    const record = e.currentTarget.dataset.record
    const index = e.currentTarget.dataset.index
    console.log('编辑记录:', record)
    
    // 查找行业索引，如果找不到则使用默认值0
    let industryIndex = this.data.industries.indexOf(record.industry)
    if (industryIndex === -1) {
      industryIndex = 0
      console.log('找不到行业:', record.industry, '使用默认行业:', this.data.industries[0])
    }
    
    // 根据行业更新平台列表
    let platforms = []
    switch(this.data.industries[industryIndex]) {
      case '外卖跑腿':
        platforms = ['美团', '饿了么', '京东秒送', '达达', 'UU跑腿', '闪送', '顺丰同城']
        break
      case '快递物流':
        platforms = ['顺丰', '京东', '中通', '申通', '圆通', '邮政', '极兔', '货拉拉', '滴滴']
        break
      case '网约车':
        platforms = ['滴滴出行', '高德打车', '曹操出行', '哈啰', '美团', 'T3出行', '首汽约车', '神州专车', '花小猪']
        break
      case '共享单车':
        platforms = ['哈啰', '美团', '青桔']
        break
      default:
        platforms = ['其他平台']
    }
    
    // 查找平台索引，如果找不到则使用默认值0
    let platformIndex = platforms.indexOf(record.platform)
    if (platformIndex === -1) {
      platformIndex = 0
      console.log('找不到平台:', record.platform, '使用默认平台:', platforms[0])
    }
    
    // 设置编辑模式
    this.setData({
      isEditing: true,
      editingIndex: index,
      currentRecord: record, // 直接使用原始记录
      date: record.date,
      industryIndex: industryIndex,
      platforms: platforms,
      platformIndex: platformIndex,
      timeSlots: record.timeSlots || []
    }, () => {
      console.log('当前编辑的记录:', this.data.currentRecord)
    })
    
    // 滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  }
}) 