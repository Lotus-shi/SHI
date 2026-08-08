/**
 * 地址编辑页：新增与编辑复用（?id= 存在时进入编辑模式）
 * 支持 wx.chooseAddress 微信地址选择快捷填充
 */
const { get, post, put } = require('../../utils/request')

Page({
  data: {
    id: 0, // 0 表示新增
    form: {
      receiver: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      is_default: false,
    },
    submitting: false,
  },

  onLoad(options) {
    const id = parseInt(options.id) || 0
    this.setData({ id })
    wx.setNavigationBarTitle({ title: id ? '编辑地址' : '新增地址' })
    if (id) {
      this.loadDetail(id)
    }
  },

  // 编辑模式：加载原地址信息
  async loadDetail(id) {
    try {
      const list = await get('/api/addresses')
      const address = list.find((a) => a.id === id)
      if (address) {
        this.setData({
          form: {
            receiver: address.receiver,
            phone: address.phone,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail,
            is_default: address.is_default,
          },
        })
      }
    } catch (e) {
      /* 已统一提示 */
    }
  },

  // ===== 表单输入 =====
  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onToggleDefault(e) {
    this.setData({ 'form.is_default': e.detail.value })
  },

  // ===== 微信地址选择快捷填充 =====
  onChooseAddress() {
    wx.chooseAddress({
      success: (res) => {
        this.setData({
          form: {
            ...this.data.form,
            receiver: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo,
          },
        })
      },
      fail: () => {
        // 用户拒绝授权，保持手动填写
      },
    })
  },

  // ===== 保存 =====
  async onSave() {
    const { id, form, submitting } = this.data
    if (submitting) return

    // 前端校验
    if (!form.receiver.trim()) return wx.showToast({ title: '请填写收货人姓名', icon: 'none' })
    if (!form.phone.trim()) return wx.showToast({ title: '请填写收货人电话', icon: 'none' })
    if (!/^\+?\d{6,15}$/.test(form.phone)) return wx.showToast({ title: '手机号格式不正确', icon: 'none' })
    if (!form.detail.trim()) return wx.showToast({ title: '请填写详细地址', icon: 'none' })

    this.setData({ submitting: true })
    try {
      if (id) {
        await put(`/api/addresses/${id}`, form)
      } else {
        await post('/api/addresses', form)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (e) {
      /* 已统一提示 */
    } finally {
      this.setData({ submitting: false })
    }
  },
})
