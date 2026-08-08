/**
 * 商品卡片组件：首页瀑布流 / 分类页网格复用
 * 用法：<goods-card goods="{{item}}" />
 * 点击整卡跳转商品详情页
 */
Component({
  properties: {
    goods: {
      type: Object,
      value: {},
    },
  },

  methods: {
    // 点击跳转商品详情
    onTap() {
      const { id } = this.data.goods
      if (!id) return
      wx.navigateTo({ url: `/pages/goods-detail/goods-detail?id=${id}` })
    },
  },
})
