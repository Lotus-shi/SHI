/**
 * 购物车页：商品列表（勾选/数量加减）、全选、底部合计与结算、空状态
 */
const { get, put, del } = require('../../utils/request')

Page({
  data: {
    list: [],           // 购物车条目 [{ goods_id, quantity, goods, checked }]
    allChecked: false,  // 全选状态
    totalPrice: '0.00', // 选中商品合计（保留两位小数）
    loading: true,
  },

  onShow() {
    this.loadCart()
  },

  // ===== 数据 =====

  async loadCart() {
    try {
      const list = await get('/api/cart')
      // 本地勾选状态（checked），默认全选
      const items = list.map((item) => ({ ...item, checked: true }))
      this.setData({ list: items, loading: false })
      this.calcTotal()
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  // 计算合计金额与全选状态
  calcTotal() {
    const checkedItems = this.data.list.filter((i) => i.checked)
    const total = checkedItems.reduce((sum, i) => sum + i.subtotal, 0)
    this.setData({
      totalPrice: total.toFixed(2),
      allChecked: this.data.list.length > 0 && checkedItems.length === this.data.list.length,
    })
  },

  // ===== 事件 =====

  // 单选切换
  onToggleCheck(e) {
    const { index } = e.currentTarget.dataset
    const key = `list[${index}].checked`
    this.setData({ [key]: !this.data.list[index].checked })
    this.calcTotal()
  },

  // 全选
  onToggleAll() {
    const allChecked = !this.data.allChecked
    const list = this.data.list.map((i) => ({ ...i, checked: allChecked }))
    this.setData({ list, allChecked })
    this.calcTotal()
  },

  // 数量加
  onPlus(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.list[index]
    if (item.quantity >= item.goods.stock) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }
    this.updateQuantity(index, item.quantity + 1)
  },

  // 数量减（减到 0 时删除该商品）
  onMinus(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.list[index]
    if (item.quantity <= 1) {
      this.removeItem(index)
      return
    }
    this.updateQuantity(index, item.quantity - 1)
  },

  // 修改数量（乐观更新，失败回滚）
  async updateQuantity(index, quantity) {
    const item = this.data.list[index]
    const oldQuantity = item.quantity
    this.setData({ [`list[${index}].quantity`]: quantity })
    this.calcTotal()
    try {
      await put(`/api/cart/${item.goods_id}`, { quantity })
    } catch (e) {
      this.setData({ [`list[${index}].quantity`]: oldQuantity })
      this.calcTotal()
    }
  },

  // 删除商品
  async removeItem(index) {
    const item = this.data.list[index]
    try {
      await del(`/api/cart/${item.goods_id}`)
      const list = this.data.list.filter((_, i) => i !== index)
      this.setData({ list })
      this.calcTotal()
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // 跳商品详情
  onGoDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` })
  },

  // 空购物车去逛逛：跳首页
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 结算：选中商品通过 storage 传递到订单确认页
  onCheckout() {
    const checkedItems = this.data.list.filter((i) => i.checked)
    if (!checkedItems.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    wx.setStorageSync('checkout_items', checkedItems)
    wx.navigateTo({ url: '/pages/order/order' })
  },
})
