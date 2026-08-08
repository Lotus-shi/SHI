/**
 * 空状态组件：icon + 文案 + 可选按钮
 * 用法：<empty icon="🛒" text="购物车是空的" btnText="去逛逛" bind:btn="onTap" />
 */
Component({
  properties: {
    icon: { type: String, value: '📦' },   // 空状态图标
    text: { type: String, value: '暂无数据' },
    btnText: { type: String, value: '' },  // 按钮文案（空则不显示按钮）
  },
  methods: {
    onBtnTap() {
      this.triggerEvent('btn')
    },
  },
})
