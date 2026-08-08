/**
 * 订单详情页：状态步骤条 + 地址 + 商品明细 + 金额明细 + 订单信息
 * 订单状态：0 待支付 | 1 待发货 | 2 配送中 | 3 已完成 | 4 已取消
 */
const { get, put, post } = require('../../utils/request')

const STATUS_MAP = { 0: '待支付', 1: '待发货', 2: '配送中', 3: '已完成', 4: '已取消' }

Page({
  data: {
    order: null,
    statusText: '',
    steps: [
      { title: '提交订单', desc: '订单已创建', done: false, active: false },
      { title: '支付成功', desc: '等待商家发货', done: false, active: false },
      { title: '配送中', desc: '骑手正在配送', done: false, active: false },
      { title: '已完成', desc: '订单已完成', done: false, active: false },
    ],
    loading: true,
  },

  onLoad(options) {
    this.orderId = parseInt(options.id)
    this.loadOrder()
  },

  async loadOrder() {
    try {
      const order = await get(`/api/orders/${this.orderId}`)
      this.setData({
        order,
        statusText: STATUS_MAP[order.status],
        loading: false,
      })
      this.buildSteps(order.status)
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  // 根据订单状态构建步骤条高亮
  buildSteps(status) {
    // 步骤索引：待支付=0，待发货=1，配送中=2，已完成=3
    let current = -1
    if (status === 0) current = 0
    else if (status === 1) current = 1
    else if (status === 2) current = 2
    else if (status === 3) current = 3

    const steps = this.data.steps.map((s, i) => ({
      ...s,
      done: current >= 0 && i < current, // 已完成的步骤
      active: i === current,             // 当前步骤
    }))
    this.setData({ steps })
  },

  // ===== 操作 =====

  // 去支付
  async onPay() {
    const order = this.data.order
    try {
      const data = await post(`/api/orders/${order.id}/pay`)
      const { payment, order_no, pay_amount } = data
      if (payment && payment.mock) {
        wx.showModal({
          title: '模拟支付',
          content: `确认支付 ¥${pay_amount}？`,
          confirmColor: '#07c160',
          success: async (res) => {
            if (!res.confirm) return
            await post('/api/pay/notify', { order_no })
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrder()
          },
        })
      } else {
        wx.requestPayment({
          ...payment,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrder()
          },
        })
      }
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // 取消订单
  onCancel() {
    const order = this.data.order
    wx.showModal({
      title: '提示',
      content: '确定取消该订单吗？',
      confirmColor: '#ff4949',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await put(`/api/orders/${order.id}/cancel`)
          wx.showToast({ title: '订单已取消', icon: 'success' })
          this.loadOrder()
        } catch (e) {
          /* 已统一提示 */
        }
      },
    })
  },

  // 查看配送进度
  onViewLogistics() {
    wx.navigateTo({ url: `/pages/logistics/logistics?id=${this.orderId}` })
  },

  // 拨打电话（客服）
  onCallService() {
    wx.makePhoneCall({ phoneNumber: '400-000-0000' }).catch(() => {})
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return '-'
    const d = new Date(time)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
})
