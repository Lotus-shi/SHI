/**
 * 加载状态组件
 * 用法：<loading show="{{loading}}" text="加载中..." />
 */
Component({
  properties: {
    show: { type: Boolean, value: false },  // 是否显示
    text: { type: String, value: '加载中...' },
  },
})
