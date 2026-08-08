/**
 * 地址列表页：展示、新增、编辑、删除、设置默认
 * ?select=1 进入选择模式（订单确认页选地址用）：点击地址直接返回
 */
const { get, del, put } = require('../../utils/request')

Page({
  data: {
    list: [],
    loading: true,
    selectMode: false, // 选择模式：从订单确认页进入
  },

  onLoad(options) {
    if (options.select) {
      this.setData({ selectMode: true })
      wx.setNavigationBarTitle({ title: '选择收货地址' })
    }
  },

  onShow() {
    this.loadList()
  },

  // 选择模式：点击地址选中并返回
  onPickAddress(e) {
    if (!this.data.selectMode) return
    const { index } = e.currentTarget.dataset
    wx.setStorageSync('selected_address', this.data.list[index])
    wx.navigateBack()
  },

  async loadList() {
    try {
      const list = await get('/api/addresses')
      this.setData({ list, loading: false })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  // 新增地址
  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  // 编辑地址
  onEdit(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` })
  },

  // 设置默认
  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset
    try {
      await put(`/api/addresses/${id}`, { is_default: true })
      wx.showToast({ title: '已设为默认', icon: 'success' })
      this.loadList()
    } catch (err) {
      /* 已统一提示 */
    }
  },

  // 删除（二次确认）
  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      confirmColor: '#ff4949',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await del(`/api/addresses/${id}`)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadList()
        } catch (err) {
          /* 已统一提示 */
        }
      },
    })
  },
})
