/**
 * 个人中心：头像昵称（可编辑）、订单快捷入口、地址管理、客服、关于我们
 */
const { get, put } = require('../../utils/request')

Page({
  data: {
    userInfo: {},
    orders: [
      { key: '0', icon: '💰', label: '待支付' },
      { key: '1', icon: '📦', label: '待发货' },
      { key: '2', icon: '🛵', label: '配送中' },
      { key: '3', icon: '⭐', label: '已完成' },
    ],
  },

  onShow() {
    // 头像临时路径缓存（真机预览重启后本地展示仍保留）
    const avatarCache = wx.getStorageSync('avatar_cache')
    if (avatarCache && (!this.data.userInfo.avatar_url || this.data.userInfo.avatar_url === avatarCache)) {
      this.setData({ 'userInfo.avatar_url': avatarCache })
    }
    this.loadProfile()
  },

  // 加载用户信息（未登录时 request.js 自动静默登录）
  async loadProfile() {
    try {
      const userInfo = await get('/api/auth/profile')
      const avatarCache = wx.getStorageSync('avatar_cache')
      this.setData({ userInfo: { ...userInfo, avatar_url: avatarCache || userInfo.avatar_url } })
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // ===== 头像昵称编辑 =====

  // 选择头像（wx.chooseMedia 临时路径；生产环境应上传至 OSS/CDN 后存永久 URL）
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        wx.setStorageSync('avatar_cache', tempPath)
        this.setData({ 'userInfo.avatar_url': tempPath })
        try {
          await put('/api/auth/profile', { avatar_url: tempPath })
          wx.showToast({ title: '头像已更新', icon: 'success' })
        } catch (e) {
          /* 已统一提示 */
        }
      },
    })
  },

  // 编辑昵称（弹窗输入）
  onEditNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: '',
      success: async (res) => {
        if (!res.confirm) return
        const nickname = (res.content || '').trim()
        if (!nickname) {
          wx.showToast({ title: '昵称不能为空', icon: 'none' })
          return
        }
        try {
          await put('/api/auth/profile', { nickname })
          this.setData({ 'userInfo.nickname': nickname })
          wx.showToast({ title: '昵称已更新', icon: 'success' })
        } catch (e) {
          /* 已统一提示 */
        }
      },
    })
  },

  // ===== 入口 =====

  // 订单快捷入口
  onGoOrders(e) {
    const { key } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/order-list/order-list?status=${key}` })
  },

  // 我的订单
  onGoAllOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  // 收货地址
  onGoAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  // 联系客服（拨打客服电话）
  onContact() {
    wx.makePhoneCall({ phoneNumber: '400-000-0000' }).catch(() => {})
  },

  // 关于我们
  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '鲜果鲜蔬 · 生鲜果蔬线上订购配送小程序\n\n产地直采，新鲜到家。\n版本 v1.0.0',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#07c160',
    })
  },
})
