/**
 * 订单确认页
 * 入口：购物车结算 或 商品详情页立即购买（均通过 storage: checkout_items 传递）
 * 流程：展示商品/选地址/金额明细/备注 → 提交订单 → 发起支付 → 支付结果页
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    items: [],        // 待下单商品 [{ goods_id, quantity, goods, subtotal }]
    address: null,    // 选中的收货地址
    remark: '',       // 备注
    totalAmount: '0.00', // 商品总额
    freight: '0.00',  // 运费
    payAmount: '0.00',  // 实付
    submitting: false,
  },

  onLoad() {
    // 读取购物车结算传递的商品
    const items = wx.getStorageSync('checkout_items') || []
    wx.removeStorageSync('checkout_items')
    if (!items.length) {
      wx.showToast({ title: '没有待结算商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
      return
    }
    this.setData({ items })
    this.calcAmount()
    this.loadAddress()
  },

  // 从地址选择页返回后读取选中地址
  onShow() {
    const selected = wx.getStorageSync('selected_address')
    if (selected) {
      wx.removeStorageSync('selected_address')
      this.setData({ address: selected })
    }
  },

  // 金额明细：商品总额 + 运费 = 实付（与后端规则一致：满 50 免运费，否则 5 元）
  calcAmount() {
    const totalAmount = this.data.items.reduce((sum, i) => sum + i.subtotal, 0)
    const freight = totalAmount >= 50 ? 0 : 5
    this.setData({
      totalAmount: totalAmount.toFixed(2),
      freight: freight.toFixed(2),
      payAmount: (totalAmount + freight).toFixed(2),
    })
  },

  // 加载默认地址
  async loadAddress() {
    try {
      const list = await get('/api/addresses')
      const address = list.find((a) => a.is_default) || list[0] || null
      this.setData({ address })
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // ===== 事件 =====

  // 切换地址（跳地址列表页，选择后返回）
  onChooseAddress() {
    wx.navigateTo({ url: '/pages/address/address?select=1' })
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // 提交订单
  async onSubmit() {
    const { items, address, remark, submitting } = this.data
    if (submitting) return
    if (!address) {
      wx.showToast({ title: '请先选择收货地址', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const order = await post('/api/orders', {
        items: items.map((i) => ({ goods_id: i.goods_id, quantity: i.quantity })),
        address_id: address.id,
        remark,
      })
      // 下单成功 → 发起支付
      this.doPay(order.id)
    } catch (e) {
      this.setData({ submitting: false })
    }
  },

  // 发起支付：mock 模式弹确认框后模拟回调；真实模式调 wx.requestPayment
  async doPay(orderId) {
    try {
      const data = await post(`/api/orders/${orderId}/pay`)
      const { payment, order_no, pay_amount } = data

      if (payment && payment.mock) {
        // 开发模式：模拟支付
        wx.showModal({
          title: '模拟支付',
          content: `确认支付 ¥${pay_amount}？`,
          confirmColor: '#07c160',
          success: async (res) => {
            if (!res.confirm) {
              // 用户取消：跳到订单列表可继续支付
              wx.redirectTo({ url: '/pages/order-list/order-list' })
              return
            }
            // 模拟微信服务器回调
            try {
              await post('/api/pay/notify', { order_no })
              this.goPayResult(orderId)
            } catch (e) {
              this.setData({ submitting: false })
            }
          },
        })
      } else {
        // 真实模式：微信支付
        wx.requestPayment({
          ...payment,
          success: () => this.goPayResult(orderId),
          fail: () => {
            wx.showToast({ title: '支付已取消', icon: 'none' })
            wx.redirectTo({ url: '/pages/order-list/order-list' })
          },
        })
      }
    } catch (e) {
      this.setData({ submitting: false })
    }
  },

  // 跳支付结果页
  goPayResult(orderId) {
    wx.redirectTo({ url: `/pages/pay-result/pay-result?id=${orderId}` })
  },
})
