/**
 * 订单列表页：顶部 Tab 筛选（全部/待支付/待发货/配送中/已完成）+ 订单卡片 + 去支付/取消
 * 订单状态：0 待支付 | 1 待发货 | 2 配送中 | 3 已完成 | 4 已取消
 */
const { get, put, post } = require('../../utils/request')

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: '0', label: '待支付' },
  { key: '1', label: '待发货' },
  { key: '2', label: '配送中' },
  { key: '3', label: '已完成' },
]
const STATUS_MAP = { 0: '待支付', 1: '待发货', 2: '配送中', 3: '已完成', 4: '已取消' }

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: '',      // 当前筛选状态（'' 全部）
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    ready: false,
  },

  onLoad(options) {
    const status = options.status || ''
    if (status) this.setData({ activeTab: status })
  },

  onShow() {
    this.loadOrders(true)
  },

  // ===== 数据 =====

  async loadOrders(reset = false) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true })
    try {
      const params = { page, page_size: 10 }
      if (this.data.activeTab !== '') params.status = this.data.activeTab
      const data = await get('/api/orders', params)
      // 为卡片补充状态文案
      const list = data.list.map((o) => ({ ...o, statusText: STATUS_MAP[o.status] }))
      this.setData({
        list: reset ? list : [...this.data.list, ...list],
        page: page + 1,
        hasMore: data.hasMore,
        ready: true,
      })
    } catch (e) {
      /* 已统一提示 */
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // ===== 事件 =====

  // Tab 切换
  onTabTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key })
    this.loadOrders(true)
  },

  // 上拉加载
  onReachBottom() {
    if (this.data.hasMore) this.loadOrders(false)
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOrders(true)
  },

  // 跳转订单详情
  onGoDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  // 去支付（复用订单确认页的模拟支付逻辑）
  async onPay(e) {
    const { id } = e.currentTarget.dataset
    try {
      const data = await post(`/api/orders/${id}/pay`)
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
            this.loadOrders(true)
          },
        })
      } else {
        wx.requestPayment({
          ...payment,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrders(true)
          },
        })
      }
    } catch (err) {
      /* 已统一提示 */
    }
  },

  // 取消订单（二次确认）
  onCancel(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定取消该订单吗？',
      confirmColor: '#ff4949',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await put(`/api/orders/${id}/cancel`)
          wx.showToast({ title: '订单已取消', icon: 'success' })
          this.loadOrders(true)
        } catch (err) {
          /* 已统一提示 */
        }
      },
    })
  },
})
