/**
 * 小程序入口
 * onLaunch：静默登录（wx.login → 后端换 JWT → 缓存 token）
 * 后续请求 401 时 request.js 会自动重新静默登录
 */
const { silentLogin } = require('./utils/request')

App({
  onLaunch() {
    // 静默登录：已有 token 则跳过（接口 401 时会自动重新登录）
    if (!wx.getStorageSync('token')) {
      silentLogin().catch(() => {
        // 登录失败不阻塞使用（公开接口可访问，登录态在需要时自动补）
        console.warn('[启动] 静默登录失败，将按需重试')
      })
    }
  },
  globalData: {
    userInfo: null,
    token: '',
  },
})
