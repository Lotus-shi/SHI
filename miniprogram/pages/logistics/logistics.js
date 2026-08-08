/**
 * 配送追踪页：状态时间轴 + 配送员信息（电话可拨打）+ 预计送达
 * 开发模式（env.isDev）：底部显示「模拟配送端」按钮，便于本地/真机预览走完配送全流程
 */
const { get, put } = require('../../utils/request')
const env = require('../../config/env')

// 配送状态文案与图标
const STATUS_INFO = {
  0: { text: '待分配', icon: '📦', desc: '商家正在准备商品' },
  1: { text: '已分配', icon: '🚴', desc: '配送员已接单，正在赶来取货' },
  2: { text: '取货中', icon: '🧺', desc: '配送员正在商家取货' },
  3: { text: '配送中', icon: '🛵', desc: '您的商品正在配送途中' },
  4: { text: '已送达', icon: '✅', desc: '商品已送达，请查收' },
}

Page({
  data: {
    orderId: 0,
    orderNo: '',
    orderStatus: 0,
    delivery: null,   // 配送信息
    current: null,    // 当前状态展示
    timeline: [],     // 时间轴（倒序：最新在前）
    loading: true,
    isDev: env.isDev, // 开发模式显示模拟配送端按钮
  },

  onLoad(options) {
    this.setData({ orderId: parseInt(options.id) })
    this.loadLogistics()
  },

  async loadLogistics() {
    try {
      const data = await get(`/api/orders/${this.data.orderId}/logistics`)
      const delivery = data.delivery
      // 时间轴倒序展示（最新状态在最上）
      const timeline = delivery.timeline.slice().reverse().map((t) => ({
        ...t,
        timeText: this.formatTime(t.time),
      }))
      this.setData({
        orderNo: data.order_no,
        orderStatus: data.order_status,
        delivery,
        current: STATUS_INFO[delivery.status],
        timeline,
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadLogistics()
  },

  // 拨打配送员电话
  onCallCourier() {
    const phone = this.data.delivery.courier_phone
    if (!phone) {
      wx.showToast({ title: '暂未分配配送员', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone }).catch(() => {})
  },

  // 【开发辅助】模拟配送端：更新到下一状态（正式环境由配送端系统调用接口）
  async onMockNextStatus() {
    const delivery = this.data.delivery
    if (delivery.status >= 4) {
      wx.showToast({ title: '已送达，流程结束', icon: 'none' })
      return
    }
    const nextStatus = delivery.status + 1
    try {
      const body = { status: nextStatus }
      // 分配时同时写入配送员信息
      if (nextStatus === 1) {
        body.courier_name = '测试配送员'
        body.courier_phone = '13800138000'
        body.estimated_time = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 预计 1 小时后送达
      }
      await put(`/api/deliveries/${delivery.id}/status`, body)
      wx.showToast({ title: '配送状态已更新', icon: 'success' })
      this.loadLogistics()
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // 格式化时间（仅展示日期时间）
  formatTime(time) {
    if (!time) return ''
    const d = new Date(time)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
})
