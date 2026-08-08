/**
 * 商品详情页：图片轮播 + 价格/规格 + 图文详情 + 底部操作栏
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    id: 0,
    goods: null,     // 商品详情
    images: [],      // 轮播图
    quantity: 1,     // 购买数量（规格区）
    loading: true,
  },

  onLoad(options) {
    const id = parseInt(options.id)
    this.setData({ id })
    this.loadDetail(id)
  },

  // 加载商品详情
  async loadDetail(id) {
    try {
      const goods = await get(`/api/goods/${id}`)
      this.setData({
        goods,
        images: goods.images && goods.images.length ? goods.images : [goods.image],
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
      // 商品不存在时返回上一页
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // ===== 数量选择 =====
  onMinus() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },
  onPlus() {
    const { goods, quantity } = this.data
    if (quantity >= goods.stock) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }
    this.setData({ quantity: quantity + 1 })
  },

  // ===== 底部操作 =====

  // 加入购物车（401 时 request.js 会自动静默登录重试）
  async onAddToCart() {
    try {
      await post('/api/cart', { goods_id: this.data.id, quantity: this.data.quantity })
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (e) {
      /* 已统一提示 */
    }
  },
  // 立即购买：跳过购物车，携带当前商品与数量直接进入订单确认页
  onBuyNow() {
    const { goods, quantity } = this.data
    const subtotal = parseFloat(goods.price) * quantity
    // 条目结构与购物车条目一致（order 页复用同一套数据格式）
    const items = [{
      goods_id: goods.id,
      quantity,
      goods: {
        id: goods.id,
        name: goods.name,
        image: goods.image,
        price: goods.price,
        unit: goods.unit,
        stock: goods.stock,
        sales: goods.sales,
      },
      subtotal,
    }]
    wx.setStorageSync('checkout_items', items)
    wx.navigateTo({ url: '/pages/order/order' })
  },

  // 拨打客服（阶段八完善）
  onContact() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },
})
