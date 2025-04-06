const app = getApp()

Page({
  data: {
    currentDimension: 'hourly',
    averageValue: 0,
    maxValue: 0,
    minValue: 0,
    volatility: 0,
    suggestions: [],
    chartData: [],
    chartLabels: [],
    showTooltip: false,
    tooltipX: 0,
    tooltipY: 0,
    tooltipDate: '',
    tooltipValue: '',
    chartInfo: {
      padding: {},
      width: 0,
      height: 0,
      dataPoints: []
    },
    salaryRecords: [],
    statistics: {
      totalDays: 0,
      totalEarnings: 0,
      averageDailyEarnings: 0,
      averageHourlyEarnings: 0,
      averagePrice: 0
    },
    platformStats: [],
    monthlyStats: [],
    yearlyStats: [],
    currentView: 'overview', // overview, monthly, yearly
    loading: false
  },

  onLoad: function() {
    this.loadData()
    this.generateSuggestions()
  },

  onShow: function() {
    this.loadData()
    this.drawChart()
  },

  // 切换维度
  switchDimension: function(e) {
    console.log('切换维度:', e.currentTarget.dataset.dimension)
    const dimension = e.currentTarget.dataset.dimension
    
    // 如果点击的是当前维度，不做任何操作
    if (dimension === this.data.currentDimension) return
    
    this.setData({
      currentDimension: dimension,
      loading: true
    })
    
    // 先加载数据，然后在数据加载完成后绘制图表
    this.loadData()
    
    // 注意：drawChart 和 generateSuggestions 会在 loadData 的回调中被调用
    // 这样可以确保数据已经准备好
  },

  // 加载数据
  loadData: function() {
    this.setData({ loading: true })
    
    wx.cloud.callFunction({
      name: 'salaryManager',
      data: {
        action: 'getSalaryRecords'
      },
      success: res => {
        if (res.result.success) {
          const records = res.result.data || []
          const dimension = this.data.currentDimension
          let data = []
          let labels = []

          // 根据维度处理数据
          switch (dimension) {
            case 'hourly':
              data = records.map(record => parseFloat(record.earnings / record.hours))
              labels = records.map(record => record.date)
              break
            case 'daily':
              data = records.map(record => parseFloat(record.earnings))
              labels = records.map(record => record.date)
              break
            case 'monthly':
              const monthlyData = this.calculateMonthlyData(records)
              data = monthlyData.values
              labels = monthlyData.labels
              break
            case 'yearly':
              const yearlyData = this.calculateYearlyData(records)
              data = yearlyData.values
              labels = yearlyData.labels
              break
          }

          // 按日期排序
          const sortedData = labels.map((label, index) => ({
            label,
            value: data[index]
          })).sort((a, b) => new Date(a.label) - new Date(b.label))

          // 分离排序后的数据和标签
          data = sortedData.map(item => item.value)
          labels = sortedData.map(item => item.label)

          // 对于时薪和日薪维度，只显示最近7天的数据
          if (dimension === 'hourly' || dimension === 'daily') {
            // 如果数据超过7天，只保留最近7天
            if (data.length > 7) {
              data = data.slice(-7)
              labels = labels.slice(-7)
            }
          }

          // 计算统计数据
          const stats = this.calculateStatistics(data)
          
          this.setData({
            averageValue: stats.average.toFixed(2),
            maxValue: stats.max.toFixed(2),
            minValue: stats.min.toFixed(2),
            volatility: stats.volatility.toFixed(1),
            chartData: data,
            chartLabels: labels,
            salaryRecords: records,
            loading: false
          }, () => {
            // 数据加载完成后，绘制图表并生成建议
            this.drawChart()
            this.generateSuggestions()
          })

          // 计算总体统计
          this.calculateOverallStatistics(records)
          // 计算平台统计
          this.calculatePlatformStats(records)
          // 计算月度统计
          this.calculateMonthlyStats(records)
          // 计算年度统计
          this.calculateYearlyStats(records)
        } else {
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: err => {
        console.error('获取工资记录失败：', err)
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 计算月度数据
  calculateMonthlyData: function(records) {
    const monthlyData = {}
    records.forEach(record => {
      const month = record.date.substring(0, 7) // 格式：YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = 0
      }
      monthlyData[month] += parseFloat(record.earnings)
    })
    
    const months = Object.keys(monthlyData).sort()
    return {
      values: months.map(month => monthlyData[month]),
      labels: months
    }
  },

  // 计算年度数据
  calculateYearlyData: function(records) {
    const yearlyData = {}
    records.forEach(record => {
      const year = record.date.substring(0, 4) // 格式：YYYY
      if (!yearlyData[year]) {
        yearlyData[year] = 0
      }
      yearlyData[year] += parseFloat(record.earnings)
    })
    
    const years = Object.keys(yearlyData).sort()
    return {
      values: years.map(year => yearlyData[year]),
      labels: years
    }
  },

  // 计算统计数据
  calculateStatistics: function(data) {
    if (data.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        volatility: 0
      }
    }

    const sum = data.reduce((a, b) => a + b, 0)
    const average = sum / data.length
    const max = Math.max(...data)
    const min = Math.min(...data)
    
    // 计算波动率（标准差/平均值）
    const variance = data.reduce((a, b) => a + Math.pow(b - average, 2), 0) / data.length
    const volatility = (Math.sqrt(variance) / average) * 100

    return {
      average,
      max,
      min,
      volatility
    }
  },

  // 计算总体统计
  calculateOverallStatistics: function(records) {
    if (!records || records.length === 0) {
      this.setData({
        statistics: {
          totalDays: 0,
          totalEarnings: 0,
          averageDailyEarnings: 0,
          averageHourlyEarnings: 0,
          averagePrice: 0
        }
      })
      return
    }

    const totalDays = records.length
    const totalEarnings = records.reduce((sum, record) => sum + parseFloat(record.earnings) || 0, 0)
    const totalHours = records.reduce((sum, record) => sum + parseFloat(record.hours) || 0, 0)
    const averageDailyEarnings = totalEarnings / totalDays
    const averageHourlyEarnings = totalHours > 0 ? totalEarnings / totalHours : 0
    const averagePrice = totalDays > 0 ? totalEarnings / totalDays : 0

    this.setData({
      statistics: {
        totalDays,
        totalEarnings: totalEarnings.toFixed(2),
        averageDailyEarnings: averageDailyEarnings.toFixed(2),
        averageHourlyEarnings: averageHourlyEarnings.toFixed(2),
        averagePrice: averagePrice.toFixed(2)
      }
    })
  },

  // 计算平台统计
  calculatePlatformStats: function(records) {
    if (!records || records.length === 0) {
      this.setData({ platformStats: [] })
      return
    }

    const platformData = {}
    records.forEach(record => {
      const platform = record.platform
      if (!platformData[platform]) {
        platformData[platform] = {
          totalEarnings: 0,
          totalDays: 0,
          totalHours: 0
        }
      }
      platformData[platform].totalEarnings += parseFloat(record.earnings) || 0
      platformData[platform].totalDays += 1
      platformData[platform].totalHours += parseFloat(record.hours) || 0
    })

    const platformStats = Object.keys(platformData).map(platform => ({
      platform,
      totalEarnings: platformData[platform].totalEarnings.toFixed(2),
      totalDays: platformData[platform].totalDays,
      totalHours: platformData[platform].totalHours.toFixed(1),
      averageDailyEarnings: platformData[platform].totalDays > 0 ? (platformData[platform].totalEarnings / platformData[platform].totalDays).toFixed(2) : 0,
      averageHourlyEarnings: platformData[platform].totalHours > 0 ? (platformData[platform].totalEarnings / platformData[platform].totalHours).toFixed(2) : 0
    }))

    this.setData({ platformStats })
  },

  // 计算月度统计
  calculateMonthlyStats: function(records) {
    if (!records || records.length === 0) {
      this.setData({ monthlyStats: [] })
      return
    }

    const monthlyData = {}
    records.forEach(record => {
      const month = record.date.substring(0, 7) // 格式：YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          totalEarnings: 0,
          totalDays: 0,
          totalHours: 0
        }
      }
      monthlyData[month].totalEarnings += parseFloat(record.earnings) || 0
      monthlyData[month].totalDays += 1
      monthlyData[month].totalHours += parseFloat(record.hours) || 0
    })

    const monthlyStats = Object.keys(monthlyData).sort().map(month => ({
      month,
      totalEarnings: monthlyData[month].totalEarnings.toFixed(2),
      totalDays: monthlyData[month].totalDays,
      totalHours: monthlyData[month].totalHours.toFixed(1),
      averageDailyEarnings: monthlyData[month].totalDays > 0 ? (monthlyData[month].totalEarnings / monthlyData[month].totalDays).toFixed(2) : 0,
      averageHourlyEarnings: monthlyData[month].totalHours > 0 ? (monthlyData[month].totalEarnings / monthlyData[month].totalHours).toFixed(2) : 0
    }))

    this.setData({ monthlyStats })
  },

  // 计算年度统计
  calculateYearlyStats: function(records) {
    if (!records || records.length === 0) {
      this.setData({ yearlyStats: [] })
      return
    }

    const yearlyData = {}
    records.forEach(record => {
      const year = record.date.substring(0, 4) // 格式：YYYY
      if (!yearlyData[year]) {
        yearlyData[year] = {
          totalEarnings: 0,
          totalDays: 0,
          totalHours: 0
        }
      }
      yearlyData[year].totalEarnings += parseFloat(record.earnings) || 0
      yearlyData[year].totalDays += 1
      yearlyData[year].totalHours += parseFloat(record.hours) || 0
    })

    const yearlyStats = Object.keys(yearlyData).sort().map(year => ({
      year,
      totalEarnings: yearlyData[year].totalEarnings.toFixed(2),
      totalDays: yearlyData[year].totalDays,
      totalHours: yearlyData[year].totalHours.toFixed(1),
      averageDailyEarnings: yearlyData[year].totalDays > 0 ? (yearlyData[year].totalEarnings / yearlyData[year].totalDays).toFixed(2) : 0,
      averageHourlyEarnings: yearlyData[year].totalHours > 0 ? (yearlyData[year].totalEarnings / yearlyData[year].totalHours).toFixed(2) : 0
    }))

    this.setData({ yearlyStats })
  },

  // 绘制图表
  drawChart: function() {
    if (this.data.chartData.length === 0) return

    const query = wx.createSelectorQuery()
    query.select('#trendChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0]
        if (!canvas) {
          console.error('未找到 canvas 节点')
          return
        }

        try {
          const ctx = canvas.node.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio
          const systemInfo = wx.getSystemInfoSync()
          
          // 设置canvas尺寸
          canvas.node.width = canvas.width * dpr
          canvas.node.height = canvas.height * dpr
          ctx.scale(dpr, dpr)

          // 计算实际绘制尺寸
          const width = canvas.width
          const height = canvas.height
          
          // 根据屏幕宽度动态计算边距
          const padding = {
            left: Math.max(60, width * 0.15),   // 左侧边距，确保金额显示完整
            right: Math.max(30, width * 0.1),   // 右侧边距
            top: Math.max(40, height * 0.1),    // 顶部边距
            bottom: Math.max(50, height * 0.15) // 底部边距，确保日期显示完整
          }
          
          const chartWidth = width - padding.left - padding.right
          const chartHeight = height - padding.top - padding.bottom

          // 清空画布
          ctx.clearRect(0, 0, width, height)

          // 计算数据范围
          const data = this.data.chartData
          const max = Math.max(...data)
          const min = 0 // 设置最小值为0
          
          // 计算Y轴刻度
          let yValues = []
          let range = max - min
          
          if (range > 0) {
            // 使用实际数据值作为刻度
            const uniqueValues = [...new Set(data)].sort((a, b) => a - b)
            
            // 根据屏幕高度动态调整刻度数量
            const maxTicks = Math.min(6, Math.floor(chartHeight / 40))
            
            if (uniqueValues.length > maxTicks) {
              yValues = [0] // 从0开始
              const step = Math.ceil(uniqueValues.length / (maxTicks - 1))
              
              for (let i = step; i < uniqueValues.length - 1; i += step) {
                yValues.push(uniqueValues[i])
              }
              
              yValues.push(max)
            } else {
              yValues = [0, ...uniqueValues]
            }
          } else {
            yValues = [0, 1, 2, 3, 4, 5]
            range = 5
          }
          
          // 存储数据点位置信息
          const dataPoints = []

          // 绘制背景网格
          ctx.strokeStyle = '#f5f5f5'
          ctx.lineWidth = 1
          yValues.forEach((_, index) => {
            const y = height - padding.bottom - (index / (yValues.length - 1)) * chartHeight
            ctx.beginPath()
            ctx.moveTo(padding.left, y)
            ctx.lineTo(width - padding.right, y)
            ctx.stroke()
          })

          // 绘制Y轴和刻度
          ctx.beginPath()
          ctx.strokeStyle = '#999999'
          ctx.lineWidth = 1
          ctx.moveTo(padding.left, padding.top)
          ctx.lineTo(padding.left, height - padding.bottom)
          ctx.stroke()

          // 绘制Y轴刻度值
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.font = `${Math.max(12, width * 0.03)}px sans-serif`
          yValues.forEach((value, index) => {
            const y = height - padding.bottom - (index / (yValues.length - 1)) * chartHeight
            ctx.fillStyle = '#666666'
            ctx.fillText(`¥${value.toFixed(0)}`, padding.left - 10, y)
          })

          // 绘制X轴
          ctx.beginPath()
          ctx.strokeStyle = '#999999'
          ctx.lineWidth = 1
          ctx.moveTo(padding.left, height - padding.bottom)
          ctx.lineTo(width - padding.right, height - padding.bottom)
          ctx.stroke()

          // 计算X轴标签间隔
          const maxLabels = Math.floor(chartWidth / (width * 0.15)) // 根据屏幕宽度动态计算标签间隔
          let labelInterval = Math.max(1, Math.ceil(this.data.chartLabels.length / maxLabels))
          
          // 对于时薪和日薪维度，确保所有日期都能显示
          if (this.data.currentDimension === 'hourly' || this.data.currentDimension === 'daily') {
            if (this.data.chartLabels.length <= 7) {
              labelInterval = 1
            } else {
              labelInterval = Math.ceil(this.data.chartLabels.length / 7)
            }
          }
          
          const visibleLabels = this.data.chartLabels.filter((_, i) => i % labelInterval === 0)

          // 绘制数据点和连线
          ctx.beginPath()
          ctx.strokeStyle = '#1296db'
          ctx.lineWidth = 2
          data.forEach((value, index) => {
            const x = padding.left + (index / (data.length - 1)) * chartWidth
            const y = height - padding.bottom - ((value - min) / range) * chartHeight
            if (index === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
            
            // 存储数据点信息
            dataPoints.push({
              x,
              y,
              value,
              date: this.data.chartLabels[index]
            })
          })
          ctx.stroke()

          // 绘制数据点
          data.forEach((value, index) => {
            const x = padding.left + (index / (data.length - 1)) * chartWidth
            const y = height - padding.bottom - ((value - min) / range) * chartHeight
            ctx.beginPath()
            ctx.fillStyle = '#1296db'
            ctx.arc(x, y, Math.max(3, width * 0.01), 0, Math.PI * 2)
            ctx.fill()
          })

          // 绘制X轴标签
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.font = `${Math.max(12, width * 0.03)}px sans-serif`
          visibleLabels.forEach((label, index) => {
            const x = padding.left + (index * labelInterval / (data.length - 1)) * chartWidth
            const y = height - padding.bottom + 10
            ctx.fillStyle = '#666666'
            const simplifiedLabel = this.simplifyDate(label)
            ctx.fillText(simplifiedLabel, x, y)
          })
          
          // 保存图表信息
          this.setData({
            chartInfo: {
              padding,
              width,
              height,
              dataPoints
            }
          })
        } catch (err) {
          console.error('绘制图表失败:', err)
        }
      })
  },

  // 简化日期显示
  simplifyDate: function(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  },

  // 生成优化建议
  generateSuggestions: function() {
    const suggestions = []
    const volatility = parseFloat(this.data.volatility)
    const average = parseFloat(this.data.averageValue)
    const dimension = this.data.currentDimension

    // 根据不同的时间维度生成不同的优化建议
    switch (dimension) {
      case 'hourly':
        // 时薪维度的建议
        if (volatility > 30) {
          suggestions.push({
            icon: '📊',
            title: '时薪波动较大',
            description: '建议稳定工作时长，避免时薪大幅波动'
          })
        }

        if (average < 50) {
          suggestions.push({
            icon: '💰',
            title: '平均时薪偏低',
            description: '建议提高工作效率，或选择单价更高的订单'
          })
        }

        if (this.data.chartData.length > 0) {
          const recentData = this.data.chartData.slice(-3)
          const isIncreasing = recentData[recentData.length - 1] > recentData[0]
          if (isIncreasing) {
            suggestions.push({
              icon: '📈',
              title: '时薪呈上升趋势',
              description: '继续保持当前工作节奏，时薪有望进一步提升'
            })
          } else {
            suggestions.push({
              icon: '📉',
              title: '时薪呈下降趋势',
              description: '建议调整工作策略，避免时薪持续下滑'
            })
          }
        }
        break

      case 'daily':
        // 日薪维度的建议
        if (volatility > 40) {
          suggestions.push({
            icon: '📊',
            title: '日收入波动较大',
            description: '建议稳定接单频率，避免日收入大幅波动'
          })
        }

        if (average < 200) {
          suggestions.push({
            icon: '💰',
            title: '平均日收入偏低',
            description: '建议增加接单数量或提高订单单价'
          })
        }

        if (this.data.chartData.length > 0) {
          const recentData = this.data.chartData.slice(-3)
          const isIncreasing = recentData[recentData.length - 1] > recentData[0]
          if (isIncreasing) {
            suggestions.push({
              icon: '📈',
              title: '日收入呈上升趋势',
              description: '继续保持当前接单策略，日收入有望进一步提升'
            })
          } else {
            suggestions.push({
              icon: '📉',
              title: '日收入呈下降趋势',
              description: '建议增加接单频率或调整接单策略'
            })
          }
        }
        break

      case 'monthly':
        // 月薪维度的建议
        if (volatility > 50) {
          suggestions.push({
            icon: '📊',
            title: '月收入波动较大',
            description: '建议稳定每月接单量，避免月收入大幅波动'
          })
        }

        if (average < 5000) {
          suggestions.push({
            icon: '💰',
            title: '平均月收入偏低',
            description: '建议增加每月接单量或提高订单单价'
          })
        }

        if (this.data.chartData.length > 0) {
          const recentData = this.data.chartData.slice(-3)
          const isIncreasing = recentData[recentData.length - 1] > recentData[0]
          if (isIncreasing) {
            suggestions.push({
              icon: '📈',
              title: '月收入呈上升趋势',
              description: '继续保持当前工作节奏，月收入有望进一步提升'
            })
          } else {
            suggestions.push({
              icon: '📉',
              title: '月收入呈下降趋势',
              description: '建议调整每月接单策略，避免月收入持续下滑'
            })
          }
        }
        break

      case 'yearly':
        // 年薪维度的建议
        if (volatility > 60) {
          suggestions.push({
            icon: '📊',
            title: '年收入波动较大',
            description: '建议稳定年度接单量，避免年收入大幅波动'
          })
        }

        if (average < 50000) {
          suggestions.push({
            icon: '💰',
            title: '平均年收入偏低',
            description: '建议增加年度接单量或提高订单单价'
          })
        }

        if (this.data.chartData.length > 0) {
          const recentData = this.data.chartData.slice(-3)
          const isIncreasing = recentData[recentData.length - 1] > recentData[0]
          if (isIncreasing) {
            suggestions.push({
              icon: '📈',
              title: '年收入呈上升趋势',
              description: '继续保持当前工作节奏，年收入有望进一步提升'
            })
          } else {
            suggestions.push({
              icon: '📉',
              title: '年收入呈下降趋势',
              description: '建议调整年度接单策略，避免年收入持续下滑'
            })
          }
        }
        break
    }

    // 如果没有数据，添加默认建议
    if (suggestions.length === 0) {
      suggestions.push({
        icon: '📝',
        title: '暂无数据',
        description: '请添加更多收入记录以获取个性化建议'
      })
    }

    this.setData({ suggestions })
  },

  // 图表点击事件处理
  onChartTap: function(e) {
    if (this.data.chartData.length === 0) return
    
    const { x, y } = e.detail
    const { dataPoints } = this.data.chartInfo
    
    // 查找最近的数据点
    let closestPoint = null
    let minDistance = Infinity
    
    dataPoints.forEach(point => {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = point
      }
    })
    
    // 如果点击位置足够接近数据点（20px范围内）
    if (closestPoint && minDistance < 20) {
      this.setData({
        showTooltip: true,
        tooltipX: closestPoint.x,
        tooltipY: closestPoint.y - 30, // 向上偏移，避免遮挡数据点
        tooltipDate: this.simplifyDate(closestPoint.date),
        tooltipValue: closestPoint.value.toFixed(2)
      })
      
      // 3秒后自动隐藏提示框
      setTimeout(() => {
        this.setData({
          showTooltip: false
        })
      }, 3000)
    } else {
      // 点击空白区域，隐藏提示框
      this.setData({
        showTooltip: false
      })
    }
  },

  // 切换视图
  switchView: function(e) {
    const view = e.currentTarget.dataset.view
    this.setData({ currentView: view })
  }
}) 