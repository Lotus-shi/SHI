/**
 * 支付结果页：展示支付成功状态与订单入口
 */
const { get } = require('../../utils/request')

Page({
  data: {
    orderId: 0,
    orderNo: '',
    payAmount: '0.00',
  },

  onLoad(options) {
    const orderId = parseInt(options.id) || 0
    this.setData({ orderId })
    if (orderId) {
      this.loadOrder(orderId)
    }
  },

  // 加载订单信息（成功后展示订单号与金额）
  async loadOrder(orderId) {
    try {
      const order = await get(`/api/orders/${orderId}`)
      this.setData({
        orderNo: order.order_no,
        payAmount: order.pay_amount,
      })
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // 查看订单
  onViewOrder() {
    wx.redirectTo({ url: `/pages/order-list/order-list?status=1` })
  },

  // 返回首页
  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
